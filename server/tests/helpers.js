const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

/** The tables the server creates or migrates on start (schema.sql only runs on a new database) */
async function initTables() {
  for (const name of ['settingsRepository', 'agendaRepository', 'prizeRepository', 'organizationTypeRepository']) {
    await require(`../repositories/${name}`).initTable();
  }
}

/** A real staff account (tests remove it with deleteUsers) */
async function createUser(username, role, password = 'Jest-Password-123') {
  const hash = await bcrypt.hash(password, 4);
  const { rows } = await db.query(
    `INSERT INTO users (username, password_hash, fullname, role, active_status)
     VALUES ($1, $2, $3, $4, true)
     ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, active_status = true
     RETURNING user_id`,
    [username, hash, `Jest ${role}`, role]
  );
  return rows[0].user_id;
}

async function deleteUsers(usernames) {
  await db.query('DELETE FROM users WHERE username = ANY($1)', [usernames]);
}

const tokenFor = (userId, username, role) =>
  jwt.sign({ user_id: userId, username, role, fullname: username }, JWT_SECRET, { expiresIn: '10m' });

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

/** An active organization type id (public sign-up requires one) */
async function anyOrganizationTypeId() {
  const { rows } = await db.query('SELECT org_type_id FROM organization_types WHERE event_id = 1 AND is_active ORDER BY sort_order LIMIT 1');
  return rows[0].org_type_id;
}

/** A prize only the test uses (removed together with its winners by deletePrize) */
async function createPrize(name, quantity = 1, isActive = true) {
  const { rows } = await db.query(
    `INSERT INTO lucky_draw_prizes (event_id, name, code, description, image, quantity, is_active, sort_order)
     VALUES (1, $1, '', '', '', $2, $3, 9999) RETURNING prize_id`,
    [name, quantity, isActive]
  );
  return rows[0].prize_id;
}

async function deletePrize(name) {
  await db.query('DELETE FROM lucky_draw_winners WHERE event_id = 1 AND prize_name = $1', [name]);
  await db.query('DELETE FROM lucky_draw_prizes WHERE event_id = 1 AND name = $1', [name]);
}

/** Removes attendees (and their check-ins and wins) by company name */
async function deleteParticipantsOf(company) {
  await db.query('DELETE FROM lucky_draw_winners WHERE participant_id IN (SELECT participant_id FROM participants WHERE company = $1)', [company]);
  await db.query('DELETE FROM checkins WHERE participant_id IN (SELECT participant_id FROM participants WHERE company = $1)', [company]);
  await db.query('DELETE FROM participants WHERE company = $1', [company]);
}

module.exports = {
  initTables, createUser, deleteUsers, tokenFor, bearer, anyOrganizationTypeId,
  createPrize, deletePrize, deleteParticipantsOf,
};
