'use client';

import type { FunnelStage } from '@/lib/analytics';
import type { ChartTheme } from './chartTheme';
import { shade } from './chartTheme';

// Ordinal ramp (one hue, strongest first) — blue steps from the validated sequential ramp
const RAMP = { light: ['#104281', '#256abf', '#5598e7'], dark: ['#9ec5f4', '#5598e7', '#256abf'] };

/** Registered → checked in → won: ordered stages, one hue in decreasing strength. */
export default function FunnelBars({
  stages, theme, fmt, stageLabel, ofPreviousLabel,
}: {
  stages: FunnelStage[];
  theme: ChartTheme;
  fmt: (n: number) => string;
  stageLabel: (s: FunnelStage['stage']) => string;
  ofPreviousLabel: (p: number) => string;
}) {
  const max = Math.max(1, stages[0]?.count ?? 0);
  const ramp = RAMP[theme.mode];
  return (
    <ul className="space-y-3">
      {stages.map((s, i) => (
        <li key={s.stage} className="grid grid-cols-[minmax(0,8rem)_1fr] items-center gap-3">
          <span className="text-sm text-slate-300 truncate">{stageLabel(s.stage)}</span>
          <div>
            <div className="flex items-center gap-2">
              <span
                className="h-7 rounded-r-lg rounded-l-md shrink-0 transition-[width] duration-700"
                style={{
                  width: `${Math.max(1.5, (s.count / max) * 82)}%`,
                  background: `linear-gradient(180deg, ${shade(ramp[i], 0.25)}, ${ramp[i]} 60%, ${shade(ramp[i], -0.15)})`,
                  boxShadow: `0 6px 12px ${ramp[i]}40, inset 0 1px 0 rgba(255,255,255,.35)`,
                }}
              />
              <span className="text-sm font-bold tabular-nums text-white">{fmt(s.count)}</span>
            </div>
            {s.ofPrevious !== null && <div className="text-xs text-slate-400 mt-1">{ofPreviousLabel(s.ofPrevious)}</div>}
          </div>
        </li>
      ))}
    </ul>
  );
}
