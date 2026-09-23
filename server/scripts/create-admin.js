#!/usr/bin/env node
/**
 * Create or reset a staff login.
 *
 *   cd server
 *   node scripts/create-admin.js <username> <password> [Admin|Staff] [full name]
 *
 * Uses DB settings from server/.env. If the username exists its password,
 * role and name are replaced; otherwise a new active user is created.
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../config/db');

(async () => {
  const [username, password, role = 'Admin', ...nameParts] = process.argv.slice(2);
  if (!username || !password) {
    console.error('Usage: node scripts/create-admin.js <username> <password> [Admin|Staff] [full name]');
    process.exit(1);
  }
  if (!['Admin', 'Staff'].includes(role)) {
    console.error('Role must be Admin or Staff');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }
  const fullname = nameParts.join(' ') || username;
  const hash = await bcrypt.hash(password, 10);
  const { rows } = await db.query(
    `INSERT INTO users (username, password_hash, fullname, role, active_status)
     VALUES ($1, $2, $3, $4, TRUE)
     ON CONFLICT (username) DO UPDATE
       SET password_hash = EXCLUDED.password_hash, fullname = EXCLUDED.fullname,
           role = EXCLUDED.role, active_status = TRUE, updated_at = NOW()
     RETURNING user_id, (xmax = 0) AS created`,
    [username, hash, fullname, role]
  );
  console.log(`${rows[0].created ? 'Created' : 'Updated'} ${role} "${username}" (user_id ${rows[0].user_id})`);
  await db.pool.end();
})().catch(async (err) => {
  console.error('Failed:', err.message);
  await db.pool.end().catch(() => {});
  process.exit(1);
});
