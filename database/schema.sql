-- =========================================================================
-- SQL DDL Database Schema
-- Project: Smart Event Registration (SCAN • CHECK-IN • SHOW)
-- Database Engine: PostgreSQL (Recommended for Relational & ACID compliance)
-- Role: Systems Analyst (SA) Database Design Template
-- =========================================================================

-- 1. Create EVENTS Table (งานอีเวนต์)
CREATE TABLE events (
    event_id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    location VARCHAR(500),
    logo_url VARCHAR(2083),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for scanning events by date ranges
CREATE INDEX idx_events_dates ON events(start_date, end_date);


-- 2. Create USERS / STAFF Table (เจ้าหน้าที่และแอดมินหลังบ้าน)
CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    fullname VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('Admin', 'Staff')),
    email VARCHAR(255) UNIQUE,
    active_status BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick username authentication
CREATE INDEX idx_users_username ON users(username);


-- 3. Create PARTICIPANTS Table (ผู้ลงทะเบียนเข้าร่วมงาน)
CREATE TABLE participants (
    participant_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    ticket_code VARCHAR(100) UNIQUE NOT NULL, -- UUID/String for QR Code encryption
    fullname VARCHAR(150) NOT NULL,
    company VARCHAR(150) NOT NULL,
    position VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    registered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    profile_picture TEXT, -- Data URL of the attendee photo (shown on LED welcome / lucky draw)
    attendee_type VARCHAR(50) DEFAULT 'General' -- 'General' | 'VIP'
);

-- Indices for scanning ticket_code (QR Code) and searching participants by name/company
CREATE INDEX idx_participants_ticket_code ON participants(ticket_code);
CREATE INDEX idx_participants_search ON participants(event_id, fullname, company);


-- 4. Create CHECKINS Table (บันทึกประวัติการสแกนเข้างานแบบเรียลไทม์)
CREATE TABLE checkins (
    checkin_id SERIAL PRIMARY KEY,
    participant_id INTEGER UNIQUE NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE, -- Unique to enforce 1-to-1 mapping (Prevent double check-in)
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    scanned_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL, -- Audit log: which staff scanned this person
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    device_info VARCHAR(255),
    
    -- Ensure checkin event matches participant event
    CONSTRAINT chk_checkin_event CHECK (event_id IS NOT NULL)
);

-- Indices for reporting and sorting check-in timestamp
CREATE INDEX idx_checkins_timestamp ON checkins(checked_in_at);
CREATE INDEX idx_checkins_event_stats ON checkins(event_id);


-- 5. Create SESSIONS Table (ตารางลำดับกำหนดการ/ห้องสัมมนาย่อย)
CREATE TABLE sessions (
    session_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    speaker_name VARCHAR(150),
    speaker_company VARCHAR(150),
    speaker_avatar_url VARCHAR(2083),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for session timelines
CREATE INDEX idx_sessions_time ON sessions(event_id, start_time, end_time);

-- 5.1 Create AGENDA_ITEMS Table (กำหนดการที่เจ้าหน้าที่จัดการและนำเข้า Excel)
CREATE TABLE agenda_items (
    agenda_item_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    speaker VARCHAR(255) DEFAULT '',
    location VARCHAR(255) DEFAULT '',
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    speaker_image TEXT,
    is_highlight BOOLEAN DEFAULT FALSE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_agenda_time_range CHECK (end_at > start_at)
);

CREATE INDEX idx_agenda_items_event_time ON agenda_items(event_id, start_at, end_at);


-- 6. Create LUCKY_DRAW_WINNERS Table (ประวัติผู้โชคดีได้รับรางวัล)
CREATE TABLE lucky_draw_winners (
    winner_id SERIAL PRIMARY KEY,
    participant_id INTEGER UNIQUE NOT NULL REFERENCES participants(participant_id) ON DELETE CASCADE, -- Unique to prevent a single participant from winning multiple prizes
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    drawn_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    drawn_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    prize_name VARCHAR(255) NOT NULL
);

-- Index for winners list
CREATE INDEX idx_winners_event ON lucky_draw_winners(event_id);

-- 7. Configurable prize catalog for Lucky Draw
CREATE TABLE lucky_draw_prizes (
    prize_id SERIAL PRIMARY KEY,
    event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(80) DEFAULT '',
    description TEXT DEFAULT '',
    image TEXT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lucky_draw_prizes_event ON lucky_draw_prizes(event_id, sort_order, prize_id);


-- =========================================================================
-- Helper Database Triggers for Auto-updating Timestamp (updated_at)
-- =========================================================================

CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_events_modtime BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_participants_modtime BEFORE UPDATE ON participants FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_sessions_modtime BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
CREATE TRIGGER update_agenda_items_modtime BEFORE UPDATE ON agenda_items FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
