const pino = require('pino');
const env = require('./env');

const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.cookie',
      'req.headers.authorization',
      'password',
      'passwordHash',
      'password_hash',
      'newPassword',
      'currentPassword',
      'token'
    ],
    censor: '[REDACTED]'
  },
  timestamp: pino.stdTimeFunctions.isoTime
});

module.exports = logger;

