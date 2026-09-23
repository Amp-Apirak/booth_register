# คู่มือส่งมอบและแผนนำเสนอโครงการ (Smart Event Registration Handoff Guide)
## สำหรับ: Project Manager (PM), Systems Analyst (SA) และทีมพัฒนาซอฟต์แวร์ (Developers)

เอกสารฉบับนี้สรุปแนวทางการนำระบบจำลองไปนำเสนอเพื่อผ่านอนุมัติงบประมาณ (Executive Pitch) และโครงสร้างการส่งมอบงานเพื่อให้ทีมเทคนิคนำไปพัฒนาจริงต่อทันที

---

## 1. ลำดับขั้นตอนการสาธิตระบบสำหรับผู้บริหาร (Executive Demo Sequence)

เพื่อให้คณะผู้บริหารหรือลูกค้าเห็นประสิทธิภาพสูงสุดของระบบการทำงานจริงร่วมกันแบบเรียลไทม์ ให้ดำเนินตามลำดับขั้นตอนดังนี้:

```
[ขั้นตอน 1: เปิดระบบหลังบ้าน] ➔ [ขั้นตอน 2: ลงทะเบียนมือถือจำลอง] ➔ [ขั้นตอน 3: จุดสแกนเช็คอินเข้างาน] ➔ [ขั้นตอน 4: ผลลัพธ์จอ LED ต้อนรับ & สุ่ม Lucky Draw]
```

### ขั้นตอนที่ 1: การเตรียมระบบฉากหลัง
1.  เปิดหน้าต่าง Command Prompt / Terminal ในเครื่องคอมพิวเตอร์ของคุณ แล้วรันคำสั่งเปิดเซิร์ฟเวอร์จำลอง:
    ```bash
    cd mock-server
    npm start
    ```
2.  เปิดหน้าเว็บ **[`presentation.html`](file:///Users/apirak.ba/Developer/booth_register/presentation.html)** แยกเป็น **2 หน้าต่างเบราว์เซอร์** วางเทียบข้างคู่กันซ้าย-ขวา

### ขั้นตอนที่ 2: จำลองพฤติกรรมผู้ร่วมงาน (Participant Experience)
1.  ที่หน้าต่างที่ 1 (ฝั่งขวา) สลับไปที่แท็บ **"พอร์ทัลมือถือ (Mobile Simulator)"** (Tab 9) ซึ่งมีกรอบโทรศัพท์ iPhone แสดงอยู่
2.  ให้ลองกรอกชื่อจำลอง เช่น `Arunee Rakdee` สังกัด `Future Tech Co.` ติ๊กปุ่มยินยอม **PDPA Consent** และกดปุ่ม **"ลงทะเบียนออนไลน์"**
3.  *สังเกตผลลัพธ์*: ตั๋วดิจิทัลคิวอาร์โค้ดจะปรากฏขึ้นบนจอมือถือทันที โดยมีสีส้มระบุสถานะ **"รอดำเนินการ (Pending)"** 
4.  *เบื้องหลัง*: ที่หน้าต่าง Terminal ของเซิร์ฟเวอร์ จะปรากฏ **Preview URL ของอีเมลตั๋ว (Nodemailer Ethereal link)** สามารถคลิกเพื่อแสดงตั๋ว HTML ที่ส่งเข้าเมลผู้ใช้จำลองได้

### ขั้นตอนที่ 3: จำลองการสแกนผ่านประตูทางเข้างาน (Staff Scanning Gate)
1.  ที่แท็บมือถือจำลอง ให้กดปุ่ม **"จำลองสแกน QR Code นี้"**
2.  *สังเกตผลลัพธ์*: 
    - ระบบจะส่งเสียงสัญญาณติ๊ด (Beep) ยืนยันการแสกน
    - แถบสถานะตั๋วบนมือถือจะขยับเปลี่ยนสีเป็นสีเขียวระบุ **"เช็คอินสำเร็จ (Checked-in)"** ทันที
    - ข้อมูลในแท็บตาราง CMS (ฝั่งสตาฟ) จะอัปเดตตัวเลข Show-up Rate และเพิ่มแถวเช็คอินให้อัตโนมัติ

### ขั้นตอนที่ 4: แสดงผลลัพธ์จอ LED หน้างานและการสุ่มรางวัล (Engagement Experience)
1.  ที่หน้าต่างที่ 2 (ฝั่งซ้าย) สลับไปที่แท็บ **"จำลองหน้าจอ Signage"** (Tab 5) และเลือกหัวข้อทีวีต้อนรับผู้เช็คอิน
2.  *สังเกตผลลัพธ์*: ชื่อของคุณ `Arunee Rakdee` จากสังกัด `Future Tech Co.` จะเด้งแสดงความยินดีต้อนรับขนาดใหญ่บนจอ Signage ทันทีด้วยการยิง WebSocket Real-time
3.  เปลี่ยนจอ Signage ไปที่ **"LUCKY DRAW TIME"** (หน้าล้อหมุนสุ่ม) จากนั้นลองสลับไปที่หน้าแผงควบคุม CMS (ฝั่งแอดมิน) แล้วกดปุ่ม **"SPIN"** เพื่อสุ่มจับรางวัล
4.  *สังเกตผลลัพธ์*: ล้อหมุนบนจอ Signage จะทำการหมุนสุ่มและหยุดแสดงรายชื่อผู้ชนะรางวัลอย่างสวยงาม พร้อมทริกเกอร์ส่ง API ยิงจำลองส่งเมลยินดีกับผู้ชนะทันที

---

## 2. โครงสร้างความสอดคล้องข้อมูลทางเทคนิคสำหรับการส่งต่อ (Technical Mapping)

เพื่อให้ทีมพัฒนานำไปแปลผลขึ้นโค้ดจริงได้อย่างไม่มีสะดุด ข้อมูลทุกส่วนได้รับการจับคู่กันไว้ดังนี้:

| หัวข้อระบบ | ลิงก์สเปกการออกแบบ (System Design Docs) | ไฟล์สคริปต์ต้นแบบ (Code Implementation) |
| :--- | :--- | :--- |
| **โครงสร้างฐานข้อมูล** | [system_design.md](file:///Users/apirak.ba/Developer/booth_register/docs/system_design.md) (หัวข้อ ER Diagram) | [schema.sql](file:///Users/apirak.ba/Developer/booth_register/database/schema.sql) และ [seed.sql](file:///Users/apirak.ba/Developer/booth_register/database/seed.sql) |
| **การทดสอบโครงสร้าง DB** | - | [docker-compose.yml](file:///Users/apirak.ba/Developer/booth_register/docker-compose.yml) (ยิง PostgreSQL & Redis ในชุดคำสั่งเดียว) |
| **ข้อกำหนด Endpoints API** | [api_spec.md](file:///Users/apirak.ba/Developer/booth_register/docs/api_spec.md) (JSON payload & WS Events) | [server.js](file:///Users/apirak.ba/Developer/booth_register/mock-server/server.js) (Express endpoints & Socket.io events) |
| **สคริปต์ยิงเมลตั๋วและเทมเพลต** | [project_plan.md](file:///Users/apirak.ba/Developer/booth_register/docs/project_plan.md) (Task-104) | [email_sender.js](file:///Users/apirak.ba/Developer/booth_register/mock-server/utils/email_sender.js) (HTML Email & Nodemailer setup) |
| **แนวทางวางระบบ LAN** | [network_deployment.md](file:///Users/apirak.ba/Developer/booth_register/docs/network_deployment.md) (LAN & Hardware setup) | [docs/adr/0001](file:///Users/apirak.ba/Developer/booth_register/docs/adr/0001-hybrid-local-sync-server.md) (บันทึกสถาปัตยกรรม Hybrid Local Server) |
| **คำศัพท์ที่ใช้ในการโค้ด** | [CONTEXT.md](file:///Users/apirak.ba/Developer/booth_register/CONTEXT.md) (พจนานุกรมประมวลคำศัพท์) | ตัวแปรคลาสและชื่อฟิลด์ภายในสคริปต์ JavaScript / SQL |

---

## 3. แผนการเปลี่ยนผ่านสู่ระบบการผลิตจริง (Production Roadmap for Developers)

หลังจากได้รับอนุมัติผ่านโครงการแล้ว ขั้นตอนแรกที่ทีมโปรแกรมเมอร์และ DevOps ควรดำเนินการเพื่อเริ่มเขียนระบบจริงมีดังนี้:

1.  **การตั้งค่าเซิร์ฟเวอร์ Local Node (Local LAN deployment)**:
    *   ใช้โค้ดต้นแบบจาก `server.js` เป็นฐานสำหรับการพัฒนาต่อ โดยเปลี่ยนฐานข้อมูลภายใน Memory ไปเชื่อมต่อกับ Local SQLite หรือ Local PostgreSQL จริงๆ
    *   ติดตั้งตัวควบคุมคิวการซิงค์ (เช่น `BullMQ` หรือ `Kue` ร่วมกับ Redis ใน Docker-compose) เพื่อประกันความทนทานต่อออฟไลน์ (Offline-Resilience Syncing)
2.  **การพัฒนาฝั่ง Frontend (Frontend Component Development)**:
    *   ดึงรูปแบบสไตล์ชีต CSS (เช่น Glassmorphism UI, ล้อหมุน Lucky Draw Canvas, กรอบรูปตั๋ว iPhone) จากไฟล์ `presentation.html` ไปแบ่งเป็น Components บน React, Next.js หรือ Vue.js
    *   เรียกใช้ไลบรารี `@socket.io/client` เพื่อต่อท่อ Socket เชื่อมเข้ากับเซิร์ฟเวอร์ และทำการสตรีมฟีดการเช็คอินแบบทิศทางเดียว
3.  **การเชื่อม SMTP สำหรับระบบอีเมลจริง (SMTP configuration)**:
    *   เปลี่ยนค่าตัวแปรสภาพแวดล้อม (Environment Variables) จาก Ethereal Account ให้ชี้ไปที่ SMTP ของ AWS SES, SendGrid, หรือเมลโฮสติ้งของบริษัท โดยผ่าน Config ล็อกใน `.env`
