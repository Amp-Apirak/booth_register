// Thai UI text for the "scanner" area (source of truth — en/scanner.ts must mirror every key)
export const scanner = {
  // Page header
  title: 'จุดสแกนบัตรผ่านประตู',
  subtitle: 'ยิงสแกน Barcode / QR Code เพื่อบันทึกประวัติการเข้างานและส่งชื่อขึ้นจอ Signage',
  beepOff: 'ปิดเสียง Beep',
  beepOn: 'เปิดเสียง Beep',
  // Live gate counters
  stats: {
    registered: 'ผู้ลงทะเบียนทั้งหมด',
    checkedIn: 'ผ่านประตูเข้างานแล้ว',
    pending: 'ยังไม่ผ่านประตู',
  },
  // Camera QR scanning
  camera: {
    start: 'เปิดกล้องสแกน QR',
    stop: 'ปิดกล้อง',
    deviceFallback: (n: number) => `กล้อง ${n}`, // camera picker when the browser gives no label
    unsupported: 'เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง (ต้องเปิดผ่าน localhost หรือ https)',
    notAllowed: 'ไม่ได้รับอนุญาตให้ใช้กล้อง — กดไอคอนกล้องที่แถบ URL แล้วเลือก "อนุญาต"',
    notFound: 'ไม่พบกล้องบนเครื่องนี้',
    inUse: 'กล้องถูกใช้งานโดยโปรแกรมอื่นอยู่ (เช่น Zoom / Teams)',
    failed: 'ไม่สามารถเปิดกล้องได้',
  },
  // Ticket code input (scanner gun or keyboard)
  form: {
    placeholder: 'สแกน QR Code หรือกรอกรหัสตั๋วที่นี่...',
    submit: 'ยืนยันเข้างาน',
  },
  // Check-in result banners
  result: {
    errorTitle: 'ไม่สามารถดำเนินการได้',
    notFound: 'ไม่พบรหัสตั๋วนี้ในระบบ',
    alreadyCheckedIn: (name: string, time: string) => `${name} เช็คอินไปแล้ว${time ? ` เมื่อ ${time} น.` : ''}`,
    alreadyCheckedInUnknown: 'ตั๋วนี้เช็คอินไปแล้ว',
    connectionError: 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเกตเวย์เซิร์ฟเวอร์',
  },
};
