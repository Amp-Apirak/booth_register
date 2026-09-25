// Thai UI text for the "ticket" area (source of truth — en/ticket.ts must mirror every key)
export const ticket = {
  title: 'ตั๋วเข้างานดิจิทัล (Digital Pass)',
  subtitle: 'แสดงบัตรดิจิทัลนี้ต่อเจ้าหน้าที่หน้าประตูทางเข้าเพื่อสแกน QR Code เช็คอิน',
  search: {
    placeholder: 'กรอกรหัสตั๋ว เบอร์โทรศัพท์ หรือชื่อ แล้วกดค้นหา',
    searching: 'กำลังค้นหา...',
    submit: 'ค้นหาตั๋ว',
    notFound: 'ไม่พบข้อมูลตั๋วนี้ในระบบ กรุณาตรวจสอบรหัสตั๋ว เบอร์โทรศัพท์ หรือชื่ออีกครั้ง',
    connectionError: 'เกิดข้อผิดพลาดในการเชื่อมต่อ',
  },
  pass: {
    copy: 'คัดลอก',
    codeCopied: 'คัดลอกรหัสแล้ว',
    dateTime: 'วันเวลาจัดงาน',
    venue: 'สถานที่จัดงาน',
    // Shown when the event has no start/end date yet
    fallbackDate: '30 สิงหาคม 2026',
    fallbackTime: '09:00 - 17:00 น.',
  },
  actions: {
    savingImage: 'กำลังบันทึกรูป...',
    saveToPhone: 'บันทึกบัตรลงมือถือ',
    printOrPdf: 'พิมพ์บัตร / บันทึกเป็น PDF',
  },
};
