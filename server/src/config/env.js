const path = require('path');
const dotenv = require('dotenv');

// Load .env from server directory or root directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  DB_DIALECT: process.env.DB_DIALECT || 'mysql',
  DB_HOST: process.env.DB_HOST || '127.0.0.1',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_NAME: process.env.DB_NAME || 'lms_production',
  DB_USER: process.env.DB_USER || 'lms_user',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_STORAGE: process.env.DB_STORAGE || path.resolve(__dirname, '../../data/lms_database.sqlite'),
  SESSION_SECRET: process.env.SESSION_SECRET || 'dev_only_fallback_secret_replace_in_production_immediately_9f8a7b6c5d4e3f2a1b',
  SESSION_NAME: process.env.SESSION_NAME || 'lms.sid',
  SESSION_MAX_AGE_MS: parseInt(process.env.SESSION_MAX_AGE_MS || '28800000', 10),
  CSRF_ENABLED: process.env.CSRF_ENABLED !== 'false',
  UPLOAD_DIR: process.env.UPLOAD_DIR
    ? path.resolve(process.cwd(), process.env.UPLOAD_DIR)
    : path.resolve(__dirname, '../../storage/uploads'),
  MAX_FILE_SIZE_BYTES: parseInt(process.env.MAX_FILE_SIZE_BYTES || '52428800', 10),
  SMTP_ENABLED: process.env.SMTP_ENABLED === 'true',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.example.edu',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  SMTP_FROM: process.env.SMTP_FROM || 'Aetheria Academy LMS <no-reply@academy.edu>',
  LOG_LEVEL: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info')
};

module.exports = env;

