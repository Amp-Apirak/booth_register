'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { ArrowDown, ArrowUp, Download, FileSpreadsheet, Gift, ImagePlus, Plus, Save, Trash2, Upload, X } from 'lucide-react';
import api, { Prize } from '@/lib/api';
import { PRIZE_PHOTO_IN_SYSTEM, PrizeField, mapPrizeRows, prizeColumnHeader } from '@/lib/prizeImport';
import { usePreferences, useT } from '@/contexts/PreferencesContext';
import type { Dict, Lang } from '@/i18n';

const blank = (): Prize => ({ name: '', code: '', description: '', image: '', quantity: 1, is_active: true, sort_order: 0 });

// Guide sheet (how to fill each column) of the template / export, in the UI language
const templateGuide = (t: Dict, lang: Lang) => {
  const H = (field: PrizeField) => prizeColumnHeader(field, lang);
  const guide = t.prizes.excel.guide;
  return [
    [guide.column, guide.required, guide.format, guide.example],
    [H('sort_order'), '', guide.sortOrder, '1'],
    [H('name'), t.common.yes, guide.text, 'iPhone 16 Pro Max 256GB'],
    [H('code'), '', guide.code, 'GRAND-01'],
    [H('description'), '', guide.text, t.prizes.excel.sampleGrandDescription],
    [H('quantity'), '', guide.quantity, '1'],
    [H('is_active'), '', guide.isActive, t.common.yes],
    [H('image'), '', guide.image(PRIZE_PHOTO_IN_SYSTEM[lang]), ''],
  ];
};

export default function PrizeManager() {
  const t = useT();
  const { lang } = usePreferences();
  // Excel column header in the UI language (import accepts Thai and English headers)
  const H = (field: PrizeField) => prizeColumnHeader(field, lang);
  const [items, setItems] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Prize | null>(null);
  const [reordering, setReordering] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const draftRef = useRef<HTMLDivElement>(null);

  const load = async () => { try { setItems(await api.getPrizes()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const readImage = (file: File, callback: (value: string) => void) => {
    if (file.size > 2 * 1024 * 1024) return Swal.fire(t.prizes.alerts.fileTooLargeTitle, t.prizes.alerts.fileTooLargeText, 'warning');
    const reader = new FileReader(); reader.onload = () => callback(String(reader.result)); reader.readAsDataURL(file);
  };
  const validate = (item: Prize) => {
    if (!item.name.trim()) { Swal.fire(t.prizes.alerts.incompleteTitle, t.prizes.alerts.incompleteText, 'warning'); return false; }
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) { Swal.fire(t.prizes.alerts.badQuantityTitle, t.prizes.alerts.badQuantityText, 'warning'); return false; }
    return true;
  };
  const save = async (item: Prize, index?: number) => {
    if (!validate(item)) return;
    const key = index === undefined ? 'new' : index; setSaving(key);
    try {
      if (item.prize_id) await api.updatePrize(item.prize_id, item); else await api.createPrize(item);
      if (index === undefined) setDraft(null);
      await load(); await Swal.fire({ icon: 'success', title: t.prizes.alerts.savedTitle, timer: 1400, showConfirmButton: false });
    } catch (e) { Swal.fire(t.prizes.alerts.saveFailedTitle, e instanceof Error ? e.message : t.prizes.alerts.checkConnection, 'error'); }
    finally { setSaving(null); }
  };
  const remove = async (item: Prize) => {
    if (!item.prize_id) return;
    const result = await Swal.fire({ icon: 'warning', title: t.prizes.alerts.deleteConfirmTitle, text: item.name, showCancelButton: true, confirmButtonText: t.common.delete, cancelButtonText: t.common.cancel, confirmButtonColor: '#e11d48' });
    if (!result.isConfirmed) return;
    try { await api.deletePrize(item.prize_id); await load(); Swal.fire({ icon: 'success', title: t.prizes.alerts.deletedTitle, timer: 1100, showConfirmButton: false }); }
    catch (e) { Swal.fire(t.prizes.alerts.deleteFailedTitle, e instanceof Error ? e.message : t.common.error, 'error'); }
  };

  const addPrize = () => {
    setDraft((current) => current ?? blank());
    window.setTimeout(() => {
      draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      draftRef.current?.querySelector('input')?.focus({ preventScroll: true });
    }, 50);
  };

  // Move a prize up/down in the draw order. Only sort_order is saved, so unsaved
  // edits on other cards stay on screen.
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length || reordering) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setReordering(true);
    try {
      const saved = await api.reorderPrizes(next.map((p) => p.prize_id!));
      const orderById = new Map(saved.map((p) => [p.prize_id, p.sort_order]));
      setItems((current) => current.map((p) => ({ ...p, sort_order: orderById.get(p.prize_id) ?? p.sort_order })));
    } catch (e) {
      setItems(items);
      Swal.fire(t.prizes.alerts.reorderFailedTitle, e instanceof Error ? e.message : t.prizes.alerts.checkConnection, 'error');
    } finally {
      setReordering(false);
    }
  };

  const writeBook = (rows: (string | number)[][], fileName: string, withGuide: boolean) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet['!cols'] = [{ wch: 8 }, { wch: 34 }, { wch: 14 }, { wch: 44 }, { wch: 8 }, { wch: 16 }, { wch: 30 }, { wch: 10 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Prizes');
    if (withGuide) {
      const guide = XLSX.utils.aoa_to_sheet(templateGuide(t, lang));
      guide['!cols'] = [{ wch: 18 }, { wch: 8 }, { wch: 60 }, { wch: 28 }];
      XLSX.utils.book_append_sheet(book, guide, t.prizes.excel.guideSheet);
    }
    XLSX.writeFile(book, fileName);
  };
  const header = [H('sort_order'), H('name'), H('code'), H('description'), H('quantity'), H('is_active'), H('image')];
  const downloadTemplate = () => writeBook([
    header,
    [1, 'iPhone 16 Pro Max 256GB', 'GRAND-01', t.prizes.excel.sampleGrandDescription, 1, t.common.yes, ''],
    [2, t.prizes.excel.sampleVoucherName, 'VOUCHER-01', t.prizes.excel.sampleVoucherDescription, 10, t.common.yes, ''],
  ], 'prize-import-template.xlsx', true);
  const exportExcel = () => writeBook([
    [...header, t.prizes.excel.awardedHeader],
    ...items.map((p, i) => [
      i + 1, p.name, p.code, p.description, p.quantity, p.is_active ? t.common.yes : t.common.no,
      p.image?.startsWith('data:') ? PRIZE_PHOTO_IN_SYSTEM[lang] : (p.image || ''), p.awarded_count ?? 0,
    ]),
  ], `lucky-draw-prizes-${Date.now()}.xlsx`, true);

  const importExcel = async (file?: File) => {
    if (!file) return;
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(book.Sheets[book.SheetNames[0]], { defval: '', raw: false });
      const { rows, missingName } = mapPrizeRows(records);
      if (missingName) throw new Error(t.prizes.importAlert.missingNameColumn(H('name')));
      if (rows.length === 0) throw new Error(t.prizes.importAlert.noData);
      const invalid = rows.filter((r) => r.error);
      if (invalid.length > 0) {
        await Swal.fire({
          icon: 'error', title: t.prizes.importAlert.invalidTitle,
          html: `<div style="text-align:left;max-height:240px;overflow:auto">${invalid.map((r) => t.prizes.importAlert.rowError(r.row, t.prizes.importAlert.errors[r.error!])).join('<br/>')}</div><p style="margin-top:10px">${t.prizes.importAlert.nothingSaved}</p>`,
        });
        return;
      }
      const byCode = new Set(items.filter((p) => p.code).map((p) => p.code.toLowerCase()));
      const byName = new Set(items.map((p) => p.name.toLowerCase()));
      const updates = rows.filter((r) => (r.code && byCode.has(r.code.toLowerCase())) || byName.has(r.name.toLowerCase())).length;
      const confirm = await Swal.fire({
        icon: 'question', title: t.prizes.importAlert.confirmTitle(rows.length),
        html: t.prizes.importAlert.confirmHtml(updates, rows.length - updates),
        showCancelButton: true, confirmButtonText: t.prizes.importAlert.confirmButton, cancelButtonText: t.common.cancel,
      });
      if (!confirm.isConfirmed) return;
      const result = await api.importPrizes(rows.map((r) => ({ row: r.row, sort_order: r.sort_order, name: r.name, code: r.code, description: r.description, quantity: r.quantity, is_active: r.is_active, image: r.image })));
      await load();
      Swal.fire({ icon: 'success', title: t.prizes.importAlert.successTitle, text: t.prizes.importAlert.successText(result.created, result.updated) });
    } catch (e) {
      Swal.fire(t.prizes.importAlert.failedTitle, e instanceof Error ? e.message : t.prizes.importAlert.unreadable, 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const field = 'w-full bg-surface/65 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-400/60';
  const card = (item: Prize, setItem: (p: Prize) => void, index?: number) => {
    const isNew = index === undefined;
    const soldOut = !isNew && item.awarded_count !== undefined && item.awarded_count >= item.quantity;
    return <div className={`rounded-3xl border p-5 ${isNew ? 'border-emerald-400/50 bg-emerald-500/[.04] shadow-[0_0_30px_rgba(52,211,153,.12)]' : 'border-white/10 bg-white/[.035]'}`}>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className={`inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-xl text-sm font-extrabold border ${isNew ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' : 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-400/30'}`}>{isNew ? <Plus className="w-4 h-4" /> : index + 1}</span>
        <span className="text-sm font-bold text-white">{isNew ? t.prizes.card.newPrize(items.length + 1) : t.prizes.card.order(index + 1)}</span>
        {!isNew && item.code && <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-white/5 border border-white/10 text-slate-300">{item.code}</span>}
        {!isNew && !item.is_active && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-300 border border-slate-400/20">{t.prizes.card.inactive}</span>}
        {soldOut && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-400/30">{t.prizes.card.soldOut}</span>}
        {!isNew && (
          <div className="ml-auto flex items-center gap-1">
            <button type="button" title={t.prizes.card.moveUp} disabled={index === 0 || reordering} onClick={() => move(index, -1)} className="p-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
            <button type="button" title={t.prizes.card.moveDown} disabled={index === items.length - 1 || reordering} onClick={() => move(index, 1)} className="p-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-5">
        <label className="relative h-40 rounded-2xl border border-dashed border-purple-400/30 bg-purple-500/5 overflow-hidden flex items-center justify-center cursor-pointer group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {item.image ? <img src={item.image} alt={item.name || t.prizes.card.imageAlt} className="w-full h-full object-contain p-2" /> : <div className="text-center text-slate-500"><ImagePlus className="w-8 h-8 mx-auto mb-2"/><span className="text-xs">{t.prizes.card.addImage}</span></div>}
          <input type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && readImage(e.target.files[0], image => setItem({ ...item, image }))}/>
        </label>
        <div className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_180px] gap-3"><input className={field} value={item.name} onChange={e => setItem({...item,name:e.target.value})} placeholder={t.prizes.card.namePlaceholder}/><input className={field} value={item.code} onChange={e => setItem({...item,code:e.target.value})} placeholder={t.prizes.card.codePlaceholder}/></div>
          <textarea className={`${field} min-h-20 resize-y`} value={item.description} onChange={e => setItem({...item,description:e.target.value})} placeholder={t.prizes.card.descriptionPlaceholder}/>
          <div className="flex flex-wrap items-center gap-3">
            <label className="text-xs text-slate-400">{t.prizes.card.quantity} <input type="number" min="1" className="ml-2 w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={item.quantity} onChange={e=>setItem({...item,quantity:Number(e.target.value)})}/></label>
            <label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={item.is_active} onChange={e=>setItem({...item,is_active:e.target.checked})}/> {t.prizes.card.active}</label>
            {item.awarded_count !== undefined && <span className="text-xs text-cyan-300">{t.prizes.card.awarded(item.awarded_count, item.quantity)}</span>}
            <div className="ml-auto flex gap-2">
              {isNew && <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold inline-flex gap-2"><X className="w-4 h-4"/>{t.common.cancel}</button>}
              <button onClick={()=>save(item,index)} disabled={saving === (index ?? 'new')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-on-accent font-bold inline-flex gap-2"><Save className="w-4 h-4"/>{t.common.save}</button>
              {item.prize_id && <button onClick={()=>remove(item)} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20"><Trash2 className="w-5 h-5"/></button>}
            </div>
          </div>
        </div>
      </div>
    </div>;
  };

  return <div className="space-y-6">
    <div className="glass-panel rounded-3xl border border-white/10 p-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2"><Gift className="text-fuchsia-400"/>{t.prizes.title}</h2>
          <p className="text-sm text-slate-400 mt-1">{t.prizes.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => importExcel(e.target.files?.[0])} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold text-sm"><Upload className="w-4 h-4" />{t.prizes.actions.importExcel}</button>
          <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 font-semibold text-sm"><FileSpreadsheet className="w-4 h-4 text-emerald-400" />{t.prizes.actions.template}</button>
          <button type="button" onClick={exportExcel} disabled={items.length === 0} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/20 font-semibold text-sm disabled:opacity-40"><Download className="w-4 h-4" />{t.prizes.actions.exportExcel}</button>
          <button type="button" onClick={addPrize} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-on-accent hover:from-fuchsia-500 hover:to-purple-500 font-bold text-sm shadow-lg shadow-fuchsia-500/20"><Plus className="w-4 h-4" />{t.prizes.actions.add}</button>
        </div>
      </div>
      <p className="text-xs text-slate-500 mt-4">
        {t.prizes.excelHint.download} <b className="text-slate-300">{t.prizes.actions.template}</b> {t.prizes.excelHint.guideSheet(t.prizes.excel.guideSheet)} <b className="text-slate-300">{t.prizes.actions.exportExcel}</b> {t.prizes.excelHint.matchBefore}<b className="text-slate-300">{t.prizes.excelHint.matchCode}</b>{t.prizes.excelHint.matchAfter}
      </p>
    </div>
    {draft && <div ref={draftRef}>{card(draft, setDraft)}</div>}
    {loading ? <div className="text-center text-slate-500 py-10">{t.common.loading}</div> : items.map((item,index)=> <div key={item.prize_id}>{card(item,p=>setItems(v=>v.map((x,i)=>i===index?p:x)),index)}</div>)}
    {items.length===0&&!loading&&!draft&&<div className="text-center py-8 text-slate-500"><Plus className="mx-auto mb-2"/>{t.prizes.empty}</div>}
  </div>;
}
