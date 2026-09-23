const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const { sendTicketEmail } = require('./utils/email_sender');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

// Mock database offsets (coincides with requirements.md)
const BASE_REGISTERED = 308;
const BASE_CHECKED = 239;
const BASE_PENDING = 69;

let participants = [
  { id: 1, name: "Yanisa Prasert", company: "Zoom Information System", position: "IT Director", email: "yanisa@zoom.com", phone: "081-234-5678", status: "Checked-in" },
  { id: 2, name: "Apirak Bampen", company: "DeepTech Solutions", position: "Software Engineer", email: "apirak@deeptech.io", phone: "089-876-5432", status: "Pending" },
  { id: 3, name: "John Smith", company: "Global Tech Corp", position: "Speaker", email: "john.s@globaltech.com", phone: "082-111-2222", status: "Checked-in" },
  { id: 4, name: "Somchai JaiDee", company: "Siam Inno Group", position: "Manager", email: "somchai@siaminno.co.th", phone: "085-555-4444", status: "Pending" },
  { id: 5, name: "Nattapong Ruang", company: "NextGen Software", position: "Developer", email: "nattapong@nextgen.com", phone: "086-777-8888", status: "Checked-in" },
  { id: 6, name: "Pitchaya Srisai", company: "Creative Studio", position: "UX/UI Designer", email: "pitchaya@creative.com", phone: "087-999-0000", status: "Checked-in" },
  { id: 7, name: "Chantana Mongkol", company: "FinTech Hub", position: "Analyst", email: "chantana@fintech.co.th", phone: "083-444-5555", status: "Pending" },
  { id: 8, name: "Tanawat Pon", company: "Data Cloud Inc", position: "Cloud Engineer", email: "tanawat@datacloud.com", phone: "084-222-3333", status: "Checked-in" },
  { id: 9, name: "Nisachol Siri", company: "Thai Bank PLC", position: "Product Owner", email: "nisachol@thaibank.co.th", phone: "081-555-6666", status: "Pending" },
  { id: 10, name: "Vipawan Tech", company: "Cyber Security Ltd", position: "Security Analyst", email: "vipawan@cybersec.com", phone: "089-444-3333", status: "Checked-in" },
  { id: 11, name: "Kitipong Tan", company: "EdTech Startup", position: "Founder", email: "kitipong@edtech.com", phone: "082-999-8888", status: "Pending" },
  { id: 12, name: "Anong Suk", company: "Green Energy Corp", position: "HR Specialist", email: "anong@greenenergy.com", phone: "083-777-6666", status: "Pending" }
];

let winners = [];

function getStats() {
  const activeChecked = participants.filter(p => p.status === 'Checked-in').length;
  const activePending = participants.filter(p => p.status === 'Pending').length;
  return {
    registered: BASE_REGISTERED + participants.length,
    checked_in: BASE_CHECKED + activeChecked,
    pending: BASE_PENDING + activePending
  };
}

// REST API endpoints

// GET Participants List
app.get('/api/v1/participants', (req, res) => {
  res.json({ success: true, data: participants });
});

// GET Participant details by QR/Ticket code
app.get('/api/v1/participants/:ticket_code', (req, res) => {
  const { ticket_code } = req.params;
  let match;
  if (ticket_code.startsWith('tkt_mock_')) {
    const id = parseInt(ticket_code.replace('tkt_mock_', ''));
    match = participants.find(p => p.id === id);
  } else {
    const namePart = ticket_code.replace('tkt_', '').replace('_2026', '').replace(/_/g, ' ');
    match = participants.find(p => p.name.toLowerCase() === namePart.toLowerCase());
  }

  if (!match) {
    return res.status(404).json({ success: false, error: "TICKET_NOT_FOUND", message: "ตั๋วนี้ไม่มีข้อมูลในฐานข้อมูล" });
  }

  res.json({ success: true, data: match });
});

// POST Add Participant
app.post('/api/v1/participants', (req, res) => {
  const { name, company, position, email, phone, status } = req.body;
  if (!name || !company) {
    return res.status(400).json({ success: false, message: "Missing required fields" });
  }

  const newId = participants.length > 0 ? Math.max(...participants.map(p => p.id)) + 1 : 1;
  const newParticipant = {
    id: newId,
    name,
    company,
    position: position || '',
    email: email || '',
    phone: phone || '',
    status: status || 'Pending'
  };
  
  participants.push(newParticipant);
  
  const stats = getStats();
  io.emit('overview:update', stats);
  io.emit('participants:update', { action: 'add', data: participants });

  if (newParticipant.status === 'Checked-in') {
    io.emit('welcome:new_checkin', {
      fullname: newParticipant.name,
      company: newParticipant.company,
      timestamp: new Date().toISOString()
    });
  }

  res.status(201).json({ success: true, data: newParticipant });
});

// PUT Edit Participant
app.put('/api/v1/participants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, company, position, email, phone, status } = req.body;
  
  const p = participants.find(part => part.id === id);
  if (!p) {
    return res.status(404).json({ success: false, message: "Participant not found" });
  }

  const statusChangedToCheckin = (p.status === 'Pending' && status === 'Checked-in');
  
  p.name = name || p.name;
  p.company = company || p.company;
  p.position = position !== undefined ? position : p.position;
  p.email = email !== undefined ? email : p.email;
  p.phone = phone !== undefined ? phone : p.phone;
  p.status = status || p.status;

  const stats = getStats();
  io.emit('overview:update', stats);
  io.emit('participants:update', { action: 'edit', data: participants });

  if (statusChangedToCheckin) {
    io.emit('welcome:new_checkin', {
      fullname: p.name,
      company: p.company,
      timestamp: new Date().toISOString()
    });
  }

  res.json({ success: true, data: p });
});

// DELETE Participant
app.delete('/api/v1/participants/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const match = participants.find(p => p.id === id);
  if (!match) {
    return res.status(404).json({ success: false, message: "Participant not found" });
  }

  participants = participants.filter(part => part.id !== id);
  
  const stats = getStats();
  io.emit('overview:update', stats);
  io.emit('participants:update', { action: 'delete', data: participants });

  res.json({ success: true, message: "Deleted successfully" });
});

// POST Online Registration Endpoint
app.post('/api/v1/events/:event_id/register', (req, res) => {
  const { fullname, company, position, email, phone } = req.body;
  if (!fullname || !company) {
    return res.status(400).json({ success: false, error: "MISSING_FIELDS", message: "กรุณากรอกชื่อและบริษัท" });
  }
  const newId = participants.length > 0 ? Math.max(...participants.map(p => p.id)) + 1 : 1;
  const newParticipant = {
    id: newId,
    name: fullname,
    company: company,
    position: position || '',
    email: email || '',
    phone: phone || '',
    status: 'Pending'
  };
  participants.push(newParticipant);
  
  io.emit('overview:update', getStats());
  io.emit('participants:update', { action: 'register', data: participants });

  // Trigger digital QR ticket email delivery
  const mailRecipient = newParticipant.email || `${newParticipant.name.toLowerCase().replace(/\s+/g, '')}@example.com`;
  sendTicketEmail({ ...newParticipant, email: mailRecipient }, `tkt_mock_${newId}`);

  res.status(201).json({
    success: true,
    data: {
      participant_id: newId,
      fullname: fullname,
      ticket_code: `tkt_mock_${newId}`,
      registered_at: new Date().toISOString()
    }
  });
});

// POST Scan Check-in API
app.post('/api/v1/checkin', (req, res) => {
  const { ticket_code } = req.body;
  if (!ticket_code) {
    return res.status(400).json({ success: false, message: "Missing ticket_code" });
  }

  let match;
  if (ticket_code.startsWith('tkt_mock_')) {
    const id = parseInt(ticket_code.replace('tkt_mock_', ''));
    match = participants.find(p => p.id === id);
  } else {
    const namePart = ticket_code.replace('tkt_', '').replace('_2026', '').replace(/_/g, ' ');
    match = participants.find(p => p.name.toLowerCase() === namePart.toLowerCase());
  }

  if (!match) {
    const newId = participants.length > 0 ? Math.max(...participants.map(p => p.id)) + 1 : 1;
    match = {
      id: newId,
      name: ticket_code.replace('tkt_', '').replace('_2026', '').replace(/_/g, ' '),
      company: "Walk-in Participant",
      position: "General",
      status: "Checked-in"
    };
    participants.push(match);
  } else {
    match.status = 'Checked-in';
  }

  const stats = getStats();
  
  io.emit('welcome:new_checkin', {
    fullname: match.name,
    company: match.company,
    timestamp: new Date().toISOString()
  });
  
  io.emit('overview:update', stats);
  io.emit('participants:update', { action: 'checkin', data: participants });

  res.status(200).json({
    success: true,
    message: "Check-in recorded",
    data: {
      participant_id: match.id,
      fullname: match.name,
      company: match.company,
      checked_in_at: new Date().toISOString()
    }
  });
});

// GET Dashboard Stats
app.get('/api/v1/events/:event_id/stats', (req, res) => {
  res.json({ success: true, data: getStats() });
});

// POST Lucky Draw Spin API
app.post('/api/v1/events/:event_id/lucky-draw/spin', (req, res) => {
  const checkedInList = participants.filter(p => p.status === 'Checked-in' && !winners.includes(p.id));
  
  if (checkedInList.length === 0) {
    return res.status(400).json({ success: false, message: "ไม่มีรายชื่อผู้เช็คอินที่ลุ้นรางวัลได้เหลืออยู่" });
  }

  const winner = checkedInList[Math.floor(Math.random() * checkedInList.length)];
  winners.push(winner.id);

  // Broadcast winner event to trigger screens to spin
  io.emit('lucky-draw:winner', {
    winner_name: winner.name,
    winner_company: winner.company,
    prize_name: req.body.prize_name || "Special Prize"
  });

  res.json({
    success: true,
    data: {
      winner_id: winner.id,
      fullname: winner.name,
      company: winner.company,
      prize_name: req.body.prize_name || "Special Prize",
      drawn_at: new Date().toISOString()
    }
  });
});

// Socket.io connection setup
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('overview:update', getStats());
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3006;
server.listen(PORT, () => {
  console.log(`===================================================================`);
  console.log(` Smart Event Registration Mock Backend Server running locally`);
  console.log(` URL: http://localhost:${PORT}`);
  console.log(` ===================================================================`);
});
