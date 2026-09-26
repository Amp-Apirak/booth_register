'use client';

import { useCallback, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { AlertTriangle, Archive, Building2, CalendarRange, Download, Gift, Images, Loader2, PanelsTopLeft, RotateCcw, Settings, ShieldCheck, Users } from 'lucide-react';
import api, { RESET_SECTIONS, type ResetResult, type ResetSection, type ResetSummary } from '@/lib/api';
import { exportEverything, exportSection } from '@/lib/sectionExport';
import { useSettings } from '@/contexts/SettingsContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useStaffSession } from '@/lib/staffSession';
import { ExportExcelButton, ResetSectionButton, confirmReset } from '@/components/DataResetControls';

const ICONS: Record<ResetSection, typeof Settings> = {
  general: Settings,
  registration: PanelsTopLeft,
  organizations: Building2,
  agenda: CalendarRange,
  prizes: Gift,
  attendees: Users,
};

/** Settings → สำรองและรีเซ็ต: export every section to Excel, then put sections (or everything) back to defaults */
export default function BackupResetManager() {
  const { t, lang } = usePreferences();
  const { updateSettingsContext } = useSettings();
  const { user } = useStaffSession();
  const [summary, setSummary] = useState<ResetSummary | null>(null);
  const [failed, setFailed] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const d = t.dataReset;

  const loadSummary = useCallback(() => api.getResetSummary()
    .then((data) => { setSummary(data); setFailed(false); })
    .catch(() => setFailed(true)), []);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  const exportAll = () => exportEverything(t, lang, user?.fullname || user?.username || '');
  const onExportAll = async () => {
    setExportingAll(true);
    try {
      await exportAll();
    } catch {
      Swal.fire({ icon: 'error', title: t.common.error, text: d.confirm.exportFailed });
    } finally {
      setExportingAll(false);
    }
  };

  const afterReset = (result: ResetResult) => {
    if (Object.keys(result.settings).length > 0) updateSettingsContext(result.settings);
    loadSummary();
  };
  const resetAll = async () => {
    const result = await confirmReset({ sections: RESET_SECTIONS, t, onExport: exportAll });
    if (result) afterReset(result);
  };

  const countOf = (section: ResetSection, s: ResetSummary): string => {
    switch (section) {
      case 'general': return d.counts.fieldsFilled(s.general_changed);
      case 'registration': return d.counts.fieldsFilled(s.registration_changed);
      case 'organizations': return d.counts.types(s.organization_types);
      case 'agenda': return d.counts.items(s.agenda_items);
      case 'prizes': return d.counts.items(s.prizes);
      case 'attendees': return d.counts.attendees(s.participants, s.checkins, s.winners);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10">
        <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2"><Archive className="w-6 h-6 text-cyan-400 shrink-0" />{d.page.title}</h2>
        <p className="text-sm text-slate-400 mt-1">{d.page.subtitle}</p>
        <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
          <li className="flex gap-2"><Images className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />{d.page.imagesNote}</li>
          <li className="flex gap-2"><ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />{d.page.accountsNote}</li>
        </ul>
      </div>

      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-white">{d.page.step1}</h3>
            <p className="text-sm text-slate-400 mt-1">{d.page.step1Hint}</p>
          </div>
          <button type="button" onClick={onExportAll} disabled={exportingAll} data-export-all className="w-full lg:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-on-accent font-bold shadow-lg shadow-cyan-500/20 disabled:opacity-50">
            {exportingAll ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}{d.actions.exportAll}
          </button>
        </div>
      </section>

      <section className="glass-panel rounded-3xl p-5 sm:p-6 border border-rose-500/20">
        <h3 className="text-lg font-bold text-white">{d.page.step2}</h3>
        <p className="text-sm text-slate-400 mt-1">{d.page.step2Hint}</p>
        {failed && (
          <div role="alert" className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {d.page.loadFailed}
            <button type="button" onClick={loadSummary} className="px-3 py-1.5 rounded-lg bg-white/10 border border-white/15 font-semibold">{d.page.retry}</button>
          </div>
        )}
        <ul className="mt-4 divide-y divide-white/5">
          {RESET_SECTIONS.map((section) => {
            const Icon = ICONS[section];
            return (
              <li key={section} data-backup-section={section} className="py-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-cyan-300" /></span>
                  <div className="min-w-0">
                    <p className="font-bold text-white">
                      {d.sections[section]}
                      <span data-section-count className="block sm:inline sm:ml-2 text-xs font-semibold text-slate-400">{summary ? countOf(section, summary) : failed ? '' : d.page.loading}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{d.sectionHints[section]}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:flex gap-2 md:shrink-0">
                  <ExportExcelButton onExport={() => exportSection(section, t, lang)} />
                  <ResetSectionButton section={section} onExport={() => exportSection(section, t, lang)} onDone={afterReset} />
                </div>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 rounded-2xl border border-rose-500/35 bg-rose-500/[.07] p-4 sm:p-5 flex flex-col md:flex-row md:items-center gap-4">
          <AlertTriangle className="w-7 h-7 text-rose-300 shrink-0" />
          <div className="flex-1 min-w-0 text-sm text-slate-300">
            <p className="font-bold text-white">{d.confirm.titleAll}</p>
            <p className="mt-1">{d.confirm.cannotUndo}</p>
          </div>
          <button type="button" onClick={resetAll} data-reset-all className="w-full md:w-auto shrink-0 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-on-accent font-bold shadow-lg shadow-rose-600/25">
            <RotateCcw className="w-5 h-5" />{d.actions.resetAll}
          </button>
        </div>
      </section>
    </div>
  );
}
