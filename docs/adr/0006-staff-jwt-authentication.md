---
status: accepted
---

# 0006-staff-jwt-authentication

เราได้ตัดสินใจใช้ JSON Web Tokens (JWT) ร่วมกับ `localStorage` สำหรับการยืนยันตัวตน (Authentication) ของเจ้าหน้าที่ (Staff / Admin) แทนการใช้ Session หรือ HTTP-only Cookies ในเฟสแรก

**เหตุผลในการตัดสินใจ (Context & Reasons):**
1. โครงสร้างโปรเจคปัจจุบันถูกออกแบบมาแบบ Decoupled (Next.js หน้าบ้าน และ Express หลังบ้านแยกกันชัดเจน)
2. JWT ช่วยให้ Backend เป็น Stateless ซึ่งดีต่อการ Scale และเข้ากันได้ดีกับสถาปัตยกรรม WebSocket ที่ใช้งานอยู่
3. การเก็บ Token ใน `localStorage` ในฝั่ง Frontend ถูกเลือกใช้เพื่อความสะดวกรวดเร็วในการทำ Mockup/Prototype (ไม่ต้องตั้งค่า CORS Credentials และ Set-Cookie headers ที่ซับซ้อนระหว่างต่างโดเมน/พอร์ต)

**ผลกระทบ (Consequences):**
- การเก็บ Token ไว้ใน `localStorage` อาจมีความเสี่ยงต่อ XSS attacks ดังนั้นโค้ด Frontend จะต้องระมัดระวังเรื่องการรับ Input (Sanitization)
- หากในอนาคตโปรเจคเข้าสู่ Production Phase เต็มรูปแบบ อาจจะต้องพิจารณาย้ายไปใช้ HTTP-only Cookies หรือ NextAuth เพื่อยกระดับความปลอดภัยให้สูงขึ้น
