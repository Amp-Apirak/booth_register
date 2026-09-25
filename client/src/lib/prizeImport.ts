// Maps spreadsheet rows (Excel / CSV) to Lucky Draw prizes for import/export.
// Kept free of UI and XLSX code so it can be unit-tested with `node --test`.
import type { Lang } from '@/i18n';

export type PrizeField = 'sort_order' | 'name' | 'code' | 'description' | 'quantity' | 'is_active' | 'image';

// Display text for these codes is in i18n/<lang>/prizes.ts (importAlert.errors)
export type PrizeImportError = 'MISSING_NAME' | 'BAD_QUANTITY' | 'BAD_IMAGE';

// Written by export (in the UI language) instead of the (large) uploaded picture;
// import recognises the marker of every language and keeps the stored image
export const PRIZE_PHOTO_IN_SYSTEM: Record<Lang, string> = {
  th: 'มีรูปในระบบ',
  en: 'Stored in system',
};
const PHOTO_MARKERS = new Set(Object.values(PRIZE_PHOTO_IN_SYSTEM));

// Header names accepted on import (compared case/space-insensitively).
// The first entry of each list is the Thai header of the template / Excel export.
export const PRIZE_HEADERS: Record<PrizeField, string[]> = {
  sort_order: ['ลำดับ', 'order', 'sort_order', 'no', 'no.'],
  name: ['ชื่อของรางวัล', 'ชื่อรางวัล', 'รางวัล', 'name', 'prize', 'prize name'],
  code: ['รหัส', 'code', 'prize code'],
  description: ['รายละเอียด', 'description', 'detail'],
  quantity: ['จำนวน', 'quantity', 'qty'],
  is_active: ['เปิดให้เลือกสุ่ม', 'เปิดใช้งาน', 'active', 'is_active', 'enabled'],
  image: ['รูปภาพ', 'รูป', 'image', 'image url', 'photo'],
};

// English header of the template / export. Each one must also match an alias above,
// so a file downloaded in English imports back.
export const PRIZE_HEADERS_EN: Record<PrizeField, string> = {
  sort_order: 'Order',
  name: 'Prize name',
  code: 'Code',
  description: 'Description',
  quantity: 'Quantity',
  is_active: 'Active',
  image: 'Image',
};

// Column header written to the template / export for the current UI language
export const prizeColumnHeader = (field: PrizeField, lang: Lang): string =>
  lang === 'en' ? PRIZE_HEADERS_EN[field] : PRIZE_HEADERS[field][0];

export interface PrizeImportRow {
  row: number; // Spreadsheet row number (header is row 1)
  sort_order: number; // 0 = keep current / append
  name: string;
  code: string;
  description: string;
  quantity: number;
  is_active: boolean;
  image: string; // '' = keep the current picture
  error?: PrizeImportError;
}

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_]+/g, ' ').trim();
const HEADER_LOOKUP = new Map<string, PrizeField>(
  (Object.entries(PRIZE_HEADERS) as [PrizeField, string[]][]).flatMap(([field, names]) =>
    names.map((n) => [normalizeHeader(n), field] as [string, PrizeField])
  )
);

const parseActive = (value: string) =>
  value === '' || !['ไม่', 'no', 'n', 'false', '0', 'ปิด', 'inactive'].includes(value.toLowerCase());

export function mapPrizeRows(records: Record<string, unknown>[]): { rows: PrizeImportRow[]; missingName: boolean } {
  const columns: Partial<Record<PrizeField, string>> = {};
  for (const header of new Set(records.flatMap((r) => Object.keys(r)))) {
    const field = HEADER_LOOKUP.get(normalizeHeader(header));
    if (field && !columns[field]) columns[field] = header;
  }
  const get = (record: Record<string, unknown>, field: PrizeField) => {
    const key = columns[field];
    return key === undefined ? '' : String(record[key] ?? '').trim();
  };

  const rows: PrizeImportRow[] = [];
  records.forEach((record, index) => {
    const name = get(record, 'name');
    const quantityText = get(record, 'quantity');
    const imageText = get(record, 'image');
    const row: PrizeImportRow = {
      row: index + 2,
      sort_order: Math.max(0, Math.trunc(Number(get(record, 'sort_order')) || 0)),
      name,
      code: get(record, 'code'),
      description: get(record, 'description'),
      quantity: quantityText === '' ? 1 : Number(quantityText),
      is_active: parseActive(get(record, 'is_active')),
      image: PHOTO_MARKERS.has(imageText) ? '' : imageText,
    };
    if (!name && !row.code && !row.description) return; // blank line
    if (!name) row.error = 'MISSING_NAME';
    else if (!Number.isInteger(row.quantity) || row.quantity < 1) row.error = 'BAD_QUANTITY';
    else if (row.image && !/^(https?:\/\/|data:image\/)/.test(row.image)) row.error = 'BAD_IMAGE';
    rows.push(row);
  });
  return { rows, missingName: !columns.name };
}
