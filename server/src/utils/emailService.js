const nodemailer = require('nodemailer');
const env = require('../config/env');
const logger = require('../config/logger');

let transporter = null;

if (env.SMTP_ENABLED && env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined
  });
}

async function sendNotificationEmail({ to, subject, text, html, retries = 2 }) {
  if (!env.SMTP_ENABLED || !transporter) {
    logger.debug({ to, subject }, 'SMTP_ENABLED is false; skipping external email dispatch (in-app notification recorded)');
    return { sent: false, status: 'not_requested', reason: 'SMTP integration disabled in environment' };
  }

  let attempt = 0;
  while (attempt <= retries) {
    try {
      attempt += 1;
      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject,
        text,
        html
      });
      return { sent: true, status: 'sent', attempts: attempt };
    } catch (err) {
      logger.warn({ err, to, attempt }, 'Email delivery attempt failed');
      if (attempt > retries) {
        return { sent: false, status: 'failed', reason: err.message };
      }
    }
  }
  return { sent: false, status: 'failed' };
}

module.exports = { sendNotificationEmail };

