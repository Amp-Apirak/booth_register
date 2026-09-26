const crypto = require('crypto');
const participantRepository = require('../repositories/participantRepository');
const { AttemptLimiter } = require('../utils/attemptLimiter');
const checkinService = require('../services/checkinService');
const { broadcastParticipants } = require('../utils/realtime');
const { sendTicketEmail } = require('../utils/email_sender');
const organizationTypeRepository = require('../repositories/organizationTypeRepository');
const { resolveOrganizationType } = require('./organizationTypeController');

const IMPORT_MAX_ROWS = 5000;

/**
 * Ticket code SERYYYYMMDD + 6 random digits (900,000 codes a day; older tickets have 4 digits)
 */
function generateTicketCode() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `SER${yyyy}${mm}${dd}${crypto.randomInt(100000, 1000000)}`;
}

/** Creates the attendee; if the drawn ticket code is already taken, draws another one */
async function createWithTicketCode(data) {
  for (let attempt = 1; ; attempt++) {
    const ticketCode = generateTicketCode();
    try {
      return { participant: await participantRepository.create({ ...data, ticket_code: ticketCode }), ticketCode };
    } catch (err) {
      if (err.code === '23505' && String(err.constraint || '').includes('ticket_code') && attempt < 5) continue;
      throw err;
    }
  }
}

// Public sign-up limits (match the database column sizes)
const PUBLIC_LIMITS = { fullname: 150, company: 150, position: 100, email: 255, phone: 50 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHOTO_RE = /^data:image\/(png|jpe?g|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_PHOTO_CHARS = 3_000_000; // ≈ 2.2 MB image; the sign-up page sends a cropped photo of a few dozen KB

function validatePublicSignUp(body) {
  for (const [field, max] of Object.entries(PUBLIC_LIMITS)) {
    if (String(body[field] ?? '').length > max) {
      return { error: 'FIELD_TOO_LONG', field, message: `ข้อมูลช่อง ${field} ยาวเกิน ${max} ตัวอักษร` };
    }
  }
  if (body.email && !EMAIL_RE.test(String(body.email).trim())) {
    return { error: 'INVALID_EMAIL', message: 'รูปแบบอีเมลไม่ถูกต้อง' };
  }
  if (body.phone && !/^[0-9+\-\s().]{6,50}$/.test(String(body.phone).trim())) {
    return { error: 'INVALID_PHONE', message: 'รูปแบบเบอร์โทรศัพท์ไม่ถูกต้อง' };
  }
  if (body.profile_picture) {
    const photo = String(body.profile_picture);
    if (!PHOTO_RE.test(photo)) return { error: 'INVALID_PHOTO', message: 'รูปภาพต้องเป็นไฟล์ PNG, JPG หรือ WebP' };
    if (photo.length > MAX_PHOTO_CHARS) return { error: 'PHOTO_TOO_LARGE', message: 'รูปภาพมีขนาดใหญ่เกินไป' };
  }
  return null;
}

// Public ticket lookup: 5 wrong answers per ticket code, 30 per visitor address, then wait 15 minutes
const lookupByTicket = new AttemptLimiter({ max: 5, windowMs: 15 * 60 * 1000 });
const lookupByClient = new AttemptLimiter({ max: 30, windowMs: 15 * 60 * 1000 });

/** The attendee proves the ticket is theirs: last 4 digits of the phone, or the email they registered with */
function ownsTicket(participant, answer) {
  const value = String(answer || '').trim();
  if (value.includes('@')) return !!participant.email && participant.email.trim().toLowerCase() === value.toLowerCase();
  const digits = value.replace(/\D/g, '');
  const phone = String(participant.phone || '').replace(/\D/g, '');
  return digits.length === 4 && phone.length >= 4 && phone.endsWith(digits);
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
      const { fullname, company, position, email, phone, pdpa_consent, profile_picture } = req.body;

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
      const invalid = validatePublicSignUp(req.body);
      if (invalid) {
        return res.status(400).json({ success: false, ...invalid });
      }
      const organization = await resolveOrganizationType(1, req.body, { required: true, activeOnly: true });
      if (organization.error) {
        return res.status(400).json({ success: false, error: organization.error, message: organization.message });
      }

      // 2. Create the attendee with a unique ticket code
      const { participant: newParticipant, ticketCode } = await createWithTicketCode({
        name: String(fullname).trim(),
        company: String(company).trim(),
        position: position || '',
        email: email ? String(email).trim() : '',
        phone: String(phone).trim(),
        profile_picture: profile_picture || null,
        attendee_type: 'General', // public sign-ups are never VIP: staff set VIP in the dashboard
        ...organization
      });

      // 3. Trigger Real-time broadcasts to Staff Dashboard (Socket.io)
      const io = req.app.get('io');
      if (io) {
        io.emit('overview:update', await getStatsSummary());
        await broadcastParticipants(io, 'register');
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

      const { participant: newParticipant } = await createWithTicketCode({
        name: participantName,
        company: company,
        position: position || '',
        email: email || '',
        phone: phone || '',
        profile_picture: profile_picture || null,
        attendee_type: attendee_type || 'General',
        ...organization
      });

      const io = req.app.get('io');
      if (io) {
        io.emit('overview:update', await getStatsSummary());
        await broadcastParticipants(io, 'add');
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
        io.emit('overview:update', await getStatsSummary());
        await broadcastParticipants(io, 'import');
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
  async lookupTicket(req, res) {
    try {
      const ticketCode = String(req.body?.ticket_code || '').trim();
      const answer = String(req.body?.verifier || '').trim();
      if (!ticketCode || !answer) {
        return res.status(400).json({ success: false, error: 'LOOKUP_FIELDS_REQUIRED', message: 'กรุณากรอกรหัสตั๋วและเบอร์โทร 4 ตัวท้าย (หรืออีเมล)' });
      }
      const retryAfter = Math.max(lookupByTicket.retryAfterSeconds(ticketCode.toUpperCase()), lookupByClient.retryAfterSeconds(req.ip));
      if (retryAfter) {
        res.set('Retry-After', String(retryAfter));
        return res.status(429).json({ success: false, error: 'TOO_MANY_ATTEMPTS', retry_after: retryAfter, message: `ลองผิดหลายครั้งเกินไป กรุณารอ ${Math.ceil(retryAfter / 60)} นาที` });
      }
      const participant = await participantRepository.getByTicketCode(ticketCode);
      if (!participant || !ownsTicket(participant, answer)) {
        lookupByTicket.fail(ticketCode.toUpperCase());
        lookupByClient.fail(req.ip);
        // same answer whether the code or the phone digits were wrong
        return res.status(404).json({ success: false, error: 'TICKET_NOT_FOUND', message: 'ไม่พบตั๋ว หรือข้อมูลยืนยันไม่ตรงกัน' });
      }
      lookupByTicket.reset(ticketCode.toUpperCase());
      // only what is printed on the ticket
      return res.json({
        success: true,
        data: {
          name: participant.name,
          company: participant.company,
          position: participant.position,
          ticket_code: participant.ticket_code,
          attendee_type: participant.attendee_type,
          status: participant.status,
          checked_in_at: participant.checked_in_at,
        },
      });
    } catch (err) {
      console.error('Ticket lookup failed:', err.message);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' });
    }
  }

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

      await broadcastParticipants(req.app.get('io'), 'update');

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
        io.emit('overview:update', await getStatsSummary());
        await broadcastParticipants(io, 'delete');
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

      // Execute transaction checkin (scanned_by records which staff login scanned the ticket)
      const checkedInUser = await checkinService.checkIn(ticket_code, req.user?.user_id);

      // Live updates: the LED screens first (small, time-critical), then the staff attendee list
      const io = req.app.get('io');
      if (io) {
        // Welcome LED (REQ-05): only what the big screen shows — never email or phone
        io.emit('welcome:new_checkin', {
          name: checkedInUser.name,
          company: checkedInUser.company,
          position: checkedInUser.position,
          profile_picture: checkedInUser.profile_picture,
          attendee_type: checkedInUser.attendee_type,
          timestamp: checkedInUser.checked_in_at
        });
        io.emit('overview:update', await getStatsSummary());
        await broadcastParticipants(io, 'checkin');
      }

      return res.json({
        success: true,
        message: 'เช็คอินสแกนเข้าประตูสำเร็จ',
        data: checkedInUser
      });
    } catch (err) {
      if (err.message === 'TICKET_NOT_FOUND') {
        return res.status(400).json({ success: false, error: 'TICKET_NOT_FOUND', message: 'ไม่พบรหัสตั๋วนี้ในระบบ' });
      }
      if (err.message === 'ALREADY_CHECKED_IN') {
        // the gate sees who it was and when they came in
        const p = await participantRepository.getByTicketCode(req.body.ticket_code).catch(() => null);
        return res.status(400).json({
          success: false, error: 'ALREADY_CHECKED_IN', message: 'ผู้ร่วมงานคนนี้เช็คอินไปแล้ว',
          participant: p ? { name: p.name, company: p.company, checked_in_at: p.checked_in_at } : null,
        });
      }
      console.error("CheckIn controller failed:", err.message);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' });
    }
  }
}

/**
 * Event stats — the single shape shared by GET /events/:id/stats and the
 * `overview:update` socket event (client type: Stats in client/src/lib/api.ts).
 */
async function getStatsSummary() {
  const { registered: total, checked_in: checkedIn } = await participantRepository.countSummary();
  return {
    registered: total,
    checked_in: checkedIn,
    pending: total - checkedIn,
    show_up_percent: total > 0 ? Math.round((checkedIn / total) * 100) : 0
  };
}

module.exports = new ParticipantController();
