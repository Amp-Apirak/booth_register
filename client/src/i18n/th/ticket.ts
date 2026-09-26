// Thai UI text for the "ticket" area (source of truth — en/ticket.ts must mirror every key)
export const ticket = {
  title: 'ตั๋วเข้างานดิจิทัล (Digital Pass)',
  subtitle: 'แสดงบัตรดิจิทัลนี้ต่อเจ้าหน้าที่หน้าประตูทางเข้าเพื่อสแกน QR Code เช็คอิน',
  search: {
    placeholder: 'กรอกรหัสตั๋ว เบอร์โทรศัพท์ หรือชื่อ แล้วกดค้นหา',
    searching: 'กำลังค้นหา...',
    submit: 'ค้นหาตั๋ว',
    notFound: 'ไม่พบข้อมูลตั๋วนี้ในระบบ กรุณาตรวจสอบรหัสตั๋ว เบอร์โทรศัพท์ หรือชื่ออีกครั้ง',
    // Attendee (not logged in): ticket code + proof that the ticket is theirs
    publicHint: 'กรอกรหัสตั๋ว (อยู่ในอีเมลยืนยันการลงทะเบียน) และเบอร์โทร 4 ตัวท้ายที่ใช้ลงทะเบียน',
    codeLabel: 'รหัสตั๋ว',
    verifierLabel: 'เบอร์โทร 4 ตัวท้าย หรืออีเมล',
    verifierPlaceholder: 'เช่น 5678',
    notFoundPublic: 'ไม่พบตั๋ว หรือเบอร์โทร/อีเมลไม่ตรงกับที่ลงทะเบียนไว้',
    tooManyAttempts: 'ลองผิดหลายครั้งเกินไป กรุณารอประมาณ 15 นาที หรือติดต่อเจ้าหน้าที่หน้างาน',
    fieldsRequired: 'กรุณากรอกรหัสตั๋วและเบอร์โทร 4 ตัวท้าย (หรืออีเมล)',
    connectionError: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
  },
  pass: {
    copy: 'คัดลอก',
    codeCopied: 'คัดลอกรหัสแล้ว',
    dateTime: 'วันเวลาจัดงาน',
    venue: 'สถานที่จัดงาน',
  },
  actions: {
    savingImage: 'กำลังบันทึกรูป...',
    saveToPhone: 'บันทึกบัตรลงมือถือ',
    printOrPdf: 'พิมพ์บัตร / บันทึกเป็น PDF',
  },
};
