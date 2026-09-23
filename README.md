# Smart Event Registration (SCAN • CHECK-IN • SHOW)
ระบบบริหารจัดการผู้เข้าร่วมงานสัมมนาและเช็คอินแบบเรียลไทม์ (Mockup Prototype & Project Blueprint)

โครงการนี้จัดทำขึ้นเพื่อใช้ในการนำเสนอขายงานจำลองระบบ (CMS Mockup) และวางแผนสถาปัตยกรรมระบบให้กับ SA และทีมพัฒนาเพื่อใช้ในการขึ้นงานจริงอย่างเป็นระบบและปลอดภัย

---

## 📂 โครงสร้างการจัดเก็บไฟล์ในโครงการ (Directory Structure)

เพื่อให้การจัดการและส่งมอบโค้ด/เอกสารเป็นระเบียบเรียบร้อย โครงการได้รับการจัดแยกเป็นหมวดหมู่ดังนี้:

```text
booth_register/
├── docs/                          # เอกสารสรุปความต้องการและการออกแบบระบบ
│   ├── requirements.md            # เอกสารข้อกำหนดความต้องการโครงการ (PRD)
│   ├── system_design.md           # สิทธิ์ (RBAC), แมทริกซ์เมนู และแบบผัง ERD
│   ├── tech_stack.md              # ข้อเสนอแนะเทคโนโลยี (Frontend/Backend/DB/Host)
│   ├── api_spec.md                # รายละเอียด REST API JSON payloads & WebSocket events
│   ├── project_plan.md            # แผนพัฒนา Agile แบ่ง Sprint 1-3 และ Story Points
│   ├── network_deployment.md      # แผนผังการติดตั้งเครือข่าย LAN และฮาร์ดแวร์หน้างาน
│   ├── handoff_guide.md           # คู่มือส่งมอบงานและลำดับสไลด์นำเสนอสำหรับ PM
│   ├── adr/                       # บันทึกการตัดสินใจเชิงสถาปัตยกรรม (ADR)
│   │   ├── 0001-hybrid-local-sync-server.md
│   │   ├── 0002-signed-token-hashing.md
│   │   ├── 0003-queue-based-event-streaming.md
│   │   ├── 0004-multi-channel-winner-notification.md
│   │   └── 0005-pdpa-consent-and-data-retention.md
│   ├── iso/                       # เอกสารรับรองมาตรฐาน ISO 9002
│   │   ├── docs_control_procedure.md   # (REG-QA-SOP-001) ระเบียบควบคุมเอกสาร
│   │   ├── software_dev_sop.md         # (REG-QA-SOP-002) ระเบียบพัฒนาซอฟต์แวร์
│   │   └── traceability_matrix.md      # (REG-QA-SPEC-001) ตารางย้อนกลับความต้องการ
│   └── requirements_image.jpeg    # ภาพสเก็ตช์ความต้องการตั้งต้น
│
├── database/                      # สคริปต์สถาปัตยกรรมจัดการข้อมูล (SQL Scripts)
│   ├── schema.sql                 # DDL สร้างตาราง คอนสเตรนต์ และดัชนี (PostgreSQL)
│   └── seed.sql                   # ข้อมูลจำลองตั้งต้น (Seed Data)
│
├── server/                        # [NEW] โครงสร้างหลังบ้านระบบการผลิตจริง (Production)
│   ├── app.js                     # Express App + Helmet + API Routes mount
│   ├── server.js                  # HTTP Server + Socket.io bootstrap + DB test
│   ├── package.json               # Dependencies (pg, ioredis, helmet, jest, ...)
│   ├── .env                       # ค่าตั้งค่าการเชื่อมต่อ (Data Masking)
│   ├── config/
│   │   └── db.js                  # PostgreSQL Connection Pool Manager
│   ├── controllers/
│   │   └── participantController.js  # Request Handler (Register, List, Check-in)
│   ├── repositories/
│   │   └── participantRepository.js  # SQL Parameterized Queries (CRUD)
│   ├── routes/
│   │   └── api.js                 # Express Router mapping
│   ├── services/
│   │   └── checkinService.js      # Business Logic + DB Transactions
│   ├── utils/
│   │   └── email_sender.js        # HTML Ticket Email (Nodemailer)
│   └── tests/
│       └── checkin.test.js        # Jest Integration Tests (ISO Verified)
│
├── mock-server/                   # เซิร์ฟเวอร์จำลองสำหรับสไลด์นำเสนอ
│   ├── server.js                  # Mock Backend (Express & Socket.io)
│   ├── package.json               # Mock dependencies
│   └── utils/
│       └── email_sender.js        # Mock email sender
│
├── presentation.html              # หน้าเว็บสไลด์นำเสนอพรีเมียม & CMS Mockup
├── docker-compose.yml             # Docker Compose: PostgreSQL & Redis
├── CONTEXT.md                     # พจนานุกรมคำศัพท์โครงการ (Domain Glossary)
└── README.md                      # เอกสารแนะนำและเริ่มต้นใช้งาน
```

---

## 🎯 วิธีเริ่มต้นใช้งานและทดสอบตัวจำลองระบบ (Quick Start Guide)

หน้าสไลด์นำเสนอหลัก `presentation.html` ถูกออกแบบมาให้เชื่อมต่อกับเซิร์ฟเวอร์หลังบ้านแบบเรียลไทม์โดยตรง หากเปิดระบบจำลองไว้ จะสามารถซิงค์การเช็คอินและการสั่งสุ่ม Lucky Draw ข้ามหน้าต่างเบราว์เซอร์ได้ทันที:

### 0. ตั้งค่าไฟล์ Environment (ทำครั้งแรกครั้งเดียว)
คัดลอกไฟล์ตัวอย่าง แล้วแก้ค่า `DB_PASSWORD` (ให้ตรงกันทั้ง 2 ไฟล์) และ `JWT_SECRET`:
```bash
cp .env.example .env                  # รหัสผ่าน DB สำหรับ Docker Compose
cp server/.env.example server/.env    # ค่าตั้งค่าเซิร์ฟเวอร์ (DB, JWT, SMTP)
openssl rand -hex 32                  # สร้างค่า JWT_SECRET แบบสุ่ม
```
*ไฟล์ `.env` ถูก ignore ไม่ขึ้น Git — หากไม่ได้ตั้ง `DB_USER`, `DB_PASSWORD` หรือ `JWT_SECRET` เซิร์ฟเวอร์จะไม่ยอมเปิดและแจ้งว่าขาดค่าใด*

### 1. การเปิดระบบฐานข้อมูลทดสอบ (Start PostgreSQL & Redis with Docker)
เปิดใช้งานตู้คอนเทนเนอร์ PostgreSQL และ Redis ด้วย Docker Compose:
```bash
docker compose up -d
```
*ระบบจะเปิดใช้งาน PostgreSQL ที่พอร์ต `localhost:5435` และ Redis ที่พอร์ต `localhost:6385` พร้อม Seed ข้อมูลตั้งต้นให้อัตโนมัติ*

### 2. การรันเซิร์ฟเวอร์หลักระดับผลิตจริง (Start Production Backend)
เข้าโฟลเดอร์ `server` และสั่งรันเซิร์ฟเวอร์จริง:
```bash
cd server
npm install
npm start          # เปิดเซิร์ฟเวอร์จริงที่ http://localhost:3005
npm test           # รันชุดทดสอบ Jest Integration Tests (19 Tests Passed - ISO 9002)
```
*เซิร์ฟเวอร์หลักจะทำงานบนพอร์ต `http://localhost:3005` พร้อมเปิดช่องสัญญาณ WebSockets เชื่อมโยงเข้ากับ PostgreSQL ทันที*

### 3. การรันเว็บแอปพลิเคชันฝั่งหน้าบ้าน (Start Next.js Client Frontend)
เข้าโฟลเดอร์ `client` และสั่งรัน Frontend:
```bash
cd client
npm install
npm run dev        # รัน Development Server (เช่น http://localhost:3080)
```
*ระบบ Client มีหน้าเว็บครบวงจร: `/register` (ลงทะเบียน), `/ticket` (ตั๋วคิวอาร์), `/scanner` (สแกนผ่านประตู), `/signage` (จอ LED), `/lucky-draw` (วงล้อสุ่ม), `/dashboard` (CMS สตาฟ)*

### การจัดการ Event Agenda

Staff สามารถเข้าเมนู `/settings` และเลือกแท็บ **จัดการกำหนดการ** เพื่อเพิ่ม แก้ไข ลบ นำเข้า หรือส่งออกกำหนดการเป็น Excel (`.xlsx`/`.xls`) รวมถึงเพิ่มรายละเอียดแบบย่อและรูปวิทยากรในแต่ละรายการ เมื่อบันทึกแล้วหน้า `/signage` จะอัปเดตผ่าน WebSocket แสดงเฉพาะกำหนดการของวันปัจจุบัน และเน้นรายการที่กำลังดำเนินอยู่จากวันเวลาเริ่ม–สิ้นสุดโดยอัตโนมัติ

แถบ **Event Agenda** เพิ่มมิติด้วย ambient grid/glow, card entrance แบบเหลื่อมจังหวะ และ active-card shimmer พร้อมแสดงความคืบหน้าของ Session ตามเวลาจริง รวมถึงทำเครื่องหมาย “รายการถัดไป” เพื่อช่วยนำสายตาบนจอ LED เมื่อเปิดหน้า ระบบจะเลื่อนรายการ Active (หรือรายการถัดไปเมื่อไม่มี Active) ขึ้นด้านบนโดยเว้นระยะจากขอบเพื่อให้เห็นข้อมูลครบ แล้วจัดรายการรอคิวต่อด้านล่างตาม Layout ปกติโดยไม่ซ้อนทับกัน รายการที่ผ่านมาเก็บไว้เหนือจุดดังกล่าวและสามารถเลื่อนย้อนขึ้นไปดูได้

หน้า `/signage` แถบ **Live Overview** แสดงยอดลงทะเบียน เช็คอิน และผู้ที่ยังไม่มาแบบการ์ดขนาดใหญ่ พร้อม Show-up Rate แบบวงแหวน/แถบความคืบหน้า สถานะ Live เวลาอัปเดต และข้อมูลผู้เช็คอินล่าสุด มี motion effects สำหรับจอ LED เช่น scan light, floating particles, card float, shimmer และ number pop พร้อมเคารพการตั้งค่า `prefers-reduced-motion`

แถบ **Lucky Standby** ถูกออกแบบเป็นเวที Lucky Draw สำหรับจอ LED โดยใช้ภาพถ้วยรางวัล 3D สีทองความละเอียดสูงและขยายข้อความ `LUCKY DRAW STAGE` ให้มองเห็นได้ชัดจากระยะไกล พร้อมวงแหวนพลังงานหมุน แสง Spotlight/พื้นเวที ประกายลอย Gradient glow และป้าย `GET READY · GRAND PRIZE` ที่เคลื่อนไหวอย่างนุ่มนวล ทั้งโหมดปกติและเต็มจอ เอฟเฟกต์ทั้งหมดจะหยุดอัตโนมัติเมื่ออุปกรณ์ตั้งค่า `prefers-reduced-motion`

หน้า `/settings` มีแท็บ **จัดการของรางวัล** สำหรับเพิ่ม แก้ไข ลบ อัปโหลดภาพ กรอกรหัส/รายละเอียด กำหนดจำนวน และเปิดหรือปิดการใช้งานของรางวัล รายการที่เปิดใช้งานและยังมีจำนวนคงเหลือจะถูกนำไปแสดงในหน้า `/lucky-draw` โดยอัตโนมัติ พร้อมภาพและยอดแจกแล้ว/คงเหลือ หน้า Lucky Draw ใช้เวทีแบบเคลื่อนไหว มีวงแหวนรางวัล Spotlight พื้นหลัง Grid แสงไล่สี และแสดงภาพของรางวัลที่เลือกอย่างเด่นชัด

ส่วน **รายชื่อผู้ได้รับรางวัล** แสดงผลแบบ Winner Hall of Fame โดยขยายชื่อ บริษัท รางวัล และเวลาประกาศ เพิ่มลำดับเหรียญ ป้ายสถานะ Live แสงวิ่ง ขอบเรืองรอง และการ์ดที่เข้าสู่หน้าจอแบบเหลื่อมจังหวะ เพื่อให้อ่านชัดและสร้างบรรยากาศตื่นเต้นระหว่างการจับรางวัล

หน้า `/settings` มีแท็บ **หน้าลงทะเบียน** สำหรับอัปโหลดภาพกิจกรรมหลัก (Hero Banner) ภาพโบรชัวร์ และกำหนดคำแนะนำ วัตถุประสงค์ ตลอดจนเงื่อนไขสำคัญ หน้า `/register` จะแสดง Hero ก่อนหัวข้อลงทะเบียน และแสดงโบรชัวร์พร้อมรายละเอียดหลังแบบฟอร์ม โดยส่วนที่ไม่ได้ตั้งค่าจะถูกซ่อนอัตโนมัติ

การอัปโหลด Hero Banner และโบรชัวร์มีหน้าปรับภาพก่อนใช้งาน เจ้าหน้าที่สามารถเลื่อนตำแหน่งและซูมภาพภายในกรอบอัตราส่วน `16:7` และ `4:5` ตามลำดับ หน้า Register แสดง Hero กว้างกว่าฟอร์ม ลดความโค้งของกรอบ และใช้ภาพที่ครอปแล้วเพื่อป้องกันเนื้อหาสำคัญบริเวณขอบถูกตัด

แถบ **Welcome Screen** ใช้ motion แบบเรียบหรู ได้แก่ ambient spotlight, title shimmer, glowing border, guest entrance, breathing status badge และประกายพื้นหลัง โดยลด/ปิด animation อัตโนมัติตาม `prefers-reduced-motion`

หน้าจัดการรองรับการค้นหาตามหัวข้อและวิทยากร กรองตามวันที่และช่วงเวลา เลือกจำนวนรายการต่อหน้า และแบ่งหน้าอัตโนมัติ การบันทึก/นำเข้าแสดงผลด้วย SweetAlert; หากข้อมูลไม่ถูกต้อง ระบบจะระบุรายการและฟิลด์ที่ต้องแก้ พร้อมตัวอย่างรูปแบบข้อมูลที่ถูกต้อง

คอลัมน์ Excel ที่รองรับ: `วันที่`, `เวลาเริ่ม`, `เวลาสิ้นสุด`, `หัวข้อ`, `รายละเอียดย่อ`, `วิทยากร`, `สถานที่`, `ไฮไลต์`, `รูปวิทยากร` โดยต้องระบุวันที่ทุกแถว และรูปวิทยากรใน Excel ใช้ URL/Data URL หรืออัปโหลดรูปจากหน้า Settings หลังนำเข้าได้

### 4. การเปิดสไลด์นำเสนอสำหรับ PM & ลูกค้า (Open Presentation Portal)
*   เปิดไฟล์ **[`presentation.html`](file:///Users/apirak.ba/Developer/booth_register/presentation.html)** ด้วยเว็บบราวเซอร์ใดๆ
*   สไลด์จะเชื่อมต่อกับ Backend ที่พอร์ต 3005 อัตโนมัติ เพื่อจำลองและสาธิตการทำงานจริงแก่ Stakeholders ได้แบบ Real-time

---

## 🛠️ เอกสารอ้างอิงรายไฟล์เชิงลึก (Direct References)

*   **ผู้บริหารและลูกค้า (Client & Stakeholders)**: 
    *   ดูสรุปความต้องการโครงการที่: **[requirements.md](file:///Users/apirak.ba/Developer/booth_register/docs/requirements.md)**
    *   ดูคู่มือส่งมอบงานและลำดับขั้นตอนเดินเครื่องจำลองที่: **[handoff_guide.md](file:///Users/apirak.ba/Developer/booth_register/docs/handoff_guide.md)**
    *   ทดลองเล่นและเปิดสไลด์นำเสนอที่: **[presentation.html](file:///Users/apirak.ba/Developer/booth_register/presentation.html)**
*   **Systems Analyst (SA) & Backend Developers**:
    *   ดูโครงร่างฐานข้อมูลและแบบผัง DDL ได้ที่: **[schema.sql](file:///Users/apirak.ba/Developer/booth_register/database/schema.sql)** และ **[system_design.md](file:///Users/apirak.ba/Developer/booth_register/docs/system_design.md)**
    *   ตรวจสอบ Payload ข้อกำหนด API ได้ที่: **[api_spec.md](file:///Users/apirak.ba/Developer/booth_register/docs/api_spec.md)**
    *   ดูตัวอย่างสคริปต์ส่งอีเมลตั๋วคิวอาร์โค้ดพร้อมเทมเพลตพรีเมียมได้ที่: **[email_sender.js](file:///Users/apirak.ba/Developer/booth_register/mock-server/utils/email_sender.js)**
*   **Lead Developers & DevOps**:
    *   ตรวจสอบระบบเทคโนโลยีและการสเกลขยายคลาวด์ได้ที่: **[tech_stack.md](file:///Users/apirak.ba/Developer/booth_register/docs/tech_stack.md)**
    *   วางแผนจัดแต้ม Story Points ลง Jira ได้ที่: **[project_plan.md](file:///Users/apirak.ba/Developer/booth_register/docs/project_plan.md)**
    *   ดูผังการตั้งค่าเน็ตเวิร์กและฮาร์ดแวร์ LAN หน้างานได้ที่: **[network_deployment.md](file:///Users/apirak.ba/Developer/booth_register/docs/network_deployment.md)**
# booth_register
