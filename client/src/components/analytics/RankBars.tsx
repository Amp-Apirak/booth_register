'use client';

import type { CompanyRow } from '@/lib/analytics';
import { shade, type ChartTheme } from './chartTheme';

/** Top organizations: one series → one hue (slot 1), value at the bar tip, rank number. */
export default function RankBars({
  rows, theme, fmt, activeSearch, onSelect, interactive = true,
}: {
  rows: CompanyRow[];
  theme: ChartTheme;
  fmt: (n: number) => string;
  activeSearch?: string;
  onSelect?: (company: string) => void;
  interactive?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.registered));
  return (
    <ol className="space-y-2">
      {rows.map((r, i) => {
        const active = !!activeSearch && activeSearch.toLowerCase() === r.company.toLowerCase();
        return (
          <li key={r.company}>
            <button
              type="button"
              disabled={!interactive}
              onClick={() => onSelect?.(r.company)}
              aria-pressed={active}
              className={`w-full grid grid-cols-[1.5rem_minmax(0,11rem)_1fr] items-center gap-3 px-2 py-1 rounded-lg text-left text-sm transition-colors disabled:cursor-default ${active ? 'bg-white/10 ring-1 ring-indigo-400/50' : 'hover:bg-white/5'}`}
            >
              <span className="text-xs font-bold tabular-nums text-slate-500 text-right">{i + 1}</span>
              <span className="truncate text-slate-200" title={r.company}>{r.company}</span>
              <span className="flex items-center gap-2 min-w-0">
                <span
                  className="h-4 rounded-r-[4px] shrink-0"
                  style={{
                    width: `${Math.max(2, (r.registered / max) * 85)}%`,
                    background: `linear-gradient(180deg, ${shade(theme.accent, 0.3)}, ${theme.accent} 60%, ${shade(theme.accent, -0.18)})`,
                    boxShadow: `0 3px 8px ${theme.accent}44, inset 0 1px 0 rgba(255,255,255,.4)`,
                  }}
                />
                <span className="text-xs font-bold tabular-nums text-white">{fmt(r.registered)}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
