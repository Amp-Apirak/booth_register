// Thai UI text for the "home" area (source of truth — en/home.ts must mirror every key)
export const home = {
  // Hero scene (components/EventExperience.tsx) — entrance dialog and top of the home page
  hero: {
    ariaLabel: 'ต้อนรับสู่งานอีเวนต์',
    logoAlt: 'โลโก้งาน',
    motionResume: 'เปิดภาพเคลื่อนไหว', // aria-label of the effects button while paused
    motionPause: 'หยุดภาพเคลื่อนไหว',
    effectsResume: 'เปิดเอฟเฟกต์',
    effectsPause: 'พักเอฟเฟกต์',
    taglineLead: 'ทุกการพบกัน',
    taglineAccent: 'สร้างความเป็นไปได้ใหม่',
    // Rendered as: descriptionLead <br (desktop only)> descriptionTail
    descriptionLead: 'เชื่อมต่อผู้คน เปิดรับแรงบันดาลใจ และร่วมเป็นส่วนหนึ่ง',
    descriptionTail: 'ของประสบการณ์พิเศษ ตั้งแต่ก้าวแรกที่เข้างาน',
    enter: 'เข้าสู่ประสบการณ์',
    register: 'ลงทะเบียนเข้าร่วมงาน',
    registerNow: 'ลงทะเบียนเข้างาน',
    findTicket: 'ค้นหาตั๋วของฉัน',
    readyNote: 'พร้อมแล้ว เริ่มต้นประสบการณ์ของคุณได้เลย',
    replay: 'ชมหน้าเปิดตัวอีกครั้ง',
    // Decorative 3D ticket
    sampleTicket: 'บัตรตัวอย่าง · PREVIEW',
    checkInNote: 'ทุกการพบกัน เริ่มต้นได้ง่าย',
  },
  // Three steps along the bottom of the hero
  journey: {
    register: 'ลงทะเบียนง่าย',
    checkIn: 'เช็คอินได้ทันที',
    enjoy: 'สนุกกับทุกโมเมนต์',
  },
  // Live metric cards (the "pending" card title reuses common.status.pending)
  stats: {
    registered: 'ยอดลงทะเบียน',
    registeredNote: 'ผู้สมัครเข้าร่วมงานทั้งหมด',
    checkedIn: 'เช็คอินเข้างานแล้ว',
    checkedInNote: 'ผ่านจุดสแกนประตูแล้ว',
    pendingNote: 'อยู่ระหว่างการเดินทาง',
  },
  // Feature portal cards
  modules: {
    title: 'ศูนย์ปฏิบัติการและเมนูระบบ',
    subtitle: 'เลือกระบบที่ต้องการเปิดใช้งานเพื่อทดสอบกระบวนการทำงาน',
    open: 'เข้าสู่หน้าการทำงาน',
    register: {
      title: 'ลงทะเบียนออนไลน์',
      desc: 'ลงทะเบียนเข้าร่วมงานสัมมนาล่วงหน้า พร้อมขอความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
    },
    ticket: {
      title: 'ตั๋วเข้างานดิจิทัล',
      desc: 'แสดงบัตรผ่านประตูดิจิทัล (Digital Pass) พร้อมรหัส QR Code เข้ารหัสสำหรับยิงสแกนหน้างาน',
    },
    scanner: {
      title: 'จุดสแกนเข้าประตู',
      desc: 'ระบบสแกนผ่านประตูสำหรับเจ้าหน้าที่ ตรวจสอบตั๋วใน 0.1 วินาที พร้อมระบบบล็อกการสแกนซ้ำ',
    },
    signage: {
      title: 'จอ LED Signage หน้างาน',
      desc: 'ป้ายไฟ LED ต้อนรับผู้เข้าร่วมงานแบบสดๆ ขึ้นชื่อและบริษัทอัตโนมัติทันทีที่สแกนผ่านประตู',
    },
    luckyDraw: {
      title: 'วงล้อสุ่มรางวัล',
      desc: 'ระบบสุ่มจับรางวัลผู้โชคดีเฉพาะคนที่เช็คอินเข้างานแล้ว ตัดสิทธิ์สตาฟและผู้เคยได้รางวัลอัตโนมัติ',
    },
    dashboard: {
      title: 'แดชบอร์ดจัดการ CMS',
      desc: 'ศูนย์ควบคุมสำหรับผู้จัดงาน ดูสถิติสด กราฟ Show-up rate จัดการรายชื่อ และส่งออกข้อมูล',
    },
  },
  // Floating pause button of the site-wide aurora backdrop (components/SiteBackdrop.tsx, every page but /signage)
  backdrop: {
    resume: 'เปิดพื้นหลังเคลื่อนไหว', // label + aria-label while paused
    pause: 'พักพื้นหลัง',
    pauseAria: 'หยุดพื้นหลังเคลื่อนไหว',
  },
};
