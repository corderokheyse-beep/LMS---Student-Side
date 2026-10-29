const {
  sequelize,
  Announcement,
  DiscussionThread,
  DiscussionPost,
  Conversation,
  ConversationMember,
  Message,
  Notification,
  ClassMembership,
  ClassSection,
  User
} = require('../models');
const { AppError } = require('../middleware/error.middleware');
const { verifyClassAccess } = require('../middleware/auth.middleware');
const { sanitizePlainText } = require('../utils/sanitizer');
const { createNotification } = require('../utils/notifyUser');

// Announcements
async function listAnnouncements(req, res, next) {
  try {
    const { scope, classId, courseId } = req.query;
    const where = {};
    if (scope) where.scope = scope;
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    const announcements = await Announcement.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] }
      ],
      order: [
        ['isPinned', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json({ success: true, data: { announcements } });
  } catch (err) {
    return next(err);
  }
}

async function createAnnouncement(req, res, next) {
  try {
    const {
      scope = 'class',
      departmentId,
      courseId,
      classId,
      title,
      content,
      priority = 'normal',
      isPinned = false,
      expiresAt
    } = req.body;

    if (!title || !content) {
      throw new AppError('Announcement title and content are required.', 400);
    }

    if (classId) {
      await verifyClassAccess(req.user, classId, { allowAdmin: true, allowInstructor: true });
    }

    const announcement = await Announcement.create({
      scope,
      departmentId: departmentId ? Number(departmentId) : null,
      courseId: courseId ? Number(courseId) : null,
      classId: classId ? Number(classId) : null,
      title: sanitizePlainText(title),
      content: sanitizePlainText(content),
      priority,
      isPinned: Boolean(isPinned),
      expiresAt: expiresAt || null,
      authorId: req.user.id
    });

    if (classId) {
      const members = await ClassMembership.findAll({ where: { classId: Number(classId), status: 'enrolled' } });
      for (const m of members) {
        await createNotification({
          userId: m.studentId,
          type: 'announcement',
          title: `New Announcement: ${announcement.title}`,
          message: announcement.content.slice(0, 140),
          destinationUrl: '/student/announcements'
        });
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Announcement published.',
      data: { announcement }
    });
  } catch (err) {
    return next(err);
  }
}

// Discussions
async function listDiscussions(req, res, next) {
  try {
    const { classId, courseId } = req.query;
    const where = {};
    if (classId) where.classId = Number(classId);
    if (courseId) where.courseId = Number(courseId);

    const threads = await DiscussionThread.findAll({
      where,
      include: [
        { model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] },
        { model: ClassSection, as: 'classSection', attributes: ['id', 'sectionCode', 'name'] },
        {
          model: DiscussionPost,
          as: 'posts',
          include: [{ model: User, as: 'author', attributes: ['id', 'firstName', 'lastName', 'email'] }]
        }
      ],
      order: [
        ['isPinned', 'DESC'],
        ['createdAt', 'DESC']
      ]
    });

    return res.status(200).json({ success: true, data: { threads } });
  } catch (err) {
    return next(err);
  }
}

async function createDiscussionThread(req, res, next) {
  try {
    const { classId, courseId, lessonId, title, body, category = 'lecture_question' } = req.body;
    if (!classId || !title || !body) {
      throw new AppError('classId, title, and body are required.', 400);
    }

    const { classSection } = await verifyClassAccess(req.user, classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    const resolvedCourseId = courseId ? Number(courseId) : (classSection.courseOffering?.courseId || 1);

    const thread = await DiscussionThread.create({
      classId: Number(classId),
      courseId: resolvedCourseId,
      lessonId: lessonId ? Number(lessonId) : null,
      authorId: req.user.id,
      title: sanitizePlainText(title),
      body: sanitizePlainText(body),
      category
    });

    return res.status(201).json({
      success: true,
      message: 'Discussion thread created.',
      data: { thread }
    });
  } catch (err) {
    return next(err);
  }
}

async function replyToDiscussionThread(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    const { body } = req.body;
    if (!body || !String(body).trim()) {
      throw new AppError('Reply body is required.', 400);
    }

    const thread = await DiscussionThread.findByPk(threadId);
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    await verifyClassAccess(req.user, thread.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true,
      allowStudent: true
    });

    const isInstructorOrTa = ['instructor', 'teaching_assistant'].includes(req.user.primaryRole);

    const post = await DiscussionPost.create({
      threadId: thread.id,
      authorId: req.user.id,
      body: sanitizePlainText(body),
      isInstructorEndorsed: isInstructorOrTa
    });

    return res.status(201).json({
      success: true,
      message: 'Reply posted.',
      data: { post }
    });
  } catch (err) {
    return next(err);
  }
}

async function escalateOrResolveDiscussion(req, res, next) {
  try {
    const threadId = Number(req.params.threadId);
    const { isResolved, isEscalated, escalationNote } = req.body;

    const thread = await DiscussionThread.findByPk(threadId);
    if (!thread) throw new AppError('Discussion thread not found.', 404);

    await verifyClassAccess(req.user, thread.classId, {
      allowAdmin: true,
      allowInstructor: true,
      allowTA: true
    });

    await thread.update({
      isResolved: isResolved !== undefined ? Boolean(isResolved) : thread.isResolved,
      isEscalated: isEscalated !== undefined ? Boolean(isEscalated) : thread.isEscalated,
      escalationNote: escalationNote !== undefined ? escalationNote : thread.escalationNote
    });

    return res.status(200).json({
      success: true,
      message: 'Discussion status updated.',
      data: { thread }
    });
  } catch (err) {
    return next(err);
  }
}

// Private Messaging (Strict Conversation Membership Enforcement)
async function listConversations(req, res, next) {
  try {
    const memberLinks = await ConversationMember.findAll({
      where: { userId: req.user.id }
    });
    const convIds = memberLinks.map((m) => m.conversationId);

    const conversations = convIds.length
      ? await Conversation.findAll({
          where: { id: convIds },
          include: [
            {
              model: ConversationMember,
              as: 'members',
              include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email'] }]
            },
            {
              model: Message,
              as: 'messages',
              include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName'] }]
            }
          ],
          order: [['lastMessageAt', 'DESC']]
        })
      : [];

    return res.status(200).json({ success: true, data: { conversations } });
  } catch (err) {
    return next(err);
  }
}

async function startOrSendMessage(req, res, next) {
  const t = await sequelize.transaction();
  try {
    const { conversationId, recipientId, subject, body, classId } = req.body;
    if (!body || !String(body).trim()) {
      throw new AppError('Message body is required.', 400);
    }

    let conv;
    if (conversationId) {
      conv = await Conversation.findByPk(Number(conversationId), { transaction: t });
      if (!conv) throw new AppError('Conversation not found.', 404);

      const isMember = await ConversationMember.findOne({
        where: { conversationId: conv.id, userId: req.user.id },
        transaction: t
      });
      if (!isMember) {
        throw new AppError('Forbidden: You are not a member of this private conversation.', 403, 'PRIVATE_CONVERSATION_DENIED');
      }
      await conv.update({ lastMessageAt: new Date() }, { transaction: t });
    } else {
      if (!recipientId || !subject) {
        throw new AppError('recipientId and subject are required to start a new conversation.', 400);
      }
      conv = await Conversation.create({
        subject: sanitizePlainText(subject),
        classId: classId ? Number(classId) : null,
        createdBy: req.user.id,
        lastMessageAt: new Date()
      }, { transaction: t });

      await ConversationMember.bulkCreate([
        { conversationId: conv.id, userId: req.user.id, lastReadAt: new Date() },
        { conversationId: conv.id, userId: Number(recipientId), lastReadAt: null }
      ], { transaction: t });
    }

    const message = await Message.create({
      conversationId: conv.id,
      senderId: req.user.id,
      body: sanitizePlainText(body)
    }, { transaction: t });

    await t.commit();

    if (recipientId) {
      await createNotification({
        userId: Number(recipientId),
        type: 'message',
        title: `New Message from ${req.user.fullName}`,
        message: body.slice(0, 100),
        destinationUrl: '/messages'
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Message sent.',
      data: { conversationId: conv.id, message }
    });
  } catch (err) {
    await t.rollback();
    return next(err);
  }
}

// Notifications
async function listNotifications(req, res, next) {
  try {
    const notifications = await Notification.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 50
    });
    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      data: { notifications, unreadCount }
    });
  } catch (err) {
    return next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;
    if (id === 'all') {
      await Notification.update(
        { isRead: true, readAt: new Date() },
        { where: { userId: req.user.id, isRead: false } }
      );
      return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
    }

    const notif = await Notification.findOne({
      where: { id: Number(id), userId: req.user.id }
    });
    if (!notif) throw new AppError('Notification not found.', 404);

    await notif.update({ isRead: true, readAt: new Date() });
    return res.status(200).json({ success: true, data: { notification: notif } });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listAnnouncements,
  createAnnouncement,
  listDiscussions,
  createDiscussionThread,
  replyToDiscussionThread,
  escalateOrResolveDiscussion,
  listConversations,
  startOrSendMessage,
  listNotifications,
  markNotificationRead
};

