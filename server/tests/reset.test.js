const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const app = require('../app');
const db = require('../config/db');
const { attachRealtime } = require('../utils/realtime');
const { DEFAULT_SETTINGS, SETTINGS_GROUPS } = require('../repositories/settingsRepository');
const { DEFAULT_TYPES } = require('../repositories/organizationTypeRepository');
const { initTables, createUser, deleteUsers, tokenFor, bearer } = require('./helpers');

/**
 * Backup & reset (ADR-0017). Everything runs on an event created for the test, so the real event (1)
 * is never touched; settings are shared by the whole system, so they are saved first and put back after.
 */
const ALL = ['general', 'registration', 'organizations', 'agenda', 'prizes', 'attendees'];

let admin;
let staff;
let eventId;
let savedSettings;
let server;
let url;

const reset = (sections, token = admin) =>
  request(app).post(`/api/v1/events/${eventId}/reset`).set(bearer(token)).send({ sections });
const count = async (table, event = eventId) =>
  (await db.query(`SELECT COUNT(*)::int AS n FROM ${table} WHERE event_id = $1`, [event])).rows[0].n;
const setting = async (key) => (await db.query('SELECT value FROM settings WHERE key = $1', [key])).rows[0]?.value;

/** 1 organization type, 3 attendees of that type (2 checked in, 1 winner), 2 agenda items, 2 prizes */
async function seedEvent() {
  const type = (await db.query(
    "INSERT INTO organization_types (event_id, name_th, name_en, color, sort_order) VALUES ($1, 'Jest ประเภท', 'Jest type', 'blue', 1) RETURNING org_type_id",
    [eventId]
  )).rows[0].org_type_id;
  const people = [];
  for (let i = 1; i <= 3; i++) {
    const { rows } = await db.query(
      `INSERT INTO participants (event_id, ticket_code, fullname, company, email, organization_type_id)
       VALUES ($1, $2, $3, 'Jest Reset Corp', $4, $5) RETURNING participant_id`,
      [eventId, `JESTRESET${Date.now()}${i}`, `Jest Reset ${i}`, `reset${i}@example.com`, type]
    );
    people.push(rows[0].participant_id);
  }
  await db.query('INSERT INTO checkins (participant_id, event_id) VALUES ($1, $3), ($2, $3)', [people[0], people[1], eventId]);
  await db.query("INSERT INTO lucky_draw_winners (participant_id, event_id, prize_name) VALUES ($1, $2, 'Jest Reset Prize')", [people[0], eventId]);
  await db.query(
    `INSERT INTO agenda_items (event_id, title, start_at, end_at) VALUES
       ($1, 'Jest opening', '2026-10-01 09:00+07', '2026-10-01 10:00+07'),
       ($1, 'Jest closing', '2026-10-01 16:00+07', '2026-10-01 17:00+07')`,
    [eventId]
  );
  await db.query("INSERT INTO lucky_draw_prizes (event_id, name, quantity) VALUES ($1, 'Jest Reset Prize', 2), ($1, 'Jest Other Prize', 1)", [eventId]);
}

async function clearEvent() {
  for (const table of ['lucky_draw_winners', 'checkins', 'participants', 'organization_types', 'agenda_items', 'lucky_draw_prizes']) {
    await db.query(`DELETE FROM ${table} WHERE event_id = $1`, [eventId]);
  }
}

beforeAll(async () => {
  await db.testConnection();
  await initTables();
  admin = tokenFor(await createUser('jest_reset_admin', 'Admin'), 'jest_reset_admin', 'Admin');
  staff = tokenFor(await createUser('jest_reset_staff', 'Staff'), 'jest_reset_staff', 'Staff');
  savedSettings = (await db.query('SELECT key, value FROM settings')).rows;
  eventId = (await db.query(
    "INSERT INTO events (title, start_date, end_date) VALUES ('Jest Reset Event', NOW(), NOW() + interval '1 day') RETURNING event_id"
  )).rows[0].event_id;

  server = http.createServer(app);
  const io = new Server(server);
  attachRealtime(io);
  app.set('io', io);
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  app.get('io').close();
  await new Promise((r) => server.close(r));
  await db.query('DELETE FROM events WHERE event_id = $1', [eventId]); // cascades to all of the test event's data
  for (const { key, value } of savedSettings) {
    await db.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [key, value]);
  }
  await deleteUsers(['jest_reset_admin', 'jest_reset_staff']);
  await db.pool.end();
});

beforeEach(async () => {
  await clearEvent();
  await seedEvent();
});

describe('who may reset', () => {
  it('needs an Admin login (Staff is refused)', async () => {
    expect((await request(app).post(`/api/v1/events/${eventId}/reset`).send({ sections: ['agenda'] })).statusCode).toBe(401);
    const byStaff = await reset(['agenda'], staff);
    expect(byStaff.statusCode).toBe(403);
    expect((await request(app).get(`/api/v1/events/${eventId}/reset-summary`).set(bearer(staff))).statusCode).toBe(403);
    expect(await count('agenda_items')).toBe(2);
  });

  it('refuses an empty or unknown list of sections, and an unknown event', async () => {
    for (const sections of [[], ['everything'], 'agenda', ['agenda', 'nope'], [null]]) {
      const res = await reset(sections);
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('INVALID_SECTIONS');
    }
    expect((await request(app).post('/api/v1/events/999999/reset').set(bearer(admin)).send({ sections: ['agenda'] })).body.error).toBe('EVENT_NOT_FOUND');
    expect((await request(app).get('/api/v1/events/999999/reset-summary').set(bearer(admin))).statusCode).toBe(404);
    expect(await count('agenda_items')).toBe(2);
  });
});

describe('summary for the confirmation popups', () => {
  it('counts what each reset would remove', async () => {
    await request(app).put('/api/v1/settings').set(bearer(admin)).send({ event_name: 'Jest Event', contact_phone: '0811111111', registration_intro: 'Jest intro' });
    const res = await request(app).get(`/api/v1/events/${eventId}/reset-summary`).set(bearer(admin));
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      organization_types: 1,
      participants_with_organization_type: 3,
      agenda_items: 2,
      prizes: 2,
      participants: 3,
      checkins: 2,
      winners: 1,
      default_organization_types: DEFAULT_TYPES.length,
    });
    expect(res.body.data.general_changed).toBeGreaterThanOrEqual(2);
    expect(res.body.data.registration_changed).toBeGreaterThanOrEqual(1);
  });
});

describe('one section at a time', () => {
  it('agenda: removes this event\'s agenda only', async () => {
    const realEventAgenda = await count('agenda_items', 1);
    const res = await reset(['agenda']);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.removed).toEqual({ agenda_items: 2 });
    expect(await count('agenda_items')).toBe(0);
    expect(await count('agenda_items', 1)).toBe(realEventAgenda);
    expect(await count('lucky_draw_prizes')).toBe(2);
    expect(await count('participants')).toBe(3);
  });

  it('prizes: removes the prize list, the draw results stay with the attendees', async () => {
    const res = await reset(['prizes']);
    expect(res.body.data.removed).toEqual({ prizes: 2 });
    expect(await count('lucky_draw_prizes')).toBe(0);
    expect(await count('lucky_draw_winners')).toBe(1);
  });

  it('organization types: back to the default list; attendees who stay become "not specified"', async () => {
    const res = await reset(['organizations']);
    expect(res.body.data.removed).toEqual({ organization_types: 1 });
    const { rows } = await db.query('SELECT name_th, name_en, color, sort_order FROM organization_types WHERE event_id = $1 ORDER BY sort_order', [eventId]);
    expect(rows).toEqual(DEFAULT_TYPES.map(([nameTh, nameEn, color], i) => ({ name_th: nameTh, name_en: nameEn, color, sort_order: i + 1 })));
    expect(await count('participants')).toBe(3);
    expect((await db.query('SELECT COUNT(*)::int AS n FROM participants WHERE event_id = $1 AND organization_type_id IS NOT NULL', [eventId])).rows[0].n).toBe(0);
  });

  it('attendees: removes attendees with their check-ins and lucky-draw wins, nothing of the real event', async () => {
    const realEventPeople = await count('participants', 1);
    const res = await reset(['attendees']);
    expect(res.body.data.removed).toEqual({ participants: 3, checkins: 2, winners: 1 });
    for (const table of ['participants', 'checkins', 'lucky_draw_winners']) expect(await count(table)).toBe(0);
    expect(await count('participants', 1)).toBe(realEventPeople);
    expect(await count('lucky_draw_prizes')).toBe(2);
  });

  it('general and registration page: the settings of that tab go back to their defaults', async () => {
    await request(app).put('/api/v1/settings').set(bearer(admin)).send({ event_name: 'Jest Event', contact_phone: '0811111111', registration_intro: 'Jest intro' });

    const general = await reset(['general']);
    expect(Object.keys(general.body.data.settings).sort()).toEqual([...SETTINGS_GROUPS.general].sort());
    expect(await setting('event_name')).toBe(DEFAULT_SETTINGS.event_name);
    expect(await setting('contact_phone')).toBe('');
    expect(await setting('registration_intro')).toBe('Jest intro');

    await reset(['registration']);
    expect(await setting('registration_intro')).toBe('');
    expect((await request(app).get('/api/v1/settings')).body.data.event_name).toBe('SMART EVENT REGISTRATION');
  });
});

describe('everything at once', () => {
  it('resets all sections together and tells every open screen', async () => {
    const screen = connect(url, { transports: ['websocket'], forceNew: true });
    await new Promise((r) => screen.on('connect', r));
    const seen = [];
    screen.onAny((event, payload) => seen.push({ event, payload }));

    const res = await reset(ALL);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.sections).toEqual(ALL);
    for (const table of ['participants', 'checkins', 'lucky_draw_winners', 'agenda_items', 'lucky_draw_prizes']) expect(await count(table)).toBe(0);
    expect(await count('organization_types')).toBe(DEFAULT_TYPES.length);

    await new Promise((r) => setTimeout(r, 300));
    screen.disconnect();
    const events = seen.map((s) => s.event);
    expect(events).toEqual(expect.arrayContaining(['settings:update', 'agenda:update', 'prizes:update', 'organization-types:update', 'overview:update', 'data:reset']));
    expect(seen.find((s) => s.event === 'data:reset').payload).toEqual({ event_id: eventId, sections: ALL });
    expect(seen.find((s) => s.event === 'agenda:update').payload.items).toEqual([]);
    expect(seen.find((s) => s.event === 'settings:update').payload.event_name).toBe(DEFAULT_SETTINGS.event_name);
    // the public screen never receives the attendee list
    expect(events).not.toContain('participants:update');
  });

  it('is all or nothing: when one step fails, nothing is removed', async () => {
    DEFAULT_TYPES.push([null, 'broken default', 'blue']); // name_th NOT NULL: the org type step fails
    try {
      const res = await reset(['attendees', 'organizations', 'agenda']);
      expect(res.statusCode).toBe(500);
    } finally {
      DEFAULT_TYPES.pop();
    }
    expect(await count('participants')).toBe(3);
    expect(await count('checkins')).toBe(2);
    expect(await count('organization_types')).toBe(1);
    expect(await count('agenda_items')).toBe(2);
  });
});
