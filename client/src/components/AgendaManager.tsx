'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  CalendarPlus, ChevronLeft, ChevronRight, Download, FileSpreadsheet,
  ImagePlus, Loader2, RotateCcw, Save, Search, Trash2, Upload, X,
} from 'lucide-react';
import api, { AgendaItem } from '@/lib/api';
import { usePreferences, useT } from '@/contexts/PreferencesContext';
import type { Dict } from '@/i18n';
import { AGENDA_PHOTO_IN_SYSTEM, agendaRows, downloadWorkbook, toLocalInput } from '@/lib/backupExport';
import { exportSection } from '@/lib/sectionExport';
import { ResetSectionButton } from '@/components/DataResetControls';

type SpreadsheetRow = Record<string, string | number | boolean | Date | null | undefined>;

// isNew marks cards added on this page and not saved yet (shown on top, never sent to the API)
type EditableAgendaItem = AgendaItem & { isNew?: boolean };

const emptyItem = (): EditableAgendaItem => ({
  title: '', description: '', speaker: '', location: '', start_at: '', end_at: '',
  speaker_image: '', is_highlight: false, isNew: true,
});

// Display order: unsaved new cards first (latest added on top), then saved items in their order
const displayOrder = (items: EditableAgendaItem[]) => items
  .map((item, index) => ({ item, index }))
  .sort((a, b) => Number(!!b.item.isNew) - Number(!!a.item.isNew) || (a.item.isNew ? b.index - a.index : a.index - b.index));

const formatCardTime = (start: string, end: string, t: Dict) => {
  if (!start) return t.agenda.card.noTime;
  const [date, time] = start.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} · ${time}${end ? `–${end.slice(11, 16)}` : ''}`;
};

const pick = (row: SpreadsheetRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
};

const pad = (value: number) => String(value).padStart(2, '0');

const parseExcelDay = (value: unknown): string => {
  if (value instanceof Date) return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  if (typeof value === 'number' && value >= 1) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }
  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`;
  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) {
    const year = Number(match[3]) > 2400 ? Number(match[3]) - 543 : Number(match[3]);
    return `${year}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
  }
  return '';
};

const parseExcelTime = (value: unknown): string => {
  if (value instanceof Date) return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  if (typeof value === 'number') {
    const totalMinutes = Math.round(((value % 1) + 1) % 1 * 24 * 60) % (24 * 60);
    return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
  }
  const match = String(value ?? '').match(/(?:T|\s|^)(\d{1,2})[:.](\d{2})(?::\d{2})?/);
  return match ? `${pad(Number(match[1]))}:${pad(Number(match[2]))}` : '';
};

const combineExcelDateTime = (dayValue: unknown, timeValue: unknown): string => {
  const day = parseExcelDay(dayValue) || parseExcelDay(timeValue);
  const time = parseExcelTime(timeValue);
  return day && time ? `${day}T${time}` : '';
};

// Export writes AGENDA_PHOTO_IN_SYSTEM (in the UI language) instead of the (huge) uploaded image data;
// import maps the marker of any language back to the stored photo
const isPhotoInSystem = (value: string) => Object.values(AGENDA_PHOTO_IN_SYSTEM).includes(value);

// Guide sheet (how to fill each column) of the template, in the UI language
const templateGuide = (t: Dict) => {
  const { columns: c, guide: g, sample1 } = t.agenda.excel;
  const yes = t.common.yes;
  return [
    [g.column, g.required, g.format, g.example],
    [c.date, yes, g.date, '21/09/2026'],
    [c.startTime, yes, g.startTime, '09:00'],
    [c.endTime, yes, g.endTime, '10:30'],
    [c.title, yes, g.text, sample1.title],
    [c.description, '', g.description, sample1.description],
    [c.speaker, '', g.text, sample1.speaker],
    [c.location, '', g.text, 'Main Stage (Hall 5)'],
    [c.highlight, '', g.yesNo, yes],
    [c.speakerImage, '', g.speakerImage, ''],
  ];
};

const parseBoolean = (value: unknown) => ['true', '1', 'yes', 'y', 'ใช่'].includes(String(value).trim().toLowerCase());

const alertTheme = {
  background: '#111629',
  color: '#f8fafc',
  confirmButtonColor: '#4f46e5',
};

type ValidationError = { index: number; field: keyof AgendaItem; title: string; detail: string; example: string };

export default function AgendaManager() {
  const t = useT();
  const { lang } = usePreferences();
  const [items, setItems] = useState<EditableAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [speakerQuery, setSpeakerQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAgenda().then((data) => setItems(data.map(item => ({
      ...item,
      start_at: toLocalInput(item.start_at),
      end_at: toLocalInput(item.end_at),
    })))).finally(() => setLoading(false));
  }, []);

  const updateItem = <K extends keyof AgendaItem>(index: number, key: K, value: AgendaItem[K]) => {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const handleImage = (index: number, file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      void Swal.fire({ ...alertTheme, icon: 'error', title: t.agenda.alerts.imageTooLargeTitle, html: t.agenda.alerts.imageTooLargeHtml });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateItem(index, 'speaker_image', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const validate = (): ValidationError | null => {
    const v = t.agenda.validation;
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.title.trim()) return { index, field: 'title', title: v.missingTitle.title, detail: v.missingTitle.detail(index + 1), example: v.missingTitle.example };
      if (!item.start_at) return { index, field: 'start_at', title: v.missingStart.title, detail: v.missingStart.detail(index + 1), example: v.missingStart.example };
      if (!item.end_at) return { index, field: 'end_at', title: v.missingEnd.title, detail: v.missingEnd.detail(index + 1), example: v.missingEnd.example };
      if (Number.isNaN(new Date(item.start_at).getTime())) return { index, field: 'start_at', title: v.invalidStart.title, detail: v.invalidStart.detail(index + 1), example: v.invalidStart.example };
      if (Number.isNaN(new Date(item.end_at).getTime())) return { index, field: 'end_at', title: v.invalidEnd.title, detail: v.invalidEnd.detail(index + 1), example: v.invalidEnd.example };
      if (new Date(item.end_at) <= new Date(item.start_at)) return { index, field: 'end_at', title: v.endBeforeStart.title, detail: v.endBeforeStart.detail(index + 1), example: v.endBeforeStart.example };
    }
    return null;
  };

  const save = async () => {
    const error = validate();
    if (error) {
      setQuery('');
      setSpeakerQuery('');
      setFilterDate('');
      setTimeFrom('');
      setTimeTo('');
      setPage(Math.floor(displayOrder(items).findIndex(entry => entry.index === error.index) / pageSize) + 1);
      await Swal.fire({ ...alertTheme, icon: 'error', title: error.title, html: `<p>${error.detail}</p><p style="margin-top:10px;color:#67e8f9">${error.example}</p>`, confirmButtonText: t.agenda.validation.backToEdit });
      window.setTimeout(() => document.getElementById(`agenda-${error.index}-${error.field}`)?.focus(), 100);
      return;
    }
    setSaving(true);
    try {
      const payload = items.map(item => ({ ...item, isNew: undefined, start_at: new Date(item.start_at).toISOString(), end_at: new Date(item.end_at).toISOString() }));
      const saved = await api.replaceAgenda(payload);
      setItems(saved.map(item => ({ ...item, start_at: toLocalInput(item.start_at), end_at: toLocalInput(item.end_at) })));
      await Swal.fire({ ...alertTheme, icon: 'success', title: t.agenda.alerts.savedTitle, text: t.agenda.alerts.savedText(saved.length), confirmButtonText: t.agenda.alerts.ok });
    } catch (error) {
      const reason = error instanceof Error ? error.message : t.common.connectionError;
      await Swal.fire({ ...alertTheme, icon: 'error', title: t.agenda.alerts.saveFailedTitle, text: `${reason}\n${t.agenda.alerts.saveFailedHint}`, confirmButtonText: t.agenda.alerts.reviewData });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const now = new Date();
    const day = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const { columns: c, sample1, sample2 } = t.agenda.excel;
    const header = [c.date, c.startTime, c.endTime, c.title, c.description, c.speaker, c.location, c.highlight, c.speakerImage];
    const sheet = XLSX.utils.aoa_to_sheet([
      header,
      [day, '09:00', '10:00', sample1.title, sample1.description, sample1.speaker, 'Main Stage (Hall 5)', t.common.yes, ''],
      [day, '10:15', '11:30', sample2.title, sample2.description, sample2.speaker, 'Conference Room A', t.common.no, ''],
    ]);
    sheet['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 48 }, { wch: 28 }, { wch: 24 }, { wch: 10 }, { wch: 36 }];
    const guide = XLSX.utils.aoa_to_sheet(templateGuide(t));
    guide['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 52 }, { wch: 28 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Agenda');
    XLSX.utils.book_append_sheet(workbook, guide, t.agenda.excel.guideSheet);
    XLSX.writeFile(workbook, 'agenda-import-template.xlsx');
  };

  const exportExcel = () => downloadWorkbook([{ name: 'Agenda', rows: agendaRows(items, t, lang, true) }], 'event-agenda.xlsx');

  const importExcel = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });
      // Re-importing an exported file: restore uploaded photos by matching title + start time
      const storedPhotos = new Map(items.filter(item => item.speaker_image).map(item => [`${item.title.trim()}|${item.start_at}`, item.speaker_image]));
      const imported = rows.map((row, index) => {
        const day = pick(row, ['วันที่', 'date', 'Date']);
        const startValue = pick(row, ['เวลาเริ่ม', 'start_at', 'Start', 'Start Time']);
        const endValue = pick(row, ['เวลาสิ้นสุด', 'end_at', 'End', 'End Time']);
        const startAt = combineExcelDateTime(day, startValue);
        const endAt = combineExcelDateTime(day || startValue, endValue);
        if (!parseExcelDay(day) && !parseExcelDay(startValue)) throw new Error(t.agenda.alerts.missingDate(index + 2));
        return {
        title: String(pick(row, ['หัวข้อ', 'title', 'Title'])).trim(),
        description: String(pick(row, ['รายละเอียดย่อ', 'รายละเอียด', 'description', 'Description'])).trim(),
        speaker: String(pick(row, ['วิทยากร', 'speaker', 'Speaker'])).trim(),
        location: String(pick(row, ['สถานที่', 'location', 'Location'])).trim(),
        start_at: startAt,
        end_at: endAt,
        is_highlight: parseBoolean(pick(row, ['ไฮไลต์', 'is_highlight', 'Highlight'])),
        speaker_image: String(pick(row, ['รูปวิทยากร', 'speaker_image', 'Speaker Image'])).trim(),
      }}).map(item => isPhotoInSystem(item.speaker_image)
        ? { ...item, speaker_image: storedPhotos.get(`${item.title}|${item.start_at}`) || '' }
        : item
      ).filter(item => item.title || item.start_at || item.end_at);
      if (!imported.length) throw new Error('EMPTY_WORKBOOK');
      setItems(imported);
      setPage(1);
      await Swal.fire({ ...alertTheme, icon: 'success', title: t.agenda.alerts.importedTitle, text: t.agenda.alerts.importedText(imported.length), confirmButtonText: t.agenda.alerts.reviewData });
    } catch (error) {
      const reason = error instanceof Error && error.message !== 'EMPTY_WORKBOOK' ? error.message : t.agenda.alerts.importNoData;
      await Swal.fire({ ...alertTheme, icon: 'error', title: t.agenda.alerts.importFailedTitle, text: `${reason}\n${t.agenda.alerts.importFailedExample}`, confirmButtonText: t.agenda.alerts.backToFile });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredItems = useMemo(() => displayOrder(items).filter(({ item }) => {
    const normalizedQuery = query.trim().toLocaleLowerCase('th');
    const normalizedSpeaker = speakerQuery.trim().toLocaleLowerCase('th');
    const startDate = item.start_at.slice(0, 10);
    const startTime = item.start_at.slice(11, 16);
    return (!normalizedQuery || item.title.toLocaleLowerCase('th').includes(normalizedQuery))
      && (!normalizedSpeaker || item.speaker.toLocaleLowerCase('th').includes(normalizedSpeaker))
      && (!filterDate || startDate === filterDate)
      && (!timeFrom || startTime >= timeFrom)
      && (!timeTo || startTime <= timeTo);
  }), [items, query, speakerQuery, filterDate, timeFrom, timeTo]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetFilters = () => {
    setQuery(''); setSpeakerQuery(''); setFilterDate(''); setTimeFrom(''); setTimeTo(''); setPage(1);
  };

  // The agenda was emptied on the server (after a confirmation popup)
  const afterReset = () => {
    setItems([]);
    resetFilters();
  };

  const addItem = () => {
    resetFilters();
    setPage(1);
    const newIndex = items.length;
    setItems(current => [...current, emptyItem()]);
    window.setTimeout(() => {
      const input = document.getElementById(`agenda-${newIndex}-title`);
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus({ preventScroll: true });
    }, 50);
  };

  if (loading) return <div className="glass-panel rounded-3xl p-12 text-center text-slate-400"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" />{t.agenda.loading}</div>;

  // Columns an imported file must have, named as in the template / export
  const excelColumns = t.agenda.excel.columns;
  const requiredColumns = [excelColumns.date, excelColumns.startTime, excelColumns.endTime, excelColumns.title].join(', ');

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400" />{t.agenda.title}</h2>
            <p className="text-sm text-slate-400 mt-1">{t.agenda.subtitle}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={event => importExcel(event.target.files?.[0])} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold text-sm"><Upload className="w-4 h-4" />{t.agenda.actions.importExcel}</button>
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 font-semibold text-sm"><FileSpreadsheet className="w-4 h-4 text-emerald-400" />{t.agenda.actions.template}</button>
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/20 font-semibold text-sm"><Download className="w-4 h-4" />{t.agenda.actions.exportExcel}</button>
            <ResetSectionButton section="agenda" onExport={() => exportSection('agenda', t, lang)} onDone={afterReset} />
            <button type="button" onClick={addItem} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-on-accent hover:bg-indigo-500 font-semibold text-sm"><CalendarPlus className="w-4 h-4" />{t.agenda.actions.add}</button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          {t.agenda.excelHint.download} <b className="text-slate-300">{t.agenda.actions.template}</b> {t.agenda.excelHint.guideSheet(t.agenda.excel.guideSheet)} <b className="text-slate-300">{t.agenda.actions.exportExcel}</b> {t.agenda.excelHint.rest(requiredColumns)}
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2"><Search className="w-4 h-4 text-cyan-400" />{t.agenda.filters.heading}</h3>
            <p className="text-xs text-slate-500 mt-1">{t.agenda.filters.hint}</p>
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10"><RotateCcw className="w-3.5 h-3.5" />{t.agenda.filters.clear}</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.filters.title}</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder={t.agenda.filters.titlePlaceholder} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.filters.speaker}</span><input value={speakerQuery} onChange={event => { setSpeakerQuery(event.target.value); setPage(1); }} placeholder={t.agenda.filters.speakerPlaceholder} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.filters.date}</span><input type="date" value={filterDate} onChange={event => { setFilterDate(event.target.value); setPage(1); }} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white scheme-dark" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.filters.timeFrom}</span><input type="time" value={timeFrom} onChange={event => { setTimeFrom(event.target.value); setPage(1); }} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white scheme-dark" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.filters.timeTo}</span><input type="time" value={timeTo} onChange={event => { setTimeTo(event.target.value); setPage(1); }} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white scheme-dark" /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-400">{t.agenda.filters.found} <b className="text-white">{filteredItems.length}</b> {t.agenda.filters.ofTotal(items.length)}</span>
          <label className="flex items-center gap-2 text-slate-400">{t.agenda.filters.perPage}
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-white">
              {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size} {t.common.items}</option>)}
            </select>
          </label>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/15">
          <CalendarPlus className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold">{t.agenda.empty.title}</p>
          <p className="text-sm text-slate-500 mt-1">{t.agenda.empty.hint}</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center border border-dashed border-white/15">
          <Search className="w-9 h-9 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold">{t.agenda.empty.noMatch}</p>
          <button type="button" onClick={resetFilters} className="mt-3 text-sm text-cyan-300 hover:text-cyan-200">{t.agenda.empty.clearAll}</button>
        </div>
      ) : visibleItems.map(({ item, index }) => {
        const cardActions = (
          <>
            {item.speaker_image && <button type="button" title={t.agenda.card.removePhoto} aria-label={t.agenda.card.removePhoto} onClick={() => updateItem(index, 'speaker_image', '')} className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"><X className="w-4 h-4" /></button>}
            <button type="button" title={t.agenda.card.removeItem} aria-label={t.agenda.card.removeItem} onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
          </>
        );
        return (
        <div key={item.id ?? `new-${index}`} className={`glass-panel rounded-3xl p-5 sm:p-6 border relative overflow-hidden ${item.isNew ? 'border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,.12)]' : 'border-white/10'}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${item.isNew ? 'from-emerald-400 to-cyan-400' : 'from-indigo-500 to-cyan-400'}`} />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-xl text-sm font-extrabold ${item.isNew ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40' : 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'}`}>{index + 1}</span>
            <span className="text-sm font-bold text-white">{t.agenda.card.order(index + 1)}</span>
            {item.isNew && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">{t.agenda.card.newUnsaved}</span>}
            <span className="ml-auto text-xs font-mono text-cyan-300/80">{formatCardTime(item.start_at, item.end_at, t)}</span>
          </div>
          {/* phones: photo + delete on one row, fields full width below */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex items-start justify-between gap-3 sm:block shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
              {item.speaker_image ? (
                // Data URLs come from staff uploads and cannot use the Next image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.speaker_image} alt={item.speaker || item.title} className="w-full h-full object-cover" />
              ) : <ImagePlus className="w-8 h-8 text-slate-600" />}
              <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center text-xs font-bold text-on-accent">
                {t.agenda.card.choosePhoto}
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => handleImage(index, event.target.files?.[0])} />
              </label>
            </div>
            <div className="flex gap-2 sm:hidden">{cardActions}</div>
            </div>
            <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input id={`agenda-${index}-title`} value={item.title} onChange={event => updateItem(index, 'title', event.target.value)} placeholder={t.agenda.card.titlePlaceholder} className="md:col-span-2 bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white font-semibold" />
              <textarea value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} placeholder={t.agenda.card.descriptionPlaceholder} rows={2} className="md:col-span-2 bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white resize-none" />
              <input value={item.speaker} onChange={event => updateItem(index, 'speaker', event.target.value)} placeholder={t.agenda.card.speakerPlaceholder} className="bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white" />
              <input value={item.location} onChange={event => updateItem(index, 'location', event.target.value)} placeholder={t.agenda.card.locationPlaceholder} className="bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white" />
              <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.card.start}</span><input id={`agenda-${index}-start_at`} type="datetime-local" value={item.start_at} onChange={event => updateItem(index, 'start_at', event.target.value)} className="w-full bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white scheme-dark" /></label>
              <label className="space-y-1"><span className="text-xs text-slate-400">{t.agenda.card.end}</span><input id={`agenda-${index}-end_at`} type="datetime-local" min={item.start_at || undefined} value={item.end_at} onChange={event => updateItem(index, 'end_at', event.target.value)} className="w-full bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white scheme-dark" /></label>
            </div>
            <div className="hidden sm:flex flex-col gap-2">{cardActions}</div>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={item.is_highlight} onChange={event => updateItem(index, 'is_highlight', event.target.checked)} className="w-4 h-4 accent-purple-500" /> {t.agenda.card.highlight}
          </label>
        </div>
        );
      })}

      {filteredItems.length > 0 && (
        <div className="glass-panel rounded-2xl px-4 py-3 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-slate-400">{t.common.page} <b className="text-white">{currentPage}</b> {t.common.of} {totalPages} · {t.common.items} {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredItems.length)}</span>
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} aria-label={t.common.previous} className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /><span className="hidden sm:inline">{t.common.previous}</span></button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).filter(number => totalPages <= 7 || number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1).map((number, index, pages) => <span key={number} className="contents">{index > 0 && number - pages[index - 1] > 1 && <span className="text-slate-500">…</span>}<button type="button" onClick={() => setPage(number)} className={`w-9 h-9 rounded-xl text-sm font-bold border ${currentPage === number ? 'bg-indigo-600 border-indigo-400 text-on-accent' : 'bg-white/5 border-white/10 text-slate-300'}`}>{number}</button></span>)}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} aria-label={t.common.next} className="inline-flex items-center gap-1 px-2.5 sm:px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 disabled:opacity-30"><span className="hidden sm:inline">{t.common.next}</span><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-on-accent font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}{t.agenda.actions.saveAll}
        </button>
      </div>
    </div>
  );
}
