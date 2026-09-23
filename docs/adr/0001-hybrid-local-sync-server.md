# Hybrid Local Sync Server for Offline Resiliency

เพื่อป้องกันไม่ให้ระบบสแกนเช็คอินและจอ Welcome Screen หยุดทำงานเมื่ออินเทอร์เน็ตหลุด เราตัดสินใจใช้สถาปัตยกรรมแบบ Hybrid Local Node (Local Sync Server) โดยการตั้งเครื่องเซิร์ฟเวอร์ย่อยในวง LAN หน้างานสำหรับการซิงค์ข้อมูลเรียลไทม์ และให้ Local Node ทำหน้าที่อัปเดตข้อมูลย้อนหลังขึ้นระบบคลาวด์ส่วนกลางทีหลังเมื่อเครือข่ายเชื่อมต่อได้

## Status
accepted

## Considered Options
- **Cloud-Centric (Direct WebSockets)**: รันผ่านคลาวด์โดยตรง มีความเสี่ยงระบบเช็คอินล่มทั้งหมดเมื่ออินเทอร์เน็ตมีปัญหา
- **Offline Browser Storage**: เก็บลง Cache หน้าเบราว์เซอร์แล้วค่อยกดซิงค์ภายหลัง แต่ทำให้จอใหญ่ Signage โชว์ชื่อต้อนรับไม่เรียลไทม์
- **Hybrid Local Node (Selected)**: ติดตั้ง Mini-PC รัน Express + Socket.io วง LAN เดียวกัน รับประกันทำงาน 100% แม้ภายนอกไม่มีเน็ต
