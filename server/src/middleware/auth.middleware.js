const {
  User,
  Role,
  Permission,
  InstructorAssignment,
  TeachingAssistantAssignment,
  ClassMembership,
  ClassSection,
  CourseOffering
} = require('../models');
const { AppError } = require('./error.middleware');
const { recordAudit } = require('../utils/auditLogger');
const { verifyJwt } = require('../utils/jwt');

const ROLE_PRIORITY = [
  'super_admin',
  'academic_admin',
  'instructor',
  'teaching_assistant',
  'student'
];

async function loadUserAuthContext(userId) {
  const user = await User.findByPk(userId, {
    include: [
      {
        model: Role,
        as: 'roles',
        include: [{ model: Permission, as: 'permissions' }]
      }
    ]
  });

  if (!user) return null;

  const roleSlugs = (user.roles || []).map((r) => r.slug);
  const permissionSet = new Set();
  for (const role of user.roles || []) {
    for (const perm of role.permissions || []) {
      permissionSet.add(perm.code);
    }
  }

  const primaryRole = ROLE_PRIORITY.find((r) => roleSlugs.includes(r)) || roleSlugs[0] || 'student';

  return {
    id: user.id,
    institutionId: user.institutionId,
    departmentId: user.departmentId,
    programId: user.programId,
    studentNumber: user.studentNumber,
    employeeNumber: user.employeeNumber,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    email: user.email,
    status: user.status,
    avatarUrl: user.avatarUrl,
    bio: user.bio,
    phone: user.phone,
    timezone: user.timezone,
    notificationPreferences: user.notificationPreferences,
    primaryRole,
    roles: roleSlugs,
    permissions: Array.from(permissionSet)
  };
}

async function requireAuth(req, res, next) {
  try {
    let userId = req.session?.userId;

    if (!userId) {
      let token = null;
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (req.cookies && req.cookies['lms.jwt']) {
        token = req.cookies['lms.jwt'];
      }

      if (token) {
        const decoded = verifyJwt(token);
        if (!decoded || !decoded.sub) {
          return next(new AppError('Invalid or expired authentication token.', 401, 'INVALID_TOKEN'));
        }
        userId = Number(decoded.sub);
      }
    }

    if (!userId) {
      return next(new AppError('Authentication required. Please log in.', 401, 'UNAUTHENTICATED'));
    }

    const authUser = await loadUserAuthContext(userId);
    if (!authUser) {
      if (req.session?.destroy) req.session.destroy(() => {});
      res.clearCookie('lms.jwt');
      return next(new AppError('User account no longer exists.', 401, 'UNAUTHENTICATED'));
    }

    if (authUser.status !== 'active') {
      if (req.session?.destroy) req.session.destroy(() => {});
      res.clearCookie('lms.jwt');
      return next(new AppError(`Account is ${authUser.status}. Contact an administrator.`, 403, 'ACCOUNT_INACTIVE'));
    }

    req.user = authUser;
    return next();
  } catch (err) {
    return next(err);
  }
}

function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }
    const hasMatch = req.user.roles.some((r) => allowedRoles.includes(r));
    if (!hasMatch) {
      await recordAudit({
        req,
        action: 'UNAUTHORIZED_ROLE_ACCESS_ATTEMPT',
        category: 'security',
        severity: 'warning',
        metadata: { path: req.originalUrl, requiredRoles: allowedRoles, userRoles: req.user.roles }
      });
      return next(new AppError('Forbidden: Insufficient role privileges.', 403, 'FORBIDDEN_ROLE'));
    }
    return next();
  };
}

function requirePermission(...requiredPermissions) {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required.', 401, 'UNAUTHENTICATED'));
    }
    const hasAll = requiredPermissions.every((perm) => req.user.permissions.includes(perm));
    if (!hasAll) {
      await recordAudit({
        req,
        action: 'UNAUTHORIZED_PERMISSION_ACCESS_ATTEMPT',
        category: 'security',
        severity: 'warning',
        metadata: { path: req.originalUrl, requiredPermissions, userRole: req.user.primaryRole }
      });
      return next(new AppError('Forbidden: Missing required permission.', 403, 'FORBIDDEN_PERMISSION'));
    }
    return next();
  };
}

/**
 * Verifies resource-level access to a specific ClassSection (`classId`).
 * Prevents instructors, TAs, or students from accessing unrelated classes.
 */
async function verifyClassAccess(user, classId, {
  allowAdmin = true,
  allowInstructor = true,
  allowTA = false,
  requiredTaFlag = null,
  allowStudent = false
} = {}) {
  const numericClassId = Number(classId);
  if (!numericClassId || Number.isNaN(numericClassId)) {
    throw new AppError('Invalid class identifier.', 400, 'INVALID_CLASS_ID');
  }

  const classSection = await ClassSection.findByPk(numericClassId, {
    include: [{ model: CourseOffering, as: 'courseOffering' }]
  });
  if (!classSection) {
    throw new AppError('Class section not found.', 404, 'CLASS_NOT_FOUND');
  }

  if (allowAdmin && (user.roles.includes('super_admin') || user.roles.includes('academic_admin'))) {
    return { accessRole: 'admin', classSection };
  }

  if (allowInstructor && user.roles.includes('instructor')) {
    const assignment = await InstructorAssignment.findOne({
      where: { classId: numericClassId, instructorId: user.id }
    });
    if (assignment) {
      return { accessRole: 'instructor', classSection, assignment };
    }
  }

  if (allowTA && user.roles.includes('teaching_assistant')) {
    const taAssignment = await TeachingAssistantAssignment.findOne({
      where: { classId: numericClassId, taUserId: user.id }
    });
    if (taAssignment) {
      if (requiredTaFlag && !taAssignment[requiredTaFlag]) {
        throw new AppError(`Teaching assistant is not authorized for ${requiredTaFlag} in this class.`, 403, 'TA_PERMISSION_DENIED');
      }
      return { accessRole: 'teaching_assistant', classSection, taAssignment };
    }
  }

  if (allowStudent && user.roles.includes('student')) {
    const membership = await ClassMembership.findOne({
      where: { classId: numericClassId, studentId: user.id, status: ['enrolled', 'completed'] }
    });
    if (membership) {
      return { accessRole: 'student', classSection, membership };
    }
  }

  throw new AppError('Forbidden: You do not have access to this class section.', 403, 'CLASS_ACCESS_DENIED');
}

module.exports = {
  loadUserAuthContext,
  requireAuth,
  requireRole,
  requirePermission,
  verifyClassAccess
};

