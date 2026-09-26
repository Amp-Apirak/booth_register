const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const {
  initTables, createUser, deleteUsers, tokenFor, bearer, anyOrganizationTypeId,
  createPrize, deletePrize, deleteParticipantsOf,
} = require('./helpers');

/**
 * Smart Event Registration – API Integration Tests (ISO 9002)
 * Tests the full HTTP request lifecycle: Route → Controller → Service → DB.
 * Everything the tests create is removed again (attendees of COMPANY, the test prize, test users).
 */
const COMPANY = 'Jest API Corp';
const PRIZE = 'Jest API Prize';

describe('API Endpoint Integration Tests (ISO 9002)', () => {
  let staff;
  let staffId;
  let orgTypeId;
  let ticketCode;

  const register = (extra = {}) => request(app).post('/api/v1/events/1/register').send({
    fullname: 'API Tester',
    company: COMPANY,
    position: 'Quality Engineer',
    email: 'api_test@iso.com',
    phone: '099-999-0000',
    pdpa_consent: true,
    organization_type_id: orgTypeId,
    ...extra,
  });

  beforeAll(async () => {
    await db.testConnection();
    await initTables();
    staffId = await createUser('jest_api_staff', 'Staff');
    staff = tokenFor(staffId, 'jest_api_staff', 'Staff');
    orgTypeId = await anyOrganizationTypeId();
    await deleteParticipantsOf(COMPANY);
    await deletePrize(PRIZE);
  });

  afterAll(async () => {
    await deletePrize(PRIZE);
    await deleteParticipantsOf(COMPANY);
    await deleteUsers(['jest_api_staff']);
    await db.pool.end();
  });

  // ─── Health Check ──────────────────────────────────

  describe('GET /api/v1/ping', () => {
    it('should return healthy status', async () => {
      const res = await request(app).get('/api/v1/ping');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('Smart Event Registration API');
    });
  });

  // ─── REQ-01, REQ-02, REQ-03: Registration ─────────

  describe('POST /api/v1/events/:event_id/register', () => {
    it('should reject registration without PDPA consent', async () => {
      const res = await register({ pdpa_consent: false });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('PDPA_CONSENT_REQUIRED');
    });

    it('should reject registration without required fields', async () => {
      const res = await register({ fullname: '', company: '', phone: '' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should successfully register a new participant (REQ-01/02/03)', async () => {
      const res = await register({ attendee_type: 'VIP' });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('API Tester');
      // SER + date + 6 random digits
      expect(res.body.data.ticket_code).toMatch(/^SER\d{14}$/);
      // nobody can make themselves VIP through the public form
      expect(res.body.data.attendee_type).toBe('General');
      ticketCode = res.body.data.ticket_code;
    });
  });

  // ─── Staff CMS: List & Lookup ──────────────────────

  describe('GET /api/v1/participants', () => {
    it('needs a staff login', async () => {
      const res = await request(app).get('/api/v1/participants');
      expect(res.statusCode).toBe(401);
    });

    it('should return all participants including the newly registered one', async () => {
      const res = await request(app).get('/api/v1/participants').set(bearer(staff));
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      const found = res.body.data.find((p) => p.ticket_code === ticketCode);
      expect(found).toBeDefined();
      expect(found.status).toBe('Pending');
    });
  });

  describe('GET /api/v1/participants/:ticket_code', () => {
    it('should find participant by ticket code', async () => {
      const res = await request(app).get(`/api/v1/participants/${ticketCode}`).set(bearer(staff));
      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('API Tester');
    });

    it('should return 404 for non-existent ticket code', async () => {
      const res = await request(app).get('/api/v1/participants/invalid_ticket_code_xyz').set(bearer(staff));
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('GET /api/v1/events/:event_id/stats', () => {
    it('should return stats summary', async () => {
      const res = await request(app).get('/api/v1/events/1/stats');
      expect(res.statusCode).toBe(200);
      expect(typeof res.body.data.registered).toBe('number');
      expect(typeof res.body.data.checked_in).toBe('number');
      expect(res.body.data.pending).toBe(res.body.data.registered - res.body.data.checked_in);
    });
  });

  // ─── REQ-04: Check-in ─────────────────────────────

  describe('POST /api/v1/checkin', () => {
    it('needs a staff login', async () => {
      const res = await request(app).post('/api/v1/checkin').send({ ticket_code: ticketCode });
      expect(res.statusCode).toBe(401);
    });

    it('should reject check-in without ticket_code', async () => {
      const res = await request(app).post('/api/v1/checkin').set(bearer(staff)).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('TICKET_CODE_REQUIRED');
    });

    it('should reject check-in with invalid ticket_code', async () => {
      const res = await request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: 'fake_ticket_12345' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('TICKET_NOT_FOUND');
    });

    it('should successfully check-in with valid ticket and record who scanned it (REQ-04)', async () => {
      const res = await request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: ticketCode });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.name).toBe('API Tester');
      const { rows } = await db.query(
        'SELECT c.scanned_by FROM checkins c JOIN participants p ON p.participant_id = c.participant_id WHERE p.ticket_code = $1',
        [ticketCode]
      );
      expect(rows[0].scanned_by).toBe(staffId);
    });

    it('should reject double check-in and say who and when (REQ-04 Edge Case)', async () => {
      const res = await request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: ticketCode });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('ALREADY_CHECKED_IN');
      expect(res.body.participant.name).toBe('API Tester');
      expect(res.body.participant.checked_in_at).toBeTruthy();
    });
  });

  // ─── REQ-06: Lucky Draw ───────────────────────────

  describe('POST /api/v1/events/:event_id/lucky-draw/spin', () => {
    it('needs a staff login', async () => {
      const res = await request(app).post('/api/v1/events/1/lucky-draw/spin').send({ prize_name: PRIZE });
      expect(res.statusCode).toBe(401);
    });

    it('should reject spin without prize_name', async () => {
      const res = await request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('PRIZE_NAME_REQUIRED');
    });

    it('should successfully spin and select a checked-in winner (no e-mail in the result)', async () => {
      await createPrize(PRIZE, 1);
      const res = await request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({ prize_name: PRIZE });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.prize_name).toBe(PRIZE);
      expect(res.body.data.name).toBeDefined();
      expect(res.body.data.email).toBeUndefined();
    });

    it('should refuse to give a prize more times than its quantity', async () => {
      const res = await request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({ prize_name: PRIZE });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('PRIZE_SOLD_OUT');
    });

    it('should fetch winners list (public, for the LED)', async () => {
      const res = await request(app).get('/api/v1/events/1/lucky-draw/winners');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.some((w) => w.prize_name === PRIZE)).toBe(true);
      expect(res.body.data.every((w) => w.email === undefined && w.phone === undefined)).toBe(true);
    });
  });
});
