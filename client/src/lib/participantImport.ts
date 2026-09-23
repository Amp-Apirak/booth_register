// Maps spreadsheet rows (Excel / CSV) to participants for bulk import.
// Kept free of UI and XLSX code so it can be unit-tested with `node --test`.

export type ImportField = 'name' | 'company' | 'position' | 'email' | 'phone' | 'attendee_type';

export type ImportIssue = 'MISSING_NAME' | 'MISSING_COMPANY' | 'INVALID_EMAIL' | 'DUPLICATE_IN_FILE';

export interface ImportRow {
  row: number; // Spreadsheet row number (header is row 1)
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  attendee_type: 'General' | 'VIP';
  issues: ImportIssue[];
}

export const IMPORT_ISSUE_LABELS: Record<ImportIssue, string> = {
  MISSING_NAME: 'ไม่มีชื่อ',
  MISSING_COMPANY: 'ไม่มีบริษัท',
  INVALID_EMAIL: 'อีเมลไม่ถูกต้อง',
  DUPLICATE_IN_FILE: 'อีเมลซ้ำในไฟล์',
};

export const SERVER_SKIP_LABELS: Record<string, string> = {
  DUPLICATE_EMAIL: 'อีเมลนี้มีในระบบแล้ว',
  MISSING_REQUIRED_FIELDS: 'ไม่มีชื่อหรือบริษัท',
  INVALID_EMAIL: 'อีเมลไม่ถูกต้อง',
};

// Header names accepted per field (compared case/space-insensitively).
// The first entry of each list is used in the downloadable template.
export const IMPORT_HEADERS: Record<ImportField, string[]> = {
  name: ['ชื่อ-นามสกุล', 'ชื่อ', 'ชื่อ นามสกุล', 'name', 'fullname', 'full name'],
  company: ['บริษัท/องค์กร', 'บริษัท', 'องค์กร', 'หน่วยงาน', 'company', 'organization', 'organisation'],
  position: ['ตำแหน่ง', 'position', 'title', 'job title'],
  email: ['อีเมล', 'อีเมล์', 'email', 'e-mail'],
  phone: ['เบอร์โทร', 'เบอร์โทรศัพท์', 'โทรศัพท์', 'phone', 'tel', 'mobile'],
  attendee_type: ['ประเภท', 'ประเภทผู้เข้าร่วม', 'attendee_type', 'type'],
};

const normalizeHeader = (h: string) => h.toLowerCase().replace(/[\s_]+/g, ' ').trim();

const HEADER_LOOKUP = new Map<string, ImportField>(
  (Object.entries(IMPORT_HEADERS) as [ImportField, string[]][]).flatMap(([field, names]) =>
    names.map((n) => [normalizeHeader(n), field] as [string, ImportField])
  )
);

export function detectColumns(headers: string[]): Partial<Record<ImportField, string>> {
  const columns: Partial<Record<ImportField, string>> = {};
  for (const header of headers) {
    const field = HEADER_LOOKUP.get(normalizeHeader(String(header)));
    if (field && !columns[field]) columns[field] = header;
  }
  return columns;
}

// Excel drops the leading 0 of phone numbers stored as numbers (0812345678 → 812345678)
export function normalizePhone(value: string): string {
  const v = value.trim();
  return /^[1-9]\d{7,8}$/.test(v) ? `0${v}` : v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function mapImportRows(records: Record<string, unknown>[]): ImportRow[] {
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  const columns = detectColumns(headers);
  const get = (record: Record<string, unknown>, field: ImportField) => {
    const key = columns[field];
    return key === undefined ? '' : String(record[key] ?? '').trim();
  };

  const seenEmails = new Set<string>();
  const rows: ImportRow[] = [];
  records.forEach((record, index) => {
    const row: ImportRow = {
      row: index + 2,
      name: get(record, 'name'),
      company: get(record, 'company'),
      position: get(record, 'position'),
      email: get(record, 'email'),
      phone: normalizePhone(get(record, 'phone')),
      attendee_type: get(record, 'attendee_type').toUpperCase() === 'VIP' ? 'VIP' : 'General',
      issues: [],
    };
    // Skip fully blank lines (common at the bottom of sheets)
    if (!row.name && !row.company && !row.position && !row.email && !row.phone) return;

    if (!row.name) row.issues.push('MISSING_NAME');
    if (!row.company) row.issues.push('MISSING_COMPANY');
    if (row.email) {
      const key = row.email.toLowerCase();
      if (!EMAIL_RE.test(row.email)) row.issues.push('INVALID_EMAIL');
      else if (seenEmails.has(key)) row.issues.push('DUPLICATE_IN_FILE');
      else seenEmails.add(key);
    }
    rows.push(row);
  });
  return rows;
}
