# ข้อกำหนดทางเทคนิค API และ WebSocket (REST API & WebSocket Specifications)
## โครงการ: Smart Event Registration
### สำหรับ: Backend & Frontend Developers
### รูปแบบข้อมูล: JSON (Javascript Object Notation)

---

## 1. ข้อมูลส่วนหัวสำหรับการเรียกใช้งาน (HTTP Headers)
ทุก ๆ REST API Request (ยกเว้นหน้าลงทะเบียนออนไลน์) จะต้องแนบส่วนหัวดังนี้:
```http
Content-Type: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

---

## 2. ข้อมูลข้อกำหนด REST API (REST Endpoints)

### 2.0 เข้าสู่ระบบเจ้าหน้าที่ (Staff Login)
ใช้สำหรับให้เจ้าหน้าที่และผู้ดูแลระบบทำการยืนยันตัวตน เพื่อรับ Access Token ไปใช้กับ API อื่นๆ ที่ต้องการสิทธิ์การเข้าถึง

*   **URL Route**: `POST /api/v1/login`
*   **Request Body**:
    ```json
    {
      "username": "superadmin",
      "password": "password123"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Login successful",
      "data": {
        "token": "eyJhbGciOiJIUzI1NiIsInR5...",
        "user": {
          "user_id": 1,
          "username": "superadmin",
          "fullname": "Apirak Bampen (Admin)",
          "role": "Admin"
        }
      }
    }
    ```
*   **Response (401 Unauthorized)**:
    ```json
    {
      "success": false,
      "error": "INVALID_CREDENTIALS",
      "message": "Username หรือ Password ไม่ถูกต้อง"
    }
    ```

---

### 2.1 ลงทะเบียนเข้าร่วมงาน (Online Registration)
สำหรับผู้เข้าร่วมงานลงทะเบียนผ่านฟอร์มมือถือ (ไม่ต้องล็อกอิน)

*   **URL Route**: `POST /api/v1/events/:event_id/register`
*   **Request Body**:
    ```json
    {
      "fullname": "Yanisa Prasert",
      "company": "Zoom Information System",
      "position": "IT Director",
      "email": "yanisa@zoom.com",
      "phone": "081-234-5678"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "message": "Registration successful",
      "data": {
        "participant_id": 123,
        "fullname": "Yanisa Prasert",
        "ticket_code": "tkt_550e8400-e29b-41d4-a716-446655440000",
        "qr_code_image_url": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=tkt_550e8400-e29b-41d4-a716-446655440000",
        "registered_at": "2026-08-30T17:15:00Z"
      }
    }
    ```

---

### 2.2 ค้นหาข้อมูลจากรหัสตั๋ว QR Code (Fetch Participant by Ticket)
สำหรับเครื่องสแกนบาร์โค้ดสตาฟดึงข้อมูลขึ้นตรวจสอบก่อนเช็คอิน

*   **URL Route**: `GET /api/v1/participants/:ticket_code`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "participant_id": 123,
        "fullname": "Yanisa Prasert",
        "company": "Zoom Information System",
        "position": "IT Director",
        "email": "yanisa@zoom.com",
        "phone": "081-234-5678",
        "status": "Pending",
        "registered_at": "2026-08-30T17:15:00Z"
      }
    }
    ```
*   **Response (404 Not Found)**:
    ```json
    {
      "success": false,
      "error": "TICKET_NOT_FOUND",
      "message": "ตั๋วหรือ QR Code นี้ไม่มีข้อมูลในฐานข้อมูลระบบ"
    }
    ```

---

### 2.3 สแกนเช็คอินเข้าร่วมงาน (Scan Check-in Gateway)
เมื่อสตาฟยืนยันการเช็คอินหน้างานสำเร็จ จะส่งประวัติการเช็คอินและทริกเกอร์ WebSocket

*   **URL Route**: `POST /api/v1/checkin`
*   **Request Body**:
    ```json
    {
      "ticket_code": "tkt_550e8400-e29b-41d4-a716-446655440000",
      "event_id": 1,
      "device_info": "Staff-Tablet-Counter-2"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Check-in recorded successfully",
      "data": {
        "checkin_id": 88,
        "participant_id": 123,
        "fullname": "Yanisa Prasert",
        "company": "Zoom Information System",
        "checked_in_at": "2026-08-30T17:16:12Z"
      }
    }
    ```
*   **Response (400 Bad Request - กรณีแสกนซ้ำ)**:
    ```json
    {
      "success": false,
      "error": "ALREADY_CHECKED_IN",
      "message": "ผู้เข้าร่วมงานคนนี้ผ่านการสแกนเช็คอินเข้างานแล้วเมื่อเวลา 17:16:12"
    }
    ```

---

### 2.4 สถิติตัวเลขภาพรวมเรียลไทม์ (Dashboard Stats)
ใช้สำหรับบอร์ดรายงานแอดมินหลังบ้าน

*   **URL Route**: `GET /api/v1/events/:event_id/stats`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "registered": 320,
        "checked_in": 245,
        "pending": 75,
        "show_up_percent": 77
      }
    }
    ```
*   **สิทธิ์**: Public (ใช้โดยจอ LED) · รูปแบบนี้**เหมือนกับ** payload ของ WebSocket `overview:update` ทุกฟิลด์ (สร้างจากฟังก์ชัน `getStatsSummary()` ตัวเดียว)

---

### 2.5 การสุ่มจับรางวัลผู้โชคดี (Lucky Draw Spin)
แอดมินหลักกดเริ่มหมุนรางวัลสุ่มชื่อผู้ร่วมงาน

*   **URL Route**: `POST /api/v1/events/:event_id/lucky-draw/spin`
*   **Request Body**:
    ```json
    {
      "prize_name": "IPAD PRO M4"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "winner_id": 9,
        "participant_id": 44,
        "name": "Narong Decha",
        "fullname": "Narong Decha",
        "company": "NextGen Software",
        "position": "CTO",
        "email": "narong@nextgen.com",
        "profile_picture": "data:image/jpeg;base64,... | null",
        "attendee_type": "General",
        "prize_name": "IPAD PRO M4",
        "prize_image": "data:image/png;base64,... | https://... | null",
        "prize_description": "ของรางวัลพิเศษ",
        "drawn_at": "2026-08-30T17:20:00Z"
      }
    }
    ```
*   **หมายเหตุ**: ส่งทั้ง `name` และ `fullname` (หน้า `/lucky-draw` อ่าน `fullname`) · `prize_image`/`prize_description` จับคู่จาก `lucky_draw_prizes` ด้วยชื่อรางวัล
*   **รายชื่อผู้โชคดีทั้งหมด (Public)**: `GET /api/v1/events/:event_id/lucky-draw/winners` → array ของ object รูปแบบเดียวกัน (ไม่มี email) เรียงจากเก่าไปใหม่ ใช้โดยจอ LED แท็บ Lucky เพื่อแสดงผู้โชคดีล่าสุดหลังรีเฟรช

---

### 2.6 การจัดการข้อมูลผู้ร่วมงาน (Participant CRUD REST APIs)
ใช้สำหรับดึง เพิ่ม แก้ไข หรือลบข้อมูลผู้ร่วมงานจากหน้าต่างแอดมิน (CMS Panel)

#### 2.6.1 ดึงข้อมูลผู้ร่วมงานทั้งหมด (Get All Participants)
*   **URL Route**: `GET /api/v1/participants`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": 1,
          "name": "Yanisa Prasert",
          "company": "Zoom Information System",
          "position": "IT Director",
          "email": "yanisa@zoom.com",
          "phone": "081-234-5678",
          "status": "Checked-in"
        }
      ]
    }
    ```

#### 2.6.2 เพิ่มข้อมูลผู้ร่วมงานแมนวล (Add Participant Manually)
*   **URL Route**: `POST /api/v1/participants`
*   **Request Body**:
    ```json
    {
      "name": "Jane Doe",
      "company": "InnoTech Corp",
      "position": "Developer",
      "email": "jane@innotech.com",
      "phone": "085-555-5555",
      "status": "Checked-in"
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "success": true,
      "data": {
        "id": 13,
        "name": "Jane Doe",
        "company": "InnoTech Corp",
        "position": "Developer",
        "email": "jane@innotech.com",
        "phone": "085-555-5555",
        "status": "Checked-in"
      }
    }
    ```

#### 2.6.3 แก้ไขโปรไฟล์ผู้ร่วมงาน (Edit Participant Profile)
*   **URL Route**: `PUT /api/v1/participants/:id`
*   **Request Body**:
    ```json
    {
      "name": "Apirak Bampen (Updated)",
      "company": "DeepTech Global"
    }
    ```
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "id": 2,
        "name": "Apirak Bampen (Updated)",
        "company": "DeepTech Global",
        "position": "Software Engineer",
        "email": "apirak@deeptech.io",
        "phone": "089-876-5432",
        "status": "Pending"
      }
    }
    ```

#### 2.6.4 ลบรายชื่อผู้ร่วมงาน (Delete Participant)
*   **URL Route**: `DELETE /api/v1/participants/:id`
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "message": "Deleted successfully"
    }
    ```

---

### 2.7 จัดการกำหนดการ Event Agenda

*   **ดึงกำหนดการสำหรับจอ LED (Public)**: `GET /api/v1/events/:event_id/agenda`
*   **แทนที่กำหนดการทั้งหมด (Staff JWT)**: `PUT /api/v1/events/:event_id/agenda`
*   **Request Body**:
    ```json
    {
      "items": [
        {
          "title": "Opening Keynote",
          "description": "ภาพรวมทิศทางเทคโนโลยีและประเด็นสำคัญของงาน",
          "speaker": "Dr. Somchai Tech",
          "location": "Main Stage",
          "start_at": "2026-09-21T09:00:00+07:00",
          "end_at": "2026-09-21T10:00:00+07:00",
          "speaker_image": "data:image/jpeg;base64,...",
          "is_highlight": true
        }
      ]
    }
    ```
*   `start_at` และ `end_at` ต้องมีวันที่พร้อมเขตเวลา และเวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม ระบบบันทึกทั้งชุดใน transaction เดียวและส่ง WebSocket `agenda:update` เมื่อสำเร็จ

---

## 3. ข้อกำหนดระบบส่งข้อมูลแบบเรียลไทม์ (WebSocket Events Specification)

เซิร์ฟเวอร์หลังบ้านจะเปิดช่องทางการเชื่อมต่อ (WebSockets Port 8080 หรือซิงค์ภายใต้ Namespace `/signage`) เพื่อกระจายข่าวสารเช็คอินเข้าหน้าจอ Signage และ Dashboard

### 3.1 การเชื่อมต่อ (Handshake Connection)
*   **Endpoint URL**: `ws://<domain>:<port>/socket.io/` หรือ namespace `/signage`

---

### 3.2 เหตุการณ์ที่จะเกิดขึ้นและทริกเกอร์ (Events Triggered)

#### 3.2.1 `welcome:new_checkin` (เช็คอินคนล่าสุด)
*   **ทริกเกอร์จาก**: หลังบ้านส่งกระจายข้อมูลออกไปทันทีหลังจาก API `POST /api/v1/checkin` บันทึกเช็คอินสำเร็จ
*   **การใช้งาน**: หน้าจอ **Welcome Screen** ของ Signage และแท็บเล็ตสตาฟ จะคอยดักฟังเพื่อดึงชื่อและกราฟฟิกต้อนรับโชว์ขึ้นภาพทันที
*   **Payload (ข้อมูลส่งออก)**:
    ```json
    {
      "fullname": "Yanisa Prasert",
      "company": "Zoom Information System",
      "timestamp": "2026-08-30T17:16:12Z"
    }
    ```

#### 3.2.2 `overview:update` (อัปเดตแดชบอร์ด/ยอดสะสม)
*   **ทริกเกอร์จาก**: เมื่อตัวเลขจำนวนผู้สมัครเปลี่ยนไป (มีผู้เช็คอินใหม่ หรือมีการแอดข้อมูลแมนวล)
*   **การใช้งาน**: หน้าจอ **Overview Dashboard** จะคอยฟังเพื่อนำค่าไปแอนิเมชันขยับยอดสถิติตัวเลขสะสม Registered, Checked-in, Pending
*   **Payload (ข้อมูลส่งออก)**:
    ```json
    {
      "registered": 320,
      "checked_in": 245,
      "pending": 75,
      "show_up_percent": 76
    }
    ```

#### 3.2.3 `signage:layout_change` (สั่งเปลี่ยนสลับหน้าจอใหญ่จากระยะไกล) — ⚠️ ยังไม่ได้ implement
> ระบบปัจจุบัน**ไม่ส่ง** event นี้ แต่ละจอเลือกแท็บด้วย URL เช่น `/signage?screen=overview` และจะไม่เปลี่ยนแท็บเอง (ดู [ADR-0007](adr/0007-signage-screen-in-url.md))

*   **ทริกเกอร์จาก**: แอดมินหลักใช้แผงควบคุม Signage CMS สั่งสลับเปลี่ยนหน้าจอ TV ส่วนกลาง เช่น สลับไปตารางกำหนดการ (Agenda)
*   **การใช้งาน**: เครื่อง Media Player ของหน้าจอใหญ่จะคอยฟังเพื่อทำการ Redirect หน้าเว็บเทมเพลตอัตโนมัติ
*   **Payload (ข้อมูลส่งออก)**:
    ```json
    {
      "target_layout": "screen-agenda" 
    }
    ```
    *(layouts: `screen-welcome`, `screen-overview`, `screen-agenda`, `screen-session`, `screen-lucky`, `screen-sponsors`, `screen-announce`, `screen-photowall`)*

#### 3.2.4 `participants:update` (ซิงค์ฐานข้อมูลรายชื่อบนจอแอดมินทุกหน้าจอ)
*   **ทริกเกอร์จาก**: เมื่อมีการทำธุรกรรม เพิ่ม ลบ หรือแก้ไขข้อมูลรายชื่อบนเซิร์ฟเวอร์หลังบ้าน
*   **การใช้งาน**: หน้าจอแผงจัดการ CMS ของเครื่องแอดมินสตาฟเครื่องอื่นจะคอยฟังเพื่อทำการโหลดเรนเดอร์ตารางตารางรายชื่อขึ้นมาใหม่แบบอัตโนมัติ เพื่อป้องกันข้อมูลทับซ้อนและข้อมูลไม่ตรงกัน (Out of Sync)
*   **Payload (ข้อมูลส่งออก)**:
    ```json
    {
      "action": "edit",
      "data": [
        {
          "id": 2,
          "name": "Apirak Bampen",
          "company": "DeepTech Global",
          "status": "Pending"
        }
      ]
    }
    ```

#### 3.2.5 `luckydraw:spin` และ `luckydraw:winner_announced` (ประกาศผลการสุ่ม)
> ชื่อ event จริงในโค้ดคือ `luckydraw:spin` (payload ด้านล่าง) และ `luckydraw:winner_announced` (payload = object ผู้ชนะแบบเดียวกับ response ของข้อ 2.5 รวมรูปผู้โชคดีและรูปรางวัล) · server ส่งหลังจากหน้า `/lucky-draw` หมุนเสร็จแล้วเรียก API จึงไม่เฉลยชื่อก่อนวงล้อหยุด · จอ LED แท็บ Lucky ฟัง `luckydraw:winner_announced` เพื่อแสดงหน้าประกาศผู้โชคดี

*   **ทริกเกอร์จาก**: เมื่อแอดมินเรียกใช้งาน API `POST /api/v1/events/:event_id/lucky-draw/spin`
*   **การใช้งาน**: หน้าจอทีวีสลากนำโชค (Lucky Draw Screen) จะจับสัญญาณเพื่อสั่งเริ่มหมุนแอนิเมชันรายชื่อด่วน และจะทำการหยุดล้อหมุน (Stop Spinner) เมื่อพบชื่อผู้ชนะตรงกับข้อมูลใน Payload พร้อมโปรยกระดาษสีเฉลิมฉลองขึ้นจอใหญ่
*   **Payload (ข้อมูลส่งออก)**:
    ```json
    {
      "winner_name": "Narong Decha",
      "winner_company": "NextGen Software",
      "prize_name": "IPAD PRO M4"
    }
    ```

#### 3.2.6 `agenda:update` (อัปเดตกำหนดการจอ LED)
*   **ทริกเกอร์จาก**: หลัง Staff บันทึกกำหนดการผ่าน `PUT /api/v1/events/:event_id/agenda`
*   **การใช้งาน**: หน้า Event Agenda รับรายการล่าสุดทันทีและคำนวณรายการ Active ใหม่ตามเวลาของเครื่องแสดงผล
# Lucky Draw Prizes

- `GET /api/v1/events/:event_id/prizes` — รายการของรางวัล (`?active=true` สำหรับรายการเปิดใช้งาน)
- `POST /api/v1/events/:event_id/prizes` — เพิ่มของรางวัล (Staff JWT)
- `PUT /api/v1/events/:event_id/prizes/:prize_id` — แก้ไขของรางวัล (Staff JWT)
- `DELETE /api/v1/events/:event_id/prizes/:prize_id` — ลบของรางวัล (Staff JWT)

ข้อมูลรองรับ `name`, `code`, `description`, `image`, `quantity`, `is_active` และ `sort_order`; ผลลัพธ์รายการมี `awarded_count` และ `remaining_count` ซึ่งคำนวณจากประวัติผู้ชนะด้วย

### รางวัล: ลำดับการสุ่มและ Excel
- `PUT /api/v1/events/:event_id/prizes/reorder` (Staff JWT) — body `{ "prize_ids": [3, 1, 2] }` ตั้ง `sort_order` = ตำแหน่ง (1, 2, 3…) คืนรายการรางวัลทั้งหมด
- `POST /api/v1/events/:event_id/prizes/import` (Staff JWT) — body `{ "prizes": [{ "row": 2, "sort_order": 1, "name": "…", "code": "GRAND-01", "description": "", "quantity": 1, "is_active": true, "image": "" }] }` สูงสุด 500 แถว
  - จับคู่รางวัลเดิมด้วย `code` ก่อน แล้วค่อย `name` (ไม่สนตัวพิมพ์เล็ก-ใหญ่) → อัปเดต; ไม่พบ → สร้างใหม่ต่อท้ายลำดับ; **ไม่ลบ** รางวัลที่ไม่มีในไฟล์
  - `image` ว่าง = คงรูปเดิม · ทำใน transaction เดียว แถวผิดแถวเดียวจะไม่บันทึกอะไรเลย (400 พร้อมเลขแถว)
  - Response: `{ "success": true, "data": { "created": 1, "updated": 5 } }`
- `POST /prizes` ที่ไม่ส่ง `sort_order` (หรือส่ง 0) จะต่อท้ายลำดับสุดท้ายอัตโนมัติ
- ทุกการเปลี่ยนแปลงส่ง WebSocket `prizes:update` `{ "event_id": 1 }`

# Participants: นำเข้าจาก Excel

`POST /api/v1/participants/import` (Staff JWT)

- Body: `{ "participants": [{ "row": 2, "name": "สมชาย ใจดี", "company": "ACME", "position": "", "email": "a@x.co", "phone": "0812345678", "attendee_type": "VIP" }] }` สูงสุด 5,000 แถว
- ข้ามแถวที่ไม่มีชื่อ/บริษัท (`MISSING_REQUIRED_FIELDS`), อีเมลผิดรูปแบบ (`INVALID_EMAIL`), อีเมลซ้ำกับในระบบหรือแถวก่อนหน้า (`DUPLICATE_EMAIL`)
- แถวที่ผ่านบันทึกใน transaction เดียว สร้างรหัสตั๋ว `SERYYYYMMDDxxxx` ที่ไม่ชนกับของเดิม ไม่ส่งอีเมลตั๋ว
- Response (201): `{ "success": true, "data": { "imported_count": 117, "skipped_count": 3, "skipped": [{ "row": 9, "reason": "DUPLICATE_EMAIL" }] } }`
- ส่ง WebSocket `participants:update` (`action: "import"`) และ `overview:update` ครั้งเดียวหลังนำเข้า

# Settings (ตั้งค่าระบบ)

- `GET /api/v1/settings` (Public) — object key/value ของทุกค่าตั้งค่า
- `PUT /api/v1/settings` (Staff JWT) — ส่งเฉพาะ key ที่ต้องการแก้ ระบบรับเฉพาะ key ในรายการที่อนุญาต แล้วส่ง WebSocket `settings:update`
- รายการ key ทั้งหมดและความหมายอยู่ที่ [configuration.md](configuration.md#2-ค่าตั้งค่าในระบบ-settings) · `event_map_url` ต้องขึ้นต้นด้วย `http(s)://` มิฉะนั้นตอบ 400

