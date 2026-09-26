// Excel exports of every settings section and the attendee data: one builder per section, shared by
// the section's own "ส่งออก Excel" button and the one-file backup (Settings → สำรองและรีเซ็ต, ADR-0017).
import * as XLSX from 'xlsx';
import type { Dict, Lang } from '@/i18n';
import type { AgendaItem, LuckyWinnerData, OrganizationType, Participant, Prize, SystemSettings } from './api';
import { columnHeader } from './participantImport';
import { PRIZE_PHOTO_IN_SYSTEM, type PrizeField, prizeColumnHeader } from './prizeImport';
import { participantOrgKey, participantOrgLabel } from './orgTypes';

export type Cell = string | number;
/** Rows of cells; the first row is the header */
export type SheetRows = Cell[][];
export interface SheetSpec { name: string; rows: SheetRows }

// Uploaded images are data URLs, far beyond an Excel cell's 32,767 characters: a marker says one exists.
// The agenda import maps this marker (either language) back to the stored photo.
export const AGENDA_PHOTO_IN_SYSTEM: Record<Lang, string> = { th: 'จัดเก็บรูปในระบบแล้ว', en: 'Stored in system' };
const imageCell = (value: string | undefined, marker: string): string => (value?.startsWith('data:') ? marker : value || '');

const pad = (n: number) => String(n).padStart(2, '0');

/** An ISO time as the browser's local "YYYY-MM-DDTHH:mm" (how the agenda editor shows and exports times) */
export const toLocalInput = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

/** "event-backup-20260926-1530.xlsx" (local time) */
export const stampedFileName = (prefix: string, now = new Date()): string =>
  `${prefix}-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.xlsx`;

const dateTime = (value: string | null | undefined, locale: string) => (value ? new Date(value).toLocaleString(locale) : '');

export function generalRows(s: SystemSettings, t: Dict): SheetRows {
  const e = t.settings.event;
  const c = t.settings.contact;
  const x = t.dataReset.excel;
  return [
    [x.field, x.value],
    [e.name, s.event_name],
    [t.settings.logo.label, imageCell(s.event_logo, x.imageInSystem)],
    [e.venue, s.event_venue],
    [e.address, s.event_address],
    [e.building, s.event_building],
    [e.floor, s.event_floor],
    [e.start, s.event_start.replace('T', ' ')],
    [e.end, s.event_end.replace('T', ' ')],
    [c.organizer, s.organizer_name],
    [c.phone, s.contact_phone],
    [c.email, s.contact_email],
    ['LINE ID', s.contact_line],
    [c.mapUrl, s.event_map_url],
    [c.privacyPolicy, s.privacy_policy],
  ];
}

export function registrationRows(s: SystemSettings, t: Dict): SheetRows {
  const r = t.registrationPage;
  const x = t.dataReset.excel;
  return [
    [x.field, x.value],
    [r.images.hero, imageCell(s.registration_hero_image, x.imageInSystem)],
    [r.images.brochure, imageCell(s.registration_brochure_image, x.imageInSystem)],
    [r.intro, s.registration_intro],
    [r.objectives, s.registration_objectives],
    [r.terms, s.registration_terms],
  ];
}

export function organizationTypeRows(types: OrganizationType[], t: Dict): SheetRows {
  const c = t.dataReset.excel.orgColumns;
  const colors: Record<string, string> = t.orgTypes.colors;
  return [
    [c.order, c.nameTh, c.nameEn, c.color, c.shown, c.usage],
    ...types.map((type, i) => [
      i + 1, type.name_th, type.name_en, colors[type.color] ?? type.color,
      type.is_active ? t.common.yes : t.common.no, type.usage_count ?? 0,
    ]),
  ];
}

/**
 * Same columns as the agenda import. `items` hold local "YYYY-MM-DDTHH:mm" times (toLocalInput).
 * withBlankRow: an empty agenda still gets one blank row, so the file can be filled in and imported.
 */
export function agendaRows(items: AgendaItem[], t: Dict, lang: Lang, withBlankRow = false): SheetRows {
  const c = t.agenda.excel.columns;
  const header = [c.order, c.date, c.startTime, c.endTime, c.title, c.description, c.speaker, c.location, c.highlight, c.speakerImage];
  const rows: SheetRows = items.map((item, index) => [
    index + 1, item.start_at.slice(0, 10), item.start_at.slice(11, 16), item.end_at.slice(11, 16),
    item.title, item.description, item.speaker, item.location,
    item.is_highlight ? t.common.yes : t.common.no, imageCell(item.speaker_image, AGENDA_PHOTO_IN_SYSTEM[lang]),
  ]);
  if (rows.length === 0 && withBlankRow) rows.push([1, '', '', '', '', '', '', '', t.common.no, '']);
  return [header, ...rows];
}

/** Same columns as the prize import, plus how many were awarded */
export function prizeRows(prizes: Prize[], t: Dict, lang: Lang): SheetRows {
  const H = (field: PrizeField) => prizeColumnHeader(field, lang);
  return [
    [H('sort_order'), H('name'), H('code'), H('description'), H('quantity'), H('is_active'), H('image'), t.prizes.excel.awardedHeader],
    ...prizes.map((p, i) => [
      i + 1, p.name, p.code, p.description, p.quantity, p.is_active ? t.common.yes : t.common.no,
      imageCell(p.image, PRIZE_PHOTO_IN_SYSTEM[lang]), p.awarded_count ?? 0,
    ]),
  ];
}

/** Name…organization type use the attendee import headers, so the file can be imported back */
export function attendeeRows(list: Participant[], types: OrganizationType[], t: Dict, lang: Lang): SheetRows {
  const col = t.dashboard.exportColumns;
  const labels = { other: t.orgTypes.other, none: t.orgTypes.none };
  return [
    [
      col.id, columnHeader('name', lang), columnHeader('company', lang), columnHeader('position', lang),
      columnHeader('email', lang), columnHeader('phone', lang), columnHeader('organization_type', lang),
      col.status, col.ticketCode, col.registeredAt, col.checkedInAt,
    ],
    ...list.map((p) => {
      const key = participantOrgKey(p);
      const orgType = key === 'other' ? (p.organization_type_other || '') : key === 'none' ? '' : participantOrgLabel(p, types, lang, labels);
      return [
        p.id, p.name, p.company, p.position || '', p.email || '', p.phone || '', orgType,
        p.status, p.ticket_code || '', dateTime(p.registered_at, t.common.locale), dateTime(p.checked_in_at, t.common.locale),
      ];
    }),
  ];
}

export function winnerRows(winners: LuckyWinnerData[], t: Dict): SheetRows {
  const c = t.dataReset.excel.winnerColumns;
  return [
    [c.order, c.name, c.company, c.prize, c.drawnAt],
    ...winners.map((w, i) => [i + 1, w.name, w.company, w.prize_name, dateTime(w.drawn_at, t.common.locale)]),
  ];
}

export interface BackupData {
  settings: SystemSettings;
  organizationTypes: OrganizationType[];
  agenda: AgendaItem[]; // local times (toLocalInput)
  prizes: Prize[];
  participants: Participant[];
  winners: LuckyWinnerData[];
}

/** Every section in one workbook: a summary sheet, then one sheet per section */
export function backupSheets(
  data: BackupData,
  t: Dict,
  lang: Lang,
  meta: { exportedAt: Date; exportedBy: string; generalFilled: number; registrationFilled: number },
): SheetSpec[] {
  const x = t.dataReset.excel;
  const n = t.dataReset.sections;
  const counts = t.dataReset.counts;
  const checkedIn = data.participants.filter((p) => p.status === 'Checked-in').length;
  return [
    {
      name: x.sheets.summary,
      rows: [
        [x.summary.eventName, data.settings.event_name],
        [x.summary.exportedAt, meta.exportedAt.toLocaleString(t.common.locale)],
        [x.summary.exportedBy, meta.exportedBy],
        [],
        [x.summary.section, x.summary.amount],
        [n.general, counts.fieldsFilled(meta.generalFilled)],
        [n.registration, counts.fieldsFilled(meta.registrationFilled)],
        [n.organizations, counts.types(data.organizationTypes.length)],
        [n.agenda, counts.items(data.agenda.length)],
        [n.prizes, counts.items(data.prizes.length)],
        [n.attendees, counts.attendees(data.participants.length, checkedIn, data.winners.length)],
        [],
        [t.dataReset.page.imagesNote],
      ],
    },
    { name: x.sheets.general, rows: generalRows(data.settings, t) },
    { name: x.sheets.registration, rows: registrationRows(data.settings, t) },
    { name: x.sheets.organizations, rows: organizationTypeRows(data.organizationTypes, t) },
    { name: x.sheets.agenda, rows: agendaRows(data.agenda, t, lang) },
    { name: x.sheets.prizes, rows: prizeRows(data.prizes, t, lang) },
    { name: x.sheets.attendees, rows: attendeeRows(data.participants, data.organizationTypes, t, lang) },
    { name: x.sheets.winners, rows: winnerRows(data.winners, t) },
  ];
}

/** Column widths from the longest text in each column (8–60 characters) */
export function columnWidths(rows: SheetRows): number[] {
  const widths: number[] = [];
  for (const row of rows) {
    row.forEach((cell, i) => {
      const longestLine = Math.max(...String(cell ?? '').split('\n').map((line) => line.length));
      widths[i] = Math.max(widths[i] ?? 8, Math.min(60, longestLine + 2));
    });
  }
  return widths;
}

export function downloadWorkbook(sheets: SheetSpec[], fileName: string) {
  const book = XLSX.utils.book_new();
  for (const { name, rows } of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = columnWidths(rows).map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(book, sheet, name);
  }
  XLSX.writeFile(book, fileName);
}
