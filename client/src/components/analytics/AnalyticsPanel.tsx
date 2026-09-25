'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2, CalendarRange, Clock, Crown, Filter, PieChart, Printer, Route, Search, TrendingUp, Trophy, UserCheck, Users, X,
} from 'lucide-react';
import api, { OrganizationType, Participant } from '@/lib/api';
import {
  AnalyticsFilters, DatePreset, EMPTY_FILTERS, applyFilters, byOrgType, checkinsByHour, filtersToQuery,
  funnel, hasActiveFilters, kpis, presetRange, registrationsByDay, topCompanies,
} from '@/lib/analytics';
import { OrgKey, orgKeyColor, orgKeyLabel } from '@/lib/orgTypes';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useSettings } from '@/contexts/SettingsContext';
import ChartCard, { DataTable } from './ChartCard';
import ShareBar from './ShareBar';
import OrgMeters from './OrgMeters';
import TrendArea from './TrendArea';
import HourColumns from './HourColumns';
import RankBars from './RankBars';
import FunnelBars from './FunnelBars';
import KpiTiles from './KpiTiles';
import { CHART_THEMES } from './chartTheme';

const pad = (n: number) => String(n).padStart(2, '0');
const control = 'bg-surface/60 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-400/60';

/**
 * Dashboard "Reports & charts" tab. One filter row scopes every chart; clicking a chart mark
 * adds a cross-filter. A chart never filters itself by its own dimension — it highlights the
 * selection instead, so the reader keeps the context and can pick another value.
 */
export default function AnalyticsPanel({ participants, loading }: { participants: Participant[]; loading: boolean }) {
  const { t, lang, theme } = usePreferences();
  const ta = t.analytics;
  const locale = t.common.locale;
  const chart = CHART_THEMES[theme];
  const { settings } = useSettings();
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [winnerIds, setWinnerIds] = useState<Set<number>>(new Set());
  const [filters, setFilters] = useState<AnalyticsFilters>(EMPTY_FILTERS);
  const [preset, setPreset] = useState<DatePreset>('all');
  const [orgMenuOpen, setOrgMenuOpen] = useState(false);
  const orgMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getOrganizationTypes().then(setTypes);
    api.getLuckyDrawWinners().then((ws) => setWinnerIds(new Set(ws.map((w) => w.participant_id).filter((id): id is number => typeof id === 'number'))));
  }, []);

  useEffect(() => {
    if (!orgMenuOpen) return;
    const close = (e: MouseEvent) => { if (!orgMenuRef.current?.contains(e.target as Node)) setOrgMenuOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [orgMenuOpen]);

  const fmt = (n: number) => n.toLocaleString(locale);
  const labels = { other: t.orgTypes.other, none: t.orgTypes.none };
  const orgLabel = (key: OrgKey) => orgKeyLabel(key, types, lang, labels);
  const orgColor = (key: OrgKey) => orgKeyColor(key, types, theme);
  const dayLabel = (day: string, short = false) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const hourLabel = (h: number, range = false) => (range ? `${pad(h)}:00–${pad(h + 1)}:00${t.common.timeSuffix}` : `${pad(h)}:00`);
  const rangeLabel = (v: string) => new Date(v).toLocaleString(locale, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // each chart ignores its own dimension (cross-filter highlight instead of self-filter)
  const all = useMemo(() => applyFilters(participants, filters), [participants, filters]);
  const withoutOrg = useMemo(() => applyFilters(participants, { ...filters, orgKeys: [] }), [participants, filters]);
  const withoutDay = useMemo(() => applyFilters(participants, { ...filters, day: '' }), [participants, filters]);
  const withoutHour = useMemo(() => applyFilters(participants, { ...filters, hour: null }), [participants, filters]);

  const k = kpis(all);
  const orgRows = byOrgType(withoutOrg, types);
  const days = registrationsByDay(withoutDay);
  const hours = checkinsByHour(withoutHour);
  const companies = topCompanies(all, 10);
  const stages = funnel(all, winnerIds);

  const toggleOrg = (key: OrgKey) =>
    setFilters((f) => ({ ...f, orgKeys: f.orgKeys.includes(key) ? f.orgKeys.filter((x) => x !== key) : [...f.orgKeys, key] }));
  const applyPreset = (p: DatePreset) => {
    setPreset(p);
    setFilters((f) => ({ ...f, ...presetRange(p, new Date(), settings.event_start, settings.event_end) }));
  };
  const clearAll = () => { setFilters(EMPTY_FILTERS); setPreset('all'); };
  const printReport = () => window.open(`/dashboard/report${filtersToQuery(filters) ? `?${filtersToQuery(filters)}` : ''}`, '_blank');

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.search) chips.push({ key: 'q', label: ta.filters.chipSearch(filters.search), clear: () => setFilters((f) => ({ ...f, search: '' })) });
  filters.orgKeys.forEach((key) => chips.push({ key: `org-${key}`, label: orgLabel(key), clear: () => toggleOrg(key) }));
  if (filters.status !== 'all') chips.push({ key: 'status', label: filters.status === 'checked' ? ta.filters.statusChecked : ta.filters.statusPending, clear: () => setFilters((f) => ({ ...f, status: 'all' })) });
  if (filters.attendeeType !== 'all') chips.push({ key: 'type', label: t.common.attendeeType[filters.attendeeType], clear: () => setFilters((f) => ({ ...f, attendeeType: 'all' })) });
  if (filters.from || filters.to) chips.push({ key: 'range', label: ta.filters.chipRange(`${filters.from ? rangeLabel(filters.from) : '…'} – ${filters.to ? rangeLabel(filters.to) : '…'}`), clear: () => { setPreset('all'); setFilters((f) => ({ ...f, from: '', to: '' })); } });
  if (filters.day) chips.push({ key: 'day', label: ta.filters.chipDay(dayLabel(filters.day)), clear: () => setFilters((f) => ({ ...f, day: '' })) });
  if (filters.hour !== null) chips.push({ key: 'hour', label: ta.filters.chipHour(hourLabel(filters.hour, true)), clear: () => setFilters((f) => ({ ...f, hour: null })) });

  const presets: DatePreset[] = ['all', 'today', 'last7', 'last30', 'event'];
  const orgChoices: OrgKey[] = [...types.map((x) => x.id), 'other', 'none'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-2"><PieChart className="w-6 h-6 text-cyan-400" />{ta.title}</h2>
          <p className="text-sm text-slate-400 mt-1">{ta.subtitle}</p>
        </div>
        <button type="button" onClick={printReport} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-on-accent text-sm font-bold shadow-lg shadow-indigo-500/20">
          <Printer className="w-4 h-4" />{ta.printReport}
        </button>
      </div>

      {/* One filter row scoping everything below */}
      <div className="glass-panel rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex-1 min-w-[14rem] space-y-1">
            <span className="text-xs text-slate-400">{ta.filters.search}</span>
            <span className="relative block">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className={`${control} w-full pl-9`} value={filters.search} placeholder={ta.filters.searchPlaceholder} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
            </span>
          </label>
          <div className="relative space-y-1" ref={orgMenuRef}>
            <span className="block text-xs text-slate-400">{ta.filters.orgType}</span>
            <button type="button" onClick={() => setOrgMenuOpen((v) => !v)} aria-expanded={orgMenuOpen} className={`${control} inline-flex items-center gap-2 min-w-[12rem] justify-between`}>
              <span className="truncate">{filters.orgKeys.length === 0 ? t.orgTypes.filterAll : filters.orgKeys.length === 1 ? orgLabel(filters.orgKeys[0]) : `${ta.filters.orgType} (${filters.orgKeys.length})`}</span>
              <Filter className="w-4 h-4 text-slate-400" />
            </button>
            {orgMenuOpen && (
              <div className="absolute z-30 mt-2 w-80 max-h-80 overflow-auto glass-panel-glow rounded-2xl border border-white/10 p-2 shadow-2xl">
                {orgChoices.map((key) => (
                  <label key={String(key)} className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer text-sm text-slate-200">
                    <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={filters.orgKeys.includes(key)} onChange={() => toggleOrg(key)} />
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: orgColor(key) }} />
                    <span className="truncate">{orgLabel(key)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <label className="space-y-1">
            <span className="block text-xs text-slate-400">{ta.filters.status}</span>
            <select className={control} value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as AnalyticsFilters['status'] }))}>
              <option value="all" className="bg-slate-900">{ta.filters.statusAll}</option>
              <option value="checked" className="bg-slate-900">{ta.filters.statusChecked}</option>
              <option value="pending" className="bg-slate-900">{ta.filters.statusPending}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-400">{ta.filters.attendeeType}</span>
            <select className={control} value={filters.attendeeType} onChange={(e) => setFilters((f) => ({ ...f, attendeeType: e.target.value as AnalyticsFilters['attendeeType'] }))}>
              <option value="all" className="bg-slate-900">{ta.filters.attendeeAll}</option>
              <option value="General" className="bg-slate-900">{t.common.attendeeType.General}</option>
              <option value="VIP" className="bg-slate-900">{t.common.attendeeType.VIP}</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <span className="flex items-center gap-1.5 text-xs text-slate-400"><CalendarRange className="w-3.5 h-3.5" />{ta.filters.dateRange}</span>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={ta.filters.dateRange}>
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => applyPreset(p)} aria-pressed={preset === p}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border transition-colors ${preset === p ? 'bg-indigo-600 text-on-accent border-indigo-400' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}>
                  {ta.filters.presets[p]}
                </button>
              ))}
            </div>
          </div>
          <label className="space-y-1">
            <span className="block text-xs text-slate-400">{ta.filters.from}</span>
            <input type="datetime-local" className={`${control} scheme-dark`} value={filters.from} max={filters.to || undefined}
              onChange={(e) => { setPreset('all'); setFilters((f) => ({ ...f, from: e.target.value })); }} />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-slate-400">{ta.filters.to}</span>
            <input type="datetime-local" className={`${control} scheme-dark`} value={filters.to} min={filters.from || undefined}
              onChange={(e) => { setPreset('all'); setFilters((f) => ({ ...f, to: e.target.value })); }} />
          </label>
          <span className="ml-auto text-sm text-slate-400 self-center">{ta.filters.showing(all.length, participants.length)}</span>
        </div>
        {hasActiveFilters(filters) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-400">{ta.filters.active}</span>
            {chips.map((c) => (
              <button key={c.key} type="button" onClick={c.clear} title={ta.filters.removeFilter}
                className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-200 border border-indigo-400/30 hover:bg-indigo-500/25">
                {c.label}<X className="w-3.5 h-3.5" />
              </button>
            ))}
            <button type="button" onClick={clearAll} className="text-xs font-semibold text-rose-300 hover:text-rose-200 ml-1">{ta.filters.clear}</button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-panel rounded-3xl p-12 text-center text-slate-400">{ta.loading}</div>
      ) : (
        <>
          <KpiTiles
            tiles={[
              { id: 'reg', label: ta.kpi.registered, value: fmt(k.registered), sub: ta.kpi.pending(k.pending), icon: <Users className="w-4 h-4" />, tone: 'text-indigo-300', active: filters.status === 'all', onClick: () => setFilters((f) => ({ ...f, status: 'all' })) },
              { id: 'in', label: ta.kpi.checkedIn, value: fmt(k.checkedIn), sub: ta.kpi.ofRegistered(k.registered), icon: <UserCheck className="w-4 h-4" />, tone: 'text-emerald-300', active: filters.status === 'checked', onClick: () => setFilters((f) => ({ ...f, status: f.status === 'checked' ? 'all' : 'checked' })) },
              { id: 'rate', label: ta.kpi.showUp, value: `${k.showUpRate}%`, icon: <TrendingUp className="w-4 h-4" />, tone: 'text-cyan-300' },
              { id: 'vip', label: ta.kpi.vip, value: fmt(k.vip), icon: <Crown className="w-4 h-4" />, tone: 'text-amber-300', active: filters.attendeeType === 'VIP', onClick: () => setFilters((f) => ({ ...f, attendeeType: f.attendeeType === 'VIP' ? 'all' : 'VIP' })) },
              { id: 'orgs', label: ta.kpi.organizations, value: fmt(k.organizations), sub: ta.kpi.distinctCompanies, icon: <Building2 className="w-4 h-4" />, tone: 'text-purple-300' },
              { id: 'peak', label: ta.kpi.peak, value: k.peakHour ? hourLabel(k.peakHour.hour, true) : '—', sub: k.peakHour ? ta.kpi.peakCount(k.peakHour.count) : ta.kpi.noPeak, icon: <Clock className="w-4 h-4" />, tone: 'text-rose-300' },
            ]}
          />

          {all.length === 0 && <div className="glass-panel rounded-2xl p-6 text-center text-slate-400">{ta.empty}</div>}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <ChartCard
              title={ta.charts.share.title}
              subtitle={ta.charts.share.subtitle}
              icon={<PieChart className="w-5 h-5 text-indigo-300" />}
              table={<DataTable head={[ta.table.category, ta.table.registered, ta.table.share]} rows={orgRows.map((r) => [orgLabel(r.key), fmt(r.registered), `${r.share}%`])} />}
            >
              <ShareBar
                rows={orgRows.map((r) => ({ key: r.key, label: orgLabel(r.key), color: orgColor(r.key), count: r.registered, share: r.share }))}
                selected={filters.orgKeys}
                onToggle={toggleOrg}
                theme={chart}
                fmt={fmt}
              />
            </ChartCard>
            <ChartCard
              title={ta.charts.orgRate.title}
              subtitle={ta.charts.orgRate.subtitle}
              icon={<UserCheck className="w-5 h-5 text-emerald-300" />}
              table={<DataTable head={[ta.table.category, ta.table.registered, ta.table.checkedIn, ta.table.rate]} rows={orgRows.map((r) => [orgLabel(r.key), fmt(r.registered), fmt(r.checkedIn), `${r.showUpRate}%`])} />}
            >
              <OrgMeters
                rows={orgRows.map((r) => ({ key: r.key, label: orgLabel(r.key), color: orgColor(r.key), registered: r.registered, checkedIn: r.checkedIn, rate: r.showUpRate }))}
                selected={filters.orgKeys}
                onToggle={toggleOrg}
                theme={chart}
                fmtOf={ta.charts.orgRate.of}
              />
            </ChartCard>

            <ChartCard
              title={ta.charts.trend.title}
              subtitle={ta.charts.trend.subtitle}
              icon={<TrendingUp className="w-5 h-5 text-cyan-300" />}
              table={<DataTable head={[ta.table.day, ta.table.newRegistrations, ta.table.cumulative]} rows={days.map((d) => [dayLabel(d.day), fmt(d.count), fmt(d.cumulative)])} />}
            >
              {days.length ? (
                <TrendArea
                  points={days}
                  theme={chart}
                  selectedDay={filters.day}
                  onSelectDay={(day) => setFilters((f) => ({ ...f, day: f.day === day ? '' : day }))}
                  dayLabel={dayLabel}
                  fmt={fmt}
                  labels={{ cumulative: ta.charts.trend.cumulative, newThatDay: ta.charts.trend.newThatDay }}
                />
              ) : <p className="text-sm text-slate-400 py-10 text-center">{ta.empty}</p>}
            </ChartCard>
            <ChartCard
              title={ta.charts.hours.title}
              subtitle={ta.charts.hours.subtitle}
              icon={<Clock className="w-5 h-5 text-amber-300" />}
              table={<DataTable head={[ta.table.hour, ta.table.checkins]} rows={hours.map((h) => [hourLabel(h.hour, true), fmt(h.count)])} />}
            >
              {hours.length ? (
                <HourColumns
                  points={hours}
                  theme={chart}
                  selectedHour={filters.hour}
                  onSelectHour={(hour) => setFilters((f) => ({ ...f, hour: f.hour === hour ? null : hour }))}
                  hourLabel={hourLabel}
                  fmt={fmt}
                  seriesLabel={ta.charts.hours.checkins}
                />
              ) : <p className="text-sm text-slate-400 py-10 text-center">{ta.charts.hours.empty}</p>}
            </ChartCard>

            <ChartCard
              title={ta.charts.companies.title}
              subtitle={ta.charts.companies.subtitle}
              icon={<Building2 className="w-5 h-5 text-purple-300" />}
              table={<DataTable head={[ta.table.company, ta.table.registered, ta.table.checkedIn]} rows={companies.map((c) => [c.company, fmt(c.registered), fmt(c.checkedIn)])} />}
            >
              {companies.length ? (
                <RankBars
                  rows={companies}
                  theme={chart}
                  fmt={fmt}
                  activeSearch={filters.search}
                  onSelect={(company) => setFilters((f) => ({ ...f, search: f.search.toLowerCase() === company.toLowerCase() ? '' : company }))}
                />
              ) : <p className="text-sm text-slate-400 py-10 text-center">{ta.empty}</p>}
            </ChartCard>
            <ChartCard
              title={ta.charts.funnel.title}
              subtitle={ta.charts.funnel.subtitle}
              icon={<Route className="w-5 h-5 text-sky-300" />}
              table={<DataTable head={[ta.table.stage, ta.table.count, ta.table.ofPrevious]} rows={stages.map((s) => [ta.charts.funnel[s.stage], fmt(s.count), s.ofPrevious === null ? '—' : `${s.ofPrevious}%`])} />}
            >
              <FunnelBars
                stages={stages}
                theme={chart}
                fmt={fmt}
                stageLabel={(s) => ta.charts.funnel[s]}
                ofPreviousLabel={ta.charts.funnel.ofPrevious}
              />
              <p className="mt-4 text-xs text-slate-500 flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-amber-300" />{ta.charts.funnel.subtitle}</p>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
}
