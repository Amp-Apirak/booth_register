// Analytics aggregation for the dashboard charts and the printed report.
// Pure functions (no React) so they can be unit-tested with `node --test`.
// All day/hour buckets use the browser's local time zone (Asia/Bangkok at the event).
import type { OrganizationType, Participant } from './api';
import { participantOrgKey, type OrgKey } from './orgTypes.ts'; // explicit extension: also loaded by `node --test`

export type StatusFilter = 'all' | 'checked' | 'pending';
export type AttendeeFilter = 'all' | 'General' | 'VIP';

export interface AnalyticsFilters {
  search: string;
  orgKeys: OrgKey[]; // empty = every organization type
  status: StatusFilter;
  attendeeType: AttendeeFilter;
  from: string; // registered at or after (datetime-local "YYYY-MM-DDTHH:mm"), '' = open
  to: string; // registered at or before, '' = open
  day: string; // cross-filter from the trend chart: registration day "YYYY-MM-DD", '' = none
  hour: number | null; // cross-filter from the check-in chart: check-in hour 0–23
}

export const EMPTY_FILTERS: AnalyticsFilters = {
  search: '', orgKeys: [], status: 'all', attendeeType: 'all', from: '', to: '', day: '', hour: null,
};

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar day "YYYY-MM-DD" */
export const dayKey = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local "YYYY-MM-DDTHH:mm" (the value format of <input type="datetime-local">) */
export const localInputValue = (d: Date): string => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

const parseDate = (v: string | null | undefined): Date | null => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const isCheckedIn = (p: Pick<Participant, 'status'>) => p.status === 'Checked-in';

export function applyFilters(participants: Participant[], f: AnalyticsFilters): Participant[] {
  const q = f.search.trim().toLowerCase();
  const orgSet = new Set(f.orgKeys);
  const from = parseDate(f.from);
  const to = parseDate(f.to);
  return participants.filter((p) => {
    if (q) {
      const hay = [p.name, p.company, p.position, p.email, p.phone, p.ticket_code, p.organization_type_other]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (orgSet.size && !orgSet.has(participantOrgKey(p))) return false;
    if (f.status === 'checked' && !isCheckedIn(p)) return false;
    if (f.status === 'pending' && isCheckedIn(p)) return false;
    if (f.attendeeType !== 'all' && (p.attendee_type || 'General') !== f.attendeeType) return false;
    const reg = parseDate(p.registered_at);
    if ((from || to || f.day) && !reg) return false;
    if (reg && from && reg < from) return false;
    if (reg && to && reg > to) return false;
    if (reg && f.day && dayKey(reg) !== f.day) return false;
    if (f.hour !== null) {
      const ci = parseDate(p.checked_in_at);
      if (!ci || ci.getHours() !== f.hour) return false;
    }
    return true;
  });
}

export interface Kpis {
  registered: number;
  checkedIn: number;
  pending: number;
  showUpRate: number; // 0–100, one decimal
  vip: number;
  organizations: number; // distinct company names
  peakHour: { hour: number; count: number } | null;
}

export function kpis(participants: Participant[]): Kpis {
  const registered = participants.length;
  const checkedIn = participants.filter(isCheckedIn).length;
  const companies = new Set(participants.map((p) => (p.company || '').trim().toLowerCase()).filter(Boolean));
  const hours = checkinsByHour(participants);
  const peak = hours.reduce<{ hour: number; count: number } | null>((best, h) => (h.count > (best?.count ?? 0) ? h : best), null);
  return {
    registered,
    checkedIn,
    pending: registered - checkedIn,
    showUpRate: registered ? Math.round((checkedIn / registered) * 1000) / 10 : 0,
    vip: participants.filter((p) => p.attendee_type === 'VIP').length,
    organizations: companies.size,
    peakHour: peak,
  };
}

export interface OrgRow {
  key: OrgKey;
  registered: number;
  checkedIn: number;
  share: number; // % of all registered in the current slice
  showUpRate: number; // % of this group that checked in
}

/**
 * One row per organization type in the configured order (types with nobody still appear, so
 * gaps are visible), then "Other" and "Not specified" only when someone is in them.
 */
export function byOrgType(participants: Participant[], types: OrganizationType[]): OrgRow[] {
  const counts = new Map<OrgKey, { registered: number; checkedIn: number }>();
  for (const p of participants) {
    const key = participantOrgKey(p);
    const c = counts.get(key) ?? { registered: 0, checkedIn: 0 };
    c.registered += 1;
    if (isCheckedIn(p)) c.checkedIn += 1;
    counts.set(key, c);
  }
  const total = participants.length;
  const row = (key: OrgKey): OrgRow => {
    const c = counts.get(key) ?? { registered: 0, checkedIn: 0 };
    return {
      key,
      ...c,
      share: total ? Math.round((c.registered / total) * 1000) / 10 : 0,
      showUpRate: c.registered ? Math.round((c.checkedIn / c.registered) * 1000) / 10 : 0,
    };
  };
  const ordered = [...types].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
  const rows = ordered.filter((t) => t.is_active || counts.has(t.id)).map((t) => row(t.id));
  // participants whose type was deleted fall back to "not specified" in participantOrgKey order
  for (const key of counts.keys()) {
    if (typeof key === 'number' && !ordered.some((t) => t.id === key)) rows.push(row(key));
  }
  if (counts.has('other')) rows.push(row('other'));
  if (counts.has('none')) rows.push(row('none'));
  return rows;
}

export interface DayPoint {
  day: string; // YYYY-MM-DD
  count: number; // registrations that day
  cumulative: number;
}

/** Registrations per day, every day from the first to the last registration (gaps filled with 0) */
export function registrationsByDay(participants: Participant[]): DayPoint[] {
  const perDay = new Map<string, number>();
  for (const p of participants) {
    const d = parseDate(p.registered_at);
    if (d) perDay.set(dayKey(d), (perDay.get(dayKey(d)) ?? 0) + 1);
  }
  if (!perDay.size) return [];
  const days = [...perDay.keys()].sort();
  const [y, m, d] = days[0].split('-').map(Number);
  const cursor = new Date(y, m - 1, d);
  const last = days[days.length - 1];
  const out: DayPoint[] = [];
  let cumulative = 0;
  for (let guard = 0; guard < 3660; guard++) {
    const key = dayKey(cursor);
    const count = perDay.get(key) ?? 0;
    cumulative += count;
    out.push({ day: key, count, cumulative });
    if (key === last) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export interface HourPoint {
  hour: number;
  count: number;
}

/** Check-ins per clock hour, from the earliest to the latest hour with a check-in (gaps filled) */
export function checkinsByHour(participants: Participant[]): HourPoint[] {
  const perHour = new Array<number>(24).fill(0);
  let min = 24;
  let max = -1;
  for (const p of participants) {
    const d = parseDate(p.checked_in_at);
    if (!d) continue;
    const h = d.getHours();
    perHour[h] += 1;
    min = Math.min(min, h);
    max = Math.max(max, h);
  }
  if (max < 0) return [];
  return perHour.slice(min, max + 1).map((count, i) => ({ hour: min + i, count }));
}

export interface CompanyRow {
  company: string;
  registered: number;
  checkedIn: number;
}

/** Organizations with the most registrations (company names compared case/space-insensitively) */
export function topCompanies(participants: Participant[], limit = 10): CompanyRow[] {
  const map = new Map<string, CompanyRow>();
  for (const p of participants) {
    const name = (p.company || '').trim().replace(/\s+/g, ' ');
    if (!name) continue;
    const key = name.toLowerCase();
    const row = map.get(key) ?? { company: name, registered: 0, checkedIn: 0 };
    row.registered += 1;
    if (isCheckedIn(p)) row.checkedIn += 1;
    map.set(key, row);
  }
  return [...map.values()]
    .sort((a, b) => b.registered - a.registered || b.checkedIn - a.checkedIn || a.company.localeCompare(b.company))
    .slice(0, limit);
}

export interface FunnelStage {
  stage: 'registered' | 'checkedIn' | 'winners';
  count: number;
  ofPrevious: number | null; // % of the previous stage
}

export function funnel(participants: Participant[], winnerIds: Set<number>): FunnelStage[] {
  const registered = participants.length;
  const checkedIn = participants.filter(isCheckedIn).length;
  const winners = participants.filter((p) => winnerIds.has(p.id)).length;
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : null);
  return [
    { stage: 'registered', count: registered, ofPrevious: null },
    { stage: 'checkedIn', count: checkedIn, ofPrevious: pct(checkedIn, registered) },
    { stage: 'winners', count: winners, ofPrevious: pct(winners, checkedIn) },
  ];
}

export type DatePreset = 'all' | 'today' | 'last7' | 'last30' | 'event';

/** from/to (datetime-local strings) for a preset; `event` uses the event start/end from settings */
export function presetRange(preset: DatePreset, now: Date, eventStart?: string, eventEnd?: string): { from: string; to: string } {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0);
  const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59);
  switch (preset) {
    case 'today':
      return { from: localInputValue(startOfDay(now)), to: localInputValue(endOfDay(now)) };
    case 'last7':
    case 'last30': {
      const days = preset === 'last7' ? 6 : 29;
      const start = startOfDay(now);
      start.setDate(start.getDate() - days);
      return { from: localInputValue(start), to: localInputValue(endOfDay(now)) };
    }
    case 'event': {
      const s = parseDate(eventStart);
      const e = parseDate(eventEnd) ?? s;
      return s && e ? { from: localInputValue(startOfDay(s)), to: localInputValue(endOfDay(e)) } : { from: '', to: '' };
    }
    default:
      return { from: '', to: '' };
  }
}

/** Serialize filters for the report URL (/dashboard/report?...) and back */
export function filtersToQuery(f: AnalyticsFilters): string {
  const q = new URLSearchParams();
  if (f.search) q.set('q', f.search);
  if (f.orgKeys.length) q.set('org', f.orgKeys.join(','));
  if (f.status !== 'all') q.set('status', f.status);
  if (f.attendeeType !== 'all') q.set('type', f.attendeeType);
  if (f.from) q.set('from', f.from);
  if (f.to) q.set('to', f.to);
  if (f.day) q.set('day', f.day);
  if (f.hour !== null) q.set('hour', String(f.hour));
  return q.toString();
}

export function filtersFromQuery(params: URLSearchParams): AnalyticsFilters {
  const org = (params.get('org') || '')
    .split(',')
    .filter(Boolean)
    .map((k): OrgKey => (k === 'other' || k === 'none' ? k : Number(k)))
    .filter((k) => typeof k === 'string' || Number.isInteger(k));
  const status = params.get('status');
  const type = params.get('type');
  const hour = params.get('hour');
  return {
    search: params.get('q') || '',
    orgKeys: org,
    status: status === 'checked' || status === 'pending' ? status : 'all',
    attendeeType: type === 'General' || type === 'VIP' ? type : 'all',
    from: params.get('from') || '',
    to: params.get('to') || '',
    day: params.get('day') || '',
    hour: hour !== null && /^\d{1,2}$/.test(hour) && Number(hour) < 24 ? Number(hour) : null,
  };
}

export const hasActiveFilters = (f: AnalyticsFilters): boolean =>
  !!(f.search || f.orgKeys.length || f.status !== 'all' || f.attendeeType !== 'all' || f.from || f.to || f.day || f.hour !== null);
