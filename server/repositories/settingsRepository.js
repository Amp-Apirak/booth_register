const { query } = require('../config/db');

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
      const insertDefaultsQuery = `
        INSERT INTO settings (key, value) VALUES
          ('event_name', 'SMART EVENT REGISTRATION'),
          ('event_logo', ''),
          ('event_venue', ''),
          ('event_address', ''),
          ('event_building', ''),
          ('event_floor', ''),
          ('event_start', ''),
          ('event_end', ''),
          ('registration_hero_image', ''),
          ('registration_brochure_image', ''),
          ('registration_intro', ''),
          ('registration_objectives', ''),
          ('registration_terms', '')
        ON CONFLICT (key) DO NOTHING;
      `;
      await query(insertDefaultsQuery);
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
    if (!settings['event_name']) settings['event_name'] = 'SMART EVENT REGISTRATION';
    if (settings['event_logo'] === undefined) settings['event_logo'] = '';
    if (settings['event_venue'] === undefined) settings['event_venue'] = '';
    if (settings['event_address'] === undefined) settings['event_address'] = '';
    if (settings['event_building'] === undefined) settings['event_building'] = '';
    if (settings['event_floor'] === undefined) settings['event_floor'] = '';
    if (settings['event_start'] === undefined) settings['event_start'] = '';
    if (settings['event_end'] === undefined) settings['event_end'] = '';
    if (settings['registration_hero_image'] === undefined) settings['registration_hero_image'] = '';
    if (settings['registration_brochure_image'] === undefined) settings['registration_brochure_image'] = '';
    if (settings['registration_intro'] === undefined) settings['registration_intro'] = '';
    if (settings['registration_objectives'] === undefined) settings['registration_objectives'] = '';
    if (settings['registration_terms'] === undefined) settings['registration_terms'] = '';
    
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
