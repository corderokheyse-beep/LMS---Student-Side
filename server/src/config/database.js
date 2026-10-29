const path = require('path');
const fs = require('fs');
const { Sequelize } = require('sequelize');
const env = require('./env');
const logger = require('./logger');

const dataDir = path.dirname(env.DB_STORAGE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const configByEnv = {
  development: {
    dialect: env.DB_DIALECT,
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    storage: env.DB_STORAGE,
    logging: (msg) => logger.debug(msg),
    define: {
      underscored: true,
      timestamps: true
    }
  },
  test: {
    dialect: 'sqlite',
    storage: ':memory:',
    logging: false,
    define: {
      underscored: true,
      timestamps: true
    }
  },
  production: {
    dialect: env.DB_DIALECT || 'mysql',
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_NAME,
    username: env.DB_USER,
    password: env.DB_PASSWORD,
    storage: env.DB_STORAGE,
    logging: false,
    pool: {
      max: 20,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    define: {
      underscored: true,
      timestamps: true
    }
  }
};

const currentConfig = configByEnv[env.NODE_ENV] || configByEnv.development;

let sequelize;
if (currentConfig.dialect === 'sqlite') {
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: currentConfig.storage,
    logging: currentConfig.logging,
    define: currentConfig.define
  });
} else {
  sequelize = new Sequelize(
    currentConfig.database,
    currentConfig.username,
    currentConfig.password,
    {
      host: currentConfig.host,
      port: currentConfig.port,
      dialect: currentConfig.dialect,
      logging: currentConfig.logging,
      pool: currentConfig.pool,
      define: currentConfig.define
    }
  );
}

module.exports = {
  sequelize,
  Sequelize,
  ...configByEnv
};

