const db = require('../config/db');
const { DEFAULT_SETTINGS, SETTINGS_GROUPS } = require('../repositories/settingsRepository');
const { DEFAULT_TYPES } = require('../repositories/organizationTypeRepository');

// What an admin can put back to the state of a new event (Settings → Backup & reset, ADR-0017)
const SECTIONS = ['general', 'registration', 'organizations', 'agenda', 'prizes', 'attendees'];
// Same lock as lucky-draw spins (luckyDrawService): a draw never runs half-way through a reset
const LOCK_NAMESPACE = 60601;

const changedCount = (settings, keys) =>
  keys.filter((key) => (settings[key] ?? DEFAULT_SETTINGS[key]) !== DEFAULT_SETTINGS[key]).length;

class ResetService {
  /** How much each reset would remove (shown in the confirmation popups); null when the event does not exist */
  async summary(eventId) {
    const counts = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM organization_types WHERE event_id = $1)::int AS organization_types,
        (SELECT COUNT(*) FROM participants WHERE event_id = $1 AND organization_type_id IS NOT NULL)::int AS participants_with_organization_type,
        (SELECT COUNT(*) FROM agenda_items WHERE event_id = $1)::int AS agenda_items,
        (SELECT COUNT(*) FROM lucky_draw_prizes WHERE event_id = $1)::int AS prizes,
        (SELECT COUNT(*) FROM participants WHERE event_id = $1)::int AS participants,
        (SELECT COUNT(*) FROM checkins WHERE event_id = $1)::int AS checkins,
        (SELECT COUNT(*) FROM lucky_draw_winners WHERE event_id = $1)::int AS winners
      FROM events WHERE event_id = $1
    `, [eventId]);
    if (counts.rows.length === 0) return null;

    const settings = {};
    for (const row of (await db.query('SELECT key, value FROM settings')).rows) settings[row.key] = row.value;
    return {
      ...counts.rows[0],
      // fields that differ from their default value
      general_changed: changedCount(settings, SETTINGS_GROUPS.general),
      registration_changed: changedCount(settings, SETTINGS_GROUPS.registration),
      default_organization_types: DEFAULT_TYPES.length,
    };
  }

  /**
   * Puts the chosen sections back to their defaults in one transaction (all or nothing).
   * Staff/Admin accounts are never touched.
   * @returns {{ sections: string[], removed: Object, settings: Object }} rows removed per table, and the settings now in force
   */
  async reset(eventId, sections) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [LOCK_NAMESPACE, eventId]);
      const event = await client.query('SELECT 1 FROM events WHERE event_id = $1', [eventId]);
      if (event.rowCount === 0) throw new Error('EVENT_NOT_FOUND');

      const removed = {};
      const deleteAll = async (table) => (await client.query(`DELETE FROM ${table} WHERE event_id = $1`, [eventId])).rowCount;

      // Attendees go with their check-ins and lucky-draw wins
      if (sections.includes('attendees')) {
        removed.winners = await deleteAll('lucky_draw_winners');
        removed.checkins = await deleteAll('checkins');
        removed.participants = await deleteAll('participants');
      }
      // Attendees who stay lose their (deleted) type: organization_type_id is ON DELETE SET NULL
      if (sections.includes('organizations')) {
        removed.organization_types = await deleteAll('organization_types');
        for (const [index, [nameTh, nameEn, color]] of DEFAULT_TYPES.entries()) {
          await client.query(
            'INSERT INTO organization_types (event_id, name_th, name_en, color, sort_order) VALUES ($1, $2, $3, $4, $5)',
            [eventId, nameTh, nameEn, color, index + 1]
          );
        }
      }
      if (sections.includes('agenda')) removed.agenda_items = await deleteAll('agenda_items');
      // Past winners keep their prize name, so the draw results stay until the attendees are reset
      if (sections.includes('prizes')) removed.prizes = await deleteAll('lucky_draw_prizes');

      const settings = {};
      for (const group of ['general', 'registration']) {
        if (!sections.includes(group)) continue;
        for (const key of SETTINGS_GROUPS[group]) {
          await client.query(
            'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
            [key, DEFAULT_SETTINGS[key]]
          );
          settings[key] = DEFAULT_SETTINGS[key];
        }
      }

      await client.query('COMMIT');
      return { sections, removed, settings };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new ResetService();
module.exports.SECTIONS = SECTIONS;
