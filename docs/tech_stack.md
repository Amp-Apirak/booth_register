# ข้อเสนอแนะเทคโนโลยีสำหรับการพัฒนาระบบ (Recommended Tech Stack)
## โครงการ: Smart Event Registration (SCAN • CHECK-IN • SHOW)
### บทบาทผู้จัดทำ: Project Manager (PM)
### สำหรับ: Systems Analyst (SA), Solution Architect และ Lead Developer

เพื่อให้ระบบสามารถทำงานได้แบบเรียลไทม์ (Real-time Sync) รองรับปริมาณคนลงทะเบียนและสแกนพร้อมๆ กันได้เป็นจำนวนมาก (High Concurrency) โดยมีอัตราความหน่วงต่ำสุด (Low Latency < 1 วินาที) สำหรับข้อความต้อนรับขึ้นจอ Signage ทางโครงการขอแนะนำ Tech Stack ต่อไปนี้:

---

## 0. สิ่งที่ใช้จริงในโค้ดปัจจุบัน (ตรวจ 2026-09-23)

เอกสารด้านล่างเป็นข้อเสนอแนะ ตารางนี้คือสิ่งที่ติดตั้งอยู่จริง

| ส่วน | ใช้จริง |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4, lucide-react, socket.io-client |
| ไลบรารีฝั่งหน้าเว็บ | `xlsx` (นำเข้า/ส่งออก Excel), `jsqr` (อ่าน QR จากกล้อง), `qrcode.react`, `react-easy-crop`, `sweetalert2`, `canvas-confetti`, `html-to-image` |
| Backend | Node.js + Express 4, Socket.io 4, `pg`, `jsonwebtoken`, `bcryptjs`, `helmet`, `nodemailer` |
| Database | PostgreSQL 15 (Docker) · Redis 7 อยู่ใน docker-compose แต่ยังไม่ถูกใช้ |
| ทดสอบ / CI | Jest + supertest (server), `node --test` (client), GitHub Actions |

## 1. ระบบฝั่งหน้าบ้าน (Frontend Client Stack)

แบ่งหน้าจอการใช้งานออกเป็น 3 ส่วนหลัก:

### 1.1 ระบบเว็บแอปพลิเคชันสำหรับผู้เข้าร่วมงาน (Participant Portal)
*   **ฟังก์ชัน**: ฟอร์มลงทะเบียนออนไลน์ (Register Form), หน้าแสดงตั๋วคิวอาร์โค้ด (My Ticket Pass), และหน้าตอบแบบสอบถาม (CSAT / Games)
*   **เทคโนโลยีแนะนำ**: 
    *   **Framework**: **Next.js (React / TypeScript)** หรือ **Vite + React (TypeScript)**
    *   **CSS Styling**: **TailwindCSS** ร่วมกับ **Shadcn UI** หรือ **Mantine** เพื่อดีไซน์ Glassmorphism ที่สวยงามพรีเมียมและปรับตามขนาดหน้าจอมือถือ (Responsive Design) ได้ง่าย
    *   **State Management**: **TanStack Query (React Query)** สำหรับการจัดการ Caching และดึงข้อมูลสถานะตั๋ว

### 1.2 ระบบหลังบ้านสำหรับแอดมินและสตาฟ (Admin CMS & Scanner Terminal)
*   **ฟังก์ชัน**: แดชบอร์ดตรวจสอบสถิติ กราฟสรุป, ระบบค้นหา/จัดการผู้เข้าร่วมงาน (CRUD), ช่องเชื่อมต่อตัวรับปืนสแกนเนอร์ QR Code, และระบบควบคุมหน้าจอ Signage / สุ่ม Lucky Draw
*   **เทคโนโลยีแนะนำ**:
    *   **Framework**: **Vite + React (TypeScript)** (รวดเร็ว คล่องตัวสูง ไม่เน้น SEO)
    *   **UI Library**: **TailwindCSS** + **Tremor UI** (เป็นคลังคอมโพเนนต์ที่ออกแบบมาสำหรับการวาดกราฟและ Analytics Dashboard โดยเฉพาะ)
    *   **Real-time Connection**: **Socket.io-client** สำหรับรับส่งข้อมูลเช็คอินเข้ากับ Server ทันที

---

## 2. ระบบฝั่งหลังบ้าน (Backend Server Stack)

หัวใจสำคัญคือความต้องการระบบประมวลผลความเร็วสูง (Event-Driven) และการอัปเดตข้อมูลแบบทันใด (WebSocket Sync):

### 2.1 API Gateway & Business Logic Server
*   **เทคโนโลยีแนะนำ (Option A - เน้นประสิทธิภาพและความเร็วสูงสุด)**:
    *   **Language / Framework**: **Go (Golang) + Fiber** หรือ **Gin**
    *   **จุดเด่น**: Go ทำงานแบบ Multi-threading ได้ดีเยี่ยม (Goroutines) กินทรัพยากรหน่วยความจำต่ำมาก เหมาะกับงานสแกนเช็คอินหน้างานที่คนกรูกันเข้ามาพร้อมๆ กัน และตอบสนองระดับ Millisecond
*   **เทคโนโลยีแนะนำ (Option B - เน้นความรวดเร็วในการพัฒนาและทีมงานคุ้นเคย)**:
    *   **Language / Framework**: **Node.js (TypeScript) + NestJS**
    *   **จุดเด่น**: NestJS มีโครงสร้างสถาปัตยกรรมโค้ดที่เป็นสัดส่วนชัดเจน (Clean Architecture) ปลอดภัยด้วย TypeScript และมี Module จัดการ WebSocket Gateway (Socket.io) ในตัวพร้อมใช้งาน

### 2.2 ระบบส่งข้อมูลเรียลไทม์ (Real-time Broker)
*   **เทคโนโลยีแนะนำ**: **Redis Pub/Sub** ร่วมกับ **WebSockets (WS/WSS)**
*   **สถาปัตยกรรมทำงาน**: เมื่อเจ้าหน้าที่สแกนผ่านจุดคัดกรอง ➔ ข้อมูลส่งผ่าน API เข้าหลังบ้าน ➔ หลังบ้านบันทึก DB และยิง **Publish Event** เข้า Redis ➔ WebSocket Server ทุกตัวที่กำลังเชื่อมต่อหน้าจอ Signage และ Dashboard อยู่จะ **Subscribe Event** นั้นและดึงข้อมูลแสดงผลขึ้นจอภาพทันทีใน 0.5 วินาที

---

## 3. ระบบจัดการข้อมูล (Database & Caching Stack)

### 3.1 ฐานข้อมูลหลัก (Primary Database)
*   **เทคโนโลยีแนะนำ**: **PostgreSQL** (หรือ **MySQL**)
*   **เหตุผล**: ข้อมูลการสมัครและเข้างานของบุคคลเป็นโครงสร้างความสัมพันธ์ (Relational Data) มีความจำเป็นต้องใช้ ACID Transaction เพื่อป้องกันการสร้างสิทธิ์ทับซ้อน การเช็คอินซ้ำ และการจับ Lucky Draw ซ้ำซ้อน PostgreSQL มีความเสถียรและรองรับการเก็บ JSON data สำหรับพารามิเตอร์ของแต่ละเซสชันสัมมนาได้ดี

### 3.2 ระบบจัดการหน่วยความจำสำรอง (Cache & In-Memory DB)
*   **เทคโนโลยีแนะนำ**: **Redis Cache**
*   **เหตุผล**: หน้าจอ Dashboard และหน้าจอ Overview Signage ภายในงานจะร้องขอตัวเลขอัปเดต (Registered, Checked-in, Pending) ทุกวินาที การแคชสถิติตัวเลขไว้ใน Redis จะช่วยป้องกันไม่ให้ฐานข้อมูลหลักคอขวดหรือล่มจากการคิวรีซ้ำๆ

### 3.3 แพลตฟอร์ม Cloud สำเร็จรูป (Fast Prototype - ทางเลือกสำหรับทำตัวทดสอบความเร็วสูง)
*   **เทคโนโลยีแนะนำ**: **Supabase (Postgres Natively)**
*   **เหตุผล**: หากมีข้อจำกัดด้านเวลาพัฒนา (เช่น ต้องเสร็จใน 1-2 สัปดาห์) Supabase มีโครงสร้าง Postgres database, Authentication, และระบบ Real-time (WebSockets) สำหรับดักจับข้อมูลเช็คอินมาให้ใช้งานได้ทันทีโดยแทบไม่ต้องเขียน Backend API จากศูนย์

---

## 4. โครงสร้างพื้นฐานและการติดตั้ง (Infrastructure & Hosting Stack)

*   **Cloud Provider**: **AWS** (Amazon Web Services) หรือ **GCP** (Google Cloud Platform)
*   **Containerization**: **Docker Containers**
*   **Application Deployment**:
    *   **Backend / Server**: ติดตั้งบน **AWS ECS (Fargate)** หรือ **Google Cloud Run** ซึ่งเป็นระบบ Serverless Container ที่สามารถ Auto-scale (ขยายจำนวนเครื่องประมวลผลเพิ่มอัตโนมัติ) เพื่อรองรับผู้ใช้งานหลักร้อย/พันคนที่พยายามเข้าหน้าลงทะเบียนพร้อมกันในช่วงเริ่มงาน
    *   **Frontend Apps**: โฮสต์บน **Vercel** หรือ **Cloudflare Pages** เพื่อประสิทธิภาพการดาวน์โหลดหน้าเว็บที่เร็วผ่านระบบ Edge Network CDN ทั่วโลก
*   **Security (ความปลอดภัย)**:
    *   **SSL/HTTPS**: จัดการผ่าน **Cloudflare** เพื่อป้องกันการโจมตีหน้าเว็บลงทะเบียนหน้างาน (DDoS Protection)
    *   **API Security**: เข้ารหัสสิทธิ์ความปลอดภัยด้วย **JWT (JSON Web Tokens)** ร่วมกับสิทธิ์ Role-Based Access Control (RBAC)
