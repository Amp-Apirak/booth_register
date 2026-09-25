const participantRepository = require('../repositories/participantRepository');
const checkinService = require('../services/checkinService');
const { sendTicketEmail } = require('../utils/email_sender');
const organizationTypeRepository = require('../repositories/organizationTypeRepository');
const { resolveOrganizationType } = require('./organizationTypeController');

const IMPORT_MAX_ROWS = 5000;

/**
 * Helper to generate ticket code in format: SER20260920XXXX
 */
function generateTicketCode() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const random4 = Math.floor(1000 + Math.random() * 9000);
  return `SER${yyyy}${mm}${dd}${random4}`;
}

/**
 * Express Controller for Participant Operations
 */
class ParticipantController {
  /**
   * Handles Self-Registration (REQ-01, REQ-02, REQ-03)
   */
  async register(req, res) {
    try {
      const { fullname, company, position, email, phone, pdpa_consent, profile_picture, attendee_type } = req.body;

      // 1. Quality Validation: Check required fields and PDPA Consent box
      if (!fullname || !company || !phone) {
        return res.status(400).json({ 
          success: false, 
          error: 'MISSING_REQUIRED_FIELDS', 
          message: 'กรุณากรอกชื่อ-นามสกุล, บริษัท และเบอร์โทรศัพท์' 
        });
      }
      if (pdpa_consent !== true) {
        return res.status(400).json({ 
          success: false, 
          error: 'PDPA_CONSENT_REQUIRED', 
          message: 'กรุณากดยอมรับเงื่อนไขการประมวลผลข้อมูลส่วนบุคคล (PDPA)' 
        });
      }
      const organization = await resolveOrganizationType(1, req.body, { required: true, activeOnly: true });
      if (organization.error) {
        return res.status(400).json({ success: false, error: organization.error, message: organization.message });
      }

      // 2. Generate secure ticket code
      const ticketCode = generateTicketCode();

      const newParticipant = await participantRepository.create({
        name: fullname,
        company: company,
        position: position || '',
        email: email || '',
        phone: phone || '',
        profile_picture: profile_picture || null,
        attendee_type: attendee_type || 'General',
        ticket_code: ticketCode,
        ...organization
      });

      // 3. Trigger Real-time broadcasts to Staff Dashboard (Socket.io)
      const io = req.app.get('io');
      if (io) {
        const allParticipants = await participantRepository.getAll();
        io.emit('participants:update', { action: 'register', data: allParticipants });
        io.emit('overview:update', await getStatsSummary());
      }

      // 4. Asynchronously send the HTML email ticket
      if (newParticipant.email) {
        sendTicketEmail(newParticipant, ticketCode).catch(err => {
          console.error("Delayed email delivery failed:", err.message);
        });
      }

      return res.status(201).json({
        success: true,
        message: 'ลงทะเบียนสำเร็จ ตั๋วจัดส่งเข้าอีเมลของท่านแล้ว',
        data: {
          participant_id: newParticipant.id,
          ticket_code: ticketCode,
          ...newParticipant
        }
      });
    } catch (err) {
      console.error("Register controller failed:", err.message);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Handles manual participant addition by Admin / Staff
   */
  async createManual(req, res) {
    try {
      const { name, fullname, company, position, email, phone, profile_picture, attendee_type } = req.body;
      const participantName = name || fullname;

      if (!participantName || !company) {
        return res.status(400).json({
          success: false,
          error: 'MISSING_REQUIRED_FIELDS',
          message: 'กรุณากรอกชื่อและบริษัท'
        });
      }
      const organization = await resolveOrganizationType(1, req.body);
      if (organization.error) {
        return res.status(400).json({ success: false, error: organization.error, message: organization.message });
      }

      const ticketCode = generateTicketCode();

      const newParticipant = await participantRepository.create({
        name: participantName,
        company: company,
        position: position || '',
        email: email || '',
        phone: phone || '',
        profile_picture: profile_picture || null,
        attendee_type: attendee_type || 'General',
        ticket_code: ticketCode,
        ...organization
      });

      const io = req.app.get('io');
      if (io) {
        const allParticipants = await participantRepository.getAll();
        io.emit('participants:update', { action: 'add', data: allParticipants });
        io.emit('overview:update', await getStatsSummary());
      }

      return res.status(201).json({
        success: true,
        data: newParticipant
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Bulk import participants from an uploaded spreadsheet (Staff CMS)
   * Body: { participants: [{ row, name, company, position?, email?, phone?, attendee_type? }] }
   */
  async importBulk(req, res) {
    try {
      const input = req.body?.participants;
      if (!Array.isArray(input) || input.length === 0) {
        return res.status(400).json({ success: false, error: 'NO_ROWS', message: 'ไม่พบข้อมูลสำหรับนำเข้า' });
      }
      if (input.length > IMPORT_MAX_ROWS) {
        return res.status(400).json({ success: false, error: 'TOO_MANY_ROWS', message: `นำเข้าได้สูงสุด ${IMPORT_MAX_ROWS} รายการต่อครั้ง` });
      }

      const text = (v, max) => String(v ?? '').trim().slice(0, max);
      // Organization type from the sheet: an id, or a Thai/English type name; unknown names become "อื่นๆ" text
      const normalize = (v) => String(v ?? '').toLowerCase().replace(/\s*\/\s*/g, '/').replace(/\s+/g, ' ').trim();
      const orgTypes = await organizationTypeRepository.findByEvent(1);
      const orgIds = new Set(orgTypes.map(t => t.id));
      const orgByName = new Map();
      for (const t of orgTypes) {
        if (t.name_th) orgByName.set(normalize(t.name_th), t.id);
        if (t.name_en) orgByName.set(normalize(t.name_en), t.id);
      }
      const organizationOf = (raw) => {
        const id = Number(raw?.organization_type_id);
        if (Number.isInteger(id) && orgIds.has(id)) return { organization_type_id: id, organization_type_other: null };
        const label = text(raw?.organization_type, 150);
        if (!label) return { organization_type_id: null, organization_type_other: null };
        const match = orgByName.get(normalize(label));
        return match ? { organization_type_id: match, organization_type_other: null } : { organization_type_id: null, organization_type_other: label };
      };
      const valid = [];
      const skipped = [];
      input.forEach((raw, i) => {
        const row = Number.isInteger(raw?.row) ? raw.row : i + 1;
        const name = text(raw?.name ?? raw?.fullname, 150);
        const company = text(raw?.company, 150);
        if (!name || !company) {
          skipped.push({ row, reason: 'MISSING_REQUIRED_FIELDS' });
          return;
        }
        const email = text(raw?.email, 255);
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          skipped.push({ row, reason: 'INVALID_EMAIL' });
          return;
        }
        valid.push({
          row,
          name,
          company,
          position: text(raw?.position, 100),
          email,
          phone: text(raw?.phone, 50),
          attendee_type: String(raw?.attendee_type ?? '').trim().toUpperCase() === 'VIP' ? 'VIP' : 'General',
          ...organizationOf(raw)
        });
      });

      const eventId = 1;
      const result = valid.length > 0
        ? await participantRepository.bulkCreate(eventId, valid, generateTicketCode)
        : { imported: [], skipped: [] };
      const allSkipped = [...skipped, ...result.skipped].sort((a, b) => a.row - b.row);

      const io = req.app.get('io');
      if (io && result.imported.length > 0) {
        const allParticipants = await participantRepository.getAll();
        io.emit('participants:update', { action: 'import', data: allParticipants });
        io.emit('overview:update', await getStatsSummary());
      }

      return res.status(201).json({
        success: true,
        message: `นำเข้าสำเร็จ ${result.imported.length} รายการ, ข้าม ${allSkipped.length} รายการ`,
        data: {
          imported_count: result.imported.length,
          skipped_count: allSkipped.length,
          skipped: allSkipped
        }
      });
    } catch (err) {
      console.error('Import participants failed:', err.message);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Handles retrieving all participants (for Staff CMS Dashboard)
   */
  async getAll(req, res) {
    try {
      const participants = await participantRepository.getAll();
      return res.json({ success: true, data: participants });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Handles retrieving single participant by Ticket Code
   */
  async getByTicketCode(req, res) {
    try {
      const { ticket_code } = req.params;
      const participant = await participantRepository.getByTicketCode(ticket_code);
      if (!participant) {
        return res.status(404).json({ success: false, error: 'TICKET_NOT_FOUND', message: 'ไม่พบตั๋วรหัสนี้ในระบบ' });
      }
      return res.json({ success: true, data: participant });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Updates participant details
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, fullname, company, position, email, phone, profile_picture, attendee_type } = req.body;
      const sentOrganization = 'organization_type_id' in req.body || 'organization_type_other' in req.body;
      const organization = sentOrganization ? await resolveOrganizationType(1, req.body) : undefined;
      if (organization?.error) {
        return res.status(400).json({ success: false, error: organization.error, message: organization.message });
      }
      const updated = await participantRepository.update(id, {
        name: name || fullname,
        company,
        position: position || '',
        email: email || '',
        phone: phone || '',
        profile_picture: profile_picture !== undefined ? profile_picture : null,
        attendee_type: attendee_type || 'General',
        organization_type: organization
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'PARTICIPANT_NOT_FOUND', message: 'ไม่พบผู้เข้าร่วมงานนี้' });
      }

      const io = req.app.get('io');
      if (io) {
        const allParticipants = await participantRepository.getAll();
        io.emit('participants:update', { action: 'update', data: allParticipants });
      }

      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Deletes participant
   */
  async delete(req, res) {
    try {
      const { id } = req.params;
      const deleted = await participantRepository.delete(id);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'PARTICIPANT_NOT_FOUND', message: 'ไม่พบผู้เข้าร่วมงานนี้' });
      }

      const io = req.app.get('io');
      if (io) {
        const allParticipants = await participantRepository.getAll();
        io.emit('participants:update', { action: 'delete', data: allParticipants });
        io.emit('overview:update', await getStatsSummary());
      }

      return res.json({ success: true, message: 'ลบข้อมูลสำเร็จ' });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Returns live event stats summary
   */
  async getStats(req, res) {
    try {
      return res.json({ success: true, data: await getStatsSummary() });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Handles barcode scan check-in (REQ-04, REQ-05)
   */
  async checkIn(req, res) {
    try {
      const { ticket_code } = req.body;
      if (!ticket_code) {
        return res.status(400).json({ 
          success: false, 
          error: 'TICKET_CODE_REQUIRED', 
          message: 'กรุณาระบุรหัสตั๋วสำหรับสแกน' 
        });
      }

      // Execute transaction checkin
      const checkedInUser = await checkinService.checkIn(ticket_code);

      // Trigger WebSockets updates
      const io = req.app.get('io');
      if (io) {
        const allParticipants = await participantRepository.getAll();
        io.emit('participants:update', { action: 'checkin', data: allParticipants });
        io.emit('overview:update', await getStatsSummary());
        
        // Emits name to TV Welcome LED Signage (REQ-05)
        io.emit('welcome:new_checkin', {
          name: checkedInUser.name,
          company: checkedInUser.company,
          position: checkedInUser.position,
          profile_picture: checkedInUser.profile_picture,
          attendee_type: checkedInUser.attendee_type
        });
      }

      return res.json({
        success: true,
        message: 'เช็คอินสแกนเข้าประตูสำเร็จ',
        data: checkedInUser
      });
    } catch (err) {
      console.error("CheckIn controller failed:", err.message);
      let statusCode = 500;
      let errorMsg = err.message;

      if (err.message === 'TICKET_NOT_FOUND' || err.message === 'ALREADY_CHECKED_IN') {
        statusCode = 400;
      }

      return res.status(statusCode).json({ success: false, error: err.message, message: errorMsg });
    }
  }
}

/**
 * Event stats — the single shape shared by GET /events/:id/stats and the
 * `overview:update` socket event (client type: Stats in client/src/lib/api.ts).
 */
async function getStatsSummary() {
  const all = await participantRepository.getAll();
  const total = all.length;
  const checkedIn = all.filter(p => p.status === 'Checked-in').length;
  return {
    registered: total,
    checked_in: checkedIn,
    pending: total - checkedIn,
    show_up_percent: total > 0 ? Math.round((checkedIn / total) * 100) : 0
  };
}

module.exports = new ParticipantController();
