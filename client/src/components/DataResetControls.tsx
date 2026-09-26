'use client';

import { useState } from 'react';
import Swal, { type SweetAlertOptions } from 'sweetalert2';
import { Download, Loader2, RotateCcw } from 'lucide-react';
import api, { RESET_SECTIONS, type ResetResult, type ResetSection, type ResetSummary } from '@/lib/api';
import { useT } from '@/contexts/PreferencesContext';
import type { Dict } from '@/i18n';

/** Typed in the confirmation box before resets that remove attendee records (personal data) */
export const RESET_WORD = 'RESET';

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string);

/** One line per consequence of resetting `sections`, with the numbers from the server */
export function resetConsequences(sections: ResetSection[], s: ResetSummary, t: Dict): string[] {
  const c = t.dataReset.confirm;
  const lines: string[] = [];
  const withAttendees = sections.includes('attendees');
  if (sections.includes('general')) lines.push(c.general(s.general_changed));
  if (sections.includes('registration')) lines.push(c.registration(s.registration_changed));
  if (sections.includes('organizations')) {
    lines.push(c.organizations(s.organization_types, s.default_organization_types));
    if (!withAttendees && s.participants_with_organization_type > 0) lines.push(c.organizationsInUse(s.participants_with_organization_type));
  }
  if (sections.includes('agenda')) lines.push(c.agenda(s.agenda_items));
  if (sections.includes('prizes')) {
    lines.push(c.prizes(s.prizes));
    if (!withAttendees && s.winners > 0) lines.push(c.prizesWinnersKept(s.winners));
  }
  if (withAttendees) lines.push(c.attendees(s.participants, s.checkins, s.winners));
  return lines;
}

/**
 * Shows what will be removed (with an "Export Excel first" button that keeps the window open)
 * and resets once confirmed. Resolves with the server's result, or null when cancelled.
 */
export async function confirmReset({ sections, t, onExport }: {
  sections: ResetSection[];
  t: Dict;
  onExport?: () => void | Promise<void>;
}): Promise<ResetResult | null> {
  const c = t.dataReset.confirm;
  let summary: ResetSummary;
  try {
    summary = await api.getResetSummary();
  } catch {
    await Swal.fire({ icon: 'error', title: t.common.error, text: c.summaryFailed });
    return null;
  }

  const names = sections.map((section) => t.dataReset.sections[section]).join(', ');
  const whole = RESET_SECTIONS.every((section) => sections.includes(section));
  const typing = sections.includes('attendees');
  const lines = resetConsequences(sections, summary, t);
  const html = `
    <div data-reset-confirm style="text-align:left;font-size:15px;line-height:1.55">
      <p style="font-weight:700;margin:0 0 6px">${escapeHtml(c.willHappen)}</p>
      <ul style="margin:0 0 12px 1.2em;padding:0;list-style:disc">${lines.map((line) => `<li style="margin:4px 0">${escapeHtml(line)}</li>`).join('')}</ul>
      <p style="margin:0 0 6px">✅ ${escapeHtml(c.accountsKept)}</p>
      <p style="margin:0;color:#be123c;font-weight:700">⚠️ ${escapeHtml(c.cannotUndo)}</p>
      ${typing ? `<p style="margin:14px 0 0;font-weight:700">${escapeHtml(c.typeToConfirm(RESET_WORD))}</p>` : ''}
    </div>`;

  const typedConfirmation: SweetAlertOptions = typing ? {
    input: 'text',
    inputPlaceholder: RESET_WORD,
    inputAttributes: { autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', 'aria-label': c.typeToConfirm(RESET_WORD) },
    inputValidator: (value: string) => (value.trim().toUpperCase() === RESET_WORD ? null : c.typeMismatch(RESET_WORD)),
  } : {};

  const result = await Swal.fire({
    icon: 'warning',
    title: whole ? c.titleAll : c.title(names),
    html,
    ...typedConfirmation,
    showCancelButton: true,
    showDenyButton: !!onExport,
    confirmButtonText: c.confirm,
    denyButtonText: c.exportFirst,
    cancelButtonText: t.common.cancel,
    confirmButtonColor: '#e11d48',
    denyButtonColor: '#0e7490',
    reverseButtons: true,
    focusCancel: true,
    showLoaderOnConfirm: true,
    allowOutsideClick: () => !Swal.isLoading(),
    // "Export Excel first": download, say so, and keep the window open
    preDeny: async () => {
      try {
        await onExport?.();
        Swal.update({ footer: `<span style="color:#047857;font-weight:600">✓ ${escapeHtml(c.exported)}</span>` });
      } catch {
        Swal.update({ footer: `<span style="color:#be123c;font-weight:600">${escapeHtml(c.exportFailed)}</span>` });
      }
      return false;
    },
    preConfirm: async () => {
      try {
        return await api.resetData(sections);
      } catch {
        Swal.showValidationMessage(c.failed);
        return false;
      }
    },
  });
  if (!result.isConfirmed || !result.value) return null;

  // not awaited: the page updates behind the message
  void Swal.fire({ icon: 'success', title: c.doneTitle, text: c.doneText(names), timer: 1800, showConfirmButton: false });
  return result.value as ResetResult;
}

// phones (360px): two of these side by side must keep their label on one line
const exportClass = 'inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 whitespace-nowrap rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/20 font-semibold text-sm disabled:opacity-40';
const resetClass = 'inline-flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 whitespace-nowrap rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500/20 font-semibold text-sm disabled:opacity-40';

/** "Export Excel" for one section; a failed export is reported in a popup */
export function ExportExcelButton({ onExport, disabled, className = '' }: { onExport: () => void | Promise<void>; disabled?: boolean; className?: string }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try {
      await onExport();
    } catch {
      Swal.fire({ icon: 'error', title: t.common.error, text: t.dataReset.confirm.exportFailed });
    } finally {
      setBusy(false);
    }
  };
  return (
    <button type="button" onClick={run} disabled={disabled || busy} data-export-section className={`${exportClass} ${className}`}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}{t.dataReset.actions.export}
    </button>
  );
}

/** "Reset to defaults" for one section: confirmation popup (with Export first), then onDone with the result */
export function ResetSectionButton({ section, onExport, onDone, className = '' }: {
  section: ResetSection;
  onExport?: () => void | Promise<void>;
  onDone: (result: ResetResult) => void;
  className?: string;
}) {
  const t = useT();
  const reset = async () => {
    const result = await confirmReset({ sections: [section], t, onExport });
    if (result) onDone(result);
  };
  return (
    <button type="button" onClick={reset} data-reset-section={section} aria-label={t.dataReset.actions.reset} className={`${resetClass} ${className}`}>
      <RotateCcw className="w-4 h-4" />
      <span className="sm:hidden">{t.dataReset.actions.resetShort}</span>
      <span className="hidden sm:inline">{t.dataReset.actions.reset}</span>
    </button>
  );
}
