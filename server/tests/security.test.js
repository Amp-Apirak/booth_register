const request = require('supertest');
const app = require('../app');
const db = require('../config/db');
const {
  initTables, createUser, deleteUsers, tokenFor, bearer, anyOrganizationTypeId,
  createPrize, deletePrize, deleteParticipantsOf,
} = require('./helpers');

/**
 * Security & roles (ADR-0015): public / staff (Admin or Staff) / Admin-only access,
 * public sign-up checks, the public ticket lookup, attempt limits, and simultaneous requests.
 */
const COMPANY = 'Jest Security Corp';
const PRIZE = 'Jest Security Prize';

let admin;
let staff;
let orgTypeId;

const signUp = (extra = {}) => request(app).post('/api/v1/events/1/register').send({
  fullname: 'Security Tester',
  company: COMPANY,
  email: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}@example.com`,
  phone: '081-234-5678',
  pdpa_consent: true,
  organization_type_id: orgTypeId,
  ...extra,
});

beforeAll(async () => {
  await db.testConnection();
  await initTables();
  admin = tokenFor(await createUser('jest_sec_admin', 'Admin'), 'jest_sec_admin', 'Admin');
  staff = tokenFor(await createUser('jest_sec_staff', 'Staff'), 'jest_sec_staff', 'Staff');
  orgTypeId = await anyOrganizationTypeId();
  await deleteParticipantsOf(COMPANY);
  await deletePrize(PRIZE);
});

afterAll(async () => {
  await deletePrize(PRIZE);
  await deleteParticipantsOf(COMPANY);
  await deleteUsers(['jest_sec_admin', 'jest_sec_staff', 'jest_sec_limit']);
  await db.pool.end();
});

// every protected route: [method, path, admin-only?]
const PROTECTED = [
  ['get', '/api/v1/participants', false],
  ['post', '/api/v1/participants', false],
  ['get', '/api/v1/participants/SER000', false],
  ['put', '/api/v1/participants/999999', false],
  ['post', '/api/v1/checkin', false],
  ['post', '/api/v1/events/1/lucky-draw/spin', false],
  ['get', '/api/v1/events/1/lucky-draw/eligible', false],
  ['post', '/api/v1/participants/import', true],
  ['delete', '/api/v1/participants/999999', true],
  ['put', '/api/v1/settings', true],
  ['put', '/api/v1/events/1/agenda', true],
  ['post', '/api/v1/events/1/prizes', true],
  ['put', '/api/v1/events/1/prizes/reorder', true],
  ['post', '/api/v1/events/1/prizes/import', true],
  ['put', '/api/v1/events/1/prizes/999999', true],
  ['delete', '/api/v1/events/1/prizes/999999', true],
  ['post', '/api/v1/events/1/organization-types', true],
  ['put', '/api/v1/events/1/organization-types/reorder', true],
  ['put', '/api/v1/events/1/organization-types/999999', true],
  ['delete', '/api/v1/events/1/organization-types/999999', true],
  // with the empty body sent below the reset is refused (400), so these checks never remove anything
  ['get', '/api/v1/events/1/reset-summary', true],
  ['post', '/api/v1/events/1/reset', true],
];

describe('access levels', () => {
  it.each(PROTECTED)('%s %s → 401 without login', async (method, path) => {
    const res = await request(app)[method](path).send({});
    expect(res.statusCode).toBe(401);
  });

  it.each(PROTECTED.filter(([, , adminOnly]) => adminOnly))('%s %s → 403 for the Staff role', async (method, path) => {
    const res = await request(app)[method](path).set(bearer(staff)).send({});
    expect(res.statusCode).toBe(403);
    expect(res.body.error).toBe('FORBIDDEN');
  });

  it.each(PROTECTED.filter(([, , adminOnly]) => adminOnly))('%s %s → allowed for Admin (not 401/403)', async (method, path) => {
    const res = await request(app)[method](path).set(bearer(admin)).send({});
    expect([401, 403]).not.toContain(res.statusCode);
  });

  it.each(PROTECTED.filter(([, , adminOnly]) => !adminOnly))('%s %s → allowed for Staff (not 401/403)', async (method, path) => {
    const res = await request(app)[method](path).set(bearer(staff)).send({});
    expect([401, 403]).not.toContain(res.statusCode);
  });

  it('rejects a forged or expired token', async () => {
    const forged = require('jsonwebtoken').sign({ user_id: 1, role: 'Admin' }, 'not-the-secret');
    expect((await request(app).get('/api/v1/participants').set(bearer(forged))).statusCode).toBe(401);
    const expired = require('jsonwebtoken').sign({ user_id: 1, role: 'Admin', exp: Math.floor(Date.now() / 1000) - 60 }, require('../middlewares/authMiddleware').JWT_SECRET);
    const res = await request(app).get('/api/v1/participants').set(bearer(expired));
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('TOKEN_EXPIRED');
  });

  it('public read-only routes answer without login', async () => {
    for (const path of ['/api/v1/settings', '/api/v1/events/1/stats', '/api/v1/events/1/agenda', '/api/v1/events/1/prizes', '/api/v1/events/1/organization-types', '/api/v1/events/1/lucky-draw/winners']) {
      expect((await request(app).get(path)).statusCode).toBe(200);
    }
  });
});

describe('public sign-up checks', () => {
  it.each([
    [{ email: 'not-an-email' }, 'INVALID_EMAIL'],
    [{ phone: 'call me maybe' }, 'INVALID_PHONE'],
    [{ fullname: 'ก'.repeat(151) }, 'FIELD_TOO_LONG'],
    [{ profile_picture: 'data:text/html;base64,PHNjcmlwdD4=' }, 'INVALID_PHOTO'],
    [{ profile_picture: `data:image/png;base64,${'A'.repeat(3_000_001)}` }, 'PHOTO_TOO_LARGE'],
  ])('refuses %o with %s', async (extra, error) => {
    const res = await signUp(extra);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe(error);
  });

  it('always registers the public as General (VIP is set by staff)', async () => {
    const res = await signUp({ attendee_type: 'VIP' });
    expect(res.statusCode).toBe(201);
    expect(res.body.data.attendee_type).toBe('General');
  });
});

describe('public ticket lookup (ticket code + last 4 phone digits or e-mail)', () => {
  let ticket;
  let email;

  beforeAll(async () => {
    email = `lookup_${Date.now()}@example.com`;
    const res = await signUp({ email, phone: '089-111-2468' });
    ticket = res.body.data.ticket_code;
  });

  it('finds the ticket with the last 4 phone digits and shows only ticket details', async () => {
    const res = await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: ticket, verifier: '2468' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.ticket_code).toBe(ticket);
    expect(res.body.data.name).toBe('Security Tester');
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.phone).toBeUndefined();
    expect(res.body.data.id).toBeUndefined();
  });

  it('also accepts the registration e-mail', async () => {
    const res = await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: ticket, verifier: email.toUpperCase() });
    expect(res.statusCode).toBe(200);
  });

  it('gives the same answer for a wrong code or wrong digits', async () => {
    const wrongDigits = await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: ticket, verifier: '0000' });
    const wrongCode = await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: 'SER00000000000000', verifier: '2468' });
    expect(wrongDigits.statusCode).toBe(404);
    expect(wrongCode.statusCode).toBe(404);
    expect(wrongDigits.body).toEqual(wrongCode.body);
  });

  it('locks a ticket code after 5 wrong answers', async () => {
    const res2 = await signUp({ phone: '089-222-1357' });
    const code = res2.body.data.ticket_code;
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: code, verifier: String(1000 + i) });
    }
    const locked = await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: code, verifier: '1357' });
    expect(locked.statusCode).toBe(429);
    expect(locked.body.error).toBe('TOO_MANY_ATTEMPTS');
  });

  it('needs both fields', async () => {
    const res = await request(app).post('/api/v1/tickets/lookup').send({ ticket_code: ticket });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('LOOKUP_FIELDS_REQUIRED');
  });
});

describe('staff login attempt limit', () => {
  it('pauses a username after 10 wrong passwords, even for the right password', async () => {
    await createUser('jest_sec_limit', 'Staff', 'Right-Password-1');
    for (let i = 0; i < 10; i++) {
      const res = await request(app).post('/api/v1/login').send({ username: 'jest_sec_limit', password: `wrong-${i}` });
      expect(res.statusCode).toBe(401);
    }
    const locked = await request(app).post('/api/v1/login').send({ username: 'jest_sec_limit', password: 'Right-Password-1' });
    expect(locked.statusCode).toBe(429);
    expect(locked.body.error).toBe('TOO_MANY_ATTEMPTS');
    expect(Number(locked.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('a normal login still works and returns the role', async () => {
    await createUser('jest_sec_staff', 'Staff', 'Staff-Password-9');
    const res = await request(app).post('/api/v1/login').send({ username: 'jest_sec_staff', password: 'Staff-Password-9' });
    expect(res.statusCode).toBe(200);
    expect(res.body.data.user.role).toBe('Staff');
  });
});

describe('simultaneous requests', () => {
  it('two gates scanning the same ticket at once: one check-in, one "already checked in"', async () => {
    const res = await signUp({ phone: '089-333-0001' });
    const code = res.body.data.ticket_code;
    const [a, b] = await Promise.all([
      request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: code }),
      request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: code }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 400]);
    expect([a.body.error, b.body.error]).toContain('ALREADY_CHECKED_IN');
  });

  it('two spins at once for a prize with quantity 1: only one winner', async () => {
    // make sure at least two people can win
    for (const phone of ['089-444-0001', '089-444-0002']) {
      const r = await signUp({ phone });
      await request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: r.body.data.ticket_code });
    }
    await createPrize(PRIZE, 1);
    const [a, b] = await Promise.all([
      request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({ prize_name: PRIZE }),
      request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({ prize_name: PRIZE }),
    ]);
    expect([a.statusCode, b.statusCode].sort()).toEqual([200, 400]);
    expect([a.body.error, b.body.error]).toContain('PRIZE_SOLD_OUT');
    const { rows } = await db.query('SELECT COUNT(*)::int AS n FROM lucky_draw_winners WHERE prize_name = $1', [PRIZE]);
    expect(rows[0].n).toBe(1);
  });

  it('a switched-off or unknown prize cannot be drawn', async () => {
    await deletePrize(PRIZE);
    await createPrize(PRIZE, 5, false);
    const off = await request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({ prize_name: PRIZE });
    expect(off.body.error).toBe('PRIZE_INACTIVE');
    const unknown = await request(app).post('/api/v1/events/1/lucky-draw/spin').set(bearer(staff)).send({ prize_name: 'No Such Prize 404' });
    expect(unknown.body.error).toBe('PRIZE_NOT_FOUND');
  });
});
