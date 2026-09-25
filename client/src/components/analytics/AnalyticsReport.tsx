'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import api, { OrganizationType, Participant, formatEventDateRange, formatEventLocation, formatEventTimeRange } from '@/lib/api';
import {
  AnalyticsFilters, applyFilters, byOrgType, checkinsByHour, funnel, hasActiveFilters, kpis, registrationsByDay, topCompanies,
} from '@/lib/analytics';
import { OrgKey, orgKeyColor, orgKeyLabel } from '@/lib/orgTypes';
import { usePreferences } from '@/contexts/PreferencesContext';
import { useSettings } from '@/contexts/SettingsContext';
import ShareBar from './ShareBar';
import TrendArea from './TrendArea';
import HourColumns from './HourColumns';
import { CHART_THEMES } from './chartTheme';
import styles from './AnalyticsReport.module.css';

const pad = (n: number) => String(n).padStart(2, '0');
const CHART_WIDTH = 600; // ≈ 160 mm printable width at 96 dpi
const light = CHART_THEMES.light;

/** Printable A4 summary of the analytics for the given filters (always light, paper-like). */
export default function AnalyticsReport({ filters }: { filters: AnalyticsFilters }) {
  const { t, lang } = usePreferences();
  const tr = t.report;
  const ta = t.analytics;
  const locale = t.common.locale;
  const { settings } = useSettings();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [winnerIds, setWinnerIds] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [generatedAt] = useState(() => new Date());

  useEffect(() => {
    Promise.all([api.getParticipants(), api.getOrganizationTypes(), api.getLuckyDrawWinners()])
      .then(([ps, ts, ws]) => {
        setParticipants(ps);
        setTypes(ts);
        setWinnerIds(new Set(ws.map((w) => w.participant_id).filter((id): id is number => typeof id === 'number')));
      })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => n.toLocaleString(locale);
  const labels = { other: t.orgTypes.other, none: t.orgTypes.none };
  const orgLabel = (key: OrgKey) => orgKeyLabel(key, types, lang, labels);
  const orgColor = (key: OrgKey) => orgKeyColor(key, types, 'light');
  const dayLabel = (day: string, short = false) => {
    const [y, m, d] = day.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(locale, short ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'long', year: 'numeric' });
  };
  const hourLabel = (h: number, range = false) => (range ? `${pad(h)}:00–${pad(h + 1)}:00${t.common.timeSuffix}` : `${pad(h)}:00`);
  const dateTime = (d: Date) => d.toLocaleString(locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const data = useMemo(() => {
    const rows = applyFilters(participants, filters);
    // a report scoped to some organization types lists only those types
    const org = byOrgType(rows, types).filter((r) => !filters.orgKeys.length || filters.orgKeys.includes(r.key));
    return {
      rows,
      k: kpis(rows),
      org,
      days: registrationsByDay(rows),
      hours: checkinsByHour(rows),
      companies: topCompanies(rows, 10),
      stages: funnel(rows, winnerIds),
    };
  }, [participants, types, winnerIds, filters]);

  // Scope line: human-readable filters (or "all attendees")
  const scope: string[] = [];
  if (filters.from || filters.to) scope.push(`${ta.filters.dateRange}: ${filters.from ? dateTime(new Date(filters.from)) : '…'} – ${filters.to ? dateTime(new Date(filters.to)) : '…'}`);
  if (filters.orgKeys.length) scope.push(`${ta.filters.orgType}: ${filters.orgKeys.map(orgLabel).join(', ')}`);
  if (filters.status !== 'all') scope.push(`${ta.filters.status}: ${filters.status === 'checked' ? ta.filters.statusChecked : ta.filters.statusPending}`);
  if (filters.attendeeType !== 'all') scope.push(`${ta.filters.attendeeType}: ${t.common.attendeeType[filters.attendeeType]}`);
  if (filters.day) scope.push(ta.filters.chipDay(dayLabel(filters.day)));
  if (filters.hour !== null) scope.push(ta.filters.chipHour(hourLabel(filters.hour, true)));
  if (filters.search) scope.push(ta.filters.chipSearch(filters.search));

  const { k, org, days, hours, companies, stages } = data;
  const topOrg = [...org].sort((a, b) => b.registered - a.registered)[0];
  const peakDay = days.reduce<(typeof days)[number] | null>((best, d) => (d.count > (best?.count ?? 0) ? d : best), null);
  const eventDate = [formatEventDateRange(settings.event_start, settings.event_end, locale), formatEventTimeRange(settings.event_start, settings.event_end, locale)].filter(Boolean).join(' · ');
  const venue = formatEventLocation(settings);
  const pageLabel = tr.pageOf.replace(/"/g, '');

  return (
    <div className="theme-print">
      {/* A4 portrait, Thai official-document margins; page number bottom-right (Chrome 131+) */}
      <style>{`@page { size: A4 portrait; margin: 25mm 20mm 20mm 30mm; background: #ffffff; @bottom-right { content: "${pageLabel} " counter(page) " / " counter(pages); font-family: Sarabun, sans-serif; font-size: 9pt; color: #6b7280; } }`}</style>

      <div className={`${styles.toolbar} flex flex-wrap items-center justify-between gap-3`}>
        <div>
          <h1 className="text-xl font-extrabold text-white">{tr.previewTitle}</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{tr.previewHint}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard?tab=analytics" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm font-semibold"><ArrowLeft className="w-4 h-4" />{tr.back}</Link>
          <button type="button" onClick={() => window.print()} disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent text-sm font-bold disabled:opacity-50"><Printer className="w-4 h-4" />{tr.print}</button>
        </div>
      </div>

      <article className={styles.sheet} aria-busy={loading}>
        {/* not a <header>: the ticket print CSS hides every header element */}
        <div className={styles.header}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {settings.event_logo && <img src={settings.event_logo} alt="" className={styles.logo} />}
          <div>
            <div className={styles.eventName}>{settings.event_name}</div>
            {settings.organizer_name && <div className={styles.organizer}>{tr.organizerLabel}: {settings.organizer_name}</div>}
          </div>
        </div>
        <div className={styles.rule} />
        <h1 className={styles.title}>{tr.title}</h1>
        <dl className={styles.meta}>
          <dt>{tr.eventLabel}</dt><dd>{settings.event_name}</dd>
          <dt>{tr.dateLabel}</dt><dd>{eventDate || tr.noDate}</dd>
          <dt>{tr.venueLabel}</dt><dd>{venue || tr.noDate}</dd>
          <dt>{tr.generatedAt}</dt><dd>{dateTime(generatedAt)}</dd>
          <dt>{tr.scope}</dt><dd>{hasActiveFilters(filters) ? scope.join(' · ') : tr.allData}</dd>
        </dl>

        {loading ? (
          <p>{tr.loading}</p>
        ) : (
          <>
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{tr.sections.summary}</h2>
              <p className={styles.paragraph}>{tr.summaryText(fmt(k.registered), fmt(k.checkedIn), String(k.showUpRate), fmt(k.organizations))}</p>
              <div className={styles.kpis}>
                {[
                  [ta.kpi.registered, fmt(k.registered), tr.unitPeople],
                  [ta.kpi.checkedIn, fmt(k.checkedIn), tr.unitPeople],
                  [ta.kpi.showUp, `${k.showUpRate}%`, ''],
                  [ta.kpi.vip, fmt(k.vip), tr.unitPeople],
                  [ta.kpi.organizations, fmt(k.organizations), tr.unitOrgs],
                  [ta.kpi.peak, k.peakHour ? hourLabel(k.peakHour.hour, true) : '—', k.peakHour ? ta.kpi.peakCount(k.peakHour.count) : ta.kpi.noPeak],
                ].map(([label, value, sub]) => (
                  <div key={label} className={styles.kpi}>
                    <div className={styles.kpiLabel}>{label}</div>
                    <div className={styles.kpiValue}>{value}</div>
                    {sub && <div className={styles.kpiSub}>{sub}</div>}
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{tr.sections.byOrg}</h2>
              {topOrg && topOrg.registered > 0 && <p className={styles.paragraph}>{tr.byOrgText(orgLabel(topOrg.key), String(topOrg.share))}</p>}
              <div className={styles.chart}>
                <ShareBar
                  rows={org.map((r) => ({ key: r.key, label: orgLabel(r.key), color: orgColor(r.key), count: r.registered, share: r.share }))}
                  selected={[]}
                  theme={light}
                  fmt={fmt}
                  interactive={false}
                  showLegend={false}
                />
              </div>
              <table className={styles.table}>
                <thead>
                  <tr><th>#</th><th>{ta.table.category}</th><th>{ta.table.registered}</th><th>{ta.table.share}</th><th>{ta.table.checkedIn}</th><th>{ta.table.rate}</th></tr>
                </thead>
                <tbody>
                  {org.map((r, i) => (
                    <tr key={String(r.key)}>
                      <td className={styles.center}>{i + 1}</td>
                      <td><span className={styles.swatch} style={{ background: orgColor(r.key) }} />{orgLabel(r.key)}</td>
                      <td className={styles.num}>{fmt(r.registered)}</td>
                      <td className={styles.num}>{r.share}%</td>
                      <td className={styles.num}>{fmt(r.checkedIn)}</td>
                      <td className={styles.num}>{r.showUpRate}%</td>
                    </tr>
                  ))}
                  {/* total as the last body row (a <tfoot> would repeat on every printed page) */}
                  <tr className={styles.totalRow}>
                    <td colSpan={2}>{ta.table.total}</td>
                    <td className={styles.num}>{fmt(k.registered)}</td>
                    <td className={styles.num}>{k.registered ? '100%' : '0%'}</td>
                    <td className={styles.num}>{fmt(k.checkedIn)}</td>
                    <td className={styles.num}>{k.showUpRate}%</td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{tr.sections.trend}</h2>
              {days.length && peakDay ? (
                <>
                  <p className={styles.paragraph}>{tr.trendText(dayLabel(days[0].day), dayLabel(days[days.length - 1].day), dayLabel(peakDay.day), fmt(peakDay.count))}</p>
                  <div className={styles.chart}>
                    <TrendArea points={days} theme={light} dayLabel={dayLabel} fmt={fmt} fixedWidth={CHART_WIDTH}
                      labels={{ cumulative: ta.charts.trend.cumulative, newThatDay: ta.charts.trend.newThatDay }} />
                  </div>
                </>
              ) : <p className={styles.paragraph}>{tr.noRegistrations}</p>}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{tr.sections.hours}</h2>
              {hours.length && k.peakHour ? (
                <>
                  <p className={styles.paragraph}>{tr.hoursText(hourLabel(k.peakHour.hour, true), fmt(k.peakHour.count))}</p>
                  <div className={styles.chart}>
                    <HourColumns points={hours} theme={light} hourLabel={hourLabel} fmt={fmt} seriesLabel={ta.charts.hours.checkins} fixedWidth={CHART_WIDTH} />
                  </div>
                </>
              ) : <p className={styles.paragraph}>{tr.noCheckins}</p>}
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{tr.sections.companies}</h2>
              <table className={`${styles.table} ${styles.keep}`}>
                <thead><tr><th>#</th><th>{ta.table.company}</th><th>{ta.table.registered}</th><th>{ta.table.checkedIn}</th></tr></thead>
                <tbody>
                  {companies.map((c, i) => (
                    <tr key={c.company}>
                      <td className={styles.center}>{i + 1}</td>
                      <td>{c.company}</td>
                      <td className={styles.num}>{fmt(c.registered)}</td>
                      <td className={styles.num}>{fmt(c.checkedIn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>{tr.sections.funnel}</h2>
              <table className={`${styles.table} ${styles.keep}`}>
                <thead><tr><th>{ta.table.stage}</th><th>{ta.table.count}</th><th>{ta.table.ofPrevious}</th></tr></thead>
                <tbody>
                  {stages.map((s) => (
                    <tr key={s.stage}>
                      <td>{ta.charts.funnel[s.stage]}</td>
                      <td className={styles.num}>{fmt(s.count)}</td>
                      <td className={styles.num}>{s.ofPrevious === null ? '—' : `${s.ofPrevious}%`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <p className={styles.note}>{tr.privacyNote}</p>

            <div className={styles.signatures}>
              {[tr.signatures.preparedBy, tr.signatures.approvedBy].map((role) => (
                <div key={role} className={styles.signature}>
                  <div>{tr.signatures.sign} ....................................................</div>
                  <div>( .................................................... )</div>
                  <div>{tr.signatures.position} ..............................................</div>
                  <div>{role}</div>
                  <div>{tr.signatures.date} ........ / ........ / ............</div>
                </div>
              ))}
            </div>
          </>
        )}
      </article>
    </div>
  );
}
