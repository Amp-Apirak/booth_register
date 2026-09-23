---
status: accepted
date: 2026-09-23
---

# 0009-secrets-from-env-only

รหัสผ่านฐานข้อมูลและ `JWT_SECRET` อ่านจาก environment (`.env`, `server/.env`) **เท่านั้น** ไม่มีค่าสำรองในโค้ด ถ้าไม่ได้ตั้ง server จะหยุดทำงานพร้อมบอกชื่อตัวแปรที่ขาด บัญชีเจ้าหน้าที่สร้างด้วย `server/scripts/create-admin.js`

**เหตุผล:**
1. Repo เป็น Public บน GitHub ค่าสำรองเดิม (`secure_pass_2026`, `fallback_secret_for_mockup_2026`) ทำให้ใครก็ปลอม token เจ้าหน้าที่ได้ถ้าลืมตั้งค่า
2. บัญชีตัวอย่างใน `seed.sql` มี hash ที่ไม่ตรงกับรหัสผ่านใดที่รู้ (คอมเมนต์เดิมที่ว่า `password123` ไม่จริง) เครื่องที่ติดตั้งใหม่จึง login ไม่ได้

**ผลกระทบ:**
- `scripts/setup.sh` สร้าง `.env` ทั้งสองไฟล์ให้ พร้อมรหัสผ่าน DB และ JWT secret แบบสุ่ม
- `docker-compose.yml` อ่าน `DB_USER`/`DB_PASSWORD` จาก `.env` ที่ root
- ทุกเครื่องมี JWT secret ของตัวเอง token จากเครื่องหนึ่งใช้กับอีกเครื่องไม่ได้ (ตั้งใจ)
