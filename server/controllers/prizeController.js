const prizeRepository = require('../repositories/prizeRepository');

const parsePrize = (body) => ({
  name: String(body.name || '').trim(),
  code: String(body.code || '').trim(),
  description: String(body.description || '').trim(),
  image: body.image || '',
  quantity: Number(body.quantity),
  is_active: body.is_active !== false,
  sort_order: Number(body.sort_order) || 0
});

const validate = (data) => {
  if (!data.name) return 'กรุณากรอกชื่อของรางวัล';
  if (!Number.isInteger(data.quantity) || data.quantity < 1) return 'จำนวนรางวัลต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป';
  if (data.image && !String(data.image).startsWith('data:image/') && !String(data.image).startsWith('http')) return 'รูปภาพต้องเป็นไฟล์รูปหรือ URL ที่ถูกต้อง';
  return null;
};

module.exports = {
  async list(req, res) {
    try { res.json({ success: true, data: await prizeRepository.findByEvent(Number(req.params.event_id), req.query.active === 'true') }); }
    catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },
  async create(req, res) {
    const data = parsePrize(req.body); const error = validate(data);
    if (error) return res.status(400).json({ success: false, message: error });
    try {
      const prize = await prizeRepository.create(Number(req.params.event_id), data);
      req.app.get('io')?.emit('prizes:update', { event_id: Number(req.params.event_id) });
      res.status(201).json({ success: true, data: prize });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async update(req, res) {
    const data = parsePrize(req.body); const error = validate(data);
    if (error) return res.status(400).json({ success: false, message: error });
    try {
      const prize = await prizeRepository.update(Number(req.params.event_id), Number(req.params.prize_id), data);
      if (!prize) return res.status(404).json({ success: false, message: 'ไม่พบของรางวัล' });
      req.app.get('io')?.emit('prizes:update', { event_id: Number(req.params.event_id) });
      res.json({ success: true, data: prize });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async reorder(req, res) {
    const ids = req.body?.prize_ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(id => Number.isInteger(id))) {
      return res.status(400).json({ success: false, message: 'prize_ids ต้องเป็นรายการรหัสของรางวัล' });
    }
    try {
      const eventId = Number(req.params.event_id);
      await prizeRepository.reorder(eventId, ids);
      req.app.get('io')?.emit('prizes:update', { event_id: eventId });
      res.json({ success: true, data: await prizeRepository.findByEvent(eventId) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async importMany(req, res) {
    const input = req.body?.prizes;
    if (!Array.isArray(input) || input.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบข้อมูลสำหรับนำเข้า' });
    if (input.length > 500) return res.status(400).json({ success: false, message: 'นำเข้าได้สูงสุด 500 รายการต่อครั้ง' });
    const rows = [];
    for (let i = 0; i < input.length; i++) {
      const data = { ...parsePrize(input[i]), sort_order: Number(input[i]?.sort_order) || 0 };
      const error = validate(data);
      if (error) return res.status(400).json({ success: false, message: `แถวที่ ${input[i]?.row ?? i + 2}: ${error}` });
      rows.push(data);
    }
    try {
      const eventId = Number(req.params.event_id);
      const result = await prizeRepository.importMany(eventId, rows);
      req.app.get('io')?.emit('prizes:update', { event_id: eventId });
      res.json({ success: true, data: result });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
  async delete(req, res) {
    try {
      const prize = await prizeRepository.delete(Number(req.params.event_id), Number(req.params.prize_id));
      if (!prize) return res.status(404).json({ success: false, message: 'ไม่พบของรางวัล' });
      req.app.get('io')?.emit('prizes:update', { event_id: Number(req.params.event_id) });
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  }
};
