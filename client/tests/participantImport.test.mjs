import test from 'node:test';
import assert from 'node:assert/strict';

import { mapImportRows, detectColumns, normalizePhone } from '../src/lib/participantImport.ts';

test('maps Thai template headers and normalizes values', () => {
  const rows = mapImportRows([
    { 'ชื่อ-นามสกุล': ' สมชาย ใจดี ', 'บริษัท/องค์กร': 'ACME', 'ตำแหน่ง': 'CTO', 'อีเมล': 'a@x.co', 'เบอร์โทร': '812345678', 'ประเภท': 'vip', 'ประเภทองค์กร': ' สถานศึกษา ' },
  ]);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    row: 2, name: 'สมชาย ใจดี', company: 'ACME', position: 'CTO', email: 'a@x.co',
    phone: '0812345678', attendee_type: 'VIP', organization_type: 'สถานศึกษา', issues: [],
  });
});

test('organization type column: Thai and English headers, blank when missing', () => {
  assert.deepEqual(detectColumns(['Organization type', 'ประเภทผู้เข้าร่วม']), { organization_type: 'Organization type', attendee_type: 'ประเภทผู้เข้าร่วม' });
  const [row] = mapImportRows([{ 'Full name': 'A', Company: 'B' }]);
  assert.equal(row.organization_type, '');
});

test('accepts English headers and re-imports the export format (extra columns ignored)', () => {
  const cols = detectColumns(['Full Name', 'Company', 'E-mail', 'รหัส ID', 'สถานะ']);
  assert.deepEqual(cols, { name: 'Full Name', company: 'Company', email: 'E-mail' });
});

test('flags missing fields, bad and duplicate emails; skips blank lines', () => {
  const rows = mapImportRows([
    { name: 'A', company: '', email: 'dup@x.co' },
    { name: '', company: '', email: '' },
    { name: 'B', company: 'C', email: 'DUP@x.co' },
    { name: 'D', company: 'C', email: 'nope' },
  ]);
  assert.deepEqual(rows.map((r) => [r.row, r.issues]), [
    [2, ['MISSING_COMPANY']],
    [4, ['DUPLICATE_IN_FILE']],
    [5, ['INVALID_EMAIL']],
  ]);
});

test('normalizePhone only restores a dropped leading zero', () => {
  assert.equal(normalizePhone('812345678'), '0812345678');
  assert.equal(normalizePhone('021234567'), '021234567');
  assert.equal(normalizePhone('+66812345678'), '+66812345678');
  assert.equal(normalizePhone('02-123-4567'), '02-123-4567');
});
