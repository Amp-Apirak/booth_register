# การตั้งค่าระบบ (Configuration Reference)

ปรับปรุง: 2026-09-23 · ใช้คู่กับ [runbook.md](runbook.md)

ระบบมีการตั้งค่า 3 ชั้น

| ชั้น | อยู่ที่ | ใครแก้ | ต้อง restart |
|---|---|---|---|
| 1. Environment (ความลับ, พอร์ต, การเชื่อมต่อ) | `.env`, `server/.env`, `client/.env.local` | DevOps / นักพัฒนา | ใช่ |
| 2. ค่าตั้งค่าในระบบ (ข้อมูลงาน) | ตาราง `settings` ผ่านหน้า `/settings` | แอดมินของงาน | ไม่ (อัปเดตทุกจอผ่าน WebSocket) |
| 3. ค่าคงที่ของแพลตฟอร์ม | `client/src/lib/platform.ts` | เจ้าของแพลตฟอร์ม | build/deploy ใหม่ |

> ไฟล์ `.env*` ทั้งหมดอยู่ใน `.gitignore` **ห้าม commit** ใช้ไฟล์ `*.env.example` เป็นแม่แบบ หรือรัน `./scripts/setup.sh` ให้สร้างให้

---

## 1. Environment variables

### 1.1 `.env` (root) — ใช้โดย `docker-compose.yml`

| ตัวแปร | จำเป็น | ตัวอย่าง | ความหมาย |
|---|---|---|---|
| `DB_USER` | ✅ | `event_admin` | user ของ PostgreSQL ที่ container สร้าง |
| `DB_PASSWORD` | ✅ | (สุ่ม) | รหัสผ่าน PostgreSQL |

> Container สร้าง user/password **ครั้งแรกที่สร้าง volume เท่านั้น** ถ้าเปลี่ยนภายหลังต้องเปลี่ยนใน DB ด้วย (`ALTER USER`) หรือลบ volume (ข้อมูลหาย) — ดู runbook

### 1.2 `server/.env` — Express API + Socket.io

| ตัวแปร | จำเป็น | ค่าเริ่มต้น | ความหมาย |
|---|---|---|---|
| `PORT` | | `3000` (ตัวอย่างตั้ง `3005`) | พอร์ต API — client ค่าเริ่มต้นเรียก `3005` จึงควรตั้ง `3005` |
| `DB_HOST` | | `localhost` | |
| `DB_PORT` | | `5432` | Docker map ไว้ที่ **`5435`** |
| `DB_USER` / `DB_PASSWORD` | ✅ | — | ต้องตรงกับ `.env` root; ไม่มี → server หยุดทันที |
| `DB_NAME` | | `booth_register_db` | |
| `DB_POOL_MAX` | | `20` | จำนวน connection สูงสุด |
| `JWT_SECRET` | ✅ | — | ใช้เซ็น token เจ้าหน้าที่ (อายุ 12 ชม.) ไม่มี → server หยุดทันที · สร้าง: `openssl rand -hex 32` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | | — | ส่งอีเมลตั๋วจริง; ถ้าไม่ตั้ง `SMTP_HOST` ระบบใช้บัญชีทดสอบ Ethereal (ไม่ถึงผู้รับจริง ดูลิงก์ preview ใน log) |
| `NODE_ENV` | | — | `test` = ไม่ส่งอีเมล (ใช้ตอนรัน Jest) |
| `REDIS_HOST` / `REDIS_PORT` | | — | มีใน `.env.example` และ docker-compose แต่ **โค้ดปัจจุบันยังไม่ใช้ Redis** |

### 1.3 `client/.env.local` — Next.js

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3005` | URL ของ API ที่ **เบราว์เซอร์** เรียก (ฝังตอน build) · ใช้บน LAN ให้ใส่ IP เครื่อง server เช่น `http://192.168.1.10:3005` |

### 1.4 พอร์ต

| บริการ | พอร์ตบนเครื่อง | หมายเหตุ |
|---|---|---|
| Web (Next.js) | 3000 | `npm run dev` / `npm start` ใน `client/` |
| API + WebSocket | 3005 | ตาม `PORT` |
| PostgreSQL | 5435 → 5432 | container `event_postgres_db` |
| Redis | 6385 → 6379 | container `event_redis_cache` (ยังไม่ถูกใช้) |

---

## 2. ค่าตั้งค่าในระบบ (Settings)

เก็บแบบ key/value ในตาราง `settings` (server สร้างตารางและค่าว่างให้เองตอนเปิด) · อ่าน `GET /api/v1/settings` (public) · แก้ `PUT /api/v1/settings` (เจ้าหน้าที่) · key ที่รับได้กำหนดใน `server/controllers/settingsController.js`

| Key | แก้ที่ (หน้า `/settings`) | แสดงที่ |
|---|---|---|
| `event_name` | ข้อมูลทั่วไป | เมนู, หน้าแรก, ตั๋ว, จอ LED, Footer |
| `event_logo` | ข้อมูลทั่วไป | เมนู, Footer (Data URL จากการครอปรูป) |
| `event_venue` `event_building` `event_floor` `event_address` | ข้อมูลทั่วไป | หน้าแรก, ตั๋ว, Footer |
| `event_start` `event_end` | ข้อมูลทั่วไป | หน้าแรก, ตั๋ว, Footer (รูปแบบ `YYYY-MM-DDTHH:mm`) |
| `organizer_name` | ข้อมูลทั่วไป → ข้อมูลติดต่อฯ | Footer "จัดโดย", ©, หน้า `/privacy` |
| `contact_phone` `contact_email` `contact_line` | ข้อมูลทั่วไป → ข้อมูลติดต่อฯ | Footer "ติดต่อ / ช่วยเหลือ", `/privacy` |
| `event_map_url` | ข้อมูลทั่วไป → ข้อมูลติดต่อฯ | ลิงก์ "ดูแผนที่" (ต้องขึ้นต้น `http(s)://`) |
| `privacy_policy` | ข้อมูลทั่วไป → ข้อมูลติดต่อฯ | หน้า `/privacy` (เว้นบรรทัดว่าง = ย่อหน้าใหม่) |
| `registration_hero_image` `registration_brochure_image` `registration_intro` `registration_objectives` `registration_terms` | หน้าลงทะเบียน | หน้า `/register` |

ข้อมูลอื่นที่แก้จากหน้า `/settings` แต่อยู่คนละตาราง: กำหนดการ (`agenda_items`) และของรางวัล (`lucky_draw_prizes`)

**เพิ่ม key ใหม่:** เพิ่มใน `initTable()` + ค่า fallback ใน `settingsRepository.js`, `allowedKeys` ใน `settingsController.js`, `SystemSettings` + `DEFAULT_SETTINGS` ใน `client/src/lib/api.ts` แล้วอัปเดตตารางนี้

---

## 3. ค่าคงที่ของแพลตฟอร์ม

`client/src/lib/platform.ts` → `PLATFORM_CONTACT` ผู้ติดต่อสำหรับผู้สนใจนำแพลตฟอร์มไปใช้ (แสดงใน Footer ทุกหน้าผู้เข้าร่วม และ Footer เจ้าหน้าที่) ไม่ขึ้นกับงาน ผู้จัดงานแก้ไม่ได้ ([ADR-0010](adr/0010-footer-and-platform-contact.md))

## 4. บัญชีเจ้าหน้าที่

ไม่มีบัญชีที่ใช้ได้หลังติดตั้ง (บัญชีตัวอย่างใน `seed.sql` ไม่มีรหัสผ่านที่ใช้ได้) สร้าง/รีเซ็ตด้วย

```bash
cd server
node scripts/create-admin.js <username> '<password อย่างน้อย 8 ตัว>' [Admin|Staff] "ชื่อ-นามสกุล"
```
