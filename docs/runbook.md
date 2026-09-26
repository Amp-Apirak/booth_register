# Runbook — ติดตั้ง ใช้งาน และแก้ปัญหา

ปรับปรุง: 2026-09-26 · ค่าตั้งค่าทั้งหมดดู [configuration.md](configuration.md)

## 1. ติดตั้งเครื่องใหม่ (ครั้งแรก)

**ต้องมี:** Node.js 20+ (ทดสอบบน 22), Docker Desktop (เปิดไว้), Git, openssl

```bash
git clone https://github.com/Amp-Apirak/booth_register.git
cd booth_register
git checkout Dev                     # งานพัฒนาอยู่ที่ Dev
./scripts/setup.sh                   # สร้าง .env (สุ่มรหัส), เปิด DB, npm ci ทั้ง server/client
cd server && node scripts/create-admin.js admin '<รหัสผ่าน>' Admin "System Admin"
```

`setup.sh` รันซ้ำได้ ไม่เขียนทับ `.env` ที่มีอยู่

ครั้งแรกที่สร้าง volume, PostgreSQL จะรัน `database/schema.sql` และ `database/seed.sql` อัตโนมัติ (มีข้อมูลงานตัวอย่าง + ผู้เข้าร่วม 12 คน) ตาราง `settings`, `agenda_items`, `lucky_draw_prizes`, `organization_types` (และคอลัมน์ประเภทองค์กรใน `participants`) ถูกสร้าง/เติมโดย server ทุกครั้งที่เปิด — **อัปเดตโค้ดบน server ที่มีข้อมูลอยู่แล้วให้ restart server หนึ่งครั้ง** ไม่ต้องรัน SQL เอง

<details><summary>ติดตั้งด้วยมือ (ถ้าไม่ใช้ setup.sh)</summary>

```bash
cp .env.example .env                        # แก้ DB_PASSWORD
cp server/.env.example server/.env          # DB_PASSWORD ให้ตรงกับ .env, JWT_SECRET=$(openssl rand -hex 32)
cp client/.env.example client/.env.local
docker compose up -d
(cd server && npm ci) && (cd client && npm ci)
```
</details>

## 2. เปิดระบบ (ทุกวัน)

```bash
docker compose up -d                 # ถ้า Docker ยังไม่ได้เปิด DB
cd server && npm run dev             # API + WebSocket :3005 (nodemon โหลดโค้ดใหม่เอง)
cd client && npm run dev             # เว็บ :3000 (พอร์ตไม่ว่าง → npm run dev -- -p 3100)
```

| URL | ใช้ทำอะไร | ต้อง login |
|---|---|---|
| `/` | หน้าแรก / Event Experience | |
| `/register` | ลงทะเบียน | |
| `/ticket` | ค้นหา/แสดงตั๋ว QR | |
| `/login` | เข้าสู่ระบบเจ้าหน้าที่ | |
| `/scanner` | จุดสแกนเช็คอิน (กล้องหรือเครื่องยิงบาร์โค้ด) | ✅ |
| `/dashboard` | จัดการผู้เข้าร่วม, นำเข้า/ส่งออก Excel | ✅ |
| `/dashboard?tab=analytics` | รายงานและกราฟ (กรอง/ค้นหา/ช่วงวันเวลา) | ✅ |
| `/dashboard/report` | รายงาน A4 สำหรับพิมพ์/บันทึก PDF (เปิดจากปุ่ม "พิมพ์รายงาน A4") | ✅ |
| `/settings?tab=general\|agenda\|registration\|organizations\|prizes` | ตั้งค่างาน | ✅ |
| `/signage?screen=welcome\|overview\|agenda\|lucky` | จอ LED (เปิดค้าง 1 จอ 1 URL; ต่อท้าย `&lang=en` / `&theme=light` ได้) | |
| `/lucky-draw` | หน้าควบคุมการสุ่มรางวัล | |
| `/privacy` | นโยบายความเป็นส่วนตัว | |

**Production build** (เครื่องหน้างาน): `cd client && npm run build && npm start` · server ใช้ `npm start`

## 3. เช็กลิสต์ก่อนวันงาน

1. `/settings` → ข้อมูลทั่วไป: ชื่องาน, โลโก้, สถานที่, วันเวลา, ผู้จัด, ช่องทางติดต่อ, ลิงก์แผนที่, นโยบาย PDPA
2. `/settings?tab=agenda`: กำหนดการ (ไฟล์ตัวอย่างอยู่ในปุ่ม "ไฟล์ตัวอย่าง") — จอ LED แสดงเฉพาะรายการ **ของวันนี้**
3. `/settings?tab=prizes`: ของรางวัล + รูป + ลำดับการสุ่ม
3.1 `/settings?tab=organizations`: ประเภทองค์กรที่ให้ผู้ลงทะเบียนเลือก (ชื่อไทย/อังกฤษ, สี, ลำดับ) — ผู้ลงทะเบียน **ต้องเลือก** ก่อนส่งฟอร์ม
4. `/dashboard` → นำเข้า Excel รายชื่อที่ลงทะเบียนล่วงหน้า (ถ้ามี)
5. สร้างบัญชีเจ้าหน้าที่ประจำจุดสแกน (`create-admin.js ... Staff`) — Staff สแกน/เพิ่ม/แก้ไข/สุ่มรางวัลได้ แต่ตั้งค่า ลบ และนำเข้าไม่ได้ ([configuration.md](configuration.md) §5)
6. เปิดจอ LED แต่ละจอด้วย URL ของตัวเอง → กด **เต็มจอ**
7. ทดสอบ: ลงทะเบียน 1 คน → สแกน → ดูจอ Welcome/Overview เปลี่ยน → ลบรายการทดสอบ
8. สำรองฐานข้อมูล (ข้อ 5)

**เครื่องอื่นในวง LAN (มือถือ, ทีวี, PC จอ LED):** เปิด `http://<IP-เครื่อง server>:3000` ได้เลย ระบบเรียก API ที่ IP เดียวกันให้เอง (ไม่ต้องแก้ `NEXT_PUBLIC_API_URL`) · ถ้าเปลี่ยน Wi-Fi แล้ว IP นอกช่วง 192.168.x.x / 10.x.x.x / 172.x.x.x ให้ restart `npm run dev` ของ client · **กล้องสแกน QR ใช้ได้เฉพาะ `localhost` หรือ `https://`** เบราว์เซอร์จะไม่เปิดกล้องบน `http://<IP>` — ใช้เครื่องยิงบาร์โค้ด USB หรือตั้ง HTTPS (reverse proxy) สำหรับแท็บเล็ต

**พิมพ์รายงาน A4** (`/dashboard` → รายงานและกราฟ → พิมพ์รายงาน A4 → พิมพ์ / บันทึก PDF): ขนาด A4 แนวตั้ง, Scale **100% (Default)**, ปิด **Headers and footers** ของเบราว์เซอร์ (ระบบใส่เลขหน้าเอง), ขอบ **Default** (รายงานกำหนดขอบ บน 2.5 ซม. ล่าง 2 ซม. ซ้าย 3 ซม. ขวา 2 ซม.) · ใช้ Chrome/Edge รุ่นใหม่ (เลขหน้า "หน้า X / Y" ใช้ความสามารถ CSS ที่เบราว์เซอร์อื่นอาจยังไม่รองรับ)

## 4. แก้ปัญหา (Troubleshooting)

| อาการ | สาเหตุที่พบ | วิธีแก้ |
|---|---|---|
| Server ไม่เปิด: `Missing required environment variable: …` | ไม่มี `server/.env` หรือขาดค่า | สร้างจาก `.env.example` / รัน `setup.sh` |
| เรียก endpoint ใหม่ได้ **404** | server รันด้วย `node server.js` (ไม่โหลดโค้ดใหม่) | restart หรือใช้ `npm run dev` |
| Login ไม่ได้ทุกบัญชี | บัญชีใน seed ไม่มีรหัสผ่านที่ใช้ได้ | `node scripts/create-admin.js ...` |
| จอ LED บนเครื่องอื่นไม่อัปเดต / ปุ่มเต็มจอไม่ทำงานบนมือถือ | (แก้แล้ว 2026-09-26) โหมดพัฒนาเคยปฏิเสธไฟล์ JavaScript และเรียก API ผิดเครื่อง | อัปเดตโค้ด แล้ว restart `npm run dev` · ถ้าจอแสดงป้ายแดง "ขาดการเชื่อมต่อ" ตรวจ Wi-Fi/เครื่อง server |
| login ขึ้น "ใส่รหัสผ่านผิดหลายครั้งเกินไป" | ผิด 10 ครั้งใน 15 นาที | รอ 15 นาที หรือ restart server (ตัวนับอยู่ในหน่วยความจำ) |
| ผู้เข้าร่วมค้นตั๋วไม่เจอ | ต้องใช้รหัสตั๋ว + เบอร์โทร 4 ตัวท้าย (หรืออีเมล) ที่ลงทะเบียน · ผิด 5 ครั้งพัก 15 นาที | เจ้าหน้าที่ login แล้วค้นด้วยชื่อ/เบอร์ที่หน้า `/ticket` ได้ |
| ลืมรหัสผ่าน | รหัสเก็บแบบเข้ารหัส (bcrypt) ย้อนดูไม่ได้ | `cd server && node scripts/create-admin.js <username เดิม> '<รหัสใหม่>' Admin "<ชื่อ>"` = ตั้งรหัสใหม่ · ดูรายชื่อบัญชี: `docker exec event_postgres_db psql -U "$DB_USER" -d booth_register_db -c "SELECT username, role, active_status FROM users"` |
| `npm run dev` ฝั่งเว็บ: พอร์ต 3000 ถูกใช้ | โปรแกรม/โปรเจกต์อื่นเปิดพอร์ต 3000 อยู่ | `npm run dev -- -p 3100` แล้วเปิด `http://localhost:3100` (login ใหม่ เพราะเบราว์เซอร์แยกการ login ตามพอร์ต) |
| ตัวเลขบนจอ LED/Scanner เป็น 0 | API ไม่ตอบ หรือ `NEXT_PUBLIC_API_URL` ผิด | เปิด `http://<api>/api/v1/events/1/stats` ต้องได้ตัวเลข; ป้ายมุมขวาบนต้องเป็น LIVE |
| จอ Welcome ไม่เด้งชื่อ | จอนั้นไม่ได้อยู่ `?screen=welcome` (ตั้งใจ) | เปิด URL ที่ถูกต้อง |
| Event Agenda ว่าง | ไม่มีรายการของ **วันนี้** | ตรวจวันที่ในกำหนดการ |
| กล้องไม่ขึ้นในหน้า Scanner | ไม่ได้อนุญาตสิทธิ์ / โปรแกรมอื่นใช้กล้อง / เปิดผ่าน http + IP | ดูข้อความใต้กรอบกล้อง, ปิด Zoom/Teams, ใช้ localhost หรือ https |
| Docker: `password authentication failed` | รหัสใน `.env` ไม่ตรงกับที่ volume สร้างไว้ตอนแรก | ใช้รหัสเดิม หรือ `ALTER USER` ใน DB (ข้อ 6) |
| `docker compose` error เรื่อง `DB_USER`/`DB_PASSWORD` | ไม่มี `.env` ที่ root | `cp .env.example .env` |
| หน้า `/register` ไม่มีตัวเลือกประเภทองค์กร / ลงทะเบียนไม่ได้ `ORGANIZATION_TYPE_REQUIRED` | server ยังไม่ได้ restart หลังอัปเดต (ตารางยังไม่ถูกสร้าง) หรือปิด "แสดงในหน้าลงทะเบียน" ทุกประเภท | restart server แล้วตรวจ `/settings?tab=organizations` |
| รายงาน A4 ขอบ/เลขหน้าเพี้ยน หรือมีหัวกระดาษ URL | ตั้งค่าในหน้าต่างพิมพ์ | Scale 100%, ปิด Headers and footers, ขอบ Default |
| จอ LED เป็นภาษา/ธีมไม่ตรง | เครื่องนั้นจำค่าเดิมใน cookie | เปิด URL พร้อม `&lang=th` / `&theme=dark` หนึ่งครั้ง |
| กด "เต็มจอ" บน iPhone แล้วยังเห็นแถบที่อยู่ | iPhone ไม่อนุญาตให้หน้าเว็บเต็มจอ (ระบบคลุมหน้าเบราว์เซอร์แทน) | ใช้คอมพิวเตอร์/แท็บเล็ต/สมาร์ททีวีเป็นเครื่องเปิดจอ LED |
| CI บน GitHub แดง | เทสต์ server 9/19 ข้อยังคาดพฤติกรรมเก่า (ดู [qa.md](qa.md)) | ไม่ใช่ปัญหาการติดตั้ง |

ดู log: server แสดงใน terminal ที่รัน `npm run dev` · DB: `docker logs event_postgres_db`

## 5. สำรองและกู้คืนข้อมูล

```bash
source .env
docker exec event_postgres_db pg_dump -U "$DB_USER" -Fc booth_register_db > backup_$(date +%Y%m%d_%H%M).dump
# กู้คืน (ทับข้อมูลเดิม)
docker exec -i event_postgres_db pg_restore -U "$DB_USER" -d booth_register_db --clean --if-exists < backup_XXXX.dump
```

**เมื่อจบงาน (ก่อนใช้กับงานถัดไป):** ผู้ดูแล (Admin) ส่งออก Excel ที่ `/settings?tab=backup` → **ส่งออกทั้งหมด** แล้วจึง **รีเซ็ตทั้งระบบ** ([user_manual.md](user_manual.md) §2.6) · ไฟล์ Excel ไม่มีรูปภาพ และรีเซ็ตแล้วกู้คืนจากหน้าเว็บไม่ได้ จึงควรสำรองฐานข้อมูลด้วยคำสั่งข้างบนก่อนกดรีเซ็ตทุกครั้ง (บน production ใช้ชื่อ container/namespace ตาม [deploy/README.md](../deploy/README.md))

## 6. งานดูแลอื่น ๆ

```bash
# เปลี่ยนรหัสผ่าน DB (แก้ .env และ server/.env ให้ตรงกันด้วย)
docker exec -it event_postgres_db psql -U "$DB_USER" -d booth_register_db -c "ALTER USER $DB_USER PASSWORD 'ใหม่';"

# ล้างทุกอย่างแล้วเริ่มใหม่ (ข้อมูลหายทั้งหมด — สำรองก่อน)
docker compose down -v && docker compose up -d
```

## 7. ทดสอบ

ดู [qa.md](qa.md) — คำสั่งหลัก:

```bash
cd client && npx tsc --noEmit && TZ=Asia/Bangkok node --test tests/*.test.mjs   # unit
cd server && npm test                                                          # API + ความปลอดภัย + ข้อมูลสด (ทีละไฟล์)
cd client && npx playwright test                                               # เปิดเบราว์เซอร์จริงทดสอบทุกหน้า (~4 นาที)
```

Playwright ต้องมีบัญชีทดสอบและไฟล์ `client/.env.e2e.local` ครั้งแรก — ดู [client/e2e/README.md](../client/e2e/README.md) · ทุกชุดทดสอบลบข้อมูลที่สร้างเอง · `e2e/backup-reset.spec.ts` กดรีเซ็ตจริงบนฐานข้อมูลของเครื่อง โดยคัดลอกข้อมูลไว้ใน schema `e2e_snapshot` ก่อนแล้วคืนให้ครบ (ห้ามชี้ `E2E_API_URL` ไปที่ production)
