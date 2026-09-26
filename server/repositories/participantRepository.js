const db = require('../config/db');

class ParticipantRepository {
  /**
   * Retrieves all registered participants with computed check-in status.
   */
  async getAll() {
    const queryStr = `
      SELECT p.participant_id AS id, p.event_id, p.fullname AS name, p.company, p.position, p.email, p.phone, p.ticket_code, p.registered_at, p.profile_picture, p.attendee_type,
             p.organization_type_id, p.organization_type_other, c.checked_in_at,
             CASE WHEN c.checkin_id IS NOT NULL THEN 'Checked-in' ELSE 'Pending' END AS status
      FROM participants p
      LEFT JOIN checkins c ON p.participant_id = c.participant_id
      ORDER BY p.participant_id ASC;
    `;
    const result = await db.query(queryStr);
    return result.rows;
  }

  /**
   * Registered / checked-in counts for the live numbers (without loading attendee records).
   */
  async countSummary() {
    const result = await db.query(`
      SELECT COUNT(DISTINCT p.participant_id)::int AS registered,
             COUNT(DISTINCT c.participant_id)::int AS checked_in
      FROM participants p
      LEFT JOIN checkins c ON p.participant_id = c.participant_id;
    `);
    return result.rows[0];
  }

  /**
   * Finds a participant by their unique ID with computed check-in status.
   */
  async getById(id) {
    const queryStr = `
      SELECT p.participant_id AS id, p.event_id, p.fullname AS name, p.company, p.position, p.email, p.phone, p.ticket_code, p.registered_at, p.profile_picture, p.attendee_type,
             p.organization_type_id, p.organization_type_other, c.checked_in_at,
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
             p.organization_type_id, p.organization_type_other, c.checked_in_at,
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
      INSERT INTO participants (event_id, ticket_code, fullname, company, position, email, phone, profile_picture, attendee_type, organization_type_id, organization_type_other)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING participant_id AS id, event_id, fullname AS name, company, position, email, phone, ticket_code, registered_at, profile_picture, attendee_type,
                organization_type_id, organization_type_other;
    `;
    const values = [
      data.event_id || 1, // single-event system: event 1
      data.ticket_code,
      data.name,
      data.company,
      data.position || '',
      data.email || '',
      data.phone || '',
      data.profile_picture || null,
      data.attendee_type || 'General',
      data.organization_type_id ?? null,
      data.organization_type_other ?? null
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
      SET fullname = $1, company = $2, position = $3, email = $4, phone = $5, profile_picture = $6, attendee_type = $7,
          organization_type_id = CASE WHEN $9 THEN $10::int ELSE organization_type_id END,
          organization_type_other = CASE WHEN $9 THEN $11::varchar ELSE organization_type_other END
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
      id,
      // organization type is only changed when the caller sent it
      data.organization_type !== undefined,
      data.organization_type?.organization_type_id ?? null,
      data.organization_type?.organization_type_other ?? null
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

  /**
   * Bulk import in a single transaction (all rows or none).
   * Rows whose email already exists in the event (or earlier in the batch) are skipped.
   * @param {number} eventId
   * @param {Array<{row:number,name:string,company:string,position:string,email:string,phone:string,attendee_type:string}>} rows
   * @param {() => string} generateTicketCode
   * @returns {{ imported: Array, skipped: Array<{row:number,reason:string}> }}
   */
  async bulkCreate(eventId, rows, generateTicketCode) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT ticket_code, LOWER(email) AS email FROM participants`
      );
      const usedCodes = new Set(existing.rows.map(r => r.ticket_code));
      const eventEmails = await client.query(
        `SELECT LOWER(email) AS email FROM participants WHERE event_id = $1 AND email <> ''`,
        [eventId]
      );
      const seenEmails = new Set(eventEmails.rows.map(r => r.email));

      const imported = [];
      const skipped = [];
      for (const r of rows) {
        const emailKey = r.email.toLowerCase();
        if (emailKey && seenEmails.has(emailKey)) {
          skipped.push({ row: r.row, reason: 'DUPLICATE_EMAIL' });
          continue;
        }

        // Ticket codes only have ~9,000 values per day, so avoid collisions explicitly
        let ticketCode = generateTicketCode();
        for (let i = 0; usedCodes.has(ticketCode); i++) {
          if (i >= 1000) throw new Error('TICKET_CODE_EXHAUSTED');
          ticketCode = generateTicketCode();
        }
        usedCodes.add(ticketCode);
        if (emailKey) seenEmails.add(emailKey);

        const result = await client.query(
          `INSERT INTO participants (event_id, ticket_code, fullname, company, position, email, phone, attendee_type, organization_type_id, organization_type_other)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING participant_id AS id, fullname AS name, ticket_code`,
          [eventId, ticketCode, r.name, r.company, r.position, r.email, r.phone, r.attendee_type,
           r.organization_type_id ?? null, r.organization_type_other ?? null]
        );
        imported.push({ row: r.row, ...result.rows[0] });
      }

      await client.query('COMMIT');
      return { imported, skipped };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

module.exports = new ParticipantRepository();
