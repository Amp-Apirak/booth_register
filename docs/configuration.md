# การตั้งค่าระบบ (Configuration Reference)

ปรับปรุง: 2026-09-26 · ใช้คู่กับ [runbook.md](runbook.md)

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
| `SMTP_FROM` | | `SMTP_USER` | อีเมลผู้ส่งที่ mail server ยอมให้ใช้ · ชื่อผู้ส่งในอีเมลคือชื่องานจากหน้าตั้งค่า |
| `TRUST_PROXY` | | — | หลัง reverse proxy (Caddy / k3s gateway) ตั้ง `1` เพื่อให้การจำกัด login ผิด / ค้นหาตั๋วผิด นับตามเครื่องผู้ใช้จริง (ตั้งไว้แล้วใน `deploy/`) · เครื่องพัฒนาไม่ต้องตั้ง |
| `NODE_ENV` | | — | `test` = ไม่ส่งอีเมล (ใช้ตอนรัน Jest) |
| `REDIS_HOST` / `REDIS_PORT` | | — | มีใน `.env.example` และ docker-compose แต่ **โค้ดปัจจุบันยังไม่ใช้ Redis** |

### 1.3 `client/.env.local` — Next.js

| ตัวแปร | ค่าเริ่มต้น | ความหมาย |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3005` | URL ของ API ที่ **เบราว์เซอร์** เรียก (ฝังตอน build) · ถ้าเป็น `localhost` แต่เปิดหน้าเว็บจากเครื่องอื่นผ่าน IP (มือถือ, ทีวี, PC จอ LED) ระบบเรียก API ที่ IP เดียวกันให้อัตโนมัติ ไม่ต้องแก้ ([ADR-0016](adr/0016-live-updates-and-network-access.md)) · production ใส่โดเมนจริง |

`client/next.config.ts` → `allowedDevOrigins` อนุญาตให้เปิด `npm run dev` จากเครื่องในวง LAN (192.168.x.x, 10.x.x.x, 172.x.x.x, *.local) มิฉะนั้น Next.js 16 ปฏิเสธไฟล์ JavaScript บนเครื่องเหล่านั้น (ปุ่มไม่ทำงาน ข้อมูลไม่อัปเดต) · ไม่มีผลกับ production

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

ข้อมูลอื่นที่แก้จากหน้า `/settings` แต่อยู่คนละตาราง: กำหนดการ (`agenda_items`), ของรางวัล (`lucky_draw_prizes`) และประเภทองค์กร (`organization_types` — แท็บ "ประเภทองค์กร": ชื่อไทย/อังกฤษ, สีในกราฟ 8 สี, แสดงในหน้าลงทะเบียน, ลำดับ; server ใส่ 6 ประเภทเริ่มต้นให้ถ้ายังไม่มี · [ADR-0012](adr/0012-organization-types.md))

**เพิ่ม key ใหม่:** เพิ่มใน `initTable()` + ค่า fallback ใน `settingsRepository.js`, `allowedKeys` ใน `settingsController.js`, `SystemSettings` + `DEFAULT_SETTINGS` ใน `client/src/lib/api.ts` แล้วอัปเดตตารางนี้

---

## 3. ค่าคงที่ของแพลตฟอร์ม

`client/src/lib/platform.ts` → `PLATFORM_CONTACT` ผู้ติดต่อสำหรับผู้สนใจนำแพลตฟอร์มไปใช้ (แสดงใน Footer ทุกหน้าผู้เข้าร่วม และ Footer เจ้าหน้าที่) ไม่ขึ้นกับงาน ผู้จัดงานแก้ไม่ได้ ([ADR-0010](adr/0010-footer-and-platform-contact.md))

## 4. ภาษาและธีม

ค่าที่ผู้ใช้เลือกจากปุ่มบนเมนู (ไม่ต้องตั้งค่าที่ server) · [ADR-0013](adr/0013-theme-and-language.md)

| Cookie | ค่า | ค่าเริ่มต้น |
|---|---|---|
| `booth_lang` | `th` \| `en` | `th` |
| `booth_theme` | `dark` \| `light` | `dark` |

- เปิด URL ใดก็ได้พร้อม `?lang=en` หรือ `?theme=light` = บังคับค่าและจำไว้ในเครื่องนั้น (ใช้กับจอ LED/kiosk เช่น `/signage?screen=overview&lang=en&theme=light`)
- ข้อความหน้าเว็บอยู่ใน `client/src/i18n/th/*.ts` (ต้นฉบับ) และ `client/src/i18n/en/*.ts`
- สีธีมสว่างสร้างจาก `cd client && node scripts/gen-theme-light.mjs` (→ `src/app/theme-light.css`) รันใหม่เมื่ออัปเกรด Tailwind

## 5. บัญชีเจ้าหน้าที่และสิทธิ์

| Role | ทำได้ | ทำไม่ได้ |
|---|---|---|
| **Admin** | ทุกอย่าง | — |
| **Staff** | สแกนเช็คอิน, ดู/เพิ่ม/แก้ไขผู้เข้าร่วม, รายงานและกราฟ, สุ่มรางวัล | ตั้งค่าระบบทุกแท็บ, ลบผู้เข้าร่วม, นำเข้า Excel |

รายละเอียด: [ADR-0015](adr/0015-roles-and-access.md) · login ผิด 10 ครั้งใน 15 นาที ต้องรอ 15 นาที (หรือ restart server)

ไม่มีบัญชีที่ใช้ได้หลังติดตั้ง (บัญชีตัวอย่างใน `seed.sql` ไม่มีรหัสผ่านที่ใช้ได้) สร้าง/รีเซ็ต/เปลี่ยน role ด้วย

```bash
cd server
node scripts/create-admin.js <username> '<password อย่างน้อย 8 ตัว>' [Admin|Staff] "ชื่อ-นามสกุล"
```

## 6. ค่าสำหรับการทดสอบ Playwright

`client/.env.e2e.local` (ห้าม commit) — `E2E_BASE_URL`, `E2E_API_URL`, `E2E_ADMIN_USER/PASSWORD`, `E2E_STAFF_USER/PASSWORD` · วิธีสร้างบัญชีทดสอบและรัน: [client/e2e/README.md](../client/e2e/README.md)
