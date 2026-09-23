const { Pool } = require('pg');

// Credentials must come from the environment (server/.env) — never hardcode them
for (const key of ['DB_USER', 'DB_PASSWORD']) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key} (see server/.env.example)`);
  }
}

// Retrieve DB Configurations from environment variables
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'booth_register_db',
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections in pool
  idleTimeoutMillis: 30000,                      // Time client remains idle before closing
  connectionTimeoutMillis: 2000                  // Fail if unable to connect in 2 seconds
};

console.log(`📡 Connecting to PostgreSQL at ${dbConfig.host}:${dbConfig.port}...`);
const pool = new Pool(dbConfig);

// Global Error Handler for Idle Clients in Pool
pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle PostgreSQL client:', err.message);
});

/**
 * Standard utility query wrapper.
 * Ensures parameterized values are sanitized to block SQL Injection.
 */
function query(text, params) {
  return pool.query(text, params);
}

/**
 * Database health connection check.
 * Used for system compliance validation.
 */
async function testConnection() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT NOW()');
    console.log(`✅ Database connection established successfully at: ${res.rows[0].now}`);
    return true;
  } catch (err) {
    console.error('❌ Failed to connect to PostgreSQL database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query,
  testConnection
};
