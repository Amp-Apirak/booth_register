# HANDOFF — ส่งต่องานพัฒนา

ปรับปรุง: 2026-09-23 · branch `Dev` · repo https://github.com/Amp-Apirak/booth_register

> เอกสารนี้สำหรับนักพัฒนาที่มารับงานต่อ อ่านจบแล้วควรรู้ว่าระบบอยู่ตรงไหน ต้องทำอะไรต่อ และไปดูรายละเอียดที่ไหน · (คู่มือสาธิตระบบให้ผู้บริหารเดิมอยู่ที่ [handoff_guide.md](handoff_guide.md))

## 1. เริ่มงานใน 10 นาที

```bash
git clone https://github.com/Amp-Apirak/booth_register.git && cd booth_register
git checkout Dev
./scripts/setup.sh
cd server && node scripts/create-admin.js admin '<password>' Admin "Dev Admin"
cd server && npm run dev      # :3005
cd client && npm run dev      # :3000 → login ที่ /login
```
รายละเอียด/แก้ปัญหา: [runbook.md](runbook.md) · ค่าตั้งค่า: [configuration.md](configuration.md)

## 2. ภาพรวมระบบ

```
Browser (Next.js 16 / React 19, client/)  ──REST + Socket.io──►  Express API (server/, :3005)  ──►  PostgreSQL 15 (Docker, :5435)
  /register /ticket /scanner /dashboard                          controllers → services → repositories
  /settings /signage /lucky-draw /privacy                        io.emit(...) หลังเขียนข้อมูล
```

- **Client** `client/src/`: `app/<route>/page.tsx` ต่อหน้า · `components/` · `lib/api.ts` (fetch ทุก endpoint + type) · `lib/useWebSocket.ts` (state สด: stats, check-in ล่าสุด, ผู้โชคดี, agenda) · `contexts/SettingsContext.tsx`
- **Server** `server/`: `routes/api.js` (รายการ endpoint ทั้งหมด + ตัวไหนต้อง JWT) · `controllers/` · `services/` (check-in, lucky draw) · `repositories/` (SQL) · ตาราง `settings`, `agenda_items`, `lucky_draw_prizes` สร้างโดย `initTable()` ตอนเปิด server
- **DB** `database/schema.sql` + `seed.sql` (รันอัตโนมัติครั้งแรกที่สร้าง volume)
- **Next.js รุ่นนี้มี breaking changes** — อ่าน `client/AGENTS.md` และ `client/node_modules/next/dist/docs/` ก่อนใช้ API ของ Next (เช่น `useSearchParams` ต้องห่อ `<Suspense>`)

WebSocket events ที่ใช้จริง: `overview:update`, `participants:update`, `welcome:new_checkin`, `luckydraw:spin`, `luckydraw:winner_announced`, `agenda:update`, `prizes:update`, `settings:update` — payload ใน [api_spec.md](api_spec.md)

## 3. สถานะปัจจุบัน

**ใช้งานได้:** ลงทะเบียน + PDPA consent, ตั๋ว QR, สแกนเช็คอิน (กล้อง/เครื่องยิง), Dashboard CRUD + นำเข้า/ส่งออก Excel, ตั้งค่างาน, กำหนดการ + Excel, ของรางวัล + ลำดับ + Excel, จอ LED 4 หน้า (URL แยก), สุ่มรางวัล + หน้าประกาศผู้โชคดี, Footer + `/privacy`, หน้าแรก Event Experience, CI

**งานรอบล่าสุด (2026-09-23)** — รายการเต็มใน [CHANGELOG.md](../CHANGELOG.md), เหตุผลใน [decision.md](decision.md)

## 4. งานค้าง (เรียงตามความสำคัญ)

| # | งาน | ทำไมสำคัญ | ที่เกี่ยวข้อง |
|---|---|---|---|
| 1 | ใส่ `verifyToken` ให้ `POST /lucky-draw/spin` | ตอนนี้ใครก็สุ่มรางวัลได้ | `server/routes/api.js`, `client/src/app/lucky-draw/page.tsx` |
| 2 | แก้เทสต์ server 9 ข้อที่ล้าสมัย → CI เขียว → เปิด branch protection `main` | CI แดง, รวม PR ไม่มั่นใจ | `server/tests/`, [qa.md](qa.md) Q-1 |
| 3 | HTTPS สำหรับหน้างาน (กล้องสแกนบนแท็บเล็ต) | กล้องไม่ทำงานบน `http://IP` | [runbook.md](runbook.md) §3 |
| 4 | ทดสอบด้วยมือตามเช็กลิสต์ [qa.md](qa.md) §4 | หลายฟีเจอร์ยังไม่ได้ทดสอบในเบราว์เซอร์จริง | |
| 5 | ขยายรหัสตั๋ว (~9,000/วัน) | งานใหญ่ | `participantController.js` `generateTicketCode` |
| 6 | เก็บกวาด ESLint แล้วเพิ่มใน CI | คุณภาพโค้ด | |
| 7 | ยืนยัน LINE ID ผู้ติดต่อแพลตฟอร์ม | ลิงก์อาจเปิดไม่ได้ | `client/src/lib/platform.ts` |
| 8 | ADR 0001–0004 (Local sync, signed ticket, queue, แจ้งผลหลายช่องทาง) ยังเป็นแผน | ตัดสินใจว่าจะทำหรือยกเลิก | [decision.md](decision.md) |

## 5. ข้อตกลงการทำงาน

- **Branch:** พัฒนาบน `Dev` (หรือ `feature/*` แตกจาก `Dev`) → Pull Request เข้า `main` เมื่อพร้อมใช้งาน
- **Commit:** รูปแบบ `type(scope): สรุป` เช่น `feat(prizes): …`, `fix(stats): …` แยก commit ตามเรื่อง
- **ความลับ:** ห้าม commit `.env*` (ยกเว้น `*.env.example`) · repo เป็น Public ([ADR-0009](adr/0009-secrets-from-env-only.md))
- **ก่อน push:** `cd client && npx tsc --noEmit && node --test tests/*.test.mjs` (+ `cd server && npm test` ถ้าแตะ server)
- **เพิ่ม endpoint:** route ใน `routes/api.js` (ใส่ `verifyToken` ถ้าเป็นงานเจ้าหน้าที่) → controller → repository → function ใน `client/src/lib/api.ts` → อัปเดต [api_spec.md](api_spec.md)
- **เพิ่มค่าตั้งค่า:** ดู [configuration.md](configuration.md) §2 (แก้ 4 จุด)
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
