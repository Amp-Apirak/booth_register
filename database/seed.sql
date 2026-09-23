-- =========================================================================
-- SQL Mock Data Seed Script
-- Project: Smart Event Registration (SCAN • CHECK-IN • SHOW)
-- Database Engine: PostgreSQL
-- Role: Systems Analyst (SA) Mock Data Seed Template
-- =========================================================================

-- 1. Insert Event (สร้างงานสัมมนาตัวอย่าง)
INSERT INTO events (event_id, title, description, start_date, end_date, location, logo_url)
VALUES (
    1,
    'Tech Innovation Summit 2026',
    'งานสัมมนานวัตกรรมเทคโนโลยีและการประยุกต์ใช้เพื่อการพัฒนาองค์กรยุคใหม่',
    '2026-08-30 09:00:00+07',
    '2026-08-30 17:00:00+07',
    'Grand Ballroom, Central Plaza Hotel, Bangkok',
    'https://example.com/assets/images/summit-logo-2026.png'
) ON CONFLICT (event_id) DO NOTHING;

-- Reset SERIAL sequence for events
SELECT setval('events_event_id_seq', (SELECT MAX(event_id) FROM events));


-- 2. Insert Users / Staff (สร้างบัญชีเจ้าหน้าที่ปฏิบัติงาน)
-- Note: รหัสผ่านสมมุติเข้ารหัสผ่าน bcrypt (รหัสผ่านดิบ: "password123")
INSERT INTO users (user_id, username, password_hash, fullname, role, email, active_status)
VALUES 
(
    1, 
    'superadmin', 
    '$2a$12$R.S2uF1v6b3eM23e7/yXqO.n0rGpeN8.B/Ff53eX3.98jJ18f3/5O', 
    'Apirak Bampen (Admin)', 
    'Admin', 
    'apirak.admin@techsummit.com', 
    TRUE
),
(
    2, 
    'staff_gate1', 
    '$2a$12$R.S2uF1v6b3eM23e7/yXqO.n0rGpeN8.B/Ff53eX3.98jJ18f3/5O', 
    'Somchai JaiDee (Gate 1)', 
    'Staff', 
    'somchai.gate1@techsummit.com', 
    TRUE
),
(
    3, 
    'staff_gate2', 
    '$2a$12$R.S2uF1v6b3eM23e7/yXqO.n0rGpeN8.B/Ff53eX3.98jJ18f3/5O', 
    'Nattapong Ruang (Gate 2)', 
    'Staff', 
    'nattapong.gate2@techsummit.com', 
    TRUE
) ON CONFLICT (user_id) DO NOTHING;

-- Reset SERIAL sequence for users
SELECT setval('users_user_id_seq', (SELECT MAX(user_id) FROM users));


-- 3. Insert Sessions / Agenda (สร้างกำหนดการเซสชันสัมมนา)
INSERT INTO sessions (session_id, event_id, title, description, start_time, end_time, speaker_name, speaker_company, speaker_avatar_url)
VALUES 
(
    1, 
    1, 
    'Registration & Coffee Reception', 
    'ลงทะเบียนเข้าร่วมงาน รับเอกสารสัมมนา และอาหารว่างต้อนรับ', 
    '2026-08-30 09:00:00+07', 
    '2026-08-30 10:00:00+07', 
    NULL, 
    NULL, 
    NULL
),
(
    2, 
    1, 
    'Opening Speech & Welcome Note', 
    'กล่าวเปิดงานสัมมนาและแนะนำภาพรวมกิจกรรมการบรรยายของวันนี้', 
    '2026-08-30 10:00:00+07', 
    '2026-08-30 11:00:00+07', 
    'Dr. Sompon Techasri', 
    'Ministry of Digital Economy', 
    'https://example.com/assets/images/speakers/sompon.png'
),
(
    3, 
    1, 
    'Keynote: Accelerating Innovation in the Digital Era', 
    'เซสชันพิเศษการปรับใช้นวัตกรรมดิจิทัลเพื่อขับเคลื่อนองค์กรรูปแบบใหม่ในอนาคต', 
    '2026-08-30 11:00:00+07', 
    '2026-08-30 12:00:00+07', 
    'Johnathan Davis', 
    'Global Innovation Speaker', 
    'https://example.com/assets/images/speakers/johnathan.png'
),
(
    4, 
    1, 
    'Interactive Tech Workshop', 
    'เวิร์กช็อปร่วมสนุกและทดลองเขียนสคริปต์จำลองระบบความปลอดภัยดิจิทัล', 
    '2026-08-30 13:00:00+07', 
    '2026-08-30 14:30:00+07', 
    'Kitti Poom', 
    'CyberSec Lab Thailand', 
    'https://example.com/assets/images/speakers/kitti.png'
),
(
    5, 
    1, 
    'Coffee Break & Networking', 
    'พักดื่มน้ำชา กาแฟ และร่วมแลกเปลี่ยนนามบัตรกับกลุ่มคู่ค้าพันธมิตร', 
    '2026-08-30 14:30:00+07', 
    '2026-08-30 15:00:00+07', 
    NULL, 
    NULL, 
    NULL
) ON CONFLICT (session_id) DO NOTHING;

-- Reset SERIAL sequence for sessions
SELECT setval('sessions_session_id_seq', (SELECT MAX(session_id) FROM sessions));

-- 3.1 Insert LED Signage Agenda
INSERT INTO agenda_items (event_id, title, speaker, location, start_at, end_at, is_highlight, sort_order)
VALUES
(1, 'Registration & Welcome Coffee', 'ทีมลงทะเบียน', 'Gate Fast Check-in', '2026-08-30 09:00:00+07', '2026-08-30 09:30:00+07', FALSE, 0),
(1, 'Opening Keynote: Next-Gen AI 2026', 'Dr. Somchai Tech', 'Main Stage', '2026-08-30 09:30:00+07', '2026-08-30 10:30:00+07', TRUE, 1),
(1, 'Morning Networking Break', '', 'Exhibition Hall', '2026-08-30 10:30:00+07', '2026-08-30 11:00:00+07', FALSE, 2),
(1, 'Cloud Native & Zero-Trust Security', 'John Smith, Global Tech', 'Main Stage', '2026-08-30 11:00:00+07', '2026-08-30 12:00:00+07', FALSE, 3),
(1, 'Grand Executive Networking Lunch', '', 'Dining Hall', '2026-08-30 12:00:00+07', '2026-08-30 13:00:00+07', FALSE, 4),
(1, 'High-Performance Microservices', 'Tanawat Pon, Data Cloud', 'Room A', '2026-08-30 13:00:00+07', '2026-08-30 14:00:00+07', FALSE, 5),
(1, 'Cybersecurity Threat Intelligence', 'Vipawan Tech, CyberSec', 'Main Stage', '2026-08-30 14:00:00+07', '2026-08-30 15:00:00+07', FALSE, 6),
(1, 'Grand Lucky Draw & Closing Ceremony', '', 'Main Stage', '2026-08-30 15:30:00+07', '2026-08-30 16:30:00+07', TRUE, 7);


-- 4. Insert Participants (สร้างรายชื่อผู้เข้าร่วมงานตัวอย่าง ทั้งหมด 12 รายสอดคล้องกับหน้าเว็บพรีเซนต์)
INSERT INTO participants (participant_id, event_id, ticket_code, fullname, company, position, email, phone, registered_at)
VALUES 
(1, 1, 'tkt_yanisa_prasert_2026', 'Yanisa Prasert', 'Zoom Information System', 'IT Director', 'yanisa@zoom.com', '081-234-5678', '2026-08-30 08:15:00+07'),
(2, 1, 'tkt_apirak_bampen_2026', 'Apirak Bampen', 'DeepTech Solutions', 'Software Engineer', 'apirak@deeptech.io', '089-876-5432', '2026-08-30 08:20:00+07'),
(3, 1, 'tkt_john_smith_2026', 'John Smith', 'Global Tech Corp', 'Speaker', 'john.s@globaltech.com', '082-111-2222', '2026-08-30 08:21:00+07'),
(4, 1, 'tkt_somchai_jaidee_2026', 'Somchai JaiDee', 'Siam Inno Group', 'Manager', 'somchai@siaminno.co.th', '085-555-4444', '2026-08-30 08:23:00+07'),
(5, 1, 'tkt_nattapong_ruang_2026', 'Nattapong Ruang', 'NextGen Software', 'Developer', 'nattapong@nextgen.com', '086-777-8888', '2026-08-30 08:24:00+07'),
(6, 1, 'tkt_pitchaya_srisai_2026', 'Pitchaya Srisai', 'Creative Studio', 'UX/UI Designer', 'pitchaya@creative.com', '087-999-0000', '2026-08-30 08:25:00+07'),
(7, 1, 'tkt_chantana_mongkol_2026', 'Chantana Mongkol', 'FinTech Hub', 'Analyst', 'chantana@fintech.co.th', '2026-08-30 08:28:00+07', '083-444-5555'),
(8, 1, 'tkt_tanawat_pon_2026', 'Tanawat Pon', 'Data Cloud Inc', 'Cloud Engineer', 'tanawat@datacloud.com', '084-222-3333', '2026-08-30 08:30:00+07'),
(9, 1, 'tkt_nisachol_siri_2026', 'Nisachol Siri', 'Thai Bank PLC', 'Product Owner', 'nisachol@thaibank.co.th', '081-555-6666', '2026-08-30 08:32:00+07'),
(10, 1, 'tkt_vipawan_tech_2026', 'Vipawan Tech', 'Cyber Security Ltd', 'Security Analyst', 'vipawan@cybersec.com', '089-444-3333', '2026-08-30 08:34:00+07'),
(11, 1, 'tkt_kitipong_tan_2026', 'Kitipong Tan', 'EdTech Startup', 'Founder', 'kitipong@edtech.com', '082-999-8888', '2026-08-30 08:35:00+07'),
(12, 1, 'tkt_anong_suk_2026', 'Anong Suk', 'Green Energy Corp', 'HR Specialist', 'anong@greenenergy.com', '083-777-6666', '2026-08-30 08:36:00+07')
ON CONFLICT (participant_id) DO NOTHING;

-- Reset SERIAL sequence for participants
SELECT setval('participants_participant_id_seq', (SELECT MAX(participant_id) FROM participants));


-- 5. Insert Check-ins (สร้างประวัติสแกนยืนยันเข้าประตูบางส่วน เพื่อจำลองสถานะ Checked-in)
-- สแกนผ่านผู้ใช้อันดับที่ 1, 3, 5, 6, 8, 10
INSERT INTO checkins (participant_id, event_id, scanned_by, checked_in_at, device_info)
VALUES 
(1, 1, 2, '2026-08-30 08:45:10+07', 'Staff-Tablet-Counter-1'),
(3, 1, 2, '2026-08-30 08:47:22+07', 'Staff-Tablet-Counter-1'),
(5, 1, 3, '2026-08-30 08:48:05+07', 'Staff-Tablet-Counter-2'),
(6, 1, 3, '2026-08-30 08:50:33+07', 'Staff-Tablet-Counter-2'),
(8, 1, 2, '2026-08-30 08:52:12+07', 'Staff-Tablet-Counter-1'),
(10, 1, 3, '2026-08-30 08:55:00+07', 'Staff-Tablet-Counter-2')
ON CONFLICT (participant_id) DO NOTHING;
