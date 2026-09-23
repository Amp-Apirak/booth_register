const request = require('supertest');
const app = require('../app');
const db = require('../config/db');

/**
 * Smart Event Registration – API Integration Tests (ISO 9002)
 * Tests the full HTTP request lifecycle: Route → Controller → Service → DB
 */
describe('API Endpoint Integration Tests (ISO 9002)', () => {
  let createdTicketCode;
  let createdParticipantId;

  beforeAll(async () => {
    await db.testConnection();
    // Ensure clean state for test run
    await db.query("DELETE FROM checkins WHERE participant_id IN (SELECT participant_id FROM participants WHERE email = 'api_test@iso.com')");
    await db.query("DELETE FROM lucky_draw_winners WHERE participant_id IN (SELECT participant_id FROM participants WHERE email = 'api_test@iso.com')");
    await db.query("DELETE FROM participants WHERE email = 'api_test@iso.com'");
  });

  afterAll(async () => {
    // Cleanup test data
    await db.query("DELETE FROM checkins WHERE participant_id IN (SELECT participant_id FROM participants WHERE email = 'api_test@iso.com')");
    await db.query("DELETE FROM lucky_draw_winners WHERE participant_id IN (SELECT participant_id FROM participants WHERE email = 'api_test@iso.com')");
    await db.query("DELETE FROM participants WHERE email = 'api_test@iso.com'");
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
      const res = await request(app)
        .post('/api/v1/events/1/register')
        .send({
          fullname: 'Test Person',
          company: 'Test Corp',
          pdpa_consent: false
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('PDPA_CONSENT_REQUIRED');
    });

    it('should reject registration without required fields', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/register')
        .send({
          fullname: '',
          company: '',
          pdpa_consent: true
        });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should successfully register a new participant (REQ-01/02/03)', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/register')
        .send({
          fullname: 'API Tester',
          company: 'ISO Audit Corp',
          position: 'Quality Engineer',
          email: 'api_test@iso.com',
          phone: '099-999-0000',
          pdpa_consent: true
        });
      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('API Tester');
      expect(res.body.data.ticket_code).toMatch(/^tkt_reg_/);
      createdTicketCode = res.body.data.ticket_code;
      createdParticipantId = res.body.data.id || res.body.data.participant_id;
    });
  });

  // ─── Staff CMS: List & Lookup ──────────────────────

  describe('GET /api/v1/participants', () => {
    it('should return all participants including the newly registered one', async () => {
      const res = await request(app).get('/api/v1/participants');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);

      const found = res.body.data.find(p => p.email === 'api_test@iso.com');
      expect(found).toBeDefined();
      expect(found.status).toBe('Pending');
    });
  });

  describe('GET /api/v1/participants/:ticket_code', () => {
    it('should find participant by ticket code', async () => {
      const res = await request(app).get(`/api/v1/participants/${createdTicketCode}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('API Tester');
    });

    it('should return 404 for non-existent ticket code', async () => {
      const res = await request(app).get('/api/v1/participants/invalid_ticket_code_xyz');
      expect(res.statusCode).toBe(404);
      expect(res.body.error).toBe('TICKET_NOT_FOUND');
    });
  });

  describe('GET /api/v1/events/:event_id/stats', () => {
    it('should return stats summary', async () => {
      const res = await request(app).get('/api/v1/events/1/stats');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.registered).toBe('number');
      expect(typeof res.body.data.checked_in).toBe('number');
    });
  });

  // ─── REQ-04: Check-in ─────────────────────────────

  describe('POST /api/v1/checkin', () => {
    it('should reject check-in without ticket_code', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('TICKET_CODE_REQUIRED');
    });

    it('should reject check-in with invalid ticket_code', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .send({ ticket_code: 'fake_ticket_12345' });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('TICKET_NOT_FOUND');
    });

    it('should successfully check-in with valid ticket (REQ-04)', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .send({ ticket_code: createdTicketCode });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('API Tester');
    });

    it('should reject double check-in (REQ-04 Edge Case)', async () => {
      const res = await request(app)
        .post('/api/v1/checkin')
        .send({ ticket_code: createdTicketCode });
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('ALREADY_CHECKED_IN');
    });
  });

  // ─── REQ-06: Lucky Draw ───────────────────────────

  describe('POST /api/v1/events/:event_id/lucky-draw/spin', () => {
    it('should reject spin without prize_name', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/lucky-draw/spin')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('PRIZE_NAME_REQUIRED');
    });

    it('should successfully spin and select checked-in winner', async () => {
      const res = await request(app)
        .post('/api/v1/events/1/lucky-draw/spin')
        .send({ prize_name: 'iPad Pro 2026' });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.prize_name).toBe('iPad Pro 2026');
      expect(res.body.data.name).toBeDefined();
    });

    it('should fetch winners list', async () => {
      const res = await request(app).get('/api/v1/events/1/lucky-draw/winners');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
    });
  });
});
