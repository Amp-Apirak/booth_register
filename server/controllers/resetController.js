const resetService = require('../services/resetService');
const { SECTIONS } = resetService;
const { getStatsSummary } = require('./participantController');
const { broadcastParticipants } = require('../utils/realtime');

const eventIdOf = (req) => {
  const id = Number(req.params.event_id);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const notFound = (res) => res.status(404).json({ success: false, error: 'EVENT_NOT_FOUND', message: 'ไม่พบงานนี้' });

module.exports = {
  // GET /events/:event_id/reset-summary (Admin): counts shown in the reset confirmation popups
  async summary(req, res) {
    try {
      const eventId = eventIdOf(req);
      const data = eventId && await resetService.summary(eventId);
      if (!data) return notFound(res);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error reading reset summary:', error);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Internal server error' });
    }
  },

  // POST /events/:event_id/reset (Admin) { sections: ['general' | 'registration' | 'organizations' | 'agenda' | 'prizes' | 'attendees'] }
  async reset(req, res) {
    const eventId = eventIdOf(req);
    if (!eventId) return notFound(res);
    const requested = Array.isArray(req.body?.sections) ? req.body.sections : [];
    const sections = SECTIONS.filter((section) => requested.includes(section));
    if (sections.length === 0 || sections.length !== new Set(requested).size) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_SECTIONS',
        message: `sections ต้องเป็นรายการจาก: ${SECTIONS.join(', ')}`,
      });
    }

    try {
      const result = await resetService.reset(eventId, sections);
      console.log(`🧹 Reset by ${req.user?.username || 'unknown'} (event ${eventId}): ${sections.join(', ')}`, result.removed);

      // Screens that are open (LED, registration page, dashboards) show the defaults straight away
      const io = req.app.get('io');
      if (io) {
        if (Object.keys(result.settings).length > 0) io.emit('settings:update', result.settings);
        if (sections.includes('agenda')) io.emit('agenda:update', { event_id: eventId, items: [] });
        if (sections.includes('prizes')) io.emit('prizes:update', { event_id: eventId });
        if (sections.includes('organizations')) io.emit('organization-types:update', { event_id: eventId });
        if (sections.includes('attendees')) io.emit('overview:update', await getStatsSummary());
        if (sections.includes('attendees') || sections.includes('organizations')) await broadcastParticipants(io, 'reset');
        io.emit('data:reset', { event_id: eventId, sections });
      }

      res.json({ success: true, data: result });
    } catch (error) {
      if (error.message === 'EVENT_NOT_FOUND') return notFound(res);
      console.error('Error resetting data:', error);
      res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'Internal server error' });
    }
  },
};
