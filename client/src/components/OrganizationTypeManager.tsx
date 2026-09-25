'use client';

import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { ArrowDown, ArrowUp, Building2, Check, Info, Plus, Save, Trash2, X } from 'lucide-react';
import api, { OrganizationType } from '@/lib/api';
import { ORG_COLOR_SLOTS, nextFreeSlot, orgTypeName, slotColor } from '@/lib/orgTypes';
import { usePreferences } from '@/contexts/PreferencesContext';

type Draft = Pick<OrganizationType, 'name_th' | 'name_en' | 'color' | 'is_active'> & { id?: number };

const field = 'w-full bg-surface/60 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400/60';

/** Settings tab: the organization types attendees pick on /register (and that group the analytics). */
export default function OrganizationTypeManager() {
  const { t, theme, lang } = usePreferences();
  const tt = t.orgTypes;
  const [items, setItems] = useState<OrganizationType[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<number | 'new' | 'order' | null>(null);
  const draftRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try { setItems(await api.getOrganizationTypes()); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const fail = (e: unknown) => {
    const code = (e as { code?: string })?.code;
    Swal.fire(tt.saveFailed, (code && tt.errors[code]) || (e instanceof Error && code ? e.message : t.common.connectionError), 'error');
  };

  const save = async (item: Draft, key: number | 'new') => {
    if (!item.name_th.trim()) { Swal.fire(tt.nameRequired, '', 'warning'); return; }
    setBusy(key);
    try {
      await api.saveOrganizationType(item);
      if (key === 'new') setDraft(null);
      await load();
      Swal.fire({ icon: 'success', title: tt.saved, timer: 1200, showConfirmButton: false });
    } catch (e) { fail(e); } finally { setBusy(null); }
  };

  const remove = async (item: OrganizationType) => {
    if ((item.usage_count ?? 0) > 0) {
      Swal.fire({ icon: 'info', title: tt.deleteTitle, text: tt.deleteInUse(item.usage_count ?? 0) });
      return;
    }
    const ok = await Swal.fire({
      icon: 'warning', title: tt.deleteTitle, text: orgTypeName(item, lang), showCancelButton: true,
      confirmButtonText: t.common.delete, cancelButtonText: t.common.cancel, confirmButtonColor: '#e11d48',
    });
    if (!ok.isConfirmed) return;
    try {
      await api.deleteOrganizationType(item.id);
      await load();
      Swal.fire({ icon: 'success', title: tt.deleted, timer: 1000, showConfirmButton: false });
    } catch (e) {
      const err = e as Error & { code?: string; usage?: number };
      if (err.code === 'IN_USE') Swal.fire({ icon: 'info', title: tt.deleteTitle, text: tt.deleteInUse(err.usage ?? 0) });
      else fail(e);
    }
  };

  // Only sort_order is saved, so unsaved edits on other rows stay on screen
  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= items.length || busy) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setBusy('order');
    try {
      const saved = await api.reorderOrganizationTypes(next.map((i) => i.id));
      const order = new Map(saved.map((s) => [s.id, s.sort_order]));
      setItems((cur) => cur.map((i) => ({ ...i, sort_order: order.get(i.id) ?? i.sort_order })));
    } catch (e) { setItems(items); fail(e); } finally { setBusy(null); }
  };

  const addType = () => {
    setDraft((d) => d ?? { name_th: '', name_en: '', color: nextFreeSlot(items), is_active: true });
    window.setTimeout(() => {
      draftRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      draftRef.current?.querySelector('input')?.focus({ preventScroll: true });
    }, 50);
  };

  const row = (item: Draft, setItem: (d: Draft) => void, index?: number) => {
    const isNew = index === undefined;
    const saved = isNew ? undefined : items[index];
    const key = isNew ? 'new' : (item.id as number);
    return (
      <div className={`rounded-2xl border p-4 sm:p-5 ${isNew ? 'border-emerald-400/50 bg-emerald-500/[.04]' : 'border-white/10 bg-white/[.03]'}`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center justify-center min-w-8 h-8 px-2 rounded-lg text-sm font-extrabold border ${isNew ? 'bg-emerald-500/15 text-emerald-200 border-emerald-400/40' : 'bg-indigo-500/15 text-indigo-200 border-indigo-400/30'}`}>
            {isNew ? <Plus className="w-4 h-4" /> : index + 1}
          </span>
          <span className="text-sm font-bold text-white">{isNew ? tt.newRow : tt.order(index + 1)}</span>
          <span className="w-3.5 h-3.5 rounded-full" style={{ background: slotColor(item.color, theme) }} aria-hidden="true" />
          {saved && !saved.is_active && <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-500/15 text-slate-300 border border-slate-400/20">{tt.hiddenBadge}</span>}
          {saved && <span className="text-xs text-slate-400">{tt.usage(saved.usage_count ?? 0)}</span>}
          {!isNew && (
            <div className="ml-auto flex items-center gap-1">
              <button type="button" title={tt.moveUp} aria-label={tt.moveUp} disabled={index === 0 || !!busy} onClick={() => move(index, -1)} className="p-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
              <button type="button" title={tt.moveDown} aria-label={tt.moveDown} disabled={index === items.length - 1 || !!busy} onClick={() => move(index, 1)} className="p-2 rounded-lg border border-white/10 bg-white/5 text-slate-300 hover:text-white disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="text-xs text-slate-400">{tt.nameTh}</span>
            <input className={field} value={item.name_th} maxLength={150} placeholder={tt.nameThPlaceholder} onChange={(e) => setItem({ ...item, name_th: e.target.value })} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-slate-400">{tt.nameEn}</span>
            <input className={field} value={item.name_en} maxLength={150} placeholder={tt.nameEnPlaceholder} onChange={(e) => setItem({ ...item, name_en: e.target.value })} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-3">
          <div className="flex items-center gap-2" role="radiogroup" aria-label={tt.color}>
            <span className="text-xs text-slate-400 mr-1">{tt.color}</span>
            {ORG_COLOR_SLOTS.map((slot) => (
              <button
                key={slot}
                type="button"
                role="radio"
                aria-checked={item.color === slot}
                aria-label={tt.colors[slot]}
                title={tt.colors[slot]}
                onClick={() => setItem({ ...item, color: slot })}
                className={`w-7 h-7 rounded-full flex items-center justify-center ring-offset-2 ring-offset-surface transition-transform ${item.color === slot ? 'ring-2 ring-indigo-400 scale-110' : 'hover:scale-110'}`}
                style={{ background: slotColor(slot, theme) }}
              >
                {item.color === slot && <Check className="w-4 h-4 text-on-accent" />}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={item.is_active} onChange={(e) => setItem({ ...item, is_active: e.target.checked })} />
            {tt.active}
          </label>
          <div className="ml-auto flex gap-2">
            {isNew && (
              <button type="button" onClick={() => setDraft(null)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-semibold inline-flex items-center gap-2"><X className="w-4 h-4" />{t.common.cancel}</button>
            )}
            <button type="button" disabled={busy === key} onClick={() => save(item, key)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent font-bold inline-flex items-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" />{t.common.save}</button>
            {saved && (
              <button type="button" title={t.common.delete} aria-label={t.common.delete} onClick={() => remove(saved)} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20"><Trash2 className="w-5 h-5" /></button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-3xl border border-white/10 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2"><Building2 className="w-5 h-5 text-cyan-400" />{tt.managerTitle}</h2>
            <p className="text-sm text-slate-400 mt-1">{tt.managerSubtitle}</p>
          </div>
          <button type="button" onClick={addType} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent font-bold text-sm shadow-lg shadow-indigo-500/20"><Plus className="w-4 h-4" />{tt.add}</button>
        </div>
        <ul className="mt-4 space-y-1.5 text-xs text-slate-400">
          <li className="flex gap-2"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />{tt.otherNote}</li>
          <li className="flex gap-2"><Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-cyan-400" />{tt.colorNote}</li>
        </ul>
      </div>

      {draft && <div ref={draftRef}>{row(draft, setDraft)}</div>}
      {loading ? (
        <div className="text-center text-slate-500 py-8">{t.common.loading}</div>
      ) : items.length === 0 && !draft ? (
        <div className="text-center text-slate-500 py-8">{tt.empty}</div>
      ) : (
        items.map((item, index) => (
          <div key={item.id}>{row(item, (d) => setItems((cur) => cur.map((x, i) => (i === index ? { ...x, ...d } : x))), index)}</div>
        ))
      )}
    </div>
  );
}
