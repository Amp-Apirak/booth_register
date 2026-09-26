// Thai text for exporting and resetting event data: every settings tab + Settings → สำรองและรีเซ็ต (ADR-0017)
// (source of truth — en/dataReset.ts must mirror every key)
export const dataReset = {
  // one name per section: buttons, popups, the backup file's summary sheet
  sections: {
    general: 'ข้อมูลทั่วไป',
    registration: 'หน้าลงทะเบียน',
    organizations: 'ประเภทองค์กร',
    agenda: 'กำหนดการ',
    prizes: 'ของรางวัล',
    attendees: 'ข้อมูลผู้เข้าร่วม',
  },
  // what each section holds (rows of the backup tab)
  sectionHints: {
    general: 'ชื่องาน โลโก้ สถานที่ วันเวลา ผู้ติดต่อ และนโยบายความเป็นส่วนตัว',
    registration: 'รูปแบนเนอร์ รูปโบรชัวร์ ข้อความแนะนำงาน วัตถุประสงค์ และเงื่อนไข',
    organizations: 'ตัวเลือกประเภทองค์กรในหน้าลงทะเบียน',
    agenda: 'กำหนดการทั้งหมด (จอ LED หน้ากำหนดการ)',
    prizes: 'รายการของรางวัลสำหรับจับรางวัล',
    attendees: 'รายชื่อผู้ลงทะเบียน การเช็คอิน และผู้ได้รางวัล',
  },
  // current amount of data per section (backup tab)
  counts: {
    fieldsFilled: (n: number) => (n > 0 ? `กรอกไว้ ${n} ช่อง` : 'เป็นค่าเริ่มต้นอยู่แล้ว'),
    items: (n: number) => `${n} รายการ`,
    types: (n: number) => `${n} ประเภท`,
    attendees: (people: number, checkins: number, winners: number) => `${people} คน · เช็คอิน ${checkins} · ได้รางวัล ${winners}`,
  },
  actions: {
    export: 'ส่งออก Excel',
    reset: 'รีเซ็ตเป็นค่าเริ่มต้น',
    resetShort: 'รีเซ็ต', // phones: the row / tab already names the section
    exportAll: 'ส่งออกทั้งหมด (Excel ไฟล์เดียว)',
    resetAll: 'รีเซ็ตทั้งระบบ (เริ่มงานใหม่)',
  },
  page: {
    title: 'สำรองข้อมูลและรีเซ็ตระบบ',
    subtitle: 'เมื่อจบงาน ให้ส่งออกข้อมูลเก็บไว้ก่อน แล้วจึงรีเซ็ตระบบกลับเป็นค่าเริ่มต้นเพื่อใช้กับงานถัดไป',
    step1: 'ขั้นที่ 1 · สำรองข้อมูล (ส่งออก Excel)',
    step1Hint: 'ดาวน์โหลดทุกหมวดในไฟล์เดียว (แยกชีตตามหมวด) หรือเลือกทีละหมวด · ไฟล์ของกำหนดการ ของรางวัล และผู้เข้าร่วม ที่ส่งออกทีละหมวด นำเข้ากลับได้จากหน้าของหมวดนั้น',
    step2: 'ขั้นที่ 2 · รีเซ็ตกลับเป็นค่าเริ่มต้น',
    step2Hint: 'รีเซ็ตทีละหมวด หรือทั้งระบบในครั้งเดียว · ทุกครั้งจะมีหน้าต่างแจ้งสิ่งที่จะถูกลบให้ยืนยันก่อน',
    imagesNote: 'รูปภาพ (โลโก้ แบนเนอร์ รูปวิทยากร รูปของรางวัล รูปผู้เข้าร่วม) ไม่รวมในไฟล์ Excel ในไฟล์จะระบุว่า "มีรูปในระบบ" กรุณาเก็บไฟล์รูปต้นฉบับไว้เอง',
    accountsNote: 'บัญชีผู้ใช้ (Admin / Staff) ไม่ถูกลบ ใช้เข้าระบบได้ตามเดิม',
    loading: 'กำลังโหลดจำนวนข้อมูล…',
    loadFailed: 'โหลดจำนวนข้อมูลไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่',
    retry: 'ลองใหม่',
  },
  confirm: {
    title: (section: string) => `รีเซ็ต "${section}" เป็นค่าเริ่มต้น?`,
    titleAll: 'รีเซ็ตทั้งระบบเพื่อเริ่มงานใหม่?',
    willHappen: 'สิ่งที่จะเกิดขึ้น',
    // one line per section; numbers come from the server
    general: (n: number) => (n > 0
      ? `ล้างข้อมูลทั่วไปที่กรอกไว้ ${n} ช่อง ชื่องานกลับเป็น "SMART EVENT REGISTRATION"`
      : 'ข้อมูลทั่วไปเป็นค่าเริ่มต้นอยู่แล้ว'),
    registration: (n: number) => (n > 0 ? `ล้างรูปและข้อความของหน้าลงทะเบียน ${n} ช่อง` : 'หน้าลงทะเบียนเป็นค่าเริ่มต้นอยู่แล้ว'),
    organizations: (n: number, defaults: number) => `ลบประเภทองค์กร ${n} รายการ แล้วใส่รายการเริ่มต้น ${defaults} รายการ`,
    organizationsInUse: (n: number) => `ผู้เข้าร่วม ${n} คนที่เลือกประเภทองค์กรไว้ จะแสดงเป็น "ไม่ระบุ"`,
    agenda: (n: number) => `ลบกำหนดการ ${n} รายการ (จอ LED หน้ากำหนดการจะว่าง)`,
    prizes: (n: number) => `ลบของรางวัล ${n} รายการ`,
    prizesWinnersKept: (n: number) => `รายชื่อผู้ได้รางวัล ${n} คนยังอยู่ (จะถูกลบเมื่อรีเซ็ต "ข้อมูลผู้เข้าร่วม")`,
    attendees: (people: number, checkins: number, winners: number) =>
      `ลบผู้เข้าร่วม ${people} คน การเช็คอิน ${checkins} รายการ และผู้ได้รางวัล ${winners} คน ตัวเลขบนจอ LED จะกลับเป็น 0`,
    accountsKept: 'บัญชีผู้ใช้ (Admin / Staff) ไม่ถูกลบ',
    cannotUndo: 'ลบแล้วกู้คืนไม่ได้ แนะนำให้กด "ส่งออก Excel ก่อน" เพื่อเก็บข้อมูลไว้',
    typeToConfirm: (word: string) => `พิมพ์คำว่า ${word} เพื่อยืนยัน`,
    typeMismatch: (word: string) => `กรุณาพิมพ์คำว่า ${word} ให้ถูกต้อง`,
    exportFirst: 'ส่งออก Excel ก่อน',
    exported: 'ดาวน์โหลดไฟล์แล้ว ตรวจสอบไฟล์ แล้วกดยืนยันเมื่อพร้อม',
    exportFailed: 'ส่งออกไม่สำเร็จ (ยังไม่มีอะไรถูกลบ) กรุณาตรวจการเชื่อมต่อแล้วลองใหม่',
    confirm: 'ยืนยันรีเซ็ต',
    doneTitle: 'รีเซ็ตเรียบร้อย',
    doneText: (sections: string) => `${sections} กลับเป็นค่าเริ่มต้นแล้ว`,
    failed: 'รีเซ็ตไม่สำเร็จ ข้อมูลยังอยู่ครบ (ไม่มีอะไรถูกลบ) กรุณาลองใหม่',
    summaryFailed: 'โหลดจำนวนข้อมูลไม่ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่',
  },
  excel: {
    field: 'รายการ',
    value: 'ข้อมูล',
    imageInSystem: 'มีรูปในระบบ (ไม่รวมในไฟล์)',
    // sheet names (at most 31 characters)
    sheets: {
      summary: 'สรุป',
      general: 'ข้อมูลทั่วไป',
      registration: 'หน้าลงทะเบียน',
      organizations: 'ประเภทองค์กร',
      agenda: 'กำหนดการ',
      prizes: 'ของรางวัล',
      attendees: 'ผู้เข้าร่วม',
      winners: 'ผู้ได้รางวัล',
    },
    summary: {
      eventName: 'ชื่องาน',
      exportedAt: 'ส่งออกเมื่อ',
      exportedBy: 'ส่งออกโดย',
      section: 'หมวด',
      amount: 'จำนวน',
    },
    orgColumns: {
      order: 'ลำดับ',
      nameTh: 'ชื่อ (ไทย)',
      nameEn: 'ชื่อ (อังกฤษ)',
      color: 'สีในกราฟ',
      shown: 'แสดงในหน้าลงทะเบียน',
      usage: 'ผู้เข้าร่วมที่เลือก (คน)',
    },
    winnerColumns: {
      order: 'ลำดับ',
      name: 'ชื่อ-นามสกุล',
      company: 'บริษัท / หน่วยงาน',
      prize: 'ของรางวัล',
      drawnAt: 'เวลาที่ได้รางวัล',
    },
  },
};
