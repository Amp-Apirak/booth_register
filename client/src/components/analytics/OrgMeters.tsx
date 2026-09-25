'use client';

import type { OrgKey } from '@/lib/orgTypes';
import { shade, type ChartTheme } from './chartTheme';

export interface MeterRow {
  key: OrgKey;
  label: string;
  color: string;
  registered: number;
  checkedIn: number;
  rate: number; // %
}

/**
 * One row per organization type on a single people axis: the light track is how many
 * registered, the solid (3D) fill how many checked in. Same unit, one axis.
 */
export default function OrgMeters({
  rows, selected, onToggle, theme, fmtOf, interactive = true,
}: {
  rows: MeterRow[];
  selected: OrgKey[];
  onToggle?: (key: OrgKey) => void;
  theme: ChartTheme;
  fmtOf: (checkedIn: number, registered: number) => string;
  interactive?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.registered));
  const dim = (key: OrgKey) => selected.length > 0 && !selected.includes(key);
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            disabled={!interactive}
            onClick={() => onToggle?.(r.key)}
            aria-pressed={selected.includes(r.key)}
            className={`w-full text-left rounded-xl px-2 py-1.5 transition-colors disabled:cursor-default ${selected.includes(r.key) ? 'bg-white/10 ring-1 ring-indigo-400/50' : 'hover:bg-white/5'} ${dim(r.key) ? 'opacity-45' : ''}`}
          >
            <div className="flex items-center gap-2 text-sm mb-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: r.color }} aria-hidden="true" />
              <span className="flex-1 min-w-0 truncate text-slate-200" title={r.label}>{r.label}</span>
              <span className="tabular-nums text-slate-400">{fmtOf(r.checkedIn, r.registered)}</span>
              <span className="w-14 text-right font-bold tabular-nums text-white">{r.rate}%</span>
            </div>
            <div className="relative h-3.5">
              {/* registered (track, same hue, lighter) */}
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{ width: `${(r.registered / max) * 100}%`, minWidth: r.registered ? 6 : 0, background: `${r.color}33`, boxShadow: `inset 0 0 0 1px ${r.color}40` }}
              />
              {/* checked in (solid, with depth) */}
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
                style={{
                  width: `${(r.checkedIn / max) * 100}%`,
                  minWidth: r.checkedIn ? 6 : 0,
                  background: `linear-gradient(180deg, ${shade(r.color, 0.3)}, ${r.color} 60%, ${shade(r.color, -0.15)})`,
                  boxShadow: theme.mode === 'dark' ? `0 4px 10px ${r.color}55, inset 0 1px 0 rgba(255,255,255,.4)` : `0 3px 8px ${r.color}40, inset 0 1px 0 rgba(255,255,255,.5)`,
                }}
              />
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
