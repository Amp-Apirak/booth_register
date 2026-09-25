# HANDOFF — ส่งต่องานพัฒนา

ปรับปรุง: 2026-09-25 · branch `Dev` · repo https://github.com/Amp-Apirak/booth_register

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
- **Server** `server/`: `routes/api.js` (รายการ endpoint ทั้งหมด + ตัวไหนต้อง JWT) · `controllers/` · `services/` (check-in, lucky draw) · `repositories/` (SQL) · ตาราง `settings`, `agenda_items`, `lucky_draw_prizes`, `organization_types` (+ คอลัมน์ประเภทองค์กรใน `participants`) สร้าง/ย้ายข้อมูลโดย `initTable()` ทุกครั้งที่เปิด server
- **DB** `database/schema.sql` + `seed.sql` (รันอัตโนมัติครั้งแรกที่สร้าง volume)
- **Next.js รุ่นนี้มี breaking changes** — อ่าน `client/AGENTS.md` และ `client/node_modules/next/dist/docs/` ก่อนใช้ API ของ Next (เช่น `useSearchParams` ต้องห่อ `<Suspense>`)

WebSocket events ที่ใช้จริง: `overview:update`, `participants:update`, `welcome:new_checkin`, `luckydraw:spin`, `luckydraw:winner_announced`, `agenda:update`, `prizes:update`, `settings:update`, `organization-types:update` — payload ใน [api_spec.md](api_spec.md)

## 3. สถานะปัจจุบัน

**ใช้งานได้:** ลงทะเบียน + PDPA consent + ประเภทองค์กร (บังคับ), ตั๋ว QR, สแกนเช็คอิน (กล้อง/เครื่องยิง), Dashboard CRUD + คอลัมน์ประเภทองค์กร + นำเข้า/ส่งออก Excel, แท็บรายงานและกราฟ (กรองไขว้, ช่วงวันเวลา) + รายงาน A4, ตั้งค่างาน, กำหนดการ + Excel, ประเภทองค์กร, ของรางวัล + ลำดับ + Excel, จอ LED 4 หน้า (URL แยก), สุ่มรางวัล + หน้าประกาศผู้โชคดี, Footer + `/privacy`, หน้าแรก Event Experience, 2 ภาษา (ไทย/อังกฤษ) + 2 ธีม (มืด/สว่าง) ทุกหน้า, CI

**งานรอบล่าสุด (2026-09-25)** — ภาษา/ธีม, ประเภทองค์กร (dropdown ในหน้าลงทะเบียน), รายงานและกราฟ + A4, แก้รูป QR/ตั๋วที่บันทึกลงเครื่อง, หัวเว็บบนมือถือ · รายการเต็มใน [CHANGELOG.md](../CHANGELOG.md), เหตุผลใน [decision.md](decision.md) (ADR 0012–0014), ผลตรวจใน [qa.md](qa.md)

> **Deploy รอบนี้:** production ต้อง restart server หนึ่งครั้งหลังอัปเดตโค้ด เพื่อสร้างตาราง `organization_types` (ไม่ต้องรัน SQL เอง) · ผู้ลงทะเบียนเดิมจะเป็น "ไม่ระบุ" จนกว่าเจ้าหน้าที่เลือกให้

## 4. งานค้าง (เรียงตามความสำคัญ)

| # | งาน | ทำไมสำคัญ | ที่เกี่ยวข้อง |
|---|---|---|---|
| 1 | ใส่ `verifyToken` ให้ `POST /lucky-draw/spin` | ตอนนี้ใครก็สุ่มรางวัลได้ | `server/routes/api.js`, `client/src/app/lucky-draw/page.tsx` |
| 1.1 | Deploy รอบ 2026-09-25 ขึ้น event-bbk.com แล้ว restart server | ตาราง/คอลัมน์ประเภทองค์กรสร้างตอนเปิด server | `deploy/k8s/deploy.sh`, [runbook.md](runbook.md) |
| 1.2 | ไล่ตรวจทุกหน้าทั้ง TH/EN × มืด/สว่าง บนจอจริง + พิมพ์รายงาน A4 กับเครื่องพิมพ์จริง | ตรวจอัตโนมัติไปบางหน้า | [qa.md](qa.md) §4 |
| 1.3 | **รอเจ้าของระบบตัดสินใจ:** เมนู/หน้าสแกนต้อง login หรือไม่ (A คง login แต่ใช้ง่ายขึ้น — แนะนำ · B PIN จุดสแกน · C เปิดสาธารณะ) | เช็คอินมีผลกับสิทธิ์ลุ้นรางวัลและตัวเลขรายงาน | [qa.md](qa.md) Q-13 |
| 1.4 | **รอเจ้าของระบบตัดสินใจ:** หน้า `/ticket` ให้ผู้เข้าร่วมค้นตั๋วเองได้ (รหัสตั๋ว + 4 ตัวท้ายเบอร์โทร) | ตอนนี้คนที่ไม่ได้ login ค้นตั๋วไม่ได้ | [qa.md](qa.md) Q-12 |
| 2 | แก้เทสต์ server 9 ข้อที่ล้าสมัย → CI เขียว → เปิด branch protection `main` | CI แดง, รวม PR ไม่มั่นใจ | `server/tests/`, [qa.md](qa.md) Q-1 |
| 3 | HTTPS สำหรับหน้างาน (กล้องสแกนบนแท็บเล็ต) | กล้องไม่ทำงานบน `http://IP` | [runbook.md](runbook.md) §3 |
| 4 | ทดสอบด้วยมือตามเช็กลิสต์ [qa.md](qa.md) §4 | หลายฟีเจอร์ยังไม่ได้ทดสอบในเบราว์เซอร์จริง | |
| 5 | ขยายรหัสตั๋ว (~9,000/วัน) | งานใหญ่ | `participantController.js` `generateTicketCode` |
| 6 | เก็บกวาด ESLint แล้วเพิ่มใน CI | คุณภาพโค้ด | |
| 7 | ยืนยัน LINE ID ผู้ติดต่อแพลตฟอร์ม | ลิงก์อาจเปิดไม่ได้ | `client/src/lib/platform.ts` |
| 8 | ADR 0001–0004 (Local sync, signed ticket, queue, แจ้งผลหลายช่องทาง) ยังเป็นแผน | ตัดสินใจว่าจะทำหรือยกเลิก | [decision.md](decision.md) |
| 9 | แปลรายละเอียด error จาก server ในหน้าเจ้าหน้าที่ที่เหลือ | โหมดอังกฤษยังเห็นภาษาไทยตอนบันทึกไม่ผ่าน | [qa.md](qa.md) Q-9 |

## 5. ข้อตกลงการทำงาน

- **Branch:** พัฒนาบน `Dev` (หรือ `feature/*` แตกจาก `Dev`) → Pull Request เข้า `main` เมื่อพร้อมใช้งาน
- **Commit:** รูปแบบ `type(scope): สรุป` เช่น `feat(prizes): …`, `fix(stats): …` แยก commit ตามเรื่อง
- **ความลับ:** ห้าม commit `.env*` (ยกเว้น `*.env.example`) · repo เป็น Public ([ADR-0009](adr/0009-secrets-from-env-only.md))
- **ก่อน push:** `cd client && npx tsc --noEmit && node --test tests/*.test.mjs` (+ `cd server && npm test` ถ้าแตะ server)
- **เพิ่ม endpoint:** route ใน `routes/api.js` (ใส่ `verifyToken` ถ้าเป็นงานเจ้าหน้าที่) → controller → repository → function ใน `client/src/lib/api.ts` → อัปเดต [api_spec.md](api_spec.md)
- **เพิ่มค่าตั้งค่า:** ดู [configuration.md](configuration.md) §2 (แก้ 4 จุด)
- **ข้อความบนหน้าเว็บ:** เพิ่ม key ใน `client/src/i18n/th/<เรื่อง>.ts` แล้วแปลใน `en/<เรื่อง>.ts` ห้ามพิมพ์ข้อความลง JSX ตรง ๆ · ตัวอักษรบนปุ่มพื้นสีใช้ `text-on-accent` · ตรวจทั้ง 2 ธีม ([ADR-0013](adr/0013-theme-and-language.md))
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
