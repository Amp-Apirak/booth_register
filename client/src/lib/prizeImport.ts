// Maps spreadsheet rows (Excel / CSV) to Lucky Draw prizes for import/export.
// Kept free of UI and XLSX code so it can be unit-tested with `node --test`.

export type PrizeField = 'sort_order' | 'name' | 'code' | 'description' | 'quantity' | 'is_active' | 'image';

// Written by export instead of the (large) uploaded picture; import keeps the stored image
export const PRIZE_PHOTO_IN_SYSTEM = 'มีรูปในระบบ';

// First entry of each list is the column name used by export and the template
export const PRIZE_HEADERS: Record<PrizeField, string[]> = {
  sort_order: ['ลำดับ', 'order', 'sort_order', 'no', 'no.'],
  name: ['ชื่อของรางวัล', 'ชื่อรางวัล', 'รางวัล', 'name', 'prize', 'prize name'],
  code: ['รหัส', 'code', 'prize code'],
  description: ['รายละเอียด', 'description', 'detail'],
  quantity: ['จำนวน', 'quantity', 'qty'],
  is_active: ['เปิดให้เลือกสุ่ม', 'เปิดใช้งาน', 'active', 'is_active', 'enabled'],
  image: ['รูปภาพ', 'รูป', 'image', 'image url', 'photo'],
};

export interface PrizeImportRow {
  row: number; // Spreadsheet row number (header is row 1)
  sort_order: number; // 0 = keep current / append
  name: string;
  code: string;
  description: string;
  quantity: number;
  is_active: boolean;
  image: string; // '' = keep the current picture
  error?: string;
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
      image: imageText === PRIZE_PHOTO_IN_SYSTEM ? '' : imageText,
    };
    if (!name && !row.code && !row.description) return; // blank line
    if (!name) row.error = 'ไม่มีชื่อของรางวัล';
    else if (!Number.isInteger(row.quantity) || row.quantity < 1) row.error = 'จำนวนต้องเป็นเลขจำนวนเต็มตั้งแต่ 1';
    else if (row.image && !/^(https?:\/\/|data:image\/)/.test(row.image)) row.error = 'รูปภาพต้องเป็นลิงก์ https://...';
    rows.push(row);
  });
  return { rows, missingName: !columns.name };
}
