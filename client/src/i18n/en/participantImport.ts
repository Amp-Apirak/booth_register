import type { participantImport as Th } from '../th/participantImport';

// "1 row" / "2 rows" — numbers formatted the same way as the Thai text
const count = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

export const participantImport: typeof Th = {
  title: 'Import attendees',
  subtitle: (maxRows: number) => `Excel (.xlsx, .xls) and CSV files · up to ${count(maxRows, 'row', 'rows')}`,
  pickFile: 'Choose a file or drag it here',
  requiredColumns: 'Required columns: Full name, Company',
  downloadTemplate: 'Download template',
  errors: {
    missingColumns: 'The "Full name" or "Company" column is missing from the first row of the file — try downloading the template',
    noData: 'No data found in the file',
    tooManyRows: (rows: number, max: number) =>
      `The file has ${count(rows, 'row', 'rows')} — you can import up to ${count(max, 'row', 'rows')} at a time`,
    unreadable: 'Could not read the file — only .xlsx, .xls and .csv are supported',
    importFailed: 'Import failed',
    nothingSaved: (detail: string) => `Import failed, nothing was saved — ${detail}`,
  },
  preview: {
    total: (n: number) => `${count(n, 'row', 'rows')} in total`,
    ready: (n: number) => `Ready to import: ${n.toLocaleString()}`,
    withIssues: (n: number) => `With issues (will be skipped): ${n.toLocaleString()}`,
    rowReady: 'Ready',
    limited: (limit: number, total: number) => `Showing the first ${limit} of ${count(total, 'row', 'rows')}`,
    note: 'Attendees whose email is already in the system are skipped automatically · Everyone gets a QR ticket code (no ticket emails are sent)',
    importButton: (n: number) => `Import ${count(n, 'attendee', 'attendees')}`,
  },
  table: {
    row: 'Row',
    name: 'Full name',
    company: 'Company',
    position: 'Position',
    email: 'Email',
    phone: 'Phone',
    type: 'Type',
    status: 'Status',
  },
  result: {
    imported: (n: number) => `Imported ${count(n, 'attendee', 'attendees')}`,
    skipped: (n: number) => `Skipped ${count(n, 'row', 'rows')} (details below)`,
    allImported: 'All rows were imported',
    ticketsCreated: 'QR ticket codes were created for everyone automatically',
    notImported: 'Rows not imported',
    rowNumber: (row: number) => `Row ${row}`,
    importAnother: 'Import another file',
    done: 'Done',
  },
  issues: {
    MISSING_NAME: 'Missing name',
    MISSING_COMPANY: 'Missing company',
    INVALID_EMAIL: 'Invalid email',
    DUPLICATE_IN_FILE: 'Duplicate email in file',
  },
  serverSkip: {
    DUPLICATE_EMAIL: 'Email already in the system',
    MISSING_REQUIRED_FIELDS: 'Missing name or company',
    INVALID_EMAIL: 'Invalid email',
  },
  template: {
    sampleName1: 'Somchai Jaidee',
    sampleCompany1: 'Example Co., Ltd.',
    samplePosition1: 'IT Manager',
    sampleName2: 'Somying Rakngan',
  },
};
