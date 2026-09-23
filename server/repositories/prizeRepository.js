const db = require('../config/db');

class PrizeRepository {
  async initTable() {
    await db.query(`
      CREATE TABLE IF NOT EXISTS lucky_draw_prizes (
        prize_id SERIAL PRIMARY KEY,
        event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(80) DEFAULT '',
        description TEXT DEFAULT '',
        image TEXT,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await db.query('CREATE INDEX IF NOT EXISTS idx_lucky_draw_prizes_event ON lucky_draw_prizes(event_id, sort_order, prize_id)');
    await db.query(`
      INSERT INTO lucky_draw_prizes (event_id, name, code, description, quantity, sort_order)
      SELECT e.event_id, preset.name, preset.code, preset.description, 1, preset.sort_order
      FROM events e
      CROSS JOIN (VALUES
        ('iPhone 16 Pro Max 256GB','GRAND-01','รางวัลใหญ่ประจำงาน',0),
        ('iPad Pro M4 (13-inch)','PRIZE-02','ของรางวัลพิเศษสำหรับผู้เข้าร่วมงาน',1),
        ('Apple Watch Ultra 2','PRIZE-03','Smart Watch รุ่นพิเศษ',2),
        ('AirPods Max (Space Gray)','PRIZE-04','หูฟังไร้สายระดับพรีเมียม',3),
        ('MacBook Air 15-inch M3','PRIZE-05','Notebook สำหรับการทำงานยุคใหม่',4),
        ('Sony WH-1000XM5 Wireless Headphones','PRIZE-06','หูฟังตัดเสียงรบกวนไร้สาย',5)
      ) AS preset(name, code, description, sort_order)
      WHERE NOT EXISTS (SELECT 1 FROM lucky_draw_prizes p WHERE p.event_id = e.event_id)
    `);
  }

  async findByEvent(eventId, activeOnly = false) {
    const result = await db.query(`
      SELECT p.*,
        (SELECT COUNT(*)::int FROM lucky_draw_winners w WHERE w.event_id = p.event_id AND w.prize_name = p.name) AS awarded_count
      FROM lucky_draw_prizes p
      WHERE p.event_id = $1 ${activeOnly ? 'AND p.is_active = TRUE' : ''}
      ORDER BY p.sort_order, p.prize_id
    `, [eventId]);
    return result.rows.map(row => ({ ...row, remaining_count: Math.max(0, row.quantity - row.awarded_count) }));
  }

  async create(eventId, data) {
    const result = await db.query(`
      INSERT INTO lucky_draw_prizes (event_id, name, code, description, image, quantity, is_active, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6,$7,
        COALESCE(NULLIF($8::int, 0), (SELECT COALESCE(MAX(sort_order), 0) + 1 FROM lucky_draw_prizes WHERE event_id = $1)))
      RETURNING *
    `, [eventId, data.name, data.code || '', data.description || '', data.image || null, data.quantity || 1, data.is_active !== false, data.sort_order || 0]);
    return result.rows[0];
  }

  async update(eventId, prizeId, data) {
    const result = await db.query(`
      UPDATE lucky_draw_prizes SET name=$3, code=$4, description=$5, image=$6, quantity=$7,
        is_active=$8, sort_order=$9, updated_at=NOW()
      WHERE event_id=$1 AND prize_id=$2 RETURNING *
    `, [eventId, prizeId, data.name, data.code || '', data.description || '', data.image || null, data.quantity || 1, data.is_active !== false, data.sort_order || 0]);
    return result.rows[0];
  }

  /** Sets sort_order to the position of each id in `orderedIds` (1-based). */
  async reorder(eventId, orderedIds) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < orderedIds.length; i++) {
        await client.query(
          'UPDATE lucky_draw_prizes SET sort_order=$3, updated_at=NOW() WHERE event_id=$1 AND prize_id=$2',
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

  /**
   * Excel import in one transaction. Rows match an existing prize by code, then by name;
   * matches are updated, others created (appended to the draw order). Nothing is deleted.
   * A row without `image` keeps the existing picture.
   */
  async importMany(eventId, rows) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const existing = (await client.query(
        'SELECT prize_id, name, code FROM lucky_draw_prizes WHERE event_id=$1', [eventId]
      )).rows;
      const byCode = new Map(existing.filter(p => p.code).map(p => [p.code.toLowerCase(), p.prize_id]));
      const byName = new Map(existing.map(p => [p.name.toLowerCase(), p.prize_id]));
      let nextOrder = (await client.query(
        'SELECT COALESCE(MAX(sort_order), 0) AS max FROM lucky_draw_prizes WHERE event_id=$1', [eventId]
      )).rows[0].max;

      let created = 0;
      let updated = 0;
      for (const row of rows) {
        const matchId = (row.code && byCode.get(row.code.toLowerCase())) || byName.get(row.name.toLowerCase());
        const sortOrder = row.sort_order || null;
        if (matchId) {
          await client.query(`
            UPDATE lucky_draw_prizes SET name=$3, code=$4, description=$5, image=COALESCE($6, image),
              quantity=$7, is_active=$8, sort_order=COALESCE($9, sort_order), updated_at=NOW()
            WHERE event_id=$1 AND prize_id=$2
          `, [eventId, matchId, row.name, row.code, row.description, row.image || null, row.quantity, row.is_active, sortOrder]);
          updated++;
        } else {
          const inserted = await client.query(`
            INSERT INTO lucky_draw_prizes (event_id, name, code, description, image, quantity, is_active, sort_order)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING prize_id
          `, [eventId, row.name, row.code, row.description, row.image || null, row.quantity, row.is_active, sortOrder || ++nextOrder]);
          const id = inserted.rows[0].prize_id;
          if (row.code) byCode.set(row.code.toLowerCase(), id);
          byName.set(row.name.toLowerCase(), id);
          created++;
        }
      }
      await client.query('COMMIT');
      return { created, updated };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async delete(eventId, prizeId) {
    return (await db.query('DELETE FROM lucky_draw_prizes WHERE event_id=$1 AND prize_id=$2 RETURNING prize_id', [eventId, prizeId])).rows[0];
  }
}

module.exports = new PrizeRepository();
