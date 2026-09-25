const organizationTypeRepository = require('../repositories/organizationTypeRepository');
const { COLOR_SLOTS } = organizationTypeRepository;

const text = (v, max) => String(v ?? '').trim().slice(0, max);

const parseType = (body) => ({
  name_th: text(body?.name_th, 150),
  name_en: text(body?.name_en, 150),
  color: COLOR_SLOTS.includes(body?.color) ? body.color : '',
  is_active: body?.is_active !== false,
});

const validate = (data) => {
  if (!data.name_th) return { error: 'NAME_TH_REQUIRED', message: 'กรุณากรอกชื่อประเภทองค์กร (ภาษาไทย)' };
  if (!data.color) return { error: 'INVALID_COLOR', message: `สีต้องเป็นหนึ่งใน ${COLOR_SLOTS.join(', ')}` };
  return null;
};

const broadcast = (req, eventId) => req.app.get('io')?.emit('organization-types:update', { event_id: eventId });

module.exports = {
  // GET /events/:event_id/organization-types  (public; ?active=true for the registration form)
  async list(req, res) {
    try {
      const data = await organizationTypeRepository.findByEvent(Number(req.params.event_id), req.query.active === 'true');
      res.json({ success: true, data });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },

  async create(req, res) {
    const data = parseType(req.body);
    const invalid = validate(data);
    if (invalid) return res.status(400).json({ success: false, ...invalid });
    try {
      const eventId = Number(req.params.event_id);
      const created = await organizationTypeRepository.create(eventId, data);
      broadcast(req, eventId);
      res.status(201).json({ success: true, data: created });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },

  async update(req, res) {
    const data = parseType(req.body);
    const invalid = validate(data);
    if (invalid) return res.status(400).json({ success: false, ...invalid });
    try {
      const eventId = Number(req.params.event_id);
      const updated = await organizationTypeRepository.update(eventId, Number(req.params.id), data);
      if (!updated) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบประเภทองค์กรนี้' });
      broadcast(req, eventId);
      res.json({ success: true, data: updated });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },

  // A type that attendees already chose cannot be deleted (their answer would be lost) — deactivate it instead
  async delete(req, res) {
    try {
      const eventId = Number(req.params.event_id);
      const id = Number(req.params.id);
      const used = await organizationTypeRepository.usageCount(id);
      if (used > 0) {
        return res.status(409).json({
          success: false, error: 'IN_USE', usage_count: used,
          message: `มีผู้เข้าร่วม ${used} คนเลือกประเภทนี้แล้ว ลบไม่ได้ — ปิดการใช้งานแทน`,
        });
      }
      const deleted = await organizationTypeRepository.delete(eventId, id);
      if (!deleted) return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'ไม่พบประเภทองค์กรนี้' });
      broadcast(req, eventId);
      res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },

  async reorder(req, res) {
    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every(Number.isInteger)) {
      return res.status(400).json({ success: false, error: 'INVALID_IDS', message: 'ids ต้องเป็นรายการรหัสประเภทองค์กร' });
    }
    try {
      const eventId = Number(req.params.event_id);
      await organizationTypeRepository.reorder(eventId, ids);
      broadcast(req, eventId);
      res.json({ success: true, data: await organizationTypeRepository.findByEvent(eventId) });
    } catch (e) { res.status(500).json({ success: false, message: e.message }); }
  },
};

/**
 * Validates the organization type sent with a participant.
 * Accepts { organization_type_id } for a listed type, or { organization_type_other } for "อื่นๆ".
 * Returns { organization_type_id, organization_type_other } or { error, message }.
 *   required     — one of the two must be given (public registration)
 *   activeOnly   — the listed type must still be active (public registration)
 */
module.exports.resolveOrganizationType = async (eventId, body, { required = false, activeOnly = false } = {}) => {
  const rawId = body?.organization_type_id;
  const other = text(body?.organization_type_other, 150);
  if (rawId !== undefined && rawId !== null && rawId !== '') {
    const id = Number(rawId);
    const type = Number.isInteger(id) ? await organizationTypeRepository.findById(eventId, id) : null;
    if (!type || (activeOnly && !type.is_active)) {
      return { error: 'INVALID_ORGANIZATION_TYPE', message: 'ประเภทองค์กรไม่ถูกต้อง' };
    }
    return { organization_type_id: id, organization_type_other: null };
  }
  if (other) return { organization_type_id: null, organization_type_other: other };
  if (required) return { error: 'ORGANIZATION_TYPE_REQUIRED', message: 'กรุณาเลือกประเภทองค์กร' };
  return { organization_type_id: null, organization_type_other: null };
};
