const nodemailer = require('nodemailer');

/**
 * Sends a digital ticket email to the registered participant.
 * If real SMTP environment variables are missing, it automatically sets up
 * a Nodemailer Ethereal test inbox and prints a preview link to the console.
 * 
 * @param {Object} participant - Participant details
 * @param {string} participant.name - Full name
 * @param {string} participant.company - Company
 * @param {string} participant.position - Position
 * @param {string} participant.email - Email address
 * @param {string} ticketCode - Unique ticket code (used to generate QR code)
 */
async function sendTicketEmail(participant, ticketCode) {
  let transporter;
  let isTestAccount = false;

  // 1. Configure SMTP Transporter (Real vs Mock)
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
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

  // 2. Generate QR Code API URL
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=090d16&data=${ticketCode}`;

  // 3. Draft Premium HTML Ticket Email Template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your Digital Pass - Tech Innovation Summit 2026</title>
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
          <h1>TECH INNOVATION SUMMIT 2026</h1>
          <p>SCAN • CHECK-IN • SHOW</p>
        </div>
        <div class="content">
          <div class="greeting">ขอขอบคุณสำหรับการลงทะเบียนเข้าร่วมงาน!</div>
          <p style="font-size: 14px; line-height: 1.5; color: #9ca3af;">
            กรุณาเก็บบัตรผ่านประตูดิจิทัลนี้ไว้แสดงต่อเจ้าหน้าที่หน้าประตูทางเข้า (Fast Check-in Counter) เพื่อทำการยิงสแกนเช็คอินเข้าร่วมสัมมนา
          </p>
          
          <div class="ticket-box">
            <div class="qr-code">
              <img src="${qrUrl}" alt="QR Ticket Code">
            </div>
            <div class="ticket-name">${participant.name}</div>
            <div class="ticket-company">${participant.company}</div>
            <div class="ticket-position">${participant.position || 'PARTICIPANT'}</div>
          </div>
          
          <table class="details-grid">
            <tr>
              <td class="details-label">วันเวลาจัดงาน</td>
              <td class="details-value">วันอาทิตย์ที่ 30 สิงหาคม 2026 เวลา 09:00 - 17:00 น.</td>
            </tr>
            <tr>
              <td class="details-label">สถานที่จัดงาน</td>
              <td class="details-value">Grand Ballroom, Central Plaza Hotel, Bangkok</td>
            </tr>
            <tr>
              <td class="details-label">รหัสผ่านตั๋ว</td>
              <td class="details-value" style="font-family: monospace; font-size: 12px;">${ticketCode}</td>
            </tr>
          </table>
        </div>
        <div class="footer">
          <p>ระบบบริหารจัดการลงทะเบียนอัจฉริยะ Smart Event Registration</p>
          <p>หากมีข้อสงสัยโปรดติดต่อ <a href="mailto:support@techsummit.com">support@techsummit.com</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  // 4. Send the Email
  try {
    const info = await transporter.sendMail({
      from: '"Tech Summit Team" <no-reply@techsummit.com>',
      to: participant.email,
      subject: '🎫 ยืนยันการลงทะเบียน: ตั๋วเข้างาน Tech Innovation Summit 2026',
      html: htmlContent,
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

module.exports = { sendTicketEmail };
