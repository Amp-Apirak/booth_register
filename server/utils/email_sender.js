const nodemailer = require('nodemailer');
const settingsRepository = require('../repositories/settingsRepository');

/** Text from attendees or settings goes into the e-mail as text, never as HTML */
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Settings store wall-clock times ("2026-09-21T08:00", Thai time): format them without any time-zone shift
const parseWallClock = (value) => {
  const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5])) : null;
};
const thaiDate = (d) => new Intl.DateTimeFormat('th-TH', { dateStyle: 'full', timeZone: 'UTC' }).format(d);
const thaiTime = (d) => new Intl.DateTimeFormat('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }).format(d);

/** "วันจันทร์ที่ 21 กันยายน พ.ศ. 2569 เวลา 08:00 - 17:00 น." (two dates when the event spans days) */
function formatEventWhen(start, end) {
  const from = parseWallClock(start);
  const to = parseWallClock(end);
  if (!from) return '';
  if (!to) return `${thaiDate(from)} เวลา ${thaiTime(from)} น.`;
  if (from.toISOString().slice(0, 10) === to.toISOString().slice(0, 10)) {
    return `${thaiDate(from)} เวลา ${thaiTime(from)} - ${thaiTime(to)} น.`;
  }
  return `${thaiDate(from)} ${thaiTime(from)} น. - ${thaiDate(to)} ${thaiTime(to)} น.`;
}

const formatVenue = (s) => [s.event_venue, s.event_building, s.event_floor, s.event_address]
  .map((v) => String(v || '').trim()).filter(Boolean).join(', ');

/**
 * The ticket e-mail for one attendee, filled from the event settings (Settings page).
 * Pure function (unit-tested); every value is escaped.
 */
function buildTicketEmail(participant, ticketCode, settings = {}) {
  const eventName = String(settings.event_name || '').trim() || 'Smart Event Registration';
  const when = formatEventWhen(settings.event_start, settings.event_end);
  const venue = formatVenue(settings);
  const contact = [settings.organizer_name, settings.contact_phone, settings.contact_email]
    .map((v) => String(v || '').trim()).filter(Boolean);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=090d16&data=${encodeURIComponent(ticketCode)}`;
  const row = (label, value, style = '') => (value
    ? `<tr><td class="details-label">${label}</td><td class="details-value"${style}>${escapeHtml(value)}</td></tr>`
    : '');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Digital Pass - ${escapeHtml(eventName)}</title>
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #05070b;
          color: #f3f4f6;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 20px auto;
          background-color: #090d16;
          border: 1px solid #1f2937;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        }
        .header {
          background: linear-gradient(135deg, #6366f1, #06b6d4);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #ffffff;
          letter-spacing: 1px;
        }
        .header p {
          margin: 5px 0 0 0;
          font-size: 14px;
          color: #e0e7ff;
        }
        .content {
          padding: 30px;
          text-align: center;
        }
        .greeting {
          font-size: 18px;
          color: #ffffff;
          margin-bottom: 20px;
          font-weight: 600;
        }
        .ticket-box {
          background-color: #111827;
          border: 1px dashed #374151;
          border-radius: 12px;
          padding: 24px;
          margin: 20px 0;
          text-align: center;
        }
        .qr-code {
          background-color: #ffffff;
          padding: 12px;
          border-radius: 8px;
          display: inline-block;
          margin-bottom: 16px;
        }
        .qr-code img {
          display: block;
          width: 150px;
          height: 150px;
        }
        .ticket-name {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin: 0 0 4px 0;
        }
        .ticket-company {
          font-size: 14px;
          color: #9ca3af;
          margin: 0 0 8px 0;
        }
        .ticket-position {
          font-size: 12px;
          color: #818cf8;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin: 0;
        }
        .details-grid {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
          font-size: 13px;
          text-align: left;
        }
        .details-grid td {
          padding: 8px 0;
          border-bottom: 1px solid #1f2937;
        }
        .details-label {
          color: #9ca3af;
          font-weight: 600;
          width: 100px;
        }
        .details-value {
          color: #ffffff;
        }
        .footer {
          background-color: #030712;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #4b5563;
          border-top: 1px solid #1f2937;
        }
        .footer a {
          color: #6366f1;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${escapeHtml(eventName)}</h1>
          <p>SCAN • CHECK-IN • SHOW</p>
        </div>
        <div class="content">
          <div class="greeting">ขอขอบคุณสำหรับการลงทะเบียนเข้าร่วมงาน!</div>
          <p style="font-size: 14px; line-height: 1.5; color: #9ca3af;">
            กรุณาเก็บบัตรผ่านประตูดิจิทัลนี้ไว้แสดงต่อเจ้าหน้าที่หน้าประตูทางเข้า (Fast Check-in Counter) เพื่อทำการยิงสแกนเช็คอินเข้าร่วมงาน
          </p>

          <div class="ticket-box">
            <div class="qr-code">
              <img src="${escapeHtml(qrUrl)}" alt="QR Ticket Code">
            </div>
            <div class="ticket-name">${escapeHtml(participant.name)}</div>
            <div class="ticket-company">${escapeHtml(participant.company)}</div>
            <div class="ticket-position">${escapeHtml(participant.position || 'PARTICIPANT')}</div>
          </div>

          <table class="details-grid">
            ${row('วันเวลาจัดงาน', when)}
            ${row('สถานที่จัดงาน', venue)}
            ${row('รหัสตั๋ว', ticketCode, ' style="font-family: monospace; font-size: 12px;"')}
          </table>
        </div>
        <div class="footer">
          <p>${escapeHtml(eventName)} · ระบบลงทะเบียนและเช็คอิน</p>
          ${contact.length ? `<p>หากมีข้อสงสัยโปรดติดต่อ ${contact.map(escapeHtml).join(' · ')}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  return { subject: `🎫 ยืนยันการลงทะเบียน: ตั๋วเข้างาน ${eventName}`, fromName: eventName, html };
}

/**
 * Sends a digital ticket email to the registered participant.
 * Resolves SMTP coordinates from environment variables; event details come from Settings.
 */
async function sendTicketEmail(participant, ticketCode) {
  if (process.env.NODE_ENV === 'test') {
    return { success: true, message: 'Test email bypassed' };
  }

  let transporter;
  let isTestAccount = false;

  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      isTestAccount = true;
    } catch (err) {
      console.error("Failed to create Nodemailer test account, skipping email send:", err.message);
      return;
    }
  }

  try {
    const settings = await settingsRepository.getSettings().catch(() => ({}));
    const email = buildTicketEmail(participant, ticketCode, settings);
    // SMTP_FROM: the sender address your mail server accepts (defaults to the SMTP login)
    const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    const info = await transporter.sendMail({
      from: { name: email.fromName, address: fromAddress },
      to: participant.email,
      subject: email.subject,
      html: email.html,
    });

    if (isTestAccount) {
      console.log(`-------------------------------------------------------------------`);
      console.log(`📧 Ticket Email sent successfully to: ${participant.email}`);
      console.log(`🔗 Preview URL (Click to view HTML Email):`);
      console.log(`   ${nodemailer.getTestMessageUrl(info)}`);
      console.log(`-------------------------------------------------------------------`);
    } else {
      console.log(`📧 Real Ticket Email sent to: ${participant.email} (Message ID: ${info.messageId})`);
    }
  } catch (error) {
    console.error("Error occurred while sending ticket email:", error.message);
  }
}

module.exports = { sendTicketEmail, buildTicketEmail, escapeHtml, formatEventWhen };
