// Thai UI text for the "luckyDraw" area (source of truth — en/luckyDraw.ts must mirror every key)
export const luckyDraw = {
  // Page header
  title: 'วงล้อสุ่มรางวัล (Lucky Draw)',
  subtitle: 'ระบบสุ่มรางวัลผู้โชคดีสำหรับผู้เข้าร่วมงานที่เช็คอินแล้ว',
  soundOff: 'ปิดเสียง Sound FX',
  soundOn: 'เปิดเสียง Sound FX',
  eligible: (n: number) => `มีสิทธิ์สุ่ม ${n} คน`,
  // Prize picker
  prizes: {
    selectLabel: 'เลือกของรางวัลที่ต้องการจับสลาก (Prize Selection):',
    remaining: (n: number) => `คงเหลือ ${n} รางวัล`,
    empty: 'ยังไม่มีของรางวัลที่เปิดใช้งาน กรุณาเพิ่มจาก ตั้งค่าระบบ › จัดการของรางวัล',
    // Placeholder prize shown while no prize is active (the spin button is disabled then)
    fallbackName: 'รางวัลพิเศษ',
    fallbackDescription: 'กรุณาเพิ่มของรางวัลจากหน้าตั้งค่าระบบ',
  },
  // Draw stage
  stage: {
    prizeWon: 'ของรางวัลที่ได้รับ',
    readyRemaining: (n: number) => `พร้อมสุ่ม · เหลือ ${n} รางวัล`,
    spin: 'SPIN • สุ่มรางวัล',
    spinning: 'กำลังสุ่มรายชื่อ...',
  },
  // Spin refused / failed
  errors: {
    title: 'สุ่มรางวัลไม่สำเร็จ',
    PRIZE_SOLD_OUT: 'ของรางวัลนี้แจกครบจำนวนแล้ว กรุณาเลือกรางวัลอื่น',
    PRIZE_INACTIVE: 'ของรางวัลนี้ปิดการสุ่มอยู่ (เปิดได้ที่ ตั้งค่าระบบ › จัดการของรางวัล)',
    PRIZE_NOT_FOUND: 'ไม่พบของรางวัลนี้ในระบบ กรุณารีเฟรชหน้า',
    NO_ELIGIBLE_PARTICIPANTS: 'ไม่มีผู้มีสิทธิ์เหลือแล้ว (ต้องเช็คอินเข้างานและยังไม่เคยได้รางวัล)',
    generic: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่',
  } as Record<string, string>,
  // Winners list
  winners: {
    title: 'รายชื่อผู้ได้รับรางวัล',
    noCompany: 'ไม่ระบุบริษัท',
  },
};
