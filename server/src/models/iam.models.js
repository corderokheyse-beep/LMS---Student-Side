const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    institutionId: { type: DataTypes.INTEGER, allowNull: true, field: 'institution_id' },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'department_id' },
    programId: { type: DataTypes.INTEGER, allowNull: true, field: 'program_id' },
    studentNumber: { type: DataTypes.STRING(50), allowNull: true, unique: true, field: 'student_number' },
    employeeNumber: { type: DataTypes.STRING(50), allowNull: true, unique: true, field: 'employee_number' },
    firstName: { type: DataTypes.STRING(100), allowNull: false, field: 'first_name' },
    lastName: { type: DataTypes.STRING(100), allowNull: false, field: 'last_name' },
    email: { type: DataTypes.STRING(191), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'suspended', 'pending'),
      defaultValue: 'active',
      allowNull: false
    },
    avatarUrl: { type: DataTypes.STRING(500), allowNull: true, field: 'avatar_url' },
    bio: { type: DataTypes.TEXT, allowNull: true },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    timezone: { type: DataTypes.STRING(80), defaultValue: 'Asia/Manila' },
    emailVerified: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'email_verified' },
    failedLoginAttempts: { type: DataTypes.INTEGER, defaultValue: 0, field: 'failed_login_attempts' },
    lockedUntil: { type: DataTypes.DATE, allowNull: true, field: 'locked_until' },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    passwordResetToken: { type: DataTypes.STRING(191), allowNull: true, field: 'password_reset_token' },
    passwordResetExpires: { type: DataTypes.DATE, allowNull: true, field: 'password_reset_expires' },
    notificationPreferences: {
      type: DataTypes.JSON,
      defaultValue: {
        inApp: true,
        email: false,
        assignments: true,
        assessments: true,
        grades: true,
        announcements: true,
        messages: true
      },
      field: 'notification_preferences'
    }
  }, {
    tableName: 'users',
    indexes: [
      { fields: ['email'], unique: true },
      { fields: ['status'] },
      { fields: ['department_id'] },
      { fields: ['program_id'] }
    ]
  });

  const Role = sequelize.define('Role', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(500), allowNull: true },
    isSystemRole: { type: DataTypes.BOOLEAN, defaultValue: true, field: 'is_system_role' }
  }, {
    tableName: 'roles'
  });

  const Permission = sequelize.define('Permission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    module: { type: DataTypes.STRING(80), allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: false }
  }, {
    tableName: 'permissions',
    indexes: [{ fields: ['code'], unique: true }, { fields: ['module'] }]
  });

  const RolePermission = sequelize.define('RolePermission', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    roleId: { type: DataTypes.INTEGER, allowNull: false, field: 'role_id' },
    permissionId: { type: DataTypes.INTEGER, allowNull: false, field: 'permission_id' }
  }, {
    tableName: 'role_permissions',
    indexes: [{ fields: ['role_id', 'permission_id'], unique: true }]
  });

  const UserRole = sequelize.define('UserRole', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    roleId: { type: DataTypes.INTEGER, allowNull: false, field: 'role_id' },
    assignedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'assigned_by' }
  }, {
    tableName: 'user_roles',
    indexes: [{ fields: ['user_id', 'role_id'], unique: true }]
  });

  const SystemSetting = sequelize.define('SystemSetting', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    key: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    category: { type: DataTypes.STRING(80), allowNull: false, defaultValue: 'general' },
    value: { type: DataTypes.JSON, allowNull: false },
    description: { type: DataTypes.STRING(500), allowNull: true },
    updatedBy: { type: DataTypes.INTEGER, allowNull: true, field: 'updated_by' }
  }, {
    tableName: 'system_settings'
  });

  const AuditLog = sequelize.define('AuditLog', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    actorId: { type: DataTypes.INTEGER, allowNull: true, field: 'actor_id' },
    actorEmail: { type: DataTypes.STRING(191), allowNull: true, field: 'actor_email' },
    actorRole: { type: DataTypes.STRING(80), allowNull: true, field: 'actor_role' },
    action: { type: DataTypes.STRING(120), allowNull: false },
    category: {
      type: DataTypes.ENUM('auth', 'security', 'user', 'role', 'academic', 'course', 'assessment', 'grade', 'system'),
      defaultValue: 'system'
    },
    severity: {
      type: DataTypes.ENUM('info', 'warning', 'critical'),
      defaultValue: 'info'
    },
    entityType: { type: DataTypes.STRING(80), allowNull: true, field: 'entity_type' },
    entityId: { type: DataTypes.STRING(80), allowNull: true, field: 'entity_id' },
    ipAddress: { type: DataTypes.STRING(64), allowNull: true, field: 'ip_address' },
    userAgent: { type: DataTypes.STRING(500), allowNull: true, field: 'user_agent' },
    metadata: { type: DataTypes.JSON, allowNull: true }
  }, {
    tableName: 'audit_logs',
    indexes: [
      { fields: ['actor_id'] },
      { fields: ['category'] },
      { fields: ['severity'] },
      { fields: ['created_at'] }
    ]
  });

  return {
    User,
    Role,
    Permission,
    RolePermission,
    UserRole,
    SystemSetting,
    AuditLog
  };
};

