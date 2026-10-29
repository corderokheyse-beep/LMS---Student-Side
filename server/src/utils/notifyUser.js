const { Notification, User } = require('../models');
const { sendNotificationEmail } = require('./emailService');

async function createNotification({
  userId,
  type = 'system',
  title,
  message,
  destinationUrl = null
}) {
  if (!userId || !title || !message) return null;

  // Deduplicate identical unread notifications created within the last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  const existing = await Notification.findOne({
    where: {
      userId,
      type,
      title,
      isRead: false
    },
    order: [['createdAt', 'DESC']]
  });

  if (existing && new Date(existing.createdAt) >= fiveMinAgo) {
    return existing;
  }

  let emailStatus = 'not_requested';
  const user = await User.findByPk(userId);
  if (user && user.notificationPreferences?.email) {
    const emailRes = await sendNotificationEmail({
      to: user.email,
      subject: `[Aetheria Academy] ${title}`,
      text: message
    });
    emailStatus = emailRes.status;
  }

  return Notification.create({
    userId,
    type,
    title,
    message,
    destinationUrl,
    isRead: false,
    emailDeliveryStatus: emailStatus
  });
}

module.exports = { createNotification };

