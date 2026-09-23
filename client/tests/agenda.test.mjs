import test from 'node:test';
import assert from 'node:assert/strict';

import { getAgendaStatus, getAgendaForDate } from '../src/lib/agenda.ts';

const item = (start_at, end_at) => ({
  title: 'Session',
  speaker: '',
  location: '',
  description: '',
  start_at,
  end_at,
  is_highlight: false,
});

test('marks the 15:30-16:30 session active at 16:00 Bangkok time', () => {
  const now = new Date('2026-09-21T16:00:00+07:00');
  assert.equal(
    getAgendaStatus(item('2026-09-21T15:30:00+07:00', '2026-09-21T16:30:00+07:00'), now),
    'active',
  );
});

test('shows only sessions scheduled for the current Bangkok calendar date', () => {
  const now = new Date('2026-09-21T16:00:00+07:00');
  const items = [
    item('2026-09-20T15:30:00+07:00', '2026-09-20T16:30:00+07:00'),
    item('2026-09-21T15:30:00+07:00', '2026-09-21T16:30:00+07:00'),
    item('2026-09-22T15:30:00+07:00', '2026-09-22T16:30:00+07:00'),
  ];
  assert.equal(getAgendaForDate(items, now).length, 1);
  assert.equal(getAgendaForDate(items, now)[0].start_at, '2026-09-21T15:30:00+07:00');
});
