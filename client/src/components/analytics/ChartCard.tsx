'use client';

import { useState, type ReactNode } from 'react';
import { BarChart3, Table2 } from 'lucide-react';
import { useT } from '@/contexts/PreferencesContext';

/**
 * A chart "figure": title, subtitle, and a chart ⇄ table toggle (the table is the
 * accessible twin of every chart, so no value is reachable only by hovering).
 */
export default function ChartCard({
  title, subtitle, icon, table, children, className = '', badge,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  table?: ReactNode;
  children: ReactNode;
  className?: string;
  badge?: ReactNode;
}) {
  const t = useT();
  const [showTable, setShowTable] = useState(false);
  return (
    <figure className={`analytics-card glass-panel rounded-3xl border border-white/10 p-5 sm:p-6 flex flex-col min-w-0 ${className}`}>
      <figcaption className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 leading-snug">
            {icon}
            <span className="min-w-0">{title}</span>
            {badge}
          </h3>
          {subtitle && <p className="text-xs sm:text-sm text-slate-400 mt-1">{subtitle}</p>}
        </div>
        {table && (
          <button
            type="button"
            onClick={() => setShowTable((v) => !v)}
            className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10"
            aria-pressed={showTable}
          >
            {showTable ? <BarChart3 className="w-3.5 h-3.5" /> : <Table2 className="w-3.5 h-3.5" />}
            {showTable ? t.analytics.table.hide : t.analytics.table.show}
          </button>
        )}
      </figcaption>
      <div className="flex-1 min-w-0">{showTable && table ? <div className="overflow-x-auto">{table}</div> : children}</div>
    </figure>
  );
}

/** Plain data table used by every chart's table view */
export function DataTable({ head, rows, numericFrom = 1 }: { head: string[]; rows: (string | number)[][]; numericFrom?: number }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-white/10 text-slate-400">
          {head.map((h, i) => (
            <th key={h} className={`py-2 px-2 font-semibold ${i >= numericFrom ? 'text-right' : 'text-left'}`}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-white/5">
        {rows.map((r, ri) => (
          <tr key={ri} className="text-slate-200">
            {r.map((c, i) => (
              <td key={i} className={`py-2 px-2 ${i >= numericFrom ? 'text-right tabular-nums' : ''}`}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
