---
status: accepted
date: 2026-09-23
---

# 0011-single-stats-shape

สถิติภาพรวมมีรูปแบบเดียว `{ registered, checked_in, pending, show_up_percent }` ใช้ทั้ง `GET /events/:id/stats` และ WebSocket `overview:update` สร้างจาก `getStatsSummary()` ใน `participantController.js` ที่เดียว และ client โหลดค่าปัจจุบันทุกครั้งที่ socket เชื่อมต่อ

**เหตุผล:**
1. เดิม socket ส่ง `{ registered_count, checkin_count, show_up_rate }` แต่ client อ่าน `registered` ฯลฯ จอ Overview พังเมื่อมีคนเช็คอิน
2. เดิม client ไม่โหลดค่าตอนเปิดหน้า ตัวเลขเป็น 0 จนกว่าจะมีเหตุการณ์ใหม่

**ผลกระทบ:**
- ถ้าเพิ่มฟิลด์สถิติ ให้แก้ `getStatsSummary()` และ `interface Stats` ใน `client/src/lib/api.ts` พร้อมกัน
