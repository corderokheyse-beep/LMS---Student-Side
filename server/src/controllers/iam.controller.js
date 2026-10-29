const argon2 = require('argon2');
const { Op } = require('sequelize');
const {
  sequelize,
  User,
  Role,
  Permission,
  RolePermission,
  UserRole,
  Department,
  Program,
  SystemSetting,
  AuditLog,
  ClassMembership,
  InstructorAssignment
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { createUserSchema, updateUserSchema } = require('../validators/schemas');

const HASH_OPTS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 };

async function listUsers(req, res, next) {
  try {
    const { search, role, status, departmentId, page = 1, limit = 50 } = req.query;
    const where = {};

    if (status) where.status = status;
    if (departmentId) where.departmentId = Number(departmentId);
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
        { studentNumber: { [Op.like]: `%${search}%` } },
        { employeeNumber: { [Op.like]: `%${search}%` } }
      ];
    }

    const roleInclude = {
      model: Role,
      as: 'roles',
      attributes: ['id', 'name', 'slug'],
      through: { attributes: [] }
    };
    if (role) {
      roleInclude.where = { slug: role };
      roleInclude.required = true;
    }

    const offset = (Math.max(1, Number(page)) - 1) * Number(limit);
    const { rows, count } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['passwordHash', 'passwordResetToken', 'passwordResetExpires'] },
      include: [
        roleInclude,
        { model: Department, as: 'department', attributes: ['id', 'code', 'name'] },
        { model: Program, as: 'program', attributes: ['id', 'code', 'name'] }
      ],
      order: [['id', 'ASC']],
      limit: Number(limit),
      offset,
      distinct: true
    });

    return res.status(200).json({
      success: true,
      data: {
        users: rows,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit)) || 1
        }
      }
    });
  } catch (err) {
    return next(err);
  }
}

async function getUserById(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const user = await User.findByPk(userId, {
      attributes: { exclude: ['passwordHash', 'passwordResetToken', 'passwordResetExpires'] },
      include: [
        { model: Role, as: 'roles', through: { attributes: [] } },
        { model: Department, as: 'department' },
        { model: Program, as: 'program' },
        { model: ClassMembership, as: 'enrollments' },
        { model: InstructorAssignment, as: 'instructorAssignments' }
      ]
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const payload = createUserSchema.parse(req.body);
    const normalizedEmail = payload.email.trim().toLowerCase();

    // Only super_admin can create super_admin or academic_admin accounts
    if (['super_admin', 'academic_admin'].includes(payload.roleSlug) && !req.user.roles.includes('super_admin')) {
      throw new AppError('Only a Super Administrator can provision administrative accounts.', 403, 'PRIVILEGE_ESCALATION_BLOCKED');
    }

    const role = await Role.findOne({ where: { slug: payload.roleSlug }, transaction: t });
    if (!role) {
      throw new AppError('Selected role does not exist.', 400, 'INVALID_ROLE');
    }

    const passwordHash = await argon2.hash(payload.password, HASH_OPTS);

    const user = await User.create({
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: normalizedEmail,
      passwordHash,
      status: payload.status || 'active',
      departmentId: payload.departmentId || null,
      programId: payload.programId || null,
      studentNumber: payload.studentNumber || null,
      employeeNumber: payload.employeeNumber || null
    }, { transaction: t });

    await UserRole.create({
      userId: user.id,
      roleId: role.id,
      assignedBy: req.user.id
    }, { transaction: t });

    await t.commit();

    await recordAudit({
      req,
      action: 'USER_ACCOUNT_CREATED',
      category: 'user',
      severity: 'info',
      entityType: 'User',
      entityId: user.id,
      metadata: { email: user.email, assignedRole: role.slug }
    });

    const createdUser = await User.findByPk(user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
    });

    return res.status(201).json({
      success: true,
      message: 'User account created successfully.',
      data: { user: createdUser }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function updateUser(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const targetUserId = Number(req.params.id);
    const payload = updateUserSchema.parse(req.body);

    const user = await User.findByPk(targetUserId, {
      include: [{ model: Role, as: 'roles' }],
      transaction: t
    });

    if (!user) {
      throw new AppError('User not found.', 404, 'USER_NOT_FOUND');
    }

    // Prevent self-privilege escalation or self-deactivation
    if (targetUserId === req.user.id) {
      if (payload.roleSlug && !req.user.roles.includes(payload.roleSlug)) {
        throw new AppError('Users are not permitted to grant themselves elevated or modified roles.', 403, 'SELF_ROLE_CHANGE_FORBIDDEN');
      }
      if (payload.status && payload.status !== 'active') {
        throw new AppError('You cannot deactivate or suspend your own active account.', 400, 'SELF_DEACTIVATION_FORBIDDEN');
      }
    }

    // Protect the final active Super Administrator against accidental deactivation or role removal
    const isTargetSuperAdmin = (user.roles || []).some((r) => r.slug === 'super_admin');
    const isRemovingSuperAdmin =
      isTargetSuperAdmin &&
      ((payload.status && payload.status !== 'active') ||
        (payload.roleSlug && payload.roleSlug !== 'super_admin'));

    if (isRemovingSuperAdmin) {
      const activeSuperAdminsCount = await User.count({
        where: { status: 'active' },
        include: [{ model: Role, as: 'roles', where: { slug: 'super_admin' }, required: true }],
        transaction: t
      });
      if (activeSuperAdminsCount <= 1) {
        throw new AppError(
          'Cannot deactivate or demote the final active Super Administrator account.',
          400,
          'FINAL_SUPER_ADMIN_PROTECTED'
        );
      }
    }

    await user.update({
      firstName: payload.firstName ?? user.firstName,
      lastName: payload.lastName ?? user.lastName,
      status: payload.status ?? user.status,
      departmentId: payload.departmentId !== undefined ? payload.departmentId : user.departmentId,
      programId: payload.programId !== undefined ? payload.programId : user.programId,
      studentNumber: payload.studentNumber !== undefined ? payload.studentNumber : user.studentNumber,
      employeeNumber: payload.employeeNumber !== undefined ? payload.employeeNumber : user.employeeNumber
    }, { transaction: t });

    if (payload.roleSlug) {
      if (!req.user.roles.includes('super_admin')) {
        throw new AppError('Only a Super Administrator can modify system role assignments.', 403, 'ROLE_CHANGE_FORBIDDEN');
      }
      const newRole = await Role.findOne({ where: { slug: payload.roleSlug }, transaction: t });
      if (!newRole) throw new AppError('Target role not found.', 404, 'ROLE_NOT_FOUND');

      await UserRole.destroy({ where: { userId: user.id }, transaction: t });
      await UserRole.create({
        userId: user.id,
        roleId: newRole.id,
        assignedBy: req.user.id
      }, { transaction: t });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'USER_ACCOUNT_UPDATED',
      category: 'user',
      severity: payload.status === 'suspended' || payload.roleSlug ? 'warning' : 'info',
      entityType: 'User',
      entityId: user.id,
      metadata: payload
    });

    const updated = await User.findByPk(user.id, {
      attributes: { exclude: ['passwordHash'] },
      include: [{ model: Role, as: 'roles', through: { attributes: [] } }]
    });

    return res.status(200).json({
      success: true,
      message: 'User account updated.',
      data: { user: updated }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function listRolesAndPermissions(req, res, next) {
  try {
    const [roles, permissions] = await Promise.all([
      Role.findAll({
        include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }],
        order: [['id', 'ASC']]
      }),
      Permission.findAll({ order: [['module', 'ASC'], ['code', 'ASC']] })
    ]);

    return res.status(200).json({
      success: true,
      data: { roles, permissions }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateRolePermissions(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const roleId = Number(req.params.id);
    const { permissionCodes } = req.body;

    if (!Array.isArray(permissionCodes)) {
      throw new AppError('permissionCodes must be an array of permission code strings.', 400);
    }

    const role = await Role.findByPk(roleId, { transaction: t });
    if (!role) throw new AppError('Role not found.', 404);

    // Prevent removing roles:manage from super_admin
    if (role.slug === 'super_admin' && !permissionCodes.includes('roles:manage')) {
      throw new AppError('Cannot remove roles:manage from Super Administrator.', 400, 'PROTECTED_PERMISSION');
    }

    const perms = await Permission.findAll({
      where: { code: permissionCodes },
      transaction: t
    });

    await RolePermission.destroy({ where: { roleId: role.id }, transaction: t });
    for (const p of perms) {
      await RolePermission.create({ roleId: role.id, permissionId: p.id }, { transaction: t });
    }

    await t.commit();

    await recordAudit({
      req,
      action: 'ROLE_PERMISSIONS_UPDATED',
      category: 'role',
      severity: 'warning',
      entityType: 'Role',
      entityId: role.id,
      metadata: { roleSlug: role.slug, permissionCount: perms.length }
    });

    const updatedRole = await Role.findByPk(roleId, {
      include: [{ model: Permission, as: 'permissions', through: { attributes: [] } }]
    });

    return res.status(200).json({
      success: true,
      message: `Permissions updated for ${role.name}.`,
      data: { role: updatedRole }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

async function listSystemSettings(req, res, next) {
  try {
    const settings = await SystemSetting.findAll({ order: [['category', 'ASC'], ['key', 'ASC']] });
    return res.status(200).json({
      success: true,
      data: { settings }
    });
  } catch (err) {
    return next(err);
  }
}

async function updateSystemSetting(req, res, next) {
  try {
    const { key } = req.params;
    const { value, description, category } = req.body;

    if (value === undefined) {
      throw new AppError('Setting value is required.', 400);
    }

    const [setting, created] = await SystemSetting.findOrCreate({
      where: { key },
      defaults: {
        key,
        category: category || 'general',
        value,
        description: description || '',
        updatedBy: req.user.id
      }
    });

    if (!created) {
      await setting.update({
        value,
        description: description !== undefined ? description : setting.description,
        category: category || setting.category,
        updatedBy: req.user.id
      });
    }

    await recordAudit({
      req,
      action: 'SYSTEM_SETTING_UPDATED',
      category: 'system',
      severity: 'warning',
      entityType: 'SystemSetting',
      entityId: key,
      metadata: { key, category: setting.category }
    });

    return res.status(200).json({
      success: true,
      message: `Configuration "${key}" saved.`,
      data: { setting }
    });
  } catch (err) {
    return next(err);
  }
}

async function listAuditLogs(req, res, next) {
  try {
    const { category, severity, search, limit = 100 } = req.query;
    const where = {};
    if (category) where.category = category;
    if (severity) where.severity = severity;
    if (search) {
      where[Op.or] = [
        { action: { [Op.like]: `%${search}%` } },
        { actorEmail: { [Op.like]: `%${search}%` } },
        { entityType: { [Op.like]: `%${search}%` } }
      ];
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC'], ['id', 'DESC']],
      limit: Math.min(500, Number(limit))
    });

    return res.status(200).json({
      success: true,
      data: { logs }
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  listRolesAndPermissions,
  updateRolePermissions,
  listSystemSettings,
  updateSystemSetting,
  listAuditLogs
};

