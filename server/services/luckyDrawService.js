const db = require('../config/db');

class LuckyDrawService {
  /**
   * Performs a random draw from eligible checked-in participants.
   * Rules (ADR-0004 / REQ-06):
   *   - Only participants with status "Checked-in" are eligible
   *   - Staff/Speakers are excluded (future: role-based filtering)
   *   - Previous winners are excluded from the pool
   *   - Each participant can only win once (UNIQUE constraint on participant_id)
   * 
   * @param {number} eventId - The event ID to draw from
   * @param {string} prizeName - Name of the prize being awarded
   * @returns {Object} Winner participant details
   */
  async spin(eventId, prizeName) {
    if (!prizeName) {
      throw new Error('PRIZE_NAME_REQUIRED');
    }

    // 1. Build eligible pool: checked-in participants who haven't won yet
    const poolQuery = `
      SELECT p.participant_id AS id, p.fullname AS name, p.company, p.position, p.email
      FROM participants p
      INNER JOIN checkins c ON p.participant_id = c.participant_id
      WHERE p.event_id = $1
        AND p.participant_id NOT IN (
          SELECT w.participant_id FROM lucky_draw_winners w WHERE w.event_id = $1
        )
      ORDER BY RANDOM()
      LIMIT 1;
    `;
    const poolResult = await db.query(poolQuery, [eventId]);

    if (poolResult.rows.length === 0) {
      throw new Error('NO_ELIGIBLE_PARTICIPANTS');
    }

    const winner = poolResult.rows[0];

    // 2. Record winner in lucky_draw_winners table (atomic insert)
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO lucky_draw_winners (participant_id, event_id, prize_name)
        VALUES ($1, $2, $3)
        RETURNING winner_id, drawn_at;
      `;
      const insertResult = await client.query(insertQuery, [
        winner.id,
        eventId,
        prizeName
      ]);

      await client.query('COMMIT');

      console.log(`🎉 Lucky Draw Winner: ${winner.name} (ID: ${winner.id}) won "${prizeName}"`);

      return {
        winner_id: insertResult.rows[0].winner_id,
        participant_id: winner.id,
        name: winner.name,
        company: winner.company,
        position: winner.position,
        email: winner.email,
        prize_name: prizeName,
        drawn_at: insertResult.rows[0].drawn_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Lucky Draw transaction failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Returns the list of all winners for an event.
   */
  async getWinners(eventId) {
    const queryStr = `
      SELECT w.winner_id, w.participant_id, p.fullname AS name, p.company,
             w.prize_name, w.drawn_at
      FROM lucky_draw_winners w
      JOIN participants p ON w.participant_id = p.participant_id
      WHERE w.event_id = $1
      ORDER BY w.drawn_at ASC;
    `;
    const result = await db.query(queryStr, [eventId]);
    return result.rows;
  }

  /**
   * Returns eligible participants for lucky draw (checked-in, hasn't won).
   */
  async getEligibleParticipants(eventId) {
    const queryStr = `
      SELECT p.fullname AS name, p.company
      FROM participants p
      INNER JOIN checkins c ON p.participant_id = c.participant_id
      WHERE p.event_id = $1
        AND p.participant_id NOT IN (
          SELECT w.participant_id FROM lucky_draw_winners w WHERE w.event_id = $1
        )
    `;
    const result = await db.query(queryStr, [eventId]);
    return result.rows;
  }
}

module.exports = new LuckyDrawService();
