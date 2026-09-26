const db = require('../config/db');
const participantRepository = require('../repositories/participantRepository');

class CheckinService {
  /**
   * Performs check-in validation and records database transaction.
   * 
   * @param {string} ticketCode - The scanned ticket QR code string
   * @param {number} [scannedBy] - user_id of the staff login that scanned (audit)
   * @returns {Object} Updated participant profile
   */
  async checkIn(ticketCode, scannedBy = null) {
    if (!ticketCode) {
      throw new Error('TICKET_CODE_REQUIRED');
    }

    // 1. Fetch participant profile associated with this ticket
    const participant = await participantRepository.getByTicketCode(ticketCode);
    if (!participant) {
      throw new Error('TICKET_NOT_FOUND');
    }

    // 2. Validate current check-in state
    if (participant.status === 'Checked-in') {
      throw new Error('ALREADY_CHECKED_IN');
    }

    // 3. Initiate Database Transaction to write check-in log
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // Insert log entry into checkins table (automatically resolves status as Checked-in)
      // scanned_by stays NULL when the staff account no longer exists (its token may still be valid)
      const insertLogQuery = `
        INSERT INTO checkins (participant_id, event_id, checked_in_at, scanned_by)
        VALUES ($1, $2, NOW(), (SELECT user_id FROM users WHERE user_id = $3))
        RETURNING checkin_id, checked_in_at;
      `;
      const logResult = await client.query(insertLogQuery, [
        participant.id,
        participant.event_id || 1,
        Number.isInteger(scannedBy) ? scannedBy : null
      ]);

      await client.query('COMMIT');

      console.log(`✅ Success check-in transaction: Participant ID ${participant.id} (Log ID: ${logResult.rows[0].checkin_id})`);
      
      // Return updated participant state
      return {
        ...participant,
        status: 'Checked-in',
        checked_in_at: logResult.rows[0].checked_in_at
      };
    } catch (error) {
      await client.query('ROLLBACK');
      // two gates scanned the same ticket at the same moment: the database kept the first one
      if (error.code === '23505') throw new Error('ALREADY_CHECKED_IN');
      console.error('❌ Failed check-in transaction, rolling back changes:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = new CheckinService();
