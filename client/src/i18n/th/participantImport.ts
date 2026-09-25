// Thai UI text for the "participantImport" area (source of truth — en/participantImport.ts must mirror every key)
export const participantImport = {
  title: 'นำเข้ารายชื่อผู้เข้าร่วมงาน',
  subtitle: (maxRows: number) => `รองรับไฟล์ Excel (.xlsx, .xls) และ CSV · สูงสุด ${maxRows.toLocaleString()} แถว`,
  // Step 1: pick a file
  pickFile: 'เลือกไฟล์ หรือลากไฟล์มาวางที่นี่',
  requiredColumns: 'คอลัมน์ที่ต้องมี: ชื่อ-นามสกุล, บริษัท/องค์กร',
  downloadTemplate: 'ดาวน์โหลดไฟล์ตัวอย่าง',
  errors: {
    missingColumns: 'ไม่พบคอลัมน์ "ชื่อ-นามสกุล" หรือ "บริษัท/องค์กร" ในแถวแรกของไฟล์ — ลองดาวน์โหลดไฟล์ตัวอย่าง',
    noData: 'ไม่พบข้อมูลในไฟล์',
    tooManyRows: (rows: number, max: number) =>
      `ไฟล์มี ${rows.toLocaleString()} แถว — นำเข้าได้สูงสุด ${max.toLocaleString()} แถวต่อครั้ง`,
    unreadable: 'อ่านไฟล์ไม่ได้ — รองรับเฉพาะ .xlsx, .xls และ .csv',
    importFailed: 'นำเข้าไม่สำเร็จ',
    nothingSaved: (detail: string) => `นำเข้าไม่สำเร็จ ไม่มีข้อมูลใดถูกบันทึก — ${detail}`,
  },
  // Step 2: preview
  preview: {
    total: (n: number) => `ทั้งหมด ${n.toLocaleString()} แถว`,
    ready: (n: number) => `พร้อมนำเข้า ${n.toLocaleString()}`,
    withIssues: (n: number) => `มีปัญหา (จะข้าม) ${n.toLocaleString()}`,
    rowReady: 'พร้อม',
    limited: (limit: number, total: number) => `แสดงตัวอย่าง ${limit} แถวแรก จากทั้งหมด ${total.toLocaleString()} แถว`,
    note: 'ผู้ที่มีอีเมลซ้ำกับข้อมูลในระบบจะถูกข้ามอัตโนมัติ · ระบบจะสร้างรหัสตั๋ว QR ให้ทุกคน (ไม่ส่งอีเมลตั๋ว)',
    importButton: (n: number) => `นำเข้า ${n.toLocaleString()} รายการ`,
  },
  table: {
    row: 'แถว',
    name: 'ชื่อ-นามสกุล',
    company: 'บริษัท/องค์กร',
    position: 'ตำแหน่ง',
    email: 'อีเมล',
    phone: 'เบอร์โทร',
    type: 'ประเภท',
    status: 'สถานะ',
  },
  // Step 3: result
  result: {
    imported: (n: number) => `นำเข้าสำเร็จ ${n.toLocaleString()} รายการ`,
    skipped: (n: number) => `ข้าม ${n.toLocaleString()} รายการ (รายละเอียดด้านล่าง)`,
    allImported: 'ทุกแถวถูกนำเข้าเรียบร้อย',
    ticketsCreated: 'ระบบสร้างรหัสตั๋ว QR ให้ทุกคนอัตโนมัติ',
    notImported: 'แถวที่ไม่ได้นำเข้า',
    rowNumber: (row: number) => `แถว ${row}`,
    importAnother: 'นำเข้าไฟล์อื่น',
    done: 'เสร็จสิ้น',
  },
  // Row problems found in the browser (ImportIssue codes in lib/participantImport.ts)
  issues: {
    MISSING_NAME: 'ไม่มีชื่อ',
    MISSING_COMPANY: 'ไม่มีบริษัท',
    INVALID_EMAIL: 'อีเมลไม่ถูกต้อง',
    DUPLICATE_IN_FILE: 'อีเมลซ้ำในไฟล์',
  },
  // Skip reasons returned by the server (POST /participants/import); unknown codes are shown as-is
  serverSkip: {
    DUPLICATE_EMAIL: 'อีเมลนี้มีในระบบแล้ว',
    MISSING_REQUIRED_FIELDS: 'ไม่มีชื่อหรือบริษัท',
    INVALID_EMAIL: 'อีเมลไม่ถูกต้อง',
  },
  // Example rows in the downloadable template (column headers come from lib/participantImport.ts)
  template: {
    sampleName1: 'สมชาย ใจดี',
    sampleCompany1: 'บริษัท ตัวอย่าง จำกัด',
    samplePosition1: 'ผู้จัดการฝ่ายไอที',
    sampleName2: 'สมหญิง รักงาน',
  },
};
