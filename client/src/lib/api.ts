// API Configuration for Smart Event Registration
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3005';

export interface Participant {
  id: number;
  name: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  status: 'Pending' | 'Checked-in';
  ticket_code?: string;
  registered_at?: string;
  profile_picture?: string;
  attendee_type?: string;
  // Organization type: a listed type (id) or free text for "อื่นๆ / Other"; both empty = not specified
  organization_type_id?: number | null;
  organization_type_other?: string | null;
  checked_in_at?: string | null;
}

// A choice on the registration form, managed in Settings → organization types
export interface OrganizationType {
  id: number;
  name_th: string;
  name_en: string;
  color: string; // chart color slot, see lib/orgTypes.ts
  sort_order: number;
  is_active: boolean;
  usage_count?: number;
}

export interface Stats {
  registered: number;
  checked_in: number;
  pending: number;
  show_up_percent?: number;
}

export interface SystemSettings {
  event_name: string;
  event_logo: string;
  event_venue: string;
  event_address: string;
  event_building: string;
  event_floor: string;
  event_start: string;
  event_end: string;
  registration_hero_image: string;
  registration_brochure_image: string;
  registration_intro: string;
  registration_objectives: string;
  registration_terms: string;
  // Footer / help (ข้อมูลทั่วไป → ข้อมูลติดต่อและผู้จัดงาน)
  organizer_name: string;
  contact_phone: string;
  contact_email: string;
  contact_line: string;
  event_map_url: string;
  privacy_policy: string;
}

export const DEFAULT_SETTINGS: SystemSettings = {
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
  organizer_name: '',
  contact_phone: '',
  contact_email: '',
  contact_line: '',
  event_map_url: '',
  privacy_policy: ''
};

// Formats event start/end into a readable date (or date range) for a locale ('th-TH' → Buddhist year)
export const formatEventDateRange = (start: string, end: string, locale = 'th-TH'): string => {
  const parse = (v: string) => {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };
  const d1 = parse(start);
  const d2 = parse(end);
  const dateStr = (d: Date) => d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  if (d1 && d2) {
    return d1.toDateString() === d2.toDateString() ? dateStr(d1) : `${dateStr(d1)} - ${dateStr(d2)}`;
  }
  return d1 ? dateStr(d1) : '';
};

// Formats event start/end into a readable time range, e.g. "08:00 - 17:00 น." (Thai) / "08:00 - 17:00"
export const formatEventTimeRange = (start: string, end: string, locale = 'th-TH'): string => {
  const timeStr = (v: string) => {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? '' : d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  const suffix = locale.startsWith('th') ? ' น.' : '';
  const s = timeStr(start);
  const e = timeStr(end);
  if (s && e) return `${s} - ${e}${suffix}`;
  return s ? `${s}${suffix}` : '';
};

// Joins the venue/building/floor/address parts into a single location string
export const formatEventLocation = (s: {
  event_venue?: string;
  event_building?: string;
  event_floor?: string;
  event_address?: string;
}): string => {
  return [s.event_venue, s.event_building, s.event_floor, s.event_address].filter(Boolean).join(', ');
};

// Winner as shown on the LED signage (socket event and public winners list)
export interface LuckyWinnerData {
  participant_id?: number;
  name: string;
  company: string;
  position?: string;
  profile_picture?: string | null;
  attendee_type?: string;
  prize_name: string;
  prize_image?: string | null;
  prize_description?: string;
  drawn_at?: string;
}

export interface LuckyDrawWinner {
  winner_id: number;
  fullname: string;
  company: string;
  prize_name: string;
  drawn_at: string;
}

export interface Prize {
  prize_id?: number;
  event_id?: number;
  name: string;
  code: string;
  description: string;
  image?: string;
  quantity: number;
  awarded_count?: number;
  remaining_count?: number;
  is_active: boolean;
  sort_order: number;
}

export interface AgendaItem {
  id?: number;
  event_id?: number;
  title: string;
  description: string;
  speaker: string;
  location: string;
  start_at: string;
  end_at: string;
  speaker_image?: string;
  is_highlight: boolean;
  sort_order?: number;
}

// Helper to get auth headers securely
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('staff_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

// Interceptor helper to handle 401 Unauthorized
const handleResponse = async (res: Response) => {
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('staff_token');
      localStorage.removeItem('staff_user');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    throw new Error(`API Error: ${res.status}`);
  }
  return res.json();
};

// API Helper Functions
export const api = {
  // Get all participants
  async getParticipants(): Promise<Participant[]> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/participants`, { headers: getAuthHeaders() });
      const data = await handleResponse(res);
      return data.data || [];
    } catch {
      return [];
    }
  },

  // Get participant by ticket code
  async getParticipantByTicket(ticketCode: string): Promise<Participant | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/participants/${ticketCode}`, { headers: getAuthHeaders() });
      const data = await handleResponse(res);
      return data.data || null;
    } catch {
      return null;
    }
  },

  // Register new participant (Public Route - No Auth)
  async register(data: {
    fullname: string;
    company: string;
    position?: string;
    email?: string;
    phone?: string;
    profile_picture?: string;
    attendee_type?: string;
    organization_type_id?: number | null;
    organization_type_other?: string | null;
  }): Promise<{ participant_id: number; ticket_code: string } | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) return null;
      const result = await res.json();
      return result.data || null;
    } catch {
      return null;
    }
  },

  // Check-in participant
  async checkIn(ticketCode: string): Promise<Participant | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/checkin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ ticket_code: ticketCode }),
      });
      const data = await handleResponse(res);
      return data.data || null;
    } catch {
      return null;
    }
  },

  // Get event stats
  async getStats(): Promise<Stats> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/stats`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        return { registered: 0, checked_in: 0, pending: 0 };
      }
      const data = await handleResponse(res);
      return data.data || { registered: 0, checked_in: 0, pending: 0 };
    } catch {
      return { registered: 0, checked_in: 0, pending: 0 };
    }
  },

  // Get system settings
  async getSettings(): Promise<SystemSettings> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/settings`);
      const data = await res.json();
      return { ...DEFAULT_SETTINGS, ...(data.data || {}) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  },

  // Update system settings (Staff only)
  async updateSettings(settings: Partial<SystemSettings>): Promise<{ success: boolean; message?: string }> {
    const res = await fetch(`${API_BASE}/api/v1/settings`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(settings),
    });
    return handleResponse(res);
  },

  async getAgenda(): Promise<AgendaItem[]> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/agenda`);
      const data = await handleResponse(res);
      return data.data || [];
    } catch {
      return [];
    }
  },

  async replaceAgenda(items: AgendaItem[]): Promise<AgendaItem[]> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/agenda`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ items }),
    });
    if (res.status === 401) return handleResponse(res);
    if (res.status === 404) {
      throw new Error('ไม่พบ Agenda API กรุณา restart backend แล้วลองอีกครั้ง');
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(data?.message || `บันทึกกำหนดการไม่สำเร็จ (HTTP ${res.status})`);
    }
    return data.data || [];
  },

  // Get eligible participants for lucky draw (Public)
  async getEligibleLuckyDraw(): Promise<Participant[]> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/lucky-draw/eligible`);
      const data = await handleResponse(res);
      return data.data || [];
    } catch {
      return [];
    }
  },

  // Lucky Draw Spin
  async luckyDrawSpin(prizeName: string): Promise<LuckyDrawWinner | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/lucky-draw/spin`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ prize_name: prizeName }),
      });
      const data = await handleResponse(res);
      return data.data || null;
    } catch {
      return null;
    }
  },

  // Public: past winners (newest last), used by the LED signage
  async getLuckyDrawWinners(): Promise<LuckyWinnerData[]> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/lucky-draw/winners`);
      const data = await handleResponse(res);
      return data.data || [];
    } catch {
      return [];
    }
  },

  // Organization types (public list; staff-only changes). Throws with the server's message on failure.
  async getOrganizationTypes(activeOnly = false): Promise<OrganizationType[]> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/events/1/organization-types${activeOnly ? '?active=true' : ''}`);
      const data = await handleResponse(res);
      return data.data || [];
    } catch {
      return [];
    }
  },

  async saveOrganizationType(type: Pick<OrganizationType, 'name_th' | 'name_en' | 'color' | 'is_active'> & { id?: number }): Promise<OrganizationType> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/organization-types${type.id ? `/${type.id}` : ''}`, {
      method: type.id ? 'PUT' : 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(type),
    });
    if (res.status === 401) await handleResponse(res);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw Object.assign(new Error(data.message || `API Error: ${res.status}`), { code: data.error });
    return data.data;
  },

  async deleteOrganizationType(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/organization-types/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (res.status === 401) await handleResponse(res);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw Object.assign(new Error(data.message || `API Error: ${res.status}`), { code: data.error, usage: data.usage_count });
  },

  async reorderOrganizationTypes(ids: number[]): Promise<OrganizationType[]> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/organization-types/reorder`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ ids }) });
    if (res.status === 401) await handleResponse(res);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw Object.assign(new Error(data.message || `API Error: ${res.status}`), { code: data.error });
    return data.data || [];
  },

  async getPrizes(activeOnly = false): Promise<Prize[]> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/prizes${activeOnly ? '?active=true' : ''}`);
    const data = await handleResponse(res);
    return data.data || [];
  },

  // Save a new draw order (prize ids, first = ลำดับที่ 1)
  async reorderPrizes(prizeIds: number[]): Promise<Prize[]> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/prizes/reorder`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify({ prize_ids: prizeIds }) });
    const data = await handleResponse(res);
    return data.data || [];
  },

  // Excel import: updates prizes matched by code/name, creates the rest. Throws with the server's message.
  async importPrizes(rows: { row: number; sort_order: number; name: string; code: string; description: string; quantity: number; is_active: boolean; image: string }[]): Promise<{ created: number; updated: number }> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/prizes/import`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify({ prizes: rows }) });
    if (res.status === 401) await handleResponse(res);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || `API Error: ${res.status}`);
    return data.data;
  },

  async createPrize(prize: Prize): Promise<Prize> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/prizes`, { method: 'POST', headers: getAuthHeaders(), body: JSON.stringify(prize) });
    const data = await handleResponse(res);
    return data.data;
  },

  async updatePrize(id: number, prize: Prize): Promise<Prize> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/prizes/${id}`, { method: 'PUT', headers: getAuthHeaders(), body: JSON.stringify(prize) });
    const data = await handleResponse(res);
    return data.data;
  },

  async deletePrize(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/events/1/prizes/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    await handleResponse(res);
  },

  // Add participant manually
  // Bulk import participants (Staff CMS). Throws with the server's message on failure.
  async importParticipants(rows: { row: number; name: string; company: string; position?: string; email?: string; phone?: string; attendee_type?: string; organization_type?: string }[]): Promise<{
    imported_count: number;
    skipped_count: number;
    skipped: { row: number; reason: string }[];
  }> {
    const res = await fetch(`${API_BASE}/api/v1/participants/import`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ participants: rows }),
    });
    if (res.status === 401) await handleResponse(res);
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) throw new Error(data.message || `API Error: ${res.status}`);
    return data.data;
  },

  async addParticipant(data: {
    name: string;
    company: string;
    position?: string;
    email?: string;
    phone?: string;
    status?: string;
    profile_picture?: string;
    attendee_type?: string;
    organization_type_id?: number | null;
    organization_type_other?: string | null;
  }): Promise<Participant | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/participants`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result = await handleResponse(res);
      return result.data || null;
    } catch {
      return null;
    }
  },

  // Edit participant
  async editParticipant(id: number, data: Partial<Participant>): Promise<Participant | null> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/participants/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      const result = await handleResponse(res);
      return result.data || null;
    } catch {
      return null;
    }
  },

  // Delete participant
  async deleteParticipant(id: number): Promise<boolean> {
    try {
      const res = await fetch(`${API_BASE}/api/v1/participants/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await handleResponse(res);
      return true;
    } catch {
      return false;
    }
  },
};

export default api;
