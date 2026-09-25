import test from 'node:test';
import assert from 'node:assert/strict';

import { mapPrizeRows, prizeColumnHeader, PRIZE_PHOTO_IN_SYSTEM } from '../src/lib/prizeImport.ts';

test('maps exported columns back (extra "แจกแล้ว" column ignored, stored photo kept)', () => {
  const { rows, missingName } = mapPrizeRows([
    { 'ลำดับ': '2', 'ชื่อของรางวัล': 'iPad', 'รหัส': 'P-02', 'รายละเอียด': 'd', 'จำนวน': '3', 'เปิดให้เลือกสุ่ม': 'ไม่', 'รูปภาพ': PRIZE_PHOTO_IN_SYSTEM.th, 'แจกแล้ว': '1' },
  ]);
  assert.equal(missingName, false);
  assert.deepEqual(rows[0], {
    row: 2, sort_order: 2, name: 'iPad', code: 'P-02', description: 'd', quantity: 3, is_active: false, image: '',
  });
});

test('re-imports an English export (English headers, "No", English photo marker, extra "Awarded" column)', () => {
  const h = (field) => prizeColumnHeader(field, 'en');
  const { rows, missingName } = mapPrizeRows([
    { [h('sort_order')]: '2', [h('name')]: 'iPad', [h('code')]: 'P-02', [h('description')]: 'd', [h('quantity')]: '3', [h('is_active')]: 'No', [h('image')]: PRIZE_PHOTO_IN_SYSTEM.en, Awarded: '1' },
    { [h('name')]: 'Mug', [h('is_active')]: 'Yes' },
  ]);
  assert.equal(missingName, false);
  assert.deepEqual(rows, [
    { row: 2, sort_order: 2, name: 'iPad', code: 'P-02', description: 'd', quantity: 3, is_active: false, image: '' },
    { row: 3, sort_order: 0, name: 'Mug', code: '', description: '', quantity: 1, is_active: true, image: '' },
  ]);
});

test('defaults: quantity 1, active, append order; English headers work', () => {
  const { rows } = mapPrizeRows([{ Name: 'Mug', Code: '' }]);
  assert.deepEqual(rows[0], { row: 2, sort_order: 0, name: 'Mug', code: '', description: '', quantity: 1, is_active: true, image: '' });
});

test('flags bad rows and skips blank lines', () => {
  const { rows } = mapPrizeRows([
    { 'ชื่อของรางวัล': '', 'รหัส': 'X' },
    { 'ชื่อของรางวัล': '', 'รหัส': '' },
    { 'ชื่อของรางวัล': 'A', 'จำนวน': '0' },
    { 'ชื่อของรางวัล': 'B', 'รูปภาพ': 'C:\\pic.png' },
  ]);
  assert.deepEqual(rows.map((r) => [r.row, r.error]), [
    [2, 'MISSING_NAME'],
    [4, 'BAD_QUANTITY'],
    [5, 'BAD_IMAGE'],
  ]);
});

test('reports a missing name column', () => {
  assert.equal(mapPrizeRows([{ foo: 'bar' }]).missingName, true);
});
