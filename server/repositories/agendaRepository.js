const { query } = require('../config/db');

class AgendaRepository {
  async initTable() {
    await query(`
      CREATE TABLE IF NOT EXISTS agenda_items (
        agenda_item_id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        speaker VARCHAR(255) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        start_at TIMESTAMP WITH TIME ZONE NOT NULL,
        end_at TIMESTAMP WITH TIME ZONE NOT NULL,
        speaker_image TEXT,
        is_highlight BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT chk_agenda_time_range CHECK (end_at > start_at)
      );
    `);
    await query("ALTER TABLE agenda_items ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';");
    // Repair rows imported by the former time-only Excel parser. It stored the
    // Excel epoch (1899) and Bangkok's historical UTC offset shifted the
    // displayed minute; moving it to the configured event date restores it.
    await query(`
      UPDATE agenda_items AS agenda
      SET start_at = (
            (setting.value::timestamp)::date
            + (agenda.start_at AT TIME ZONE 'Asia/Bangkok' + INTERVAL '1 minute')::time
          ) AT TIME ZONE 'Asia/Bangkok',
          end_at = (
            (setting.value::timestamp)::date
            + (agenda.end_at AT TIME ZONE 'Asia/Bangkok' + INTERVAL '1 minute')::time
          ) AT TIME ZONE 'Asia/Bangkok'
      FROM settings AS setting
      WHERE setting.key = 'event_start'
        AND setting.value <> ''
        AND EXTRACT(YEAR FROM agenda.start_at AT TIME ZONE 'Asia/Bangkok') <= 1900;
    `);
    await query('CREATE INDEX IF NOT EXISTS idx_agenda_items_event_time ON agenda_items(event_id, start_at, end_at);');
    await query(`
      INSERT INTO agenda_items (event_id, title, speaker, location, start_at, end_at, sort_order)
      SELECT s.event_id, s.title, COALESCE(s.speaker_name, ''), '', s.start_time, s.end_time,
             ROW_NUMBER() OVER (PARTITION BY s.event_id ORDER BY s.start_time) - 1
      FROM sessions s
      WHERE NOT EXISTS (
        SELECT 1 FROM agenda_items a WHERE a.event_id = s.event_id
      );
    `);
  }

  async getByEvent(eventId) {
    const result = await query(`
      SELECT agenda_item_id AS id, event_id, title, description, speaker, location,
             start_at, end_at, speaker_image, is_highlight, sort_order
      FROM agenda_items
      WHERE event_id = $1
      ORDER BY start_at ASC, sort_order ASC, agenda_item_id ASC;
    `, [eventId]);
    return result.rows;
  }

  async replaceForEvent(eventId, items) {
    const db = require('../config/db');
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM agenda_items WHERE event_id = $1', [eventId]);

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        await client.query(`
          INSERT INTO agenda_items (
            event_id, title, description, speaker, location, start_at, end_at,
            speaker_image, is_highlight, sort_order
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10);
        `, [
          eventId,
          item.title,
          item.description || '',
          item.speaker || '',
          item.location || '',
          item.start_at,
          item.end_at,
          item.speaker_image || null,
          item.is_highlight === true,
          index,
        ]);
      }

      await client.query('COMMIT');
      return this.getByEvent(eventId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new AgendaRepository();
