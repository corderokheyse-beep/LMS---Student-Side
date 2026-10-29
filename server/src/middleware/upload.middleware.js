const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');
const { AppError } = require('./error.middleware');

if (!fs.existsSync(env.UPLOAD_DIR)) {
  fs.mkdirSync(env.UPLOAD_DIR, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.doc',
  '.docx',
  '.ppt',
  '.pptx',
  '.xls',
  '.xlsx',
  '.csv',
  '.txt',
  '.md',
  '.zip',
  '.pkt',
  '.py',
  '.js',
  '.jsx',
  '.ts',
  '.sql',
  '.json',
  '.yaml',
  '.yml',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.mp4'
]);

const DISALLOWED_MIME_PREFIXES = [
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-bat',
  'text/html'
];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const randomId = crypto.randomBytes(16).toString('hex');
    cb(null, `${Date.now()}-${randomId}${ext}`);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return cb(new AppError(`File extension "${ext}" is not permitted.`, 400, 'INVALID_FILE_TYPE'));
  }

  if (DISALLOWED_MIME_PREFIXES.some((blocked) => mime.startsWith(blocked))) {
    return cb(new AppError(`MIME type "${mime}" is blocked for security reasons.`, 400, 'BLOCKED_MIME_TYPE'));
  }

  return cb(null, true);
}

/**
 * Inspects uploaded file header bytes to reject disguised executables (MZ / ELF / HTML script)
 */
function verifyUploadedFileSafety(filePath) {
  if (!fs.existsSync(filePath)) return false;
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(64);
    const bytesRead = fs.readSync(fd, buffer, 0, 64, 0);
    if (bytesRead >= 2) {
      // Windows PE executable "MZ"
      if (buffer[0] === 0x4d && buffer[1] === 0x5a) return false;
    }
    if (bytesRead >= 4) {
      // Linux ELF binary "\x7FELF"
      if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return false;
    }
    const headText = buffer.subarray(0, bytesRead).toString('utf8').toLowerCase();
    if (headText.includes('<script') || headText.includes('<!doctype html')) {
      return false;
    }
    return true;
  } finally {
    fs.closeSync(fd);
  }
}

const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: env.MAX_FILE_SIZE_BYTES
  },
  fileFilter
});

module.exports = {
  uploadMiddleware,
  verifyUploadedFileSafety
};

