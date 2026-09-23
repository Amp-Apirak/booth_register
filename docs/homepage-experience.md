# Event Experience — หน้าเปิดตัวและหน้าแรก

ปรับปรุง: 23 กันยายน 2569

## แนวคิด

“ทุกการพบกัน สร้างความเป็นไปได้ใหม่” — ใช้ภาพประตูวงแหวนและตั๋วดิจิทัลเป็นจุดเด่น เชื่อมกับกระบวนการจริงของระบบ: ลงทะเบียน → รับ Digital Ticket → Check-in → Welcome Screen และกิจกรรมในงาน

- ใช้พื้นหลัง `--background` เดียวกับระบบ พร้อมแสงคราม/ม่วง/ไซแอนตาม globals.css; วงแหวนผิวโลหะม่วงสลับไซแอน ตั๋วกระจกสีคราม และปุ่มไล่สีคราม–ม่วง–ไซแอนตัวอักษรขาวให้สอดคล้องกับ Navigation
- สีอ้างอิง: Indigo `#6366f1`, Purple `#a855f7`, Cyan `#06b6d4`; ข้อความเน้นใช้ `#818cf8`, `#c084fc`, `#38bdf8` ตาม holographic text ของระบบ
- Desktop วางข้อความและข้อมูลกิจกรรมด้านซ้าย กราฟิกด้านขวา; หน้าจอไม่เกิน 900px เรียงแนวตั้ง
- กราฟิกประกอบด้วยวงแหวน CSS 3D ตั๋วลอย แสงสะท้อน วงโคจร และอนุภาคแสง พร้อม parallax ตามเมาส์
- ใช้ CSS และไอคอนที่มีในระบบ ไม่เพิ่ม dependency หรือดาวน์โหลดโมเดล 3D

## การใช้งาน

หน้าเปิดตัวแสดงเป็น native modal dialog เมื่อเข้าหน้าแรกใน session ที่ยังไม่ได้กดเข้าสู่ประสบการณ์ ผู้ชมเลือกเข้าสู่เมนูหลักหรือลงทะเบียนได้โดยตรง หน้าแรกมีปุ่ม “ชมหน้าเปิดตัวอีกครั้ง” และลิงก์ค้นหาตั๋ว

ชื่อ โลโก้ วันเวลา และสถานที่มาจาก SettingsContext และ formatter เดิม รองรับการอัปเดต settings ผ่าน WebSocket ของระบบ ฟิลด์วันและสถานที่จะซ่อนเมื่อไม่ได้ตั้งค่า กราฟิกตั๋วเป็นตัวอย่างที่ระบุ PREVIEW ไม่ใช่ตั๋วของผู้เข้าร่วมและไม่มี token สำหรับเช็คอิน

เมนูระบบและสถิติเดิมยังอยู่ด้านล่างหน้าแรก การเปลี่ยนแปลงนี้ไม่แก้ API ฐานข้อมูล หรือสิทธิ์การเข้าถึง

## การเคลื่อนไหวและการเข้าถึง

- พื้นหลังสองชั้น: ชั้น viewport ต่อเนื่องหลังเนื้อหาหน้าแรก และชั้นภายในกรอบ Event/หน้าเปิดตัว ประกอบด้วยแสงออโรรา เส้นแสงโค้ง ประกายลอย และลำแสงพาดผ่าน
- ใช้ CSS transform/opacity animation โดยไม่มี JavaScript render loop; บนจอไม่เกิน 900px ลดประกายจาก 28 เป็น 12 จุด และลำแสงจาก 3 เป็น 1 เส้นต่อชั้น
- ปุ่มพัก/เปิดเอฟเฟกต์หยุดและเล่นทั้งพื้นหลังและฉาก 3D พร้อมกัน โดยรักษาสถานะระหว่างหน้าเปิดตัวกับหน้าแรก
- พื้นหลัง viewport แสดงทุกหน้า (ดูหัวข้อ “พื้นหลังออโรราทุกหน้า”) และซ่อนชั่วคราวขณะเปิดหน้าแนะนำของหน้าแรกเพื่อไม่ให้ animate ซ้อนสองชั้น
- `prefers-reduced-motion: reduce` ปิด animation, transition และ pointer parallax
- เปิด dialog แล้ว focus ชื่องาน; Escape เข้าหน้าแรก; หลังปิด dialog focus กลับหัวข้อหน้าแรก
- Native modal จำกัด focus ไว้ในหน้าเปิดตัวและป้องกันการกดเมนูเบื้องหลัง
- ล็อกการเลื่อน body ระหว่างเปิดหน้าแนะนำ และคืนค่าเมื่อปิดหรือเปลี่ยนหน้า
- sessionStorage ใช้เป็นความสะดวกเท่านั้น เมื่อ browser ปิดกั้น storage ยังเข้าใช้งานได้
- ฉากตกแต่งซ่อนจาก accessibility tree และไม่รับ pointer events

## ไฟล์ที่เกี่ยวข้อง

- `client/src/components/EventBackdrop.tsx` และ `EventBackdrop.module.css` — พื้นหลังเคลื่อนไหวสำหรับ viewport และกรอบ Event
- `client/src/components/EventExperience.tsx` — ฉาก การเคลื่อนไหว เนื้อหา และ modal
- `client/src/components/EventExperience.module.css` — ดีไซน์เฉพาะคอมโพเนนต์และ responsive breakpoints
- `client/src/components/SiteBackdrop.tsx` — `SiteBackdropProvider` ใน root layout, ปุ่มพักพื้นหลังลอย และ `useBackdrop()`
- `client/src/app/page.tsx` — การจำ session, เปิดซ้ำ และสถิติ/เมนูเดิม

## การตรวจสอบ

ตรวจ TypeScript และ ESLint ของไฟล์ที่แก้ พร้อมตรวจใน Chrome ที่ localhost:3000:

- แสดงชื่อ วันเวลา และสถานที่จริงจากระบบ
- ปุ่มพักเอฟเฟกต์เปลี่ยนสถานะ `aria-pressed`
- เข้าหน้าแรก เปิดหน้าแนะนำซ้ำ และกด Escape ได้
- Refresh หลังเข้าสู่หน้าแรกไม่แสดงหน้าแนะนำซ้ำ
- ลิงก์ลงทะเบียนเปิดฟอร์ม `/register` ได้ โดยไม่ส่งข้อมูลทดสอบ
- ตรวจ desktop, mobile 390px และ tablet 768px; ปรับ tablet เป็นคอลัมน์เดียวเพื่อไม่ให้กราฟิกเบียดข้อความ

ตรวจโค้ด fallback สำหรับ storage ที่ถูกปิดกั้น, ฟิลด์ settings ว่าง และ reduced motion; ยังไม่ได้ทดสอบกรณีเหล่านี้ด้วยการเปลี่ยนค่าระบบหรือฐานข้อมูลจริง

ผลตรวจ build: `npm run build -- --webpack` ผ่าน (รวม TypeScript และ prerender ทุกหน้า) ส่วน `npm run build` ที่ใช้ Turbopack ถูกจำกัดด้วย `binding to a port: Operation not permitted` ในสภาพแวดล้อมนี้ แม้รันซ้ำด้วยการขอสิทธิ์เพิ่มเติมแล้ว ไม่ได้เปลี่ยน build script ของโครงการ ตรวจความกว้างหน้าเพิ่มเติมที่ 320px ไม่พบ horizontal overflow

ตรวจพื้นหลังเคลื่อนไหวใน Chrome: transform ของแสงออโรราเปลี่ยนตามเวลา ปุ่มพักเปลี่ยน animation-play-state เป็น paused ทั้งสองชั้น และรักษาสถานะเมื่อเปิดหน้าแนะนำซ้ำ/กลับหน้าแรก; จอ 390px แสดงประกาย 12 จุดต่อชั้นและไม่มี horizontal overflow ข้อความเข้าสู่หน้าจอด้วย animation สั้นที่เล่นจนจบเพื่อไม่ให้ค้างเป็นข้อความโปร่งใสขณะพักเอฟเฟกต์

## พื้นหลังออโรราทุกหน้า

`SiteBackdropProvider` (ใน `client/src/app/layout.tsx`) แสดง EventBackdrop แบบ viewport ครั้งเดียวสำหรับทุกหน้า: ออโรรา เส้นแสง ประกาย และลำแสงโทนม่วง–คราม–ไซแอน

- หน้าแรกใช้แสงเต็ม ทุกหน้าอื่นใช้ `subtle` เพื่อลดแสงตรงกลางบริเวณฟอร์ม/ตาราง
- ปุ่ม “พักพื้นหลัง” ลอยมุมขวาล่าง (`type="button"`, `aria-pressed`) อยู่นอก form ทุกหน้า สถานะอยู่ใน root layout จึงคงอยู่เมื่อเปลี่ยนหน้า และการกดไม่ re-mount หน้า ข้อมูลที่กรอกไม่หาย
- จอกว้างไม่เกิน 640px ปุ่มย่อเหลือไอคอน 44×44px (label ยังอ่านได้ด้วย screen reader) และเคารพ safe-area
- `/signage` แสดงพื้นหลังแต่ไม่แสดงปุ่มลอยทับจอแสดงผล
- หน้าแรกใช้ `useBackdrop()` ร่วมกับปุ่มพักเอฟเฟกต์ในฉาก Event จึงหยุด/เล่นพร้อมกันทั้งสองจุด
- reduced motion และ `@media print` ใช้กฎเดิมของ EventBackdrop (ปุ่มลอยซ่อนเมื่อพิมพ์)

การตรวจสอบ: `tsc --noEmit` ผ่าน, ESLint ของ SiteBackdrop/layout/หน้าแรกไม่มี findings ใหม่ (register ยังเป็น 3 errors / 12 warnings เดิม), ทุกหน้า (/, /register, /ticket, /dashboard, /settings, /scanner, /lucky-draw, /signage, /privacy, /login) render พื้นหลังจาก SSR และ /signage ไม่มีปุ่มลอย, ภาพหน้าจอ Chrome desktop ของ /ticket, /lucky-draw ยืนยันแสงออโรราและปุ่ม

## พื้นหลังหน้าลงทะเบียน

หน้า `/register` รวมถึงโหมด `?mode=public` / `?standalone=true` ใช้พื้นหลังร่วมจาก `SiteBackdropProvider` (แบบ `subtle`) — ไม่มี backdrop หรือปุ่มของตัวเองแล้ว การเคลื่อนไหวของ Hero Banner เดิมยังทำงานตามเดิม

พื้นหลังอยู่หลังเนื้อหา (fixed, z-index -1 ใน root stacking context) และไม่รับ pointer event พื้นหลังและปุ่มควบคุมซ่อนด้วย `@media print` และอยู่นอก `#printable-ticket` ที่ใช้บันทึกรูปตั๋ว

การตรวจสอบ: production build ด้วย Webpack (รวม TypeScript) ผ่าน ตรวจ Chrome desktop และ 390px, ปุ่มพักหยุด aurora ทั้งสามชั้น, กรอกข้อความทดสอบแล้วพัก/เปิดพื้นหลังข้อมูลไม่หาย และล้างข้อความทดสอบโดยไม่ส่งฟอร์ม จอมือถือเหลือ 12 ประกายและไม่มี horizontal overflow

ESLint ในหน้า register มีปัญหาเดิม 3 errors / 12 warnings เท่ากับ HEAD ก่อนแก้ (any ใน callback ครอปรูปและ setState ใน effect รวมถึง warnings เดิม); EventBackdrop ไม่มี lint findings การส่งลงทะเบียนจริง การออกตั๋ว และการพิมพ์ตั๋วจริงไม่ได้ทดสอบในงานตกแต่งครั้งนี้
