const agendaRepository = require('../repositories/agendaRepository');

const isValidDate = (value) => Boolean(value) && !Number.isNaN(new Date(value).getTime());

class AgendaController {
  async getByEvent(req, res) {
    try {
      const eventId = Number.parseInt(req.params.event_id, 10) || 1;
      const items = await agendaRepository.getByEvent(eventId);
      return res.json({ success: true, data: items });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }

  async replaceForEvent(req, res) {
    try {
      const eventId = Number.parseInt(req.params.event_id, 10) || 1;
      const items = req.body.items;

      if (!Array.isArray(items)) {
        return res.status(400).json({ success: false, error: 'AGENDA_ITEMS_REQUIRED', message: 'กรุณาส่งรายการกำหนดการ' });
      }

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        if (!item.title || !isValidDate(item.start_at) || !isValidDate(item.end_at)) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_AGENDA_ITEM',
            message: `ข้อมูลกำหนดการแถวที่ ${index + 1} ไม่ครบถ้วน`,
          });
        }
        if (new Date(item.end_at) <= new Date(item.start_at)) {
          return res.status(400).json({
            success: false,
            error: 'INVALID_AGENDA_TIME_RANGE',
            message: `เวลาสิ้นสุดของแถวที่ ${index + 1} ต้องอยู่หลังเวลาเริ่ม`,
          });
        }
      }

      const saved = await agendaRepository.replaceForEvent(eventId, items);
      const io = req.app.get('io');
      if (io) io.emit('agenda:update', { event_id: eventId, items: saved });

      return res.json({ success: true, data: saved, message: 'บันทึกกำหนดการเรียบร้อยแล้ว' });
    } catch (error) {
      return res.status(500).json({ success: false, error: 'SERVER_ERROR', message: error.message });
    }
  }
}

module.exports = new AgendaController();
