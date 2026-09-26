# HANDOFF — ส่งต่องานพัฒนา

ปรับปรุง: 2026-09-26 · branch `Dev` · repo https://github.com/Amp-Apirak/booth_register

> เอกสารนี้สำหรับนักพัฒนาที่มารับงานต่อ อ่านจบแล้วควรรู้ว่าระบบอยู่ตรงไหน ต้องทำอะไรต่อ และไปดูรายละเอียดที่ไหน · (คู่มือสาธิตระบบให้ผู้บริหารเดิมอยู่ที่ [handoff_guide.md](handoff_guide.md))

## 1. เริ่มงานใน 10 นาที

```bash
git clone https://github.com/Amp-Apirak/booth_register.git && cd booth_register
git checkout Dev
./scripts/setup.sh
cd server && node scripts/create-admin.js admin '<password>' Admin "Dev Admin"
cd server && npm run dev      # :3005
cd client && npm run dev      # :3000 → login ที่ /login (พอร์ตไม่ว่าง: npm run dev -- -p 3100)
```
รายละเอียด/แก้ปัญหา: [runbook.md](runbook.md) · ค่าตั้งค่า: [configuration.md](configuration.md)

## 2. ภาพรวมระบบ

```
Browser (Next.js 16 / React 19, client/)  ──REST + Socket.io──►  Express API (server/, :3005)  ──►  PostgreSQL 15 (Docker, :5435)
  /register /ticket /scanner /dashboard                          controllers → services → repositories
  /settings /signage /lucky-draw /privacy                        io.emit(...) หลังเขียนข้อมูล
```

- **Client** `client/src/`: `app/<route>/page.tsx` ต่อหน้า · `components/` · `lib/api.ts` (fetch ทุก endpoint + type) · `lib/useWebSocket.ts` (state สด: stats, check-in ล่าสุด, ผู้โชคดี, agenda, รายชื่อ) · `contexts/SettingsContext.tsx`
- **ภาษา/ธีม** `client/src/i18n/{th,en}/*.ts` (ไทยเป็นต้นฉบับ, ภาษาอังกฤษต้องมี key ครบ ไม่งั้น typecheck ไม่ผ่าน) · `contexts/PreferencesContext.tsx` (`useT()`) · ธีมสว่าง `app/theme-light.css` สร้างจาก `scripts/gen-theme-light.mjs` ([ADR-0013](adr/0013-theme-and-language.md))
- **รายงานและกราฟ** `lib/analytics.ts` (คำนวณ, มี test) · `components/analytics/` (กราฟ, `AnalyticsPanel`, `AnalyticsReport` สำหรับ A4) · `lib/orgTypes.ts` (สี/ชื่อประเภทองค์กร) ([ADR-0014](adr/0014-analytics-and-a4-report.md))
- **Server** `server/`: `routes/api.js` (รายการ endpoint ทั้งหมด + ตัวไหนต้อง JWT) · `controllers/` · `services/` (check-in, lucky draw, reset) · `repositories/` (SQL) · ตาราง `settings`, `agenda_items`, `lucky_draw_prizes`, `organization_types` (+ คอลัมน์ประเภทองค์กรใน `participants`) สร้าง/ย้ายข้อมูลโดย `initTable()` ทุกครั้งที่เปิด server
- **DB** `database/schema.sql` + `seed.sql` (รันอัตโนมัติครั้งแรกที่สร้าง volume)
- **Next.js รุ่นนี้มี breaking changes** — อ่าน `client/AGENTS.md` และ `client/node_modules/next/dist/docs/` ก่อนใช้ API ของ Next (เช่น `useSearchParams` ต้องห่อ `<Suspense>`)

WebSocket events ที่ใช้จริง: `overview:update`, `participants:update`, `welcome:new_checkin`, `luckydraw:spin`, `luckydraw:winner_announced`, `agenda:update`, `prizes:update`, `settings:update`, `organization-types:update`, `data:reset` — payload ใน [api_spec.md](api_spec.md)

## 3. สถานะปัจจุบัน

**ใช้งานได้:** ลงทะเบียน + PDPA consent + ประเภทองค์กร (บังคับ), ตั๋ว QR, สแกนเช็คอิน (กล้อง/เครื่องยิง), Dashboard CRUD + คอลัมน์ประเภทองค์กร + นำเข้า/ส่งออก Excel, แท็บรายงานและกราฟ (กรองไขว้, ช่วงวันเวลา) + รายงาน A4, ตั้งค่างาน, กำหนดการ + Excel, ประเภทองค์กร, ของรางวัล + ลำดับ + Excel, จอ LED 4 หน้า (URL แยก), สุ่มรางวัล + หน้าประกาศผู้โชคดี, Footer + `/privacy`, หน้าแรก Event Experience, 2 ภาษา (ไทย/อังกฤษ) + 2 ธีม (มืด/สว่าง) ทุกหน้า, รองรับทุกขนาดจอ 360–1920 px (มือถือ/แท็บเล็ต/คอมพิวเตอร์/จอ LED), สำรองข้อมูล (Excel ทุกหมวด) และรีเซ็ตกลับค่าเริ่มต้นทีละหมวด/ทั้งระบบ, CI

**งานรอบล่าสุด (2026-09-26 รอบ 3)** — สำรองและรีเซ็ต: ทุกแท็บตั้งค่ามีปุ่มส่งออก Excel และรีเซ็ตเป็นค่าเริ่มต้น (หน้าต่างยืนยันบอกจำนวนที่จะถูกลบ, ปุ่ม "ส่งออก Excel ก่อน", พิมพ์ RESET เมื่อลบรายชื่อ), แท็บใหม่ `/settings?tab=backup` ส่งออกทั้งหมดในไฟล์เดียวและรีเซ็ตทั้งระบบ, จอที่เปิดอยู่เปลี่ยนตามทันที (Playwright 46 · Jest 127 · unit 24) ([ADR-0017](adr/0017-backup-and-reset.md)) · รอบ 2 วันเดียวกัน — จอ LED อัปเดตทันทีทุกกรณี (รวมเปิดจากเครื่องอื่นในวง LAN), ปิดช่องข้อมูลส่วนบุคคลรั่วผ่านข้อมูลสด, สิทธิ์ Admin/Staff, ค้นหาตั๋วสาธารณะ, สุ่มรางวัลต้อง login และไม่เกินจำนวน, อีเมลตั๋วใช้ข้อมูลงานจริง, รหัสตั๋วไม่ชน, เทสต์ครบ (Playwright 39 · Jest 111 · unit 24) ([ADR-0015](adr/0015-roles-and-access.md), [ADR-0016](adr/0016-live-updates-and-network-access.md)) · ก่อนหน้า (2026-09-25): ภาษา/ธีม, ประเภทองค์กร, รายงานและกราฟ + A4 · รายการเต็มใน [CHANGELOG.md](../CHANGELOG.md), เหตุผลใน [decision.md](decision.md) (ADR 0012–0014), ผลตรวจใน [qa.md](qa.md)

> **Deploy รอบนี้:** production ต้อง restart server หนึ่งครั้งหลังอัปเดตโค้ด เพื่อสร้างตาราง `organization_types` (ไม่ต้องรัน SQL เอง) · ผู้ลงทะเบียนเดิมจะเป็น "ไม่ระบุ" จนกว่าเจ้าหน้าที่เลือกให้

## 4. งานค้าง (เรียงตามความสำคัญ)

| # | งาน | ทำไมสำคัญ | ที่เกี่ยวข้อง |
|---|---|---|---|
| 1 | Deploy รอบ 2026-09-25 + 2026-09-26 ขึ้น event-bbk.com (restart server ครั้งเดียว) | ประเภทองค์กร, สิทธิ์, ค้นหาตั๋ว, อีเมลตั๋วที่ถูกต้อง, ปิดช่องข้อมูลรั่ว, สำรองและรีเซ็ต | `deploy/k8s/deploy.sh`, [deploy/README.md](../deploy/README.md) |
| 2 | บัญชีเจ้าหน้าที่บน production: ใครต้องตั้งค่าได้ให้เป็น **Admin** ที่เหลือเป็น **Staff** | Staff เข้าหน้าตั้งค่า ลบ นำเข้าไม่ได้แล้ว | [configuration.md](configuration.md) §5 |
| 3 | เปิด branch protection `main` ให้ต้องผ่าน CI (CI เขียวแล้วรอบนี้) | กันโค้ดที่ทดสอบไม่ผ่านเข้า main | GitHub Settings |
| 4 | ทดสอบด้วยมือบนอุปกรณ์จริง: มือถือ iPhone/Android, แท็บเล็ต, ทีวีจอ LED, เครื่องพิมพ์ A4 | Playwright ครอบคลุมเบราว์เซอร์ Chrome แล้ว | [qa.md](qa.md) §4 |
| 5 | HTTPS สำหรับหน้างาน (กล้องสแกนบนแท็บเล็ตผ่าน IP) | กล้องไม่ทำงานบน `http://IP` | [runbook.md](runbook.md) §3 |
| 6 | สร้างรูป QR ใน server แนบในอีเมล (แทนบริการภายนอก) | อีเมลบางโปรแกรมบล็อกรูปภายนอก | [qa.md](qa.md) Q-15 |
| 7 | เก็บกวาด ESLint แล้วเพิ่มใน CI | คุณภาพโค้ด | |
| 8 | ยืนยัน LINE ID ผู้ติดต่อแพลตฟอร์ม | ลิงก์อาจเปิดไม่ได้ | `client/src/lib/platform.ts` |
| 9 | ADR 0001–0004 (Local sync, signed ticket, queue, แจ้งผลหลายช่องทาง) ยังเป็นแผน | ตัดสินใจว่าจะทำหรือยกเลิก | [decision.md](decision.md) |
| 10 | แปลรายละเอียด error จาก server ในหน้าเจ้าหน้าที่ที่เหลือ | โหมดอังกฤษยังเห็นภาษาไทยตอนบันทึกไม่ผ่าน | [qa.md](qa.md) Q-9 |
| 11 | (ถ้าต้องการ) รูปภาพในไฟล์สำรอง และปุ่มกู้คืนจากไฟล์สำรอง | ตอนนี้ Excel ไม่มีรูป และนำกลับเข้าได้เฉพาะกำหนดการ ของรางวัล ผู้เข้าร่วม | [qa.md](qa.md) Q-17 |

## 5. ข้อตกลงการทำงาน

- **Branch:** พัฒนาบน `Dev` (หรือ `feature/*` แตกจาก `Dev`) → Pull Request เข้า `main` เมื่อพร้อมใช้งาน
- **Commit:** รูปแบบ `type(scope): สรุป` เช่น `feat(prizes): …`, `fix(stats): …` แยก commit ตามเรื่อง
- **ความลับ:** ห้าม commit `.env*` (ยกเว้น `*.env.example`) · repo เป็น Public ([ADR-0009](adr/0009-secrets-from-env-only.md))
- **ก่อน push:** `cd client && npx tsc --noEmit && TZ=Asia/Bangkok node --test tests/*.test.mjs` + `cd server && npm test` + `cd client && npx playwright test` สำหรับหน้าที่แก้ (ตั้งค่าครั้งแรก: [client/e2e/README.md](../client/e2e/README.md))
- **สิทธิ์:** endpoint ใหม่กำหนด `staff` หรือ `admin` ใน `routes/api.js` แล้วเพิ่มในรายการ `PROTECTED` ของ `server/tests/security.test.js` · หน้าเจ้าหน้าที่ครอบด้วย `<StaffGate>` ([ADR-0015](adr/0015-roles-and-access.md))
- **ข้อมูลสด:** ข้อมูลส่วนบุคคลส่งเข้าห้อง `staff` เท่านั้น (`broadcastParticipants`) · ใช้ `useWebSocket()` / `useWebSocket({ staff: true })` / `useSocketStatus()` ไม่สร้าง socket เอง ([ADR-0016](adr/0016-live-updates-and-network-access.md))
- **เพิ่ม endpoint:** route ใน `routes/api.js` (ใส่ `verifyToken` ถ้าเป็นงานเจ้าหน้าที่) → controller → repository → function ใน `client/src/lib/api.ts` → อัปเดต [api_spec.md](api_spec.md)
- **เพิ่มค่าตั้งค่า:** ดู [configuration.md](configuration.md) §2 (`DEFAULT_SETTINGS` + `SETTINGS_GROUPS` ฝั่ง server, type ฝั่ง client, แถว Excel)
- **ตารางใหม่ที่ผูกกับงาน:** เพิ่มในการรีเซ็ต (`server/services/resetService.js`) และไฟล์สำรอง (`client/src/lib/backupExport.ts`, `sectionExport.ts`) ([ADR-0017](adr/0017-backup-and-reset.md))
- **ข้อความบนหน้าเว็บ:** เพิ่ม key ใน `client/src/i18n/th/<เรื่อง>.ts` แล้วแปลใน `en/<เรื่อง>.ts` ห้ามพิมพ์ข้อความลง JSX ตรง ๆ · ตัวอักษรบนปุ่มพื้นสีใช้ `text-on-accent` · ตรวจทั้ง 2 ธีม ([ADR-0013](adr/0013-theme-and-language.md))
- **หน้าจอ:** ออกแบบจากมือถือขึ้นไป ตรวจที่ 360 / 390 / 768 / 1024 / 1440 / 1920 px (Chrome DevTools → Toggle device toolbar) ต้องไม่มีส่วนล้นจอ · ตารางกว้างให้มีมุมมองการ์ดบนจอเล็ก (ดูแดชบอร์ด) · ข้อความยาวใช้ `break-words` แทนการตัด
- **การตัดสินใจที่มีผลระยะยาว:** เขียน ADR + เพิ่มแถวใน [decision.md](decision.md)
- **หลังงานเสร็จ:** อัปเดต CHANGELOG, qa.md (ตรวจอะไรไปแล้ว), HANDOFF §3–4

## 6. แผนที่เอกสาร

| ต้องการ | เปิด |
|---|---|
| ติดตั้ง / เปิดระบบ / แก้ปัญหา / สำรองข้อมูล | [runbook.md](runbook.md) |
| ตัวแปร env, settings keys, พอร์ต | [configuration.md](configuration.md) |
| วิธีใช้งานสำหรับเจ้าหน้าที่ | [user_manual.md](user_manual.md) |
| API และ WebSocket | [api_spec.md](api_spec.md) |
| ทำไมถึงออกแบบแบบนี้ | [decision.md](decision.md), [adr/](adr/) |
| ผลทดสอบ / ปัญหาที่ทราบ | [qa.md](qa.md) |
| เปลี่ยนแปลงแต่ละรอบ | [CHANGELOG.md](../CHANGELOG.md) |
| ความต้องการ / ออกแบบ DB / เครือข่ายหน้างาน | [requirements.md](requirements.md), [system_design.md](system_design.md), [network_deployment.md](network_deployment.md) |
| คำศัพท์ในโดเมน | [CONTEXT.md](../CONTEXT.md) |
| หน้าแรก Event Experience | [homepage-experience.md](homepage-experience.md) |
