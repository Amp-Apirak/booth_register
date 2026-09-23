# แผนผังการติดตั้งระบบและเครือข่ายหน้างาน (Network & Hardware Deployment Guide)
## โครงการ: Smart Event Registration
### สำหรับ: Network Engineer, Systems Analyst (SA) และทีมควบคุมหน้างาน (On-site Operators)

เพื่อสนับสนุนการทำงานร่วมกันระหว่างระบบซอฟต์แวร์และการติดตั้งโครงสร้างพื้นฐานจริงในวันจัดงานสัมมนา เอกสารฉบับนี้สรุปโครงสร้างทางกายภาพ (Physical Topology) และการเชื่อมต่อเครือข่าย LAN/Cloud ในบริเวณงาน

---

## 1. แผนผังการเชื่อมต่อเครือข่ายหน้างาน (Network Topology Diagram)

แผนผังแสดงความเชื่อมโยงระหว่างอุปกรณ์ท้องถิ่นภายในพื้นที่จัดสัมมนา (Local LAN) และการซิงค์ข้อมูลขึ้นคลาวด์ภายนอก:

```mermaid
graph TD
    subgraph CLOUD_INFRASTRUCTURE ["ระบบบนคลาวด์อินเทอร์เน็ต (Cloud Backend)"]
        CloudDB[(PostgreSQL Primary DB)]
        SmsGw[SMS & Email Gateway]
        CloudSocket[Cloud Push Server]
    end

    subgraph LOCAL_BALLROOM_LAN ["ระบบเครือข่าย LAN ภายในงาน (On-site LAN - Router Node)"]
        LocalRouter{Local Security Router}
        LocalServer[Local Sync Server Node <br/> Express + Socket.io]
        
        subgraph ZONE_2_FAST_CHECKIN ["โซน 2: เคาน์เตอร์ทางเข้าประตู (Fast Check-in Counter)"]
            Tablet1[Staff Tablet 1] <-->|WiFi| LocalRouter
            Tablet2[Staff Tablet 2] <-->|WiFi| LocalRouter
            Scanner1[Barcode Scanner 1] -.->|USB/Bluetooth| Tablet1
            Scanner2[Barcode Scanner 2] -.->|USB/Bluetooth| Tablet2
        </div>

        subgraph ZONE_3_DIGITAL_SIGNAGE ["โซน 3: จอทีวีและป้ายไฟประชาสัมพันธ์ (Digital Signage Display)"]
            SignageTV1[TV 1: Welcome Name Screen] <-->|HDMI| Player1[Media Player Node]
            SignageTV2[TV 2: Overview Stats Screen] <-->|HDMI| Player2[Media Player Node]
            SignageTV3[TV 3: Lucky Draw Screen] <-->|HDMI| Player3[Media Player Node]
            
            Player1 <-->|LAN Cable| LocalRouter
            Player2 <-->|LAN Cable| LocalRouter
            Player3 <-->|LAN Cable| LocalRouter
        end

        subgraph ZONE_1_SELF_REGISTRATION ["โซน 1: บริเวณลงทะเบียนด้วยตนเอง (Self-Registration)"]
            ParticipantPhone[Participant Smartphone] <.->|Mobile Data / Public WiFi| CloudDB
        end
    end

    %% Sync connections
    LocalServer <-->|LAN / WiFi| LocalRouter
    LocalRouter <-->|WAN: Active Internet Connection| CloudDB
    LocalServer -.->|FIFO Event Queue Sync| CloudDB
    CloudDB -.->|Trigger SMS/Email alerts| SmsGw
```

---

## 2. รายการอุปกรณ์และการติดตั้งทางกายภาพ (Hardware & Equipment Checklist)

เพื่อให้หน้างานสัมมนาขนาดใหญ่ (เป้าหมาย 300+ คน) ทำงานลื่นไหล มีความต้องการฮาร์ดแวร์พื้นฐานดังนี้:

### 2.1 เครื่องแม่ข่ายย่อยหน้างาน (Local Server Node)
*   **ความต้องการอุปกรณ์**: Mini-PC (Intel NUC หรือเทียบเท่า) หรือ Raspberry Pi 4 (RAM 4GBขึ้นไป)
*   **ซอฟต์แวร์**: Node.js (Express + Socket.io Server) และตัวจัดคิว NeDB/SQLite ท้องถิ่น
*   **การเชื่อมต่อ**: ต่อสาย LAN เข้ากับ Router หลักโดยตรงเพื่อเสถียรภาพสูงสุด

### 2.2 จุดสแกนและตรวจสอบรายชื่อ (Fast Check-in Terminals)
*   **ความต้องการอุปกรณ์**: แท็บเล็ต (iPad หรือ Android RAM 4GB+) จำนวน 2 - 4 เครื่อง (ตามจำนวนช่องสแกน)
*   **เครื่องยิงสแกน**: เครื่องสแกนบาร์โค้ดไร้สาย (Wireless Bluetooth 2D Scanner) ความเร็วในการยิงอ่านคิวอาร์โค้ดสูง
*   **การเชื่อมต่อ**: ตัวยิงสแกนเนอร์เชื่อมกับแท็บเล็ตผ่าน Bluetooth ในโหมดจำลองคีย์บอร์ด (Keyboard Emulation Mode) และแท็บเล็ตต่อ WiFi วง LAN ภายในงาน

### 2.3 ตัวแปลงสัญญาณภาพและบอร์ดเล่นสื่อ (Media Players)
*   **ความต้องการอุปกรณ์**: อุปกรณ์เล่นเว็บเบราว์เซอร์สำหรับต่อทีวี เช่น Android TV Box (รันเบราว์เซอร์ WebView) หรือ Mini-PC
*   **การเชื่อมต่อ**: เชื่อมสัญญาณอินเทอร์เน็ตผ่านสาย LAN (Ethernet RJ45) เพื่อความนิ่งในการรับ WebSocket Event เปลี่ยนแปลงจอภาพต้อนรับ

---

## 3. ขั้นตอนการตั้งค่าเครือข่ายและการรับมือภัยพิบัติ (LAN Configuration & Recovery Steps)

1.  **การแยกวงเครือข่าย (Network Segmentation)**:
    *   วง WiFi สำหรับทีมสตาฟสแกนและจอ Signage (SSID: `STAFF_EVENT_SECURE`) จะต้องล็อกรหัสผ่านและปิดกั้นไม่ให้ผู้เข้างานทั่วไปเข้ามาร่วมใช้วงเครือข่ายนี้ เพื่อรักษาปริมาณแบนด์วิดท์ (Bandwidth Reservation) สำหรับส่งแพ็กเก็ต WebSockets
    *   ผู้ลงทะเบียนจะเข้าถึงหน้าสมัครด้วยสัญญาณมือถือตนเอง (4G/5G) หรือต่อ WiFi สาธารณะแยกวง (`GUEST_FREE_WIFI`) ซึ่งจะยิงข้อมูลตรงเข้าฐานข้อมูลคลาวด์คีย์นอกงาน
2.  **กรณีเราเตอร์ LAN หน้างานพัง (Router Hardware failure)**:
    *   เตรียม Router สำรองพร้อมโคลนข้อมูล SSID และรหัสผ่านเดียวกันไว้ เพื่อสลับเปลี่ยนทดแทนได้ภายใน 5 นาที
3.  **กลไกซิงค์ข้อมูลย้อนกลับ (Re-sync Mechanism)**:
    *   เมื่อช่องสัญญาณเน็ตหลุด (WAN Connection offline) ➔ ระบบแสกนจะยังคงสแกนได้ลื่นไหลผ่าน Local Node Server
    *   เมื่อเน็ตกลับมา ➔ สคริปต์ Sync Pipeline บน Local Node Server จะเช็คสถานะฐานข้อมูลคลาวด์ และส่งข้อมูลในคิวออกไปจนหมด (Queue Flushed) ➔ คลาวด์ Database ได้รับข้อมูลครบถ้วน ➔ ล้างคิวใน Local และระบบเข้าสู่สถานะปกติ
