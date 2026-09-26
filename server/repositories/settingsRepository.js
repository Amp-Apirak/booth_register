const { query } = require('../config/db');

// Value of every setting on a new system, and after "reset to defaults" (Settings, ADR-0017)
const DEFAULT_SETTINGS = {
  event_name: 'SMART EVENT REGISTRATION',
  event_logo: '',
  event_venue: '',
  event_address: '',
  event_building: '',
  event_floor: '',
  event_start: '',
  event_end: '',
  registration_hero_image: '',
  registration_brochure_image: '',
  registration_intro: '',
  registration_objectives: '',
  registration_terms: '',
  // Footer: organizer, attendee help contacts, map link and privacy policy
  organizer_name: '',
  contact_phone: '',
  contact_email: '',
  contact_line: '',
  event_map_url: '',
  privacy_policy: '',
};

// The settings each Settings tab edits (and resets)
const SETTINGS_GROUPS = {
  general: [
    'event_name', 'event_logo', 'event_venue', 'event_address', 'event_building', 'event_floor', 'event_start', 'event_end',
    'organizer_name', 'contact_phone', 'contact_email', 'contact_line', 'event_map_url', 'privacy_policy',
  ],
  registration: ['registration_hero_image', 'registration_brochure_image', 'registration_intro', 'registration_objectives', 'registration_terms'],
};

class SettingsRepository {
  /**
   * Initializes the settings table and default values if not exists
   */
  async initTable() {
    try {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS settings (
          key VARCHAR(50) PRIMARY KEY,
          value TEXT NOT NULL
        );
      `;
      await query(createTableQuery);

      // Insert defaults if not exist
      const entries = Object.entries(DEFAULT_SETTINGS);
      const rows = entries.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(', ');
      await query(`INSERT INTO settings (key, value) VALUES ${rows} ON CONFLICT (key) DO NOTHING`, entries.flat());
      console.log('✅ Settings table initialized.');
    } catch (error) {
      console.error('❌ Failed to initialize settings table:', error.message);
      throw error;
    }
  }

  /**
   * Gets all settings as a key-value object
   */
  async getSettings() {
    const text = 'SELECT key, value FROM settings';
    const result = await query(text);

    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    // Fallbacks just in case
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
      if (settings[key] === undefined) settings[key] = value;
    }
    if (!settings.event_name) settings.event_name = DEFAULT_SETTINGS.event_name;

    return settings;
  }

  /**
   * Updates multiple settings
   * @param {Object} settingsObj - Key-value pairs of settings to update
   */
  async updateSettings(settingsObj) {
    const keys = Object.keys(settingsObj);
    if (keys.length === 0) return true;

    for (const key of keys) {
      const text = `
        INSERT INTO settings (key, value) 
        VALUES ($1, $2) 
        ON CONFLICT (key) DO UPDATE SET value = $2
      `;
      await query(text, [key, settingsObj[key]]);
    }
    
    return true;
  }
}

module.exports = new SettingsRepository();
module.exports.DEFAULT_SETTINGS = DEFAULT_SETTINGS;
module.exports.SETTINGS_GROUPS = SETTINGS_GROUPS;
