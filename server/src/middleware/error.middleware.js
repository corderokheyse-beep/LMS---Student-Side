const { ZodError } = require('zod');
const logger = require('../config/logger');

class AppError extends Error {
  constructor(message, statusCode = 400, code = 'BAD_REQUEST', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof ZodError) {
    const formattedErrors = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    return res.status(422).json({
      success: false,
      code: 'VALIDATION_ERROR',
      message: formattedErrors[0]?.message || 'Validation failed',
      errors: formattedErrors
    });
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err.details ? { details: err.details } : {})
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    const fields = Object.keys(err.fields || {}).join(', ');
    return res.status(409).json({
      success: false,
      code: 'DUPLICATE_RECORD',
      message: `A record with the same ${fields || 'unique identifier'} already exists.`
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(422).json({
      success: false,
      code: 'DATABASE_VALIDATION_ERROR',
      message: err.errors?.[0]?.message || 'Database validation failed.'
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      code: 'FILE_TOO_LARGE',
      message: 'Uploaded file exceeds the maximum allowed size.'
    });
  }

  logger.error({ err, url: req.originalUrl, method: req.method }, 'Unhandled application error');

  return res.status(500).json({
    success: false,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred on the server.'
  });
}

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};

