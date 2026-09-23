require('dotenv').config();
const { testConnection } = require('./config/db');

async function run() {
  try {
    console.log('Testing connection to PostgreSQL container...');
    await testConnection();
    console.log('✅ ISO 9002 Verification Check: Database connection verified successfully.');
    process.exit(0);
  } catch (error) {
    console.error('❌ ISO 9002 Verification Check: Connection failure detected.');
    console.error(error.message);
    process.exit(1);
  }
}

run();
