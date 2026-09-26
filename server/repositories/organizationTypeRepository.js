const db = require('../config/db');

// Chart-safe color slots (validated categorical palette, see docs/adr/0012). The client
// resolves each slot to a light/dark hex, so only the slot name is stored.
const COLOR_SLOTS = ['blue', 'red', 'green', 'violet', 'orange', 'aqua', 'yellow', 'magenta'];

// Default organization types for a new event (from the organizer's registration form)
const DEFAULT_TYPES = [
  ['หน่วยงานราชการ / รัฐวิสาหกิจ', 'Government agency / State enterprise', 'blue'],
  ['หน่วยงานเอกชน / บริษัท', 'Private company', 'red'],
  ['ลูกค้ากลุ่มธุรกิจ / ลูกค้าราชการ / อุตสาหกรรม / คู่ค้า', 'Business & government customer / Industry / Partner', 'green'],
  ['สถานศึกษา', 'Educational institution', 'violet'],
  ['ประชาชนทั่วไป', 'General public', 'orange'],
  ['พนักงาน MEA', 'MEA employee', 'aqua'],
];

class OrganizationTypeRepository {
  /**
   * Creates the table, links participants to it and seeds the defaults once per event.
   * Runs on every server start, so existing databases are migrated in place.
   */
  async initTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS organization_types (
        org_type_id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        name_th VARCHAR(150) NOT NULL,
        name_en VARCHAR(150) NOT NULL DEFAULT '',
        color VARCHAR(20) NOT NULL DEFAULT 'blue',
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_organization_types_event ON organization_types(event_id, sort_order, org_type_id)');
    await db.query(`
      ALTER TABLE participants
        ADD COLUMN IF NOT EXISTS organization_type_id INTEGER REFERENCES organization_types(org_type_id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS organization_type_other VARCHAR(150)
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_participants_org_type ON participants(organization_type_id)');

    const values = [];
    const rows = DEFAULT_TYPES.map(([th, en, color], i) => {
      values.push(th, en, color, i + 1);
      const b = i * 4;
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
    });
    await db.query(`
      INSERT INTO organization_types (event_id, name_th, name_en, color, sort_order)
      SELECT e.event_id, d.name_th, d.name_en, d.color, d.sort_order::int
      FROM events e
      CROSS JOIN (VALUES ${rows.join(', ')}) AS d(name_th, name_en, color, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM organization_types t WHERE t.event_id = e.event_id)
    `, values);
  }

  async findByEvent(eventId, activeOnly = false) {
    const result = await db.query(`
      SELECT t.org_type_id AS id, t.event_id, t.name_th, t.name_en, t.color, t.sort_order, t.is_active,
        (SELECT COUNT(*)::int FROM participants p WHERE p.organization_type_id = t.org_type_id) AS usage_count
      FROM organization_types t
      WHERE t.event_id = $1 ${activeOnly ? 'AND t.is_active = TRUE' : ''}
      ORDER BY t.sort_order, t.org_type_id
    `, [eventId]);
    return result.rows;
  }

  async findById(eventId, id) {
    const result = await db.query(
      'SELECT org_type_id AS id, name_th, name_en, color, sort_order, is_active FROM organization_types WHERE event_id = $1 AND org_type_id = $2',
      [eventId, id]
    );
    return result.rows[0] || null;
  }

  async create(eventId, data) {
    const result = await db.query(`
      INSERT INTO organization_types (event_id, name_th, name_en, color, is_active, sort_order)
      VALUES ($1, $2, $3, $4, $5, (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM organization_types WHERE event_id = $1))
      RETURNING org_type_id AS id, event_id, name_th, name_en, color, sort_order, is_active
    `, [eventId, data.name_th, data.name_en, data.color, data.is_active]);
    return { ...result.rows[0], usage_count: 0 };
  }

  async update(eventId, id, data) {
    const result = await db.query(`
      UPDATE organization_types SET name_th = $3, name_en = $4, color = $5, is_active = $6, updated_at = NOW()
      WHERE event_id = $1 AND org_type_id = $2
      RETURNING org_type_id AS id, event_id, name_th, name_en, color, sort_order, is_active
    `, [eventId, id, data.name_th, data.name_en, data.color, data.is_active]);
    return result.rows[0] || null;
  }

  async usageCount(id) {
    const result = await db.query('SELECT COUNT(*)::int AS n FROM participants WHERE organization_type_id = $1', [id]);
    return result.rows[0].n;
  }

  async delete(eventId, id) {
    const result = await db.query('DELETE FROM organization_types WHERE event_id = $1 AND org_type_id = $2 RETURNING org_type_id', [eventId, id]);
    return result.rows[0] || null;
  }

  /** Sets sort_order to the position of each id in `orderedIds` (1-based). */
  async reorder(eventId, orderedIds) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE organization_types SET sort_order = $3, updated_at = NOW() WHERE event_id = $1 AND org_type_id = $2',
          [eventId, orderedIds[i], i + 1]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new OrganizationTypeRepository();
module.exports.COLOR_SLOTS = COLOR_SLOTS;
module.exports.DEFAULT_TYPES = DEFAULT_TYPES;
