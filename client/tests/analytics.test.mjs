// Buckets use local time; pin the zone so results match on any machine / CI
process.env.TZ = 'Asia/Bangkok';

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_FILTERS, applyFilters, byOrgType, checkinsByHour, filtersFromQuery, filtersToQuery,
  funnel, kpis, presetRange, registrationsByDay, topCompanies,
} from '../src/lib/analytics.ts';

const types = [
  { id: 1, name_th: 'ราชการ', name_en: 'Government', color: 'blue', sort_order: 1, is_active: true },
  { id: 2, name_th: 'เอกชน', name_en: 'Private', color: 'red', sort_order: 2, is_active: true },
  { id: 3, name_th: 'สถานศึกษา', name_en: 'Education', color: 'green', sort_order: 3, is_active: false },
];

// registered_at / checked_in_at in UTC; Bangkok is UTC+7
const people = [
  { id: 1, name: 'A', company: 'ACME', status: 'Checked-in', attendee_type: 'VIP', organization_type_id: 1, registered_at: '2026-09-18T03:00:00Z', checked_in_at: '2026-09-21T02:10:00Z' }, // 09:10
  { id: 2, name: 'B', company: 'acme ', status: 'Pending', attendee_type: 'General', organization_type_id: 1, registered_at: '2026-09-18T20:00:00Z' }, // 19 Sep 03:00 local
  { id: 3, name: 'C', company: 'Beta', status: 'Checked-in', attendee_type: 'General', organization_type_id: 2, registered_at: '2026-09-20T05:00:00Z', checked_in_at: '2026-09-21T02:50:00Z' }, // 09:50
  { id: 4, name: 'D', company: 'Gamma', status: 'Checked-in', attendee_type: 'General', organization_type_other: 'มูลนิธิ', registered_at: '2026-09-20T06:00:00Z', checked_in_at: '2026-09-21T04:05:00Z' }, // 11:05
  { id: 5, name: 'E', company: '', status: 'Pending', attendee_type: 'General', registered_at: '2026-09-20T07:00:00Z' },
];

test('kpis', () => {
  assert.deepEqual(kpis(people), {
    registered: 5, checkedIn: 3, pending: 2, showUpRate: 60, vip: 1, organizations: 3, peakHour: { hour: 9, count: 2 },
  });
  assert.equal(kpis([]).showUpRate, 0);
  assert.equal(kpis([]).peakHour, null);
});

test('byOrgType keeps configured order, hides inactive empty types, appends other/none', () => {
  const rows = byOrgType(people, types);
  assert.deepEqual(rows.map((r) => [r.key, r.registered, r.checkedIn, r.share, r.showUpRate]), [
    [1, 2, 1, 40, 50],
    [2, 1, 1, 20, 100],
    ['other', 1, 1, 20, 100],
    ['none', 1, 0, 20, 0],
  ]);
});

test('registrationsByDay fills gaps and accumulates (local days)', () => {
  assert.deepEqual(registrationsByDay(people), [
    { day: '2026-09-18', count: 1, cumulative: 1 },
    { day: '2026-09-19', count: 1, cumulative: 2 },
    { day: '2026-09-20', count: 3, cumulative: 5 },
  ]);
  assert.deepEqual(registrationsByDay([]), []);
});

test('checkinsByHour covers first..last hour with zeros between', () => {
  assert.deepEqual(checkinsByHour(people), [
    { hour: 9, count: 2 }, { hour: 10, count: 0 }, { hour: 11, count: 1 },
  ]);
});

test('topCompanies merges names case/space-insensitively and skips blanks', () => {
  assert.deepEqual(topCompanies(people, 2), [
    { company: 'ACME', registered: 2, checkedIn: 1 },
    { company: 'Beta', registered: 1, checkedIn: 1 },
  ]);
});

test('funnel', () => {
  assert.deepEqual(funnel(people, new Set([3, 99])), [
    { stage: 'registered', count: 5, ofPrevious: null },
    { stage: 'checkedIn', count: 3, ofPrevious: 60 },
    { stage: 'winners', count: 1, ofPrevious: 33.3 },
  ]);
});

test('applyFilters combines search, org, status, type, date range and cross-filters', () => {
  const ids = (f) => applyFilters(people, { ...EMPTY_FILTERS, ...f }).map((p) => p.id);
  assert.deepEqual(ids({}), [1, 2, 3, 4, 5]);
  assert.deepEqual(ids({ search: 'acme' }), [1, 2]);
  assert.deepEqual(ids({ search: 'มูลนิธิ' }), [4]);
  assert.deepEqual(ids({ orgKeys: [1, 'none'] }), [1, 2, 5]);
  assert.deepEqual(ids({ status: 'pending' }), [2, 5]);
  assert.deepEqual(ids({ attendeeType: 'VIP' }), [1]);
  assert.deepEqual(ids({ from: '2026-09-19T00:00', to: '2026-09-20T12:00' }), [2, 3]);
  assert.deepEqual(ids({ day: '2026-09-20' }), [3, 4, 5]);
  assert.deepEqual(ids({ hour: 9 }), [1, 3]);
  assert.deepEqual(ids({ day: '2026-09-20', hour: 11 }), [4]);
});

test('filters round-trip through the report URL', () => {
  const f = { ...EMPTY_FILTERS, search: 'a b', orgKeys: [2, 'other'], status: 'checked', attendeeType: 'VIP', from: '2026-09-01T00:00', to: '2026-09-30T23:59', day: '2026-09-20', hour: 9 };
  assert.deepEqual(filtersFromQuery(new URLSearchParams(filtersToQuery(f))), f);
  assert.equal(filtersToQuery(EMPTY_FILTERS), '');
  assert.deepEqual(filtersFromQuery(new URLSearchParams('status=bogus&hour=99&org=x,1')), { ...EMPTY_FILTERS, orgKeys: [1] });
});

test('presetRange', () => {
  const now = new Date(2026, 8, 25, 14, 30);
  assert.deepEqual(presetRange('today', now), { from: '2026-09-25T00:00', to: '2026-09-25T23:59' });
  assert.deepEqual(presetRange('last7', now), { from: '2026-09-19T00:00', to: '2026-09-25T23:59' });
  assert.deepEqual(presetRange('event', now, '2026-09-21T08:00', '2026-09-22T17:00'), { from: '2026-09-21T00:00', to: '2026-09-22T23:59' });
  assert.deepEqual(presetRange('event', now, '', ''), { from: '', to: '' });
  assert.deepEqual(presetRange('all', now), { from: '', to: '' });
});
