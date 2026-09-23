import type { AgendaItem } from './api';

const BANGKOK_TIME_ZONE = 'Asia/Bangkok';

const dateKey = (value: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BANGKOK_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
};

export const getAgendaStatus = (item: AgendaItem, now: Date): 'past' | 'active' | 'upcoming' => {
  const start = new Date(item.start_at);
  const end = new Date(item.end_at);
  if (now >= start && now < end) return 'active';
  if (now >= end) return 'past';
  return 'upcoming';
};

export const getAgendaForDate = (items: AgendaItem[], now: Date): AgendaItem[] => {
  const today = dateKey(now);
  return items.filter(item => {
    const start = new Date(item.start_at);
    const end = new Date(item.end_at);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;
    return dateKey(start) === today || (now >= start && now < end);
  });
};
