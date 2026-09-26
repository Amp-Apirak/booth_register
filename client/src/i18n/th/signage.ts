// Thai UI text for the "signage" area (source of truth — en/signage.ts must mirror every key)
// The stylised English LED labels (WELCOME, LIVE GATE INTELLIGENCE, LUCKY DRAW …) stay in the page on purpose.
export const signage = {
  // Controller bar above the screens (hidden in fullscreen)
  controls: {
    title: 'โหมดจอ LED',
    subtitle: 'เลือกหน้าที่จอนี้จะแสดง แล้วกดเต็มจอ',
    tabs: {
      welcome: 'หน้าต้อนรับ',
      overview: 'ภาพรวมสด',
      agenda: 'กำหนดการ',
      lucky: 'ลุ้นรางวัล',
    },
    fullscreen: 'เต็มจอ',
    fullscreenHint: 'แสดงหน้านี้เต็มจอ (ออกด้วยปุ่มมุมขวาบน หรือกด ESC)',
    exitFullscreen: 'ออกจากเต็มจอ',
    live: 'ถ่ายทอดสด',
    offline: 'ออฟไลน์',
    reconnecting: 'ขาดการเชื่อมต่อ — กำลังเชื่อมต่อใหม่',
  },
  // Screen 1: Welcome
  welcome: {
    waiting: 'กำลังรอผู้ร่วมงานสแกนผ่านประตูทางเข้า...',
  },
  // Screen 2: Live overview
  overview: {
    subtitle: 'ภาพรวมผู้เข้าร่วมงานแบบเรียลไทม์',
    registered: 'ลงทะเบียนทั้งหมด',
    checkedIn: 'เข้างานแล้ว',
    pending: 'ยังไม่มา',
    showUpHint: 'อัตราผู้เข้าร่วมงานจริง ณ เวลาปัจจุบัน',
    latestCheckin: 'เช็คอินล่าสุด',
  },
  // Screen 3: Agenda
  agenda: {
    emptyTitle: 'ไม่มีกำหนดการสำหรับวันนี้',
    emptyHint: 'จอจะแสดงเฉพาะรายการที่ตรงกับวันที่ปัจจุบัน กรุณาตรวจสอบวันที่ในเมนูตั้งค่าระบบ',
    nowOn: 'กำลังดำเนินรายการ',
    upNext: 'รายการถัดไป',
    morePast: (n: number) => `↑ เลื่อนขึ้นเพื่อดู ${n} รายการที่ผ่านมา`,
  },
  // Screen 4: Lucky draw standby + winner reveal (components/LuckyWinnerReveal.tsx)
  lucky: {
    trophyAlt: 'ถ้วยรางวัล Lucky Draw',
    getReady: 'เตรียมพร้อมสำหรับการสุ่มรางวัลใหญ่',
    goodLuck: 'ขอให้ผู้ร่วมงานทุกท่านโชคดี!',
    spinHint: 'กดปุ่มสุ่มรางวัล (SPIN) จากแผงควบคุมระบบ เพื่อเริ่มการหมุนวงล้อ',
    won: 'ได้รับรางวัล',
  },
};
