const express = require('express');
const session = require('express-session');
const SequelizeStoreInit = require('connect-session-sequelize');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const env = require('./config/env');
const { sequelize } = require('./models');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware');

const SequelizeStore = SequelizeStoreInit(session.Store);

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// CORS configuration for authenticated session cookies
app.use(cors({
  origin: [
    env.CLIENT_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:8080'
  ],
  credentials: true
}));

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

const sessionStore = new SequelizeStore({
  db: sequelize,
  tableName: 'user_sessions',
  checkExpirationInterval: 15 * 60 * 1000,
  expiration: env.SESSION_MAX_AGE_MS
});

app.use(session({
  name: env.SESSION_NAME,
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: env.SESSION_MAX_AGE_MS
  }
}));

// Mount API routes (/api/v1 and /api alias)
app.use('/api/v1', apiRoutes);
app.use('/api', apiRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = { app, sessionStore };

