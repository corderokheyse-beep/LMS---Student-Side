const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Announcement = sequelize.define('Announcement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    scope: {
      type: DataTypes.ENUM('institution', 'department', 'course', 'class'),
      defaultValue: 'class'
    },
    departmentId: { type: DataTypes.INTEGER, allowNull: true, field: 'department_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: true, field: 'course_id' },
    classId: { type: DataTypes.INTEGER, allowNull: true, field: 'class_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    priority: {
      type: DataTypes.ENUM('normal', 'important', 'urgent'),
      defaultValue: 'normal'
    },
    isPinned: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_pinned' },
    publishAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'publish_at' },
    expiresAt: { type: DataTypes.DATE, allowNull: true, field: 'expires_at' },
    authorId: { type: DataTypes.INTEGER, allowNull: false, field: 'author_id' }
  }, {
    tableName: 'announcements',
    indexes: [{ fields: ['scope'] }, { fields: ['class_id'] }, { fields: ['course_id'] }]
  });

  const DiscussionThread = sequelize.define('DiscussionThread', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    classId: { type: DataTypes.INTEGER, allowNull: false, field: 'class_id' },
    courseId: { type: DataTypes.INTEGER, allowNull: false, field: 'course_id' },
    lessonId: { type: DataTypes.INTEGER, allowNull: true, field: 'lesson_id' },
    authorId: { type: DataTypes.INTEGER, allowNull: false, field: 'author_id' },
    title: { type: DataTypes.STRING(220), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    category: {
      type: DataTypes.ENUM('general', 'lecture_question', 'laboratory_help', 'project', 'troubleshooting'),
      defaultValue: 'lecture_question'
    },
    isPinned: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_pinned' },
    isResolved: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_resolved' },
    isEscalated: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_escalated' },
    escalationNote: { type: DataTypes.STRING(500), allowNull: true, field: 'escalation_note' }
  }, {
    tableName: 'discussions',
    indexes: [{ fields: ['class_id'] }, { fields: ['course_id'] }]
  });

  const DiscussionPost = sequelize.define('DiscussionPost', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    threadId: { type: DataTypes.INTEGER, allowNull: false, field: 'thread_id' },
    authorId: { type: DataTypes.INTEGER, allowNull: false, field: 'author_id' },
    body: { type: DataTypes.TEXT, allowNull: false },
    isInstructorEndorsed: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_instructor_endorsed' }
  }, {
    tableName: 'discussion_posts',
    indexes: [{ fields: ['thread_id'] }]
  });

  const Conversation = sequelize.define('Conversation', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    subject: { type: DataTypes.STRING(220), allowNull: false },
    classId: { type: DataTypes.INTEGER, allowNull: true, field: 'class_id' },
    createdBy: { type: DataTypes.INTEGER, allowNull: false, field: 'created_by' },
    lastMessageAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'last_message_at' }
  }, {
    tableName: 'conversations',
    indexes: [{ fields: ['class_id'] }]
  });

  const ConversationMember = sequelize.define('ConversationMember', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.INTEGER, allowNull: false, field: 'conversation_id' },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    lastReadAt: { type: DataTypes.DATE, allowNull: true, field: 'last_read_at' }
  }, {
    tableName: 'conversation_members',
    indexes: [{ fields: ['conversation_id', 'user_id'], unique: true }]
  });

  const Message = sequelize.define('Message', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    conversationId: { type: DataTypes.INTEGER, allowNull: false, field: 'conversation_id' },
    senderId: { type: DataTypes.INTEGER, allowNull: false, field: 'sender_id' },
    body: { type: DataTypes.TEXT, allowNull: false }
  }, {
    tableName: 'messages',
    indexes: [{ fields: ['conversation_id'] }]
  });

  const Notification = sequelize.define('Notification', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    type: {
      type: DataTypes.ENUM(
        'enrollment',
        'assignment',
        'deadline',
        'assessment',
        'grade',
        'feedback',
        'announcement',
        'completion',
        'certificate',
        'message',
        'system'
      ),
      defaultValue: 'system'
    },
    title: { type: DataTypes.STRING(220), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    destinationUrl: { type: DataTypes.STRING(300), allowNull: true, field: 'destination_url' },
    isRead: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'is_read' },
    readAt: { type: DataTypes.DATE, allowNull: true, field: 'read_at' },
    emailDeliveryStatus: {
      type: DataTypes.ENUM('not_requested', 'queued', 'sent', 'failed'),
      defaultValue: 'not_requested',
      field: 'email_delivery_status'
    }
  }, {
    tableName: 'notifications',
    indexes: [{ fields: ['user_id', 'is_read'] }]
  });

  return {
    Announcement,
    DiscussionThread,
    DiscussionPost,
    Conversation,
    ConversationMember,
    Message,
    Notification
  };
};

