const settingsRepository = require('../repositories/settingsRepository');

class SettingsController {
  
  // GET /api/v1/settings (Public)
  async getSettings(req, res) {
    try {
      const settings = await settingsRepository.getSettings();
      res.status(200).json({
        success: true,
        data: settings
      });
    } catch (error) {
      console.error('Error fetching settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  // PUT /api/v1/settings (Protected)
  async updateSettings(req, res) {
    try {
      const allowedKeys = [
        'event_name',
        'event_logo',
        'event_venue',
        'event_address',
        'event_building',
        'event_floor',
        'event_start',
        'event_end',
        'registration_hero_image',
        'registration_brochure_image',
        'registration_intro',
        'registration_objectives',
        'registration_terms',
        'organizer_name',
        'contact_phone',
        'contact_email',
        'contact_line',
        'event_map_url',
        'privacy_policy'
      ];

      const updateData = {};
      for (const key of allowedKeys) {
        if (req.body[key] !== undefined) updateData[key] = req.body[key];
      }

      // The map link is rendered as an <a href>, so only allow web URLs
      if (updateData.event_map_url && !/^https?:\/\//i.test(String(updateData.event_map_url).trim())) {
        return res.status(400).json({ success: false, message: 'ลิงก์แผนที่ต้องขึ้นต้นด้วย https://' });
      }

      if (Object.keys(updateData).length > 0) {
        await settingsRepository.updateSettings(updateData);
        
        // Broadcast the update via socket so clients refresh settings immediately
        const io = req.app.get('io');
        if (io) {
          io.emit('settings:update', updateData);
        }
      }

      res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        data: updateData
      });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }
}

module.exports = new SettingsController();
