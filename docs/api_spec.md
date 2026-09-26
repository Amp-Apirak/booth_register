# ข้อกำหนดทางเทคนิค API และ WebSocket (REST API & WebSocket Specifications)
## โครงการ: Smart Event Registration
### สำหรับ: Backend & Frontend Developers
### รูปแบบข้อมูล: JSON (Javascript Object Notation)

---

## 1. ข้อมูลส่วนหัวสำหรับการเรียกใช้งาน (HTTP Headers)
Endpoint ของเจ้าหน้าที่ต้องแนบส่วนหัวดังนี้ (endpoint สาธารณะไม่ต้องมี `Authorization`):
```http
Content-Type: application/json
Authorization: Bearer <JWT_ACCESS_TOKEN>
```

### 1.1 ระดับสิทธิ์ ([ADR-0015](adr/0015-roles-and-access.md))

| ระดับ | Endpoint |
|---|---|
| สาธารณะ | `POST /login` · `POST /events/:id/register` · `POST /tickets/lookup` · `GET /events/:id/stats` · `GET /settings` · `GET /events/:id/agenda` · `GET /events/:id/prizes` · `GET /events/:id/organization-types` · `GET /events/:id/lucky-draw/winners` · `GET /ping` |
| เจ้าหน้าที่ (Staff หรือ Admin) | `GET/POST /participants` · `GET /participants/:ticket_code` · `PUT /participants/:id` · `POST /checkin` · `POST /events/:id/lucky-draw/spin` · `GET /events/:id/lucky-draw/eligible` |
| Admin เท่านั้น | `POST /participants/import` · `DELETE /participants/:id` · `PUT /settings` · `PUT /events/:id/agenda` · ของรางวัลทั้งหมดที่เปลี่ยนข้อมูล (POST/PUT/DELETE/reorder/import) · ประเภทองค์กรที่เปลี่ยนข้อมูล (POST/PUT/DELETE/reorder) · `GET /events/:id/reset-summary` · `POST /events/:id/reset` |

- ไม่มี token / token ผิด / หมดอายุ → **401** (`UNAUTHORIZED` / `INVALID_TOKEN` / `TOKEN_EXPIRED`) · role ไม่พอ → **403** `FORBIDDEN`
- `POST /login` ผิด 10 ครั้งต่อ username + เครื่อง ภายใน 15 นาที → **429** `TOO_MANY_ATTEMPTS` (มี `retry_after` วินาที และ header `Retry-After`)

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
      "phone": "081-234-5678",
      "pdpa_consent": true,
      "organization_type_id": 2
    }
    ```
*   **ตรวจข้อมูล (2026-09-26):** ความยาวสูงสุด ชื่อ 150 / บริษัท 150 / ตำแหน่ง 100 / อีเมล 255 / เบอร์ 50 (`FIELD_TOO_LONG`) · อีเมลผิดรูปแบบ `INVALID_EMAIL` · เบอร์ผิดรูปแบบ `INVALID_PHONE` · รูปต้องเป็น data URL ของ PNG/JPG/WebP (`INVALID_PHOTO`) ไม่เกิน ~2.2 MB (`PHOTO_TOO_LARGE`) · `attendee_type` จากหน้าสาธารณะเป็น `General` เสมอ · รหัสตั๋ว `SER` + วันที่ + ตัวเลขสุ่ม 6 หลัก (ตั๋วเก่า 4 หลัก) ชนกันระบบสุ่มใหม่ให้
*   **ประเภทองค์กร (บังคับ, 2026-09-25):** ส่ง `organization_type_id` (ประเภทที่เปิดใช้งานจาก `GET /events/:event_id/organization-types?active=true`) **หรือ** `organization_type_other` (ข้อความเมื่อเลือก "อื่นๆ", สูงสุด 150 ตัวอักษร) · ไม่ส่งเลย → 400 `ORGANIZATION_TYPE_REQUIRED` · รหัสไม่มีอยู่หรือถูกปิด → 400 `INVALID_ORGANIZATION_TYPE` ([ADR-0012](adr/0012-organization-types.md))
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

> **ปัจจุบัน (2026-09-26):** ต้องใช้ token เจ้าหน้าที่ · body `{ "ticket_code": "SER20260921123456" }` · 200 → `data` = ผู้เข้าร่วม (`name`, `company`, `status: "Checked-in"`, `checked_in_at` …) · บันทึก `checkins.scanned_by` = บัญชีที่สแกน · 400 `TICKET_CODE_REQUIRED` / `TICKET_NOT_FOUND` / `ALREADY_CHECKED_IN` (มี `participant: { name, company, checked_in_at }` บอกว่าใครเข้าไปแล้วเมื่อไร) · สองจุดสแกนตั๋วเดียวกันพร้อมกัน: สำเร็จ 1 ครั้ง อีกครั้งได้ `ALREADY_CHECKED_IN` · ตัวอย่างด้านล่างเป็นแบบร่างเดิม

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

> **ปัจจุบัน (2026-09-26):** ต้องใช้ token เจ้าหน้าที่ · รางวัลต้องมีใน `lucky_draw_prizes`, เปิดการสุ่ม และยังเหลือจำนวน · สุ่มทีละครั้งต่องาน (ล็อกใน DB) จึงไม่ได้ผู้ชนะซ้ำหรือเกินจำนวน · 400 `PRIZE_NAME_REQUIRED` / `PRIZE_NOT_FOUND` / `PRIZE_INACTIVE` / `PRIZE_SOLD_OUT` / `NO_ELIGIBLE_PARTICIPANTS` · ผลลัพธ์และ event `luckydraw:winner_announced` **ไม่มี `email`** (ตัวอย่างด้านล่างที่มี email เป็นรูปแบบเดิม) · `GET /events/:id/lucky-draw/eligible` ต้องใช้ token เจ้าหน้าที่

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

### 2.5.1 ค้นหาตั๋วของตัวเอง (Public ticket lookup)
ผู้เข้าร่วม (ไม่ต้อง login) พิสูจน์ว่าเป็นเจ้าของตั๋ว

*   **URL Route**: `POST /api/v1/tickets/lookup`
*   **Request Body**: `{ "ticket_code": "SER20260921123456", "verifier": "5678" }` — `verifier` = เบอร์โทร 4 ตัวท้าย หรืออีเมลที่ลงทะเบียน (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
*   **Response (200)**: `{ "success": true, "data": { "name", "company", "position", "ticket_code", "attendee_type", "status", "checked_in_at" } }` — ไม่มีอีเมล เบอร์โทร หรือ id
*   **404** `TICKET_NOT_FOUND` (ตอบแบบเดียวกันทั้งรหัสผิดและข้อมูลยืนยันผิด) · **400** `LOOKUP_FIELDS_REQUIRED` · **429** `TOO_MANY_ATTEMPTS` หลังผิด 5 ครั้งต่อรหัสตั๋ว หรือ 30 ครั้งต่อเครื่อง ภายใน 15 นาที

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
          "status": "Checked-in",
          "checked_in_at": "2026-09-21T02:05:13.000Z",
          "organization_type_id": 2,
          "organization_type_other": null
        }
      ]
    }
    ```
*   ต้องใช้ Staff JWT · `organization_type_id` = รหัสประเภทองค์กร, `organization_type_other` = ข้อความ "อื่นๆ" (มีได้อย่างใดอย่างหนึ่ง, ทั้งคู่ `null` = ไม่ระบุ) · `checked_in_at` = เวลาเช็คอิน (`null` ถ้ายังไม่เข้างาน) ใช้คำนวณกราฟช่วงเวลาเข้างาน

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

*   รับ `organization_type_id` / `organization_type_other` ได้เหมือนข้อ 2.1 แต่ **ไม่บังคับ** (เจ้าหน้าที่เพิ่มแทน)

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

*   ประเภทองค์กรเปลี่ยนเฉพาะเมื่อ body มี key `organization_type_id` หรือ `organization_type_other` (ส่ง `{"organization_type_id": null, "organization_type_other": null}` = ล้างเป็น "ไม่ระบุ") · ไม่ส่ง key = คงค่าเดิม

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
*   **แทนที่กำหนดการทั้งหมด (Admin JWT)**: `PUT /api/v1/events/:event_id/agenda`
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

### 2.8 สำรองและรีเซ็ต (Backup & reset) — Admin ([ADR-0017](adr/0017-backup-and-reset.md))

*   **จำนวนข้อมูลที่จะถูกลบ (แสดงในหน้าต่างยืนยัน)**: `GET /api/v1/events/:event_id/reset-summary`
    ```json
    {
      "success": true,
      "data": {
        "organization_types": 6, "participants_with_organization_type": 40,
        "agenda_items": 24, "prizes": 6,
        "participants": 48, "checkins": 30, "winners": 10,
        "general_changed": 7, "registration_changed": 4, "default_organization_types": 6
      }
    }
    ```
    `general_changed` / `registration_changed` = จำนวนช่องที่ไม่ใช่ค่าเริ่มต้น
*   **รีเซ็ตกลับเป็นค่าเริ่มต้น**: `POST /api/v1/events/:event_id/reset`
    ```json
    { "sections": ["general", "registration", "organizations", "agenda", "prizes", "attendees"] }
    ```
    เลือกได้ตั้งแต่ 1 หมวด · ทำใน transaction เดียว (สำเร็จทั้งหมดหรือไม่เปลี่ยนเลย) · บัญชีผู้ใช้ไม่ถูกลบ
    | หมวด | ผล |
    |---|---|
    | `general` | การตั้งค่าแท็บข้อมูลทั่วไปเป็นค่าเริ่มต้น (`event_name` = `SMART EVENT REGISTRATION`, ที่เหลือว่าง) |
    | `registration` | การตั้งค่าหน้าลงทะเบียนว่างทั้งหมด |
    | `organizations` | ลบประเภทองค์กรของงาน แล้วใส่ 6 รายการเริ่มต้น (ผู้เข้าร่วมที่ยังอยู่ → `organization_type_id = null`) |
    | `agenda` | ลบกำหนดการทั้งหมด |
    | `prizes` | ลบของรางวัลทั้งหมด (ผู้ได้รางวัลยังอยู่) |
    | `attendees` | ลบผู้เข้าร่วม การเช็คอิน และผู้ได้รางวัล |
*   **Response (200)**:
    ```json
    {
      "success": true,
      "data": {
        "sections": ["agenda", "attendees"],
        "removed": { "participants": 48, "checkins": 30, "winners": 10, "agenda_items": 24 },
        "settings": {}
      }
    }
    ```
    `settings` = ค่าเริ่มต้นที่ใช้แล้ว (เมื่อมี `general` / `registration`)
*   **Errors**: `sections` ว่างหรือมีชื่อที่ไม่รู้จัก → **400** `INVALID_SECTIONS` · ไม่พบงาน → **404** `EVENT_NOT_FOUND` · ไม่ login → 401 · Staff → 403 `FORBIDDEN`
*   **WebSocket หลังรีเซ็ต**: `settings:update` (ค่าเริ่มต้น), `agenda:update` (`items: []`), `prizes:update`, `organization-types:update`, `overview:update`, `participants:update` (เฉพาะหน้าจอเจ้าหน้าที่) และ `data:reset` (ข้อ 3.2.8)

---

## 3. ข้อกำหนดระบบส่งข้อมูลแบบเรียลไทม์ (WebSocket Events Specification)

เซิร์ฟเวอร์หลังบ้านจะเปิดช่องทางการเชื่อมต่อ (WebSockets Port 8080 หรือซิงค์ภายใต้ Namespace `/signage`) เพื่อกระจายข่าวสารเช็คอินเข้าหน้าจอ Signage และ Dashboard

### 3.1 การเชื่อมต่อ (Handshake Connection)
*   **Endpoint URL**: `ws://<domain>:<port>/socket.io/` หรือ namespace `/signage`

> **ปัจจุบัน (2026-09-26, [ADR-0016](adr/0016-live-updates-and-network-access.md)):** namespace เดียว `/` ที่ `<API URL>/socket.io/` (WebSocket ก่อน, สำรองด้วย long-polling) · ทุกหน้าจอได้ event สาธารณะ (`overview:update`, `welcome:new_checkin`, `luckydraw:*`, `agenda:update`, `prizes:update`, `settings:update`, `organization-types:update`) · **`participants:update` ส่งเฉพาะหน้าจอเจ้าหน้าที่**: client ส่ง `socket.emit('staff:join', <token>, ack)` → `ack({ ok: true })` แล้วอยู่ในห้อง `staff` จนกว่าจะ `staff:leave` หรือ token หมดอายุ · `welcome:new_checkin` = `{ name, company, position, profile_picture, attendee_type, timestamp }` (ไม่มีอีเมล/เบอร์โทร) · ลำดับตอนเช็คอิน: `welcome:new_checkin` → `overview:update` → `participants:update`

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

#### 3.2.7 `organization-types:update` (ประเภทองค์กรเปลี่ยน)
*   **ทริกเกอร์จาก**: เพิ่ม/แก้ไข/ลบ/เรียงลำดับประเภทองค์กร
*   **Payload**: `{ "event_id": 1 }` — ผู้รับโหลด `GET /events/:event_id/organization-types` ใหม่

#### 3.2.8 `data:reset` (รีเซ็ตกลับเป็นค่าเริ่มต้น)
*   **ทริกเกอร์จาก**: `POST /api/v1/events/:event_id/reset` สำเร็จ (ส่งหลัง event เฉพาะของแต่ละหมวด)
*   **Payload**: `{ "event_id": 1, "sections": ["attendees", "prizes"] }`
*   **การใช้งาน**: เมื่อมี `attendees` จอ LED ล้างชื่อแขกคนล่าสุดและผู้ได้รางวัลล่าสุด · หน้าสุ่มรางวัลโหลดรายชื่อผู้มีสิทธิ์ ของรางวัล และผู้ได้รางวัลใหม่เมื่อมี `attendees` หรือ `prizes`
# Lucky Draw Prizes

- `GET /api/v1/events/:event_id/prizes` — รายการของรางวัล (`?active=true` สำหรับรายการเปิดใช้งาน)
- `POST /api/v1/events/:event_id/prizes` — เพิ่มของรางวัล (Admin JWT)
- `PUT /api/v1/events/:event_id/prizes/:prize_id` — แก้ไขของรางวัล (Admin JWT)
- `DELETE /api/v1/events/:event_id/prizes/:prize_id` — ลบของรางวัล (Admin JWT)

ข้อมูลรองรับ `name`, `code`, `description`, `image`, `quantity`, `is_active` และ `sort_order`; ผลลัพธ์รายการมี `awarded_count` และ `remaining_count` ซึ่งคำนวณจากประวัติผู้ชนะด้วย

### รางวัล: ลำดับการสุ่มและ Excel
- `PUT /api/v1/events/:event_id/prizes/reorder` (Admin JWT) — body `{ "prize_ids": [3, 1, 2] }` ตั้ง `sort_order` = ตำแหน่ง (1, 2, 3…) คืนรายการรางวัลทั้งหมด
- `POST /api/v1/events/:event_id/prizes/import` (Admin JWT) — body `{ "prizes": [{ "row": 2, "sort_order": 1, "name": "…", "code": "GRAND-01", "description": "", "quantity": 1, "is_active": true, "image": "" }] }` สูงสุด 500 แถว
  - จับคู่รางวัลเดิมด้วย `code` ก่อน แล้วค่อย `name` (ไม่สนตัวพิมพ์เล็ก-ใหญ่) → อัปเดต; ไม่พบ → สร้างใหม่ต่อท้ายลำดับ; **ไม่ลบ** รางวัลที่ไม่มีในไฟล์
  - `image` ว่าง = คงรูปเดิม · ทำใน transaction เดียว แถวผิดแถวเดียวจะไม่บันทึกอะไรเลย (400 พร้อมเลขแถว)
  - Response: `{ "success": true, "data": { "created": 1, "updated": 5 } }`
- `POST /prizes` ที่ไม่ส่ง `sort_order` (หรือส่ง 0) จะต่อท้ายลำดับสุดท้ายอัตโนมัติ
- ทุกการเปลี่ยนแปลงส่ง WebSocket `prizes:update` `{ "event_id": 1 }`

# Participants: นำเข้าจาก Excel

`POST /api/v1/participants/import` (Admin JWT)

- Body: `{ "participants": [{ "row": 2, "name": "สมชาย ใจดี", "company": "ACME", "position": "", "email": "a@x.co", "phone": "0812345678", "attendee_type": "VIP", "organization_type": "สถานศึกษา" }] }` สูงสุด 5,000 แถว
- `organization_type` (ไม่บังคับ): รหัสหรือชื่อไทย/อังกฤษของประเภทองค์กร (ไม่สนตัวพิมพ์เล็ก-ใหญ่และช่องว่างรอบ `/`) → จับคู่เป็น `organization_type_id`; ไม่ตรงกับประเภทใด → เก็บเป็น `organization_type_other`; ว่าง → ไม่ระบุ
- ข้ามแถวที่ไม่มีชื่อ/บริษัท (`MISSING_REQUIRED_FIELDS`), อีเมลผิดรูปแบบ (`INVALID_EMAIL`), อีเมลซ้ำกับในระบบหรือแถวก่อนหน้า (`DUPLICATE_EMAIL`)
- แถวที่ผ่านบันทึกใน transaction เดียว สร้างรหัสตั๋ว `SERYYYYMMDDxxxx` ที่ไม่ชนกับของเดิม ไม่ส่งอีเมลตั๋ว
- Response (201): `{ "success": true, "data": { "imported_count": 117, "skipped_count": 3, "skipped": [{ "row": 9, "reason": "DUPLICATE_EMAIL" }] } }`
- ส่ง WebSocket `participants:update` (`action: "import"`) และ `overview:update` ครั้งเดียวหลังนำเข้า

# Organization types (ประเภทองค์กร)

[ADR-0012](adr/0012-organization-types.md) · ทุกการเปลี่ยนแปลงส่ง WebSocket `organization-types:update`

- `GET /api/v1/events/:event_id/organization-types` (Public) — เรียงตาม `sort_order` · `?active=true` = เฉพาะที่แสดงในหน้าลงทะเบียน
  ```json
  { "success": true, "data": [{ "id": 1, "name_th": "หน่วยงานราชการ / รัฐวิสาหกิจ", "name_en": "Government agency / State enterprise", "color": "blue", "sort_order": 1, "is_active": true, "usage_count": 5 }] }
  ```
- `POST /api/v1/events/:event_id/organization-types` (Admin JWT) — body `{ "name_th": "มูลนิธิ", "name_en": "Foundation", "color": "violet", "is_active": true }` → 201 ต่อท้ายลำดับ
  - `name_th` ว่าง → 400 `NAME_TH_REQUIRED` · `color` ต้องเป็น `blue` `red` `green` `violet` `orange` `aqua` `yellow` `magenta` มิฉะนั้น 400 `INVALID_COLOR`
- `PUT /api/v1/events/:event_id/organization-types/:id` (Admin JWT) — body แบบเดียวกับ POST (ส่งครบทุกช่อง) · ไม่พบ → 404 `NOT_FOUND`
- `PUT /api/v1/events/:event_id/organization-types/reorder` (Admin JWT) — body `{ "ids": [3, 1, 2] }` ตั้ง `sort_order` ตามตำแหน่ง คืนรายการทั้งหมด · ids ผิดรูปแบบ → 400 `INVALID_IDS`
- `DELETE /api/v1/events/:event_id/organization-types/:id` (Admin JWT) — มีผู้เข้าร่วมเลือกแล้ว → 409 `{ "error": "IN_USE", "usage_count": 12 }` (ให้ปิด `is_active` แทน)

# Settings (ตั้งค่าระบบ)

- `GET /api/v1/settings` (Public) — object key/value ของทุกค่าตั้งค่า
- `PUT /api/v1/settings` (Admin JWT) — ส่งเฉพาะ key ที่ต้องการแก้ ระบบรับเฉพาะ key ในรายการที่อนุญาต แล้วส่ง WebSocket `settings:update`
- รายการ key ทั้งหมดและความหมายอยู่ที่ [configuration.md](configuration.md#2-ค่าตั้งค่าในระบบ-settings) · `event_map_url` ต้องขึ้นต้นด้วย `http(s)://` มิฉะนั้นตอบ 400

