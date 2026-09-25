'use client';

import { Building, Crown, Gift, Sparkles, Trophy } from 'lucide-react';
import type { LuckyWinnerData } from '@/lib/api';
import { useT } from '@/contexts/PreferencesContext';

interface Props {
  winner: LuckyWinnerData;
  isFullscreen: boolean;
}

const initials = (name: string) =>
  name
    .replace(/^(นาย|นางสาว|นาง|ดร\.|Mr\.|Mrs\.|Ms\.|Dr\.)\s*/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.replace(/^[เแโใไ]/, '')[0] ?? part[0]) // skip Thai leading vowels
    .join('')
    .toUpperCase();

// Winner announcement for the LED "Lucky" screen. Sizes are capped by viewport
// height so the whole reveal fits on any display, windowed or fullscreen.
export default function LuckyWinnerReveal({ winner, isFullscreen }: Props) {
  const t = useT();
  const isVip = winner.attendee_type === 'VIP';
  const visual = isFullscreen ? 'w-[min(20rem,30vh)] h-[min(20rem,30vh)]' : 'w-[min(13rem,22vh)] h-[min(13rem,22vh)]';

  return (
    <div className="relative z-10 w-full flex flex-col items-center">
      <div className="winner-rays" aria-hidden="true" />

      <div className={`relative lucky-title font-black tracking-[-0.03em] leading-none ${isFullscreen ? 'text-4xl lg:text-5xl' : 'text-2xl sm:text-3xl'}`}>
        LUCKY DRAW
      </div>
      <div className={`relative winner-reveal inline-flex items-center gap-3 font-mono font-bold uppercase text-amber-200 ${isFullscreen ? 'text-xl tracking-[0.45em] mt-4 mb-8' : 'text-sm tracking-[0.35em] mt-3 mb-5'}`}>
        <Sparkles className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
        Congratulations
        <Sparkles className={isFullscreen ? 'w-6 h-6' : 'w-4 h-4'} />
      </div>

      {/* Winner photo ── link ── prize image */}
      <div className="relative flex items-center justify-center gap-4 sm:gap-8">
        <div className="winner-reveal relative flex flex-col items-center">
          <div className={`relative ${visual}`}>
            <div className="winner-ring absolute inset-0 rounded-full p-[5px]">
              <div className="w-full h-full rounded-full bg-surface-3" />
            </div>
            <div className="absolute inset-[9px] rounded-full overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center">
              {winner.profile_picture ? (
                // Staff-uploaded data URLs cannot use the Next image optimizer
                // eslint-disable-next-line @next/next/no-img-element
                <img src={winner.profile_picture} alt={winner.name} className="w-full h-full object-cover" />
              ) : (
                <span className={`font-black text-white/95 drop-shadow-lg ${isFullscreen ? 'text-8xl' : 'text-5xl'}`}>{initials(winner.name)}</span>
              )}
            </div>
            {isVip && (
              <div className="absolute left-1/2 -translate-x-1/2 -top-[9%] text-amber-300 drop-shadow-[0_0_18px_rgba(251,191,36,.8)]">
                <Crown className={isFullscreen ? 'w-16 h-16' : 'w-10 h-10'} fill="currentColor" />
              </div>
            )}
            {isVip && (
              <span className={`absolute left-1/2 -translate-x-1/2 -bottom-3 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-amber-950 font-black tracking-widest shadow-lg shadow-amber-500/40 ${isFullscreen ? 'px-5 py-1.5 text-base' : 'px-3 py-1 text-xs'}`}>
                VIP
              </span>
            )}
          </div>
        </div>

        <div className="winner-reveal flex flex-col items-center gap-2 text-amber-300">
          <div className={`winner-link h-[3px] rounded-full ${isFullscreen ? 'w-28' : 'w-14 sm:w-20'}`} />
          <Trophy className={`drop-shadow-[0_0_20px_rgba(251,191,36,.7)] ${isFullscreen ? 'w-14 h-14' : 'w-9 h-9'}`} />
          <div className={`winner-link h-[3px] rounded-full ${isFullscreen ? 'w-28' : 'w-14 sm:w-20'}`} />
        </div>

        <div className="winner-reveal-late relative flex flex-col items-center">
          <div className={`winner-prize-frame relative ${visual} rounded-[2rem] border border-amber-300/40 bg-gradient-to-br from-amber-400/15 via-purple-500/15 to-cyan-400/10 backdrop-blur-xl overflow-hidden flex items-center justify-center`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(251,191,36,.28),transparent_65%)]" />
            {winner.prize_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={winner.prize_image} alt={winner.prize_name} className="lucky-prize-float relative w-[82%] h-[82%] object-contain drop-shadow-[0_20px_30px_rgba(0,0,0,.55)]" />
            ) : (
              <Gift className={`lucky-prize-float relative text-amber-200 drop-shadow-[0_0_30px_rgba(251,191,36,.7)] ${isFullscreen ? 'w-32 h-32' : 'w-20 h-20'}`} strokeWidth={1.4} />
            )}
          </div>
        </div>
      </div>

      {/* Name, company, prize */}
      <div key={winner.name} className={`winner-reveal-late text-center max-w-full ${isFullscreen ? 'mt-10' : 'mt-6'}`}>
        <div className={`winner-name font-black leading-tight break-words px-4 ${isFullscreen ? 'text-7xl lg:text-8xl' : 'text-4xl sm:text-5xl lg:text-6xl'}`}>
          {winner.name}
        </div>
        {(winner.company || winner.position) && (
          <div className={`text-indigo-100/90 flex items-center justify-center gap-2 flex-wrap ${isFullscreen ? 'text-2xl mt-3' : 'text-base sm:text-lg mt-2'}`}>
            <Building className={`text-cyan-300 ${isFullscreen ? 'w-7 h-7' : 'w-5 h-5'}`} />
            <span>{winner.company}</span>
            {winner.position && <span className="text-cyan-300/80">· {winner.position}</span>}
          </div>
        )}
        <div className={`inline-flex items-center gap-3 rounded-2xl border border-amber-300/40 bg-gradient-to-r from-amber-500/20 via-purple-500/20 to-cyan-500/15 shadow-[0_0_40px_rgba(251,191,36,.18)] ${isFullscreen ? 'mt-7 px-8 py-4' : 'mt-5 px-5 py-2.5'}`}>
          <Trophy className={`text-amber-300 ${isFullscreen ? 'w-8 h-8' : 'w-5 h-5'}`} />
          <span className={`text-amber-100/80 font-semibold ${isFullscreen ? 'text-xl' : 'text-sm'}`}>{t.signage.lucky.won}</span>
          <span className={`font-extrabold text-white ${isFullscreen ? 'text-3xl' : 'text-lg sm:text-xl'}`}>{winner.prize_name}</span>
        </div>
        {winner.prize_description && (
          <div className={`text-slate-400 ${isFullscreen ? 'text-lg mt-3' : 'text-xs sm:text-sm mt-2'}`}>{winner.prize_description}</div>
        )}
      </div>
    </div>
  );
}
