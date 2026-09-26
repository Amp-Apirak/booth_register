// Downloads a section's Excel file (or the one-file backup) from data read fresh from the server.
// Used by each settings tab's "ส่งออก Excel" button and by Settings → สำรองและรีเซ็ต (ADR-0017).
import api, { type ResetSection } from './api';
import {
  agendaRows, attendeeRows, backupSheets, downloadWorkbook, generalRows, organizationTypeRows, prizeRows,
  registrationRows, stampedFileName, toLocalInput, winnerRows, type BackupData, type SheetSpec,
} from './backupExport';
import type { Dict, Lang } from '@/i18n';

// File name prefix of each section's export ("event-agenda-20260926-1530.xlsx"); the backup is "event-backup-…"
export const SECTION_FILE_PREFIX: Record<ResetSection, string> = {
  general: 'event-general',
  registration: 'event-registration-page',
  organizations: 'organization-types',
  agenda: 'event-agenda',
  prizes: 'lucky-draw-prizes',
  attendees: 'event-attendees',
};

/** The current data of every section (throws when any part fails, so a backup is never silently incomplete) */
export async function loadBackupData(): Promise<BackupData> {
  const data = await api.getBackupSources();
  return {
    ...data,
    agenda: data.agenda.map((item) => ({ ...item, start_at: toLocalInput(item.start_at), end_at: toLocalInput(item.end_at) })),
  };
}

export function sectionSheets(section: ResetSection, data: BackupData, t: Dict, lang: Lang): SheetSpec[] {
  const sheet = t.dataReset.excel.sheets;
  switch (section) {
    case 'general': return [{ name: sheet.general, rows: generalRows(data.settings, t) }];
    case 'registration': return [{ name: sheet.registration, rows: registrationRows(data.settings, t) }];
    case 'organizations': return [{ name: sheet.organizations, rows: organizationTypeRows(data.organizationTypes, t) }];
    // same sheet names as the agenda / prize pages' own exports, so the files import back there
    case 'agenda': return [{ name: 'Agenda', rows: agendaRows(data.agenda, t, lang, true) }];
    case 'prizes': return [{ name: 'Prizes', rows: prizeRows(data.prizes, t, lang) }];
    // attendees first: the attendee import reads the first sheet
    case 'attendees': return [
      { name: sheet.attendees, rows: attendeeRows(data.participants, data.organizationTypes, t, lang) },
      { name: sheet.winners, rows: winnerRows(data.winners, t) },
    ];
  }
}

export async function exportSection(section: ResetSection, t: Dict, lang: Lang) {
  downloadWorkbook(sectionSheets(section, await loadBackupData(), t, lang), stampedFileName(SECTION_FILE_PREFIX[section]));
}

export async function exportEverything(t: Dict, lang: Lang, exportedBy: string) {
  const [data, summary] = await Promise.all([loadBackupData(), api.getResetSummary()]);
  const meta = { exportedAt: new Date(), exportedBy, generalFilled: summary.general_changed, registrationFilled: summary.registration_changed };
  downloadWorkbook(backupSheets(data, t, lang, meta), stampedFileName('event-backup'));
}
