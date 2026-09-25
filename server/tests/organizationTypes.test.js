const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const db = require('../config/db');
const organizationTypeRepository = require('../repositories/organizationTypeRepository');
const { JWT_SECRET } = require('../middlewares/authMiddleware');

/**
 * Organization types (ADR-0012): public list, staff-only management,
 * required choice on public registration, and the in-use delete guard.
 */
describe('Organization types API', () => {
  const COMPANY = 'Jest OrgType Co';
  const token = jwt.sign({ user_id: 0, username: 'jest', role: 'Admin', fullname: 'Jest' }, JWT_SECRET, { expiresIn: '5m' });
  const auth = { Authorization: `Bearer ${token}` };
  let typeId;

  const register = (extra) => request(app).post('/api/v1/events/1/register').send({
    fullname: 'Jest Org Type', company: COMPANY, phone: '0990000000', pdpa_consent: true, ...extra,
  });

  const cleanup = async () => {
    await db.query('DELETE FROM participants WHERE company = $1', [COMPANY]);
    await db.query("DELETE FROM organization_types WHERE name_th LIKE 'Jest %'");
  };

  beforeAll(async () => {
    await db.testConnection();
    await organizationTypeRepository.initTable(); // same migration the server runs on start
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await db.pool.end();
  });

  it('lists the types publicly, with a chart color on each', async () => {
    const res = await request(app).get('/api/v1/events/1/organization-types?active=true');
    expect(res.statusCode).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const type of res.body.data) {
      expect(type.is_active).toBe(true);
      expect(organizationTypeRepository.COLOR_SLOTS).toContain(type.color);
    }
  });

  it('requires a staff token to create a type', async () => {
    const res = await request(app).post('/api/v1/events/1/organization-types').send({ name_th: 'Jest ไม่มีสิทธิ์', color: 'blue' });
    expect(res.statusCode).toBe(401);
  });

  it('rejects a color outside the validated palette', async () => {
    const res = await request(app).post('/api/v1/events/1/organization-types').set(auth).send({ name_th: 'Jest สีผิด', color: '#ff0000' });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('INVALID_COLOR');
  });

  it('creates a type for staff', async () => {
    const res = await request(app).post('/api/v1/events/1/organization-types').set(auth).send({ name_th: 'Jest มูลนิธิ', name_en: 'Jest foundation', color: 'violet' });
    expect(res.statusCode).toBe(201);
    typeId = res.body.data.id;
    expect(Number.isInteger(typeId)).toBe(true);
  });

  it('makes the choice required on public registration', async () => {
    const res = await register({});
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('ORGANIZATION_TYPE_REQUIRED');
  });

  it('accepts a listed type or free "other" text', async () => {
    const listed = await register({ organization_type_id: typeId });
    expect(listed.statusCode).toBe(201);
    expect(listed.body.data.organization_type_id).toBe(typeId);

    const other = await register({ organization_type_other: '  สมาคมการค้า  ' });
    expect(other.statusCode).toBe(201);
    expect(other.body.data.organization_type_id).toBeNull();
    expect(other.body.data.organization_type_other).toBe('สมาคมการค้า');
  });

  it('refuses to delete a type attendees already chose (409 IN_USE)', async () => {
    const res = await request(app).delete(`/api/v1/events/1/organization-types/${typeId}`).set(auth);
    expect(res.statusCode).toBe(409);
    expect(res.body.error).toBe('IN_USE');
    expect(res.body.usage_count).toBe(1);
  });

  it('hides an inactive type from public registration', async () => {
    const off = await request(app).put(`/api/v1/events/1/organization-types/${typeId}`).set(auth)
      .send({ name_th: 'Jest มูลนิธิ', name_en: 'Jest foundation', color: 'violet', is_active: false });
    expect(off.statusCode).toBe(200);
    const res = await register({ organization_type_id: typeId });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBe('INVALID_ORGANIZATION_TYPE');
  });
});
