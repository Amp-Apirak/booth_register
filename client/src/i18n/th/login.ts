// Thai UI text for the "login" area (source of truth — en/login.ts must mirror every key)
export const login = {
  subtitle: (eventName: string) => `เข้าสู่ระบบจัดการ ${eventName}`,
  submit: 'เข้าสู่ระบบ',
  submitting: 'กำลังตรวจสอบ...',
  // Fallback when the server does not send its own message
  wrongPassword: 'รหัสผ่านไม่ถูกต้อง',
  connectionError: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ (กรุณาตรวจสอบว่า Backend รันอยู่ที่พอร์ต 3005 หรือไม่)',
  // Server error codes (POST /login) shown in the chosen language instead of the server's Thai message
  errors: {
    MISSING_CREDENTIALS: 'กรุณากรอก Username และ Password',
    INVALID_CREDENTIALS: 'Username หรือ Password ไม่ถูกต้อง',
    ACCOUNT_DISABLED: 'บัญชีนี้ถูกระงับการใช้งาน',
    SERVER_ERROR: 'เกิดข้อผิดพลาดภายในระบบ กรุณาลองใหม่อีกครั้ง',
    TOO_MANY_ATTEMPTS: 'ใส่รหัสผ่านผิดหลายครั้งเกินไป กรุณารอประมาณ 15 นาทีแล้วลองใหม่',
  } as Record<string, string>,
};
