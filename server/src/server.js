const env = require('./config/env');
const logger = require('./config/logger');
const { sequelize } = require('./models');
const { app, sessionStore } = require('./app');
const runMigrations = require('./utils/runMigrations');
const runSeeders = require('./utils/runSeeders');

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info({ dialect: sequelize.getDialect() }, 'Database connection established successfully.');

    await sessionStore.sync();
    await runMigrations();
    await runSeeders();

    app.listen(env.PORT, () => {
      logger.info({ port: env.PORT, env: env.NODE_ENV }, `Aetheria Academy LMS Server listening on port ${env.PORT}`);
      console.log(`Server running on http://localhost:${env.PORT}`);
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to initialize database and start server');
    console.error('Startup error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  startServer();
}

module.exports = startServer;

