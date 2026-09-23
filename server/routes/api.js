const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const luckyDrawController = require('../controllers/luckyDrawController');
const authController = require('../controllers/authController');
const settingsController = require('../controllers/settingsController');
const agendaController = require('../controllers/agendaController');
const prizeController = require('../controllers/prizeController');
const { verifyToken } = require('../middlewares/authMiddleware');

// ─────────────────────────────────────────────────
// Auth Routes
// ─────────────────────────────────────────────────
router.post('/login', authController.login);

// ─────────────────────────────────────────────────
// REQ-01, REQ-02, REQ-03: Self-Registration + PDPA Consent + QR Ticket Email
// ─────────────────────────────────────────────────
// Public Route (No Token Required)
router.post('/events/:event_id/register', (req, res) => participantController.register(req, res));

// Public Route (Used by LED Signage)
router.get('/events/:event_id/stats', (req, res) => participantController.getStats(req, res));

// ─────────────────────────────────────────────────
// Staff CMS: CRUD Participants & Lookup
// Protected Routes
// ─────────────────────────────────────────────────
router.get('/participants', verifyToken, (req, res) => participantController.getAll(req, res));
router.post('/participants', verifyToken, (req, res) => participantController.createManual(req, res));
router.post('/participants/import', verifyToken, (req, res) => participantController.importBulk(req, res));
router.get('/participants/:ticket_code', verifyToken, (req, res) => participantController.getByTicketCode(req, res));
router.put('/participants/:id', verifyToken, (req, res) => participantController.update(req, res));
router.delete('/participants/:id', verifyToken, (req, res) => participantController.delete(req, res));

// ─────────────────────────────────────────────────
// REQ-04, REQ-05: Barcode Scanner Check-in Gate
// Protected Route
// ─────────────────────────────────────────────────
router.post('/checkin', verifyToken, (req, res) => participantController.checkIn(req, res));

// ─────────────────────────────────────────────────
// REQ-06: Lucky Draw Spin & Winners List
// Protected Routes
// ─────────────────────────────────────────────────
router.post('/events/:event_id/lucky-draw/spin', (req, res) => luckyDrawController.spin(req, res));
router.get('/events/:event_id/lucky-draw/winners', (req, res) => luckyDrawController.getWinners(req, res));
router.get('/events/:event_id/lucky-draw/eligible', (req, res) => luckyDrawController.getEligible(req, res));
router.get('/events/:event_id/prizes', (req, res) => prizeController.list(req, res));
router.post('/events/:event_id/prizes', verifyToken, (req, res) => prizeController.create(req, res));
router.put('/events/:event_id/prizes/reorder', verifyToken, (req, res) => prizeController.reorder(req, res));
router.post('/events/:event_id/prizes/import', verifyToken, (req, res) => prizeController.importMany(req, res));
router.put('/events/:event_id/prizes/:prize_id', verifyToken, (req, res) => prizeController.update(req, res));
router.delete('/events/:event_id/prizes/:prize_id', verifyToken, (req, res) => prizeController.delete(req, res));

// ─────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────
router.get('/settings', (req, res) => settingsController.getSettings(req, res));
router.put('/settings', verifyToken, (req, res) => settingsController.updateSettings(req, res));

// Event Agenda: public display feed + protected back-office replacement
router.get('/events/:event_id/agenda', (req, res) => agendaController.getByEvent(req, res));
router.put('/events/:event_id/agenda', verifyToken, (req, res) => agendaController.replaceForEvent(req, res));

module.exports = router;
