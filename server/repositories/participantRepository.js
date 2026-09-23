const db = require('../config/db');

class ParticipantRepository {
  /**
   * Retrieves all registered participants with computed check-in status.
   */
  async getAll() {
    const queryStr = `
      SELECT p.participant_id AS id, p.event_id, p.fullname AS name, p.company, p.position, p.email, p.phone, p.ticket_code, p.registered_at, p.profile_picture, p.attendee_type,
             CASE WHEN c.checkin_id IS NOT NULL THEN 'Checked-in' ELSE 'Pending' END AS status
      FROM participants p
      LEFT JOIN checkins c ON p.participant_id = c.participant_id
      ORDER BY p.participant_id ASC;
    `;
    const result = await db.query(queryStr);
    return result.rows;
  }

  /**
   * Finds a participant by their unique ID with computed check-in status.
   */
  async getById(id) {
    const queryStr = `
      SELECT p.participant_id AS id, p.event_id, p.fullname AS name, p.company, p.position, p.email, p.phone, p.ticket_code, p.registered_at, p.profile_picture, p.attendee_type,
             CASE WHEN c.checkin_id IS NOT NULL THEN 'Checked-in' ELSE 'Pending' END AS status
      FROM participants p
      LEFT JOIN checkins c ON p.participant_id = c.participant_id
      WHERE p.participant_id = $1;
    `;
    const result = await db.query(queryStr, [id]);
    return result.rows[0] || null;
  }

  /**
   * Finds a participant by their unique ticket code with computed check-in status.
   * Includes event_id to ensure check-in references match.
   */
  async getByTicketCode(ticketCode) {
    const queryStr = `
      SELECT p.participant_id AS id, p.event_id, p.fullname AS name, p.company, p.position, p.email, p.phone, p.ticket_code, p.registered_at, p.profile_picture, p.attendee_type,
             CASE WHEN c.checkin_id IS NOT NULL THEN 'Checked-in' ELSE 'Pending' END AS status
      FROM participants p
      LEFT JOIN checkins c ON p.participant_id = c.participant_id
      WHERE p.ticket_code = $1;
    `;
    const result = await db.query(queryStr, [ticketCode]);
    return result.rows[0] || null;
  }

  /**
   * Creates a new participant record inside participants table.
   */
  async create(data) {
    const queryStr = `
      INSERT INTO participants (event_id, ticket_code, fullname, company, position, email, phone, profile_picture, attendee_type) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
      RETURNING participant_id AS id, event_id, fullname AS name, company, position, email, phone, ticket_code, registered_at, profile_picture, attendee_type;
    `;
    const values = [
      data.event_id || 1, // Default to Tech Innovation Summit 2026
      data.ticket_code,
      data.name,
      data.company,
      data.position || '',
      data.email || '',
      data.phone || '',
      data.profile_picture || null,
      data.attendee_type || 'General'
    ];
    const result = await db.query(queryStr, values);
    
    // Add default status for new participant
    return {
      ...result.rows[0],
      status: 'Pending'
    };
  }

  /**
   * Updates an existing participant's credentials.
   */
  async update(id, data) {
    const queryStr = `
      UPDATE participants 
      SET fullname = $1, company = $2, position = $3, email = $4, phone = $5, profile_picture = $6, attendee_type = $7
      WHERE participant_id = $8
      RETURNING participant_id AS id, event_id, fullname AS name, company, position, email, phone, registered_at, profile_picture, attendee_type;
    `;
    const values = [
      data.name,
      data.company,
      data.position,
      data.email,
      data.phone,
      data.profile_picture,
      data.attendee_type,
      id
    ];
    const result = await db.query(queryStr, values);
    if (!result.rows[0]) return null;

    // Fetch fresh status in case it was checked in
    const freshRecord = await this.getById(id);
    return freshRecord;
  }

  /**
   * Deletes a participant record by ID.
   */
  async delete(id) {
    const queryStr = `
      DELETE FROM participants 
      WHERE participant_id = $1
      RETURNING participant_id AS id;
    `;
    const result = await db.query(queryStr, [id]);
    return result.rows[0] || null;
  }
}

module.exports = new ParticipantRepository();
