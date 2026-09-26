const luckyDrawService = require('../services/luckyDrawService');

const SPIN_MESSAGES = {
  PRIZE_NAME_REQUIRED: 'กรุณาระบุชื่อรางวัลที่จะจับสลาก',
  PRIZE_NOT_FOUND: 'ไม่พบของรางวัลนี้ในระบบ',
  PRIZE_INACTIVE: 'ของรางวัลนี้ปิดการสุ่มอยู่',
  PRIZE_SOLD_OUT: 'ของรางวัลนี้แจกครบจำนวนแล้ว',
  NO_ELIGIBLE_PARTICIPANTS: 'ไม่มีผู้มีสิทธิ์เหลือในกองสุ่มรางวัล'
};

/**
 * Express Controller for Lucky Draw Operations (REQ-06)
 */
class LuckyDrawController {
  /**
   * Spins the lucky draw wheel and picks a random winner.
   */
  async spin(req, res) {
    try {
      const eventId = parseInt(req.params.event_id) || 1;
      const { prize_name } = req.body;

      if (!prize_name) {
        return res.status(400).json({
          success: false,
          error: 'PRIZE_NAME_REQUIRED',
          message: 'กรุณาระบุชื่อรางวัลที่จะจับสลาก'
        });
      }

      const winner = await luckyDrawService.spin(eventId, prize_name);

      // Broadcast to Signage TV screens via WebSocket
      const io = req.app.get('io');
      if (io) {
        io.emit('luckydraw:spin', {
          winner_name: winner.name,
          winner_company: winner.company,
          prize_name: winner.prize_name
        });
        io.emit('luckydraw:winner_announced', winner);
      }

      return res.json({
        success: true,
        message: `ยินดีด้วย ${winner.name} ได้รับรางวัล "${winner.prize_name}"`,
        data: winner
      });
    } catch (err) {
      if (SPIN_MESSAGES[err.message]) {
        return res.status(400).json({ success: false, error: err.message, message: SPIN_MESSAGES[err.message] });
      }
      console.error('LuckyDraw spin error:', err.message);
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: 'เกิดข้อผิดพลาดภายในระบบ' });
    }
  }

  /**
   * Returns all winners for an event.
   */
  async getWinners(req, res) {
    try {
      const eventId = parseInt(req.params.event_id) || 1;
      const winners = await luckyDrawService.getWinners(eventId);
      return res.json({ success: true, data: winners });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }

  /**
   * Returns eligible participants
   */
  async getEligible(req, res) {
    try {
      const eventId = parseInt(req.params.event_id) || 1;
      const eligible = await luckyDrawService.getEligibleParticipants(eventId);
      return res.json({ success: true, data: eligible });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: err.message });
    }
  }
}

module.exports = new LuckyDrawController();
