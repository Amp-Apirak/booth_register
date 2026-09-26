const express = require('express');
const router = express.Router();
const participantController = require('../controllers/participantController');
const luckyDrawController = require('../controllers/luckyDrawController');
const authController = require('../controllers/authController');
const settingsController = require('../controllers/settingsController');
const agendaController = require('../controllers/agendaController');
const prizeController = require('../controllers/prizeController');
const organizationTypeController = require('../controllers/organizationTypeController');
const resetController = require('../controllers/resetController');
const { verifyToken, requireRole } = require('../middlewares/authMiddleware');

// Access levels (ADR-0015): public · staff (any login: Admin or Staff) · admin (Admin only)
const staff = verifyToken;
const admin = [verifyToken, requireRole('Admin')];

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

// Public: an attendee finds their own ticket with the ticket code + last 4 digits of their phone (or their email)
router.post('/tickets/lookup', (req, res) => participantController.lookupTicket(req, res));

// ─────────────────────────────────────────────────
// Staff CMS: CRUD Participants & Lookup
// Protected Routes
// ─────────────────────────────────────────────────
router.get('/participants', staff, (req, res) => participantController.getAll(req, res));
router.post('/participants', staff, (req, res) => participantController.createManual(req, res));
router.post('/participants/import', admin, (req, res) => participantController.importBulk(req, res));
router.get('/participants/:ticket_code', staff, (req, res) => participantController.getByTicketCode(req, res));
router.put('/participants/:id', staff, (req, res) => participantController.update(req, res));
router.delete('/participants/:id', admin, (req, res) => participantController.delete(req, res));

// ─────────────────────────────────────────────────
// REQ-04, REQ-05: Barcode Scanner Check-in Gate
// Protected Route
// ─────────────────────────────────────────────────
router.post('/checkin', staff, (req, res) => participantController.checkIn(req, res));

// ─────────────────────────────────────────────────
// REQ-06: Lucky Draw Spin & Winners List
// Spinning and the eligible list need a staff login; the winners list is public (LED screen)
// ─────────────────────────────────────────────────
router.post('/events/:event_id/lucky-draw/spin', staff, (req, res) => luckyDrawController.spin(req, res));
router.get('/events/:event_id/lucky-draw/winners', (req, res) => luckyDrawController.getWinners(req, res)); // public: the LED shows winners
router.get('/events/:event_id/lucky-draw/eligible', staff, (req, res) => luckyDrawController.getEligible(req, res));
// Organization types (registration form choice; staff manage them in Settings)
router.get('/events/:event_id/organization-types', (req, res) => organizationTypeController.list(req, res));
router.post('/events/:event_id/organization-types', admin, (req, res) => organizationTypeController.create(req, res));
router.put('/events/:event_id/organization-types/reorder', admin, (req, res) => organizationTypeController.reorder(req, res));
router.put('/events/:event_id/organization-types/:id', admin, (req, res) => organizationTypeController.update(req, res));
router.delete('/events/:event_id/organization-types/:id', admin, (req, res) => organizationTypeController.delete(req, res));

router.get('/events/:event_id/prizes', (req, res) => prizeController.list(req, res));
router.post('/events/:event_id/prizes', admin, (req, res) => prizeController.create(req, res));
router.put('/events/:event_id/prizes/reorder', admin, (req, res) => prizeController.reorder(req, res));
router.post('/events/:event_id/prizes/import', admin, (req, res) => prizeController.importMany(req, res));
router.put('/events/:event_id/prizes/:prize_id', admin, (req, res) => prizeController.update(req, res));
router.delete('/events/:event_id/prizes/:prize_id', admin, (req, res) => prizeController.delete(req, res));

// ─────────────────────────────────────────────────
// Settings
// ─────────────────────────────────────────────────
router.get('/settings', (req, res) => settingsController.getSettings(req, res));
router.put('/settings', admin, (req, res) => settingsController.updateSettings(req, res));

// Event Agenda: public display feed + protected back-office replacement
router.get('/events/:event_id/agenda', (req, res) => agendaController.getByEvent(req, res));
router.put('/events/:event_id/agenda', admin, (req, res) => agendaController.replaceForEvent(req, res));

// Backup & reset (Settings → สำรองและรีเซ็ต, ADR-0017): back to a new event's defaults
router.get('/events/:event_id/reset-summary', admin, (req, res) => resetController.summary(req, res));
router.post('/events/:event_id/reset', admin, (req, res) => resetController.reset(req, res));

module.exports = router;
