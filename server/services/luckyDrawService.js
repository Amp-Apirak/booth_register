const db = require('../config/db');

// pg_advisory_xact_lock(namespace, event_id): serialises draws of the same event
const LOCK_NAMESPACE = 60601;
// Expected refusals (answered with 400), not failures
const RULE_ERRORS = new Set(['PRIZE_NAME_REQUIRED', 'PRIZE_NOT_FOUND', 'PRIZE_INACTIVE', 'PRIZE_SOLD_OUT', 'NO_ELIGIBLE_PARTICIPANTS']);

class LuckyDrawService {
  /**
   * Performs a random draw from eligible checked-in participants.
   * Rules (ADR-0004 / REQ-06):
   *   - Only participants with status "Checked-in" are eligible
   *   - Staff/Speakers are excluded (future: role-based filtering)
   *   - Previous winners are excluded from the pool
   *   - Each participant can only win once (UNIQUE constraint on participant_id)
   *   - The prize must exist, be active and have units left (quantity − awarded)
   * 
   * @param {number} eventId - The event ID to draw from
   * @param {string} prizeName - Name of the prize being awarded
   * @returns {Object} Winner participant details
   */
  async spin(eventId, prizeName) {
    if (!prizeName) {
      throw new Error('PRIZE_NAME_REQUIRED');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      // One draw at a time per event, so two quick clicks can neither pick the same person
      // nor give a prize more times than its quantity
      await client.query('SELECT pg_advisory_xact_lock($1, $2)', [LOCK_NAMESPACE, eventId]);

      // 1. The prize must exist, be switched on and still have units left
      const prizeResult = await client.query(
        `SELECT p.name, p.quantity, p.is_active, p.image, p.description,
                (SELECT COUNT(*)::int FROM lucky_draw_winners w WHERE w.event_id = p.event_id AND w.prize_name = p.name) AS awarded
         FROM lucky_draw_prizes p
         WHERE p.event_id = $1 AND p.name = $2
         ORDER BY p.prize_id LIMIT 1`,
        [eventId, prizeName]
      );
      const prize = prizeResult.rows[0];
      if (!prize) throw new Error('PRIZE_NOT_FOUND');
      if (!prize.is_active) throw new Error('PRIZE_INACTIVE');
      if (prize.awarded >= prize.quantity) throw new Error('PRIZE_SOLD_OUT');

      // 2. Eligible pool: checked-in participants who haven't won yet
      const poolResult = await client.query(
        `SELECT p.participant_id AS id, p.fullname AS name, p.company, p.position,
                p.profile_picture, p.attendee_type
         FROM participants p
         INNER JOIN checkins c ON p.participant_id = c.participant_id
         WHERE p.event_id = $1
           AND p.participant_id NOT IN (
             SELECT w.participant_id FROM lucky_draw_winners w WHERE w.event_id = $1
           )
         ORDER BY RANDOM()
         LIMIT 1`,
        [eventId]
      );
      if (poolResult.rows.length === 0) throw new Error('NO_ELIGIBLE_PARTICIPANTS');
      const winner = poolResult.rows[0];

      // 3. Record the winner
      const insertResult = await client.query(
        `INSERT INTO lucky_draw_winners (participant_id, event_id, prize_name)
         VALUES ($1, $2, $3)
         RETURNING winner_id, drawn_at`,
        [winner.id, eventId, prizeName]
      );
      await client.query('COMMIT');

      console.log(`🎉 Lucky Draw Winner: ${winner.name} (ID: ${winner.id}) won "${prizeName}"`);

      // Shown on the public LED and control page: never email or phone
      return {
        winner_id: insertResult.rows[0].winner_id,
        participant_id: winner.id,
        name: winner.name,
        fullname: winner.name, // the Lucky Draw page reads `fullname`
        company: winner.company,
        position: winner.position,
        profile_picture: winner.profile_picture || null,
        attendee_type: winner.attendee_type || 'General',
        prize_name: prizeName,
        prize_image: prize.image || null,
        prize_description: prize.description || '',
        drawn_at: insertResult.rows[0].drawn_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (!RULE_ERRORS.has(error.message)) console.error('❌ Lucky Draw transaction failed:', error.message);
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
      SELECT w.winner_id, w.participant_id, p.fullname AS name, p.company, p.position,
             p.profile_picture, p.attendee_type,
             w.prize_name, w.drawn_at,
             pr.image AS prize_image, pr.description AS prize_description
      FROM lucky_draw_winners w
      JOIN participants p ON w.participant_id = p.participant_id
      LEFT JOIN LATERAL (
        SELECT image, description FROM lucky_draw_prizes
        WHERE event_id = w.event_id AND name = w.prize_name
        ORDER BY prize_id LIMIT 1
      ) pr ON TRUE
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
module.exports.RULE_ERRORS = RULE_ERRORS;
