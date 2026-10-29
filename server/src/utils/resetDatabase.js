const { sequelize } = require('../models');
const migration = require('../migrations/20261028000001-create-lms-schema');
const seeder = require('../seeders/20261028000001-seed-initial-data');

async function resetDatabase() {
  const queryInterface = sequelize.getQueryInterface();
  await migration.down(queryInterface);
  await migration.up(queryInterface);
  await seeder.up();
}

if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('Database reset and re-seeded successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database reset failed:', err);
      process.exit(1);
    });
}

module.exports = resetDatabase;

