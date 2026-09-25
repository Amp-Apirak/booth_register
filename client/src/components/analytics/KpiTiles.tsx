'use client';

import type { ReactNode } from 'react';

export interface KpiTile {
  id: string;
  label: string;
  value: string;
  sub?: string;
  icon: ReactNode;
  tone: string; // tailwind text color class for the icon chip
  active?: boolean;
  onClick?: () => void;
}

/** Headline numbers: proportional figures, sans, one tile per metric; some double as quick filters. */
export default function KpiTiles({ tiles }: { tiles: KpiTile[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4 perspective-1000">
      {tiles.map((k) => {
        const body = (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs sm:text-sm font-semibold text-slate-400">{k.label}</span>
              <span className={`w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${k.tone}`}>{k.icon}</span>
            </div>
            <div className={`mt-2 font-extrabold text-white leading-tight ${k.value.length > 7 ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`}>{k.value}</div>
            {k.sub && <div className="mt-1 text-xs text-slate-400 leading-snug">{k.sub}</div>}
          </>
        );
        const cls = `analytics-card glass-panel rounded-2xl border p-4 text-left ${k.active ? 'border-indigo-400/60 ring-1 ring-indigo-400/40' : 'border-white/10'}`;
        return k.onClick ? (
          <button key={k.id} type="button" onClick={k.onClick} aria-pressed={k.active} className={`${cls} hover:border-indigo-400/40 transition-colors`}>{body}</button>
        ) : (
          <div key={k.id} className={cls}>{body}</div>
        );
      })}
    </div>
  );
}
