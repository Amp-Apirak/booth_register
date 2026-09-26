const http = require('http');
const request = require('supertest');
const { Server } = require('socket.io');
const { io: connect } = require('socket.io-client');
const app = require('../app');
const db = require('../config/db');
const { attachRealtime } = require('../utils/realtime');
const { initTables, createUser, deleteUsers, tokenFor, bearer, anyOrganizationTypeId, deleteParticipantsOf } = require('./helpers');

/**
 * Live updates (Socket.io): public screens (LED, register page) get only what they show;
 * the attendee list with personal data goes to logged-in staff screens only.
 */
const COMPANY = 'Jest Realtime Corp';

let server;
let url;
let staff;
let orgTypeId;
const clients = [];

const open = () => new Promise((resolve) => {
  const s = connect(url, { transports: ['websocket'], forceNew: true });
  clients.push(s);
  s.on('connect', () => resolve(s));
});

const record = (socket) => {
  const seen = [];
  socket.onAny((event, payload) => seen.push({ event, payload }));
  return seen;
};

const settle = () => new Promise((r) => setTimeout(r, 300));

beforeAll(async () => {
  await db.testConnection();
  await initTables();
  staff = tokenFor(await createUser('jest_rt_staff', 'Staff'), 'jest_rt_staff', 'Staff');
  orgTypeId = await anyOrganizationTypeId();
  await deleteParticipantsOf(COMPANY);
  server = http.createServer(app);
  const io = new Server(server);
  attachRealtime(io);
  app.set('io', io);
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});

afterAll(async () => {
  clients.forEach((c) => c.disconnect());
  app.get('io').close();
  await new Promise((r) => server.close(r));
  await deleteParticipantsOf(COMPANY);
  await deleteUsers(['jest_rt_staff']);
  await db.pool.end();
});

async function registerAndCheckIn() {
  const res = await request(app).post('/api/v1/events/1/register').send({
    fullname: 'Realtime Guest', company: COMPANY, position: 'Guest', email: `rt_${Date.now()}@example.com`,
    phone: '081-555-0101', pdpa_consent: true, organization_type_id: orgTypeId,
  });
  await request(app).post('/api/v1/checkin').set(bearer(staff)).send({ ticket_code: res.body.data.ticket_code });
}

test('an LED (not logged in) gets the welcome and the numbers, never the attendee list or contact details', async () => {
  const led = await open();
  const seen = record(led);
  await registerAndCheckIn();
  await settle();
  const events = seen.map((e) => e.event);
  expect(events).toContain('welcome:new_checkin');
  expect(events).toContain('overview:update');
  expect(events).not.toContain('participants:update');
  const welcome = seen.find((e) => e.event === 'welcome:new_checkin').payload;
  expect(welcome.name).toBe('Realtime Guest');
  expect(welcome.email).toBeUndefined();
  expect(welcome.phone).toBeUndefined();
  expect(JSON.stringify(seen)).not.toContain('081-555-0101');
});

test('the welcome message is sent before the (bigger) staff list', async () => {
  const dashboard = await open();
  await new Promise((r) => dashboard.emit('staff:join', staff, r));
  const seen = record(dashboard);
  await registerAndCheckIn();
  await settle();
  const events = seen.map((e) => e.event);
  expect(events.indexOf('welcome:new_checkin')).toBeLessThan(events.lastIndexOf('participants:update'));
});

test('a logged-in staff screen receives the live attendee list', async () => {
  const dashboard = await open();
  const ack = await new Promise((r) => dashboard.emit('staff:join', staff, r));
  expect(ack).toEqual({ ok: true });
  const seen = record(dashboard);
  await registerAndCheckIn();
  await settle();
  const list = seen.filter((e) => e.event === 'participants:update').pop();
  expect(list).toBeDefined();
  expect(list.payload.data.some((p) => p.company === COMPANY && p.status === 'Checked-in')).toBe(true);
});

test('a fake token does not unlock the attendee list', async () => {
  const intruder = await open();
  const ack = await new Promise((r) => intruder.emit('staff:join', 'not-a-real-token', r));
  expect(ack).toEqual({ ok: false });
  const seen = record(intruder);
  await registerAndCheckIn();
  await settle();
  expect(seen.map((e) => e.event)).not.toContain('participants:update');
});

test('stats in the live update match the stats endpoint', async () => {
  const led = await open();
  const seen = record(led);
  await registerAndCheckIn();
  await settle();
  const live = seen.filter((e) => e.event === 'overview:update').pop().payload;
  const rest = (await request(app).get('/api/v1/events/1/stats')).body.data;
  expect(live).toEqual(rest);
});
