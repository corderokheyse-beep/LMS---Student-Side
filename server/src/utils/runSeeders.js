const seeder = require('../seeders/20261028000001-seed-initial-data');
const runMigrations = require('./runMigrations');
const logger = require('../config/logger');

async function runSeeders() {
  await runMigrations();
  await seeder.up();
  logger.info('Database seeders verified and executed.');
}

if (require.main === module) {
  runSeeders()
    .then(() => {
      console.log('Seeders completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seeder failed:', err);
      process.exit(1);
    });
}

module.exports = runSeeders;

