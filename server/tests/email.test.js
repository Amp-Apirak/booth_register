require('dotenv').config();
const { buildTicketEmail, formatEventWhen, escapeHtml } = require('../utils/email_sender');

/** The ticket e-mail shows this event's details (from Settings) and never runs attendee input as HTML */
const settings = {
  event_name: 'Thailand Mobile Expo',
  event_start: '2026-09-21T08:00',
  event_end: '2026-09-21T17:00',
  event_venue: 'QSNCC',
  event_building: 'Hall 1',
  organizer_name: 'ACME Events',
  contact_phone: '02-000-0000',
};

test('uses the event name, date, venue and contact from Settings', () => {
  const email = buildTicketEmail({ name: 'สมชาย ใจดี', company: 'ACME', position: 'CTO' }, 'SER20260921123456', settings);
  expect(email.subject).toContain('Thailand Mobile Expo');
  expect(email.fromName).toBe('Thailand Mobile Expo');
  expect(email.html).toContain('<h1>Thailand Mobile Expo</h1>');
  expect(email.html).toContain('21 กันยายน');
  expect(email.html).toContain('08:00 - 17:00');
  expect(email.html).toContain('QSNCC, Hall 1');
  expect(email.html).toContain('02-000-0000');
  expect(email.html).toContain('SER20260921123456');
  expect(email.html).not.toMatch(/Tech Innovation|techsummit|Central Plaza|30 สิงหาคม/i);
});

test('attendee input is shown as text, not HTML', () => {
  const email = buildTicketEmail({ name: '<a href="https://evil.example">Click</a>', company: 'A&B <b>', position: '"x"' }, 'SER1', settings);
  expect(email.html).not.toContain('<a href="https://evil.example">');
  expect(email.html).toContain('&lt;a href=&quot;https://evil.example&quot;&gt;Click&lt;/a&gt;');
  expect(email.html).toContain('A&amp;B &lt;b&gt;');
});

test('rows without a value are left out (no sample data)', () => {
  const email = buildTicketEmail({ name: 'A', company: 'B' }, 'SER1', { event_name: 'X' });
  expect(email.html).not.toContain('วันเวลาจัดงาน');
  expect(email.html).not.toContain('สถานที่จัดงาน');
  expect(email.html).not.toContain('หากมีข้อสงสัยโปรดติดต่อ');
});

test('event times are wall-clock Thai time whatever the server time zone', () => {
  expect(formatEventWhen('2026-09-21T08:00', '2026-09-21T17:00')).toBe('วันจันทร์ที่ 21 กันยายน พ.ศ. 2569 เวลา 08:00 - 17:00 น.');
  expect(formatEventWhen('2026-09-21T08:00', '2026-09-22T17:00')).toContain('วันอังคารที่ 22 กันยายน');
  expect(formatEventWhen('', '')).toBe('');
  expect(escapeHtml(`<>&"'`)).toBe('&lt;&gt;&amp;&quot;&#39;');
});
