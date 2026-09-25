'use client';

import { useState, useEffect } from 'react';
import api, { Participant, LuckyDrawWinner, Prize } from '@/lib/api';
import useWebSocket from '@/lib/useWebSocket';
import { useT } from '@/contexts/PreferencesContext';
import { 
  Sparkles, 
  Trophy, 
  Gift, 
  RotateCw, 
  Users, 
  Building, 
  Crown,
  Volume2,
  VolumeX,
  Clock
} from 'lucide-react';

// Placeholder while no prize is active; its name/description come from the dictionary (t.luckyDraw.prizes)
const FALLBACK_PRIZE: Prize = { name: '', code: '', description: '', image: '', quantity: 1, is_active: true, sort_order: 0 };

export default function LuckyDrawPage() {
  const t = useT();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [currentName, setCurrentName] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [winner, setWinner] = useState<LuckyDrawWinner | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [selectedPrizeId, setSelectedPrizeId] = useState<number | undefined>();
  const [winners, setWinners] = useState<LuckyDrawWinner[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  useWebSocket();

  useEffect(() => {
    const fetchEligible = async () => {
      const [eligible, prizeItems] = await Promise.all([api.getEligibleLuckyDraw(), api.getPrizes(true)]);
      const availablePrizes = prizeItems.filter(p => (p.remaining_count ?? p.quantity) > 0);
      setParticipants(eligible);
      setPrizes(availablePrizes);
      setSelectedPrizeId(availablePrizes[0]?.prize_id);
    };
    fetchEligible();
  }, []);

  const selectedPrize = prizes.find(p => p.prize_id === selectedPrizeId) || prizes[0] || { ...FALLBACK_PRIZE, name: t.luckyDraw.prizes.fallbackName, description: t.luckyDraw.prizes.fallbackDescription };

  const playSound = (type: 'tick' | 'fanfare') => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      if (type === 'tick') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.setValueAtTime(440 + Math.random() * 200, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.05);
      } else {
        // Fanfare chord
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.2, audioCtx.currentTime + idx * 0.1);
          osc.start(audioCtx.currentTime + idx * 0.1);
          osc.stop(audioCtx.currentTime + 0.8 + idx * 0.1);
        });
      }
    } catch {
      // Audio not supported
    }
  };

  const handleSpin = async () => {
    if (spinning || participants.length === 0) return;

    setSpinning(true);
    setWinner(null);

    // Dynamic slot roller animation
    let iterations = 0;
    const maxIterations = 35;
    let speed = 60;

    const rollStep = () => {
      const randomIdx = Math.floor(Math.random() * participants.length);
      setCurrentName(participants[randomIdx].name);
      setCurrentCompany(participants[randomIdx].company);
      playSound('tick');
      iterations++;

      if (iterations < maxIterations) {
        speed += 6; // Gradually decelerate
        setTimeout(rollStep, speed);
      } else {
        // Finalize with backend API
        api.luckyDrawSpin(selectedPrize.name).then((result) => {
          if (result) {
            setWinner(result);
            setCurrentName(result.fullname);
            setCurrentCompany(result.company);
            setWinners(prev => [result, ...prev]);
            setPrizes(prev => prev.map(prize => prize.prize_id === selectedPrize.prize_id ? { ...prize, awarded_count: (prize.awarded_count || 0) + 1, remaining_count: Math.max(0, (prize.remaining_count ?? prize.quantity) - 1) } : prize));
            playSound('fanfare');
          }
          setSpinning(false);
        }).catch(() => {
          setSpinning(false);
        });
      }
    };

    rollStep();
  };

  return (
    <div className="lucky-control-stage max-w-6xl mx-auto space-y-8 pb-16 relative">
      <div className="absolute inset-x-0 -top-28 h-96 bg-[radial-gradient(circle_at_center,rgba(168,85,247,.18),transparent_65%)] pointer-events-none" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            <span>Official Event Lucky Draw Studio</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {t.luckyDraw.title}
          </h1>
          <p className="text-sm text-slate-400">
            {t.luckyDraw.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled ? 'bg-white/[0.05] border-white/10 text-cyan-400' : 'bg-white/[0.02] border-white/5 text-slate-500'
            }`}
            title={soundEnabled ? t.luckyDraw.soundOff : t.luckyDraw.soundOn}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-white/[0.04] border border-white/10 text-slate-300">
            <Users className="w-4 h-4 text-cyan-400" />
            <span>{t.luckyDraw.eligible(participants.length)}</span>
          </div>
        </div>
      </div>

      {/* Prize Preset Selector */}
      <div className="glass-panel rounded-3xl p-6 border border-purple-400/20 shadow-[0_18px_60px_rgba(88,28,135,.2)] space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 lucky-selector-shine pointer-events-none" />
        <label className="block text-xs font-semibold text-slate-300">
          {t.luckyDraw.prizes.selectLabel}
        </label>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 relative">
          {prizes.map((prize) => (
            <button
              key={prize.prize_id}
              onClick={() => setSelectedPrizeId(prize.prize_id)}
              className={`p-3 rounded-2xl text-left transition-all flex items-center gap-3 ${
                selectedPrize.prize_id === prize.prize_id
                  ? 'bg-gradient-to-r from-purple-600/70 to-pink-600/60 text-on-accent shadow-lg shadow-purple-500/25 border border-purple-300/50 scale-[1.02]'
                  : 'bg-white/[0.04] text-slate-300 hover:bg-white/[0.08] hover:text-white border border-white/5'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-black/20 shrink-0 flex items-center justify-center overflow-hidden">{prize.image ? <img src={prize.image} alt="" className="w-full h-full object-contain p-1"/> : <Gift className="w-6 h-6 text-fuchsia-300"/>}</div>
              <span className="min-w-0"><strong className="block text-sm truncate">{prize.name}</strong><small className="text-[11px] opacity-70">{t.luckyDraw.prizes.remaining(prize.remaining_count ?? prize.quantity)}</small></span>
            </button>
          ))}
          {prizes.length === 0 && <div className="col-span-full rounded-2xl border border-dashed border-amber-400/30 bg-amber-500/5 p-5 text-sm text-amber-200">{t.luckyDraw.prizes.empty}</div>}
        </div>
      </div>

      {/* ── 3D Stadium Stage Screen ── */}
      <div className="lucky-draw-arena glass-panel-glow rounded-[2rem] min-h-[560px] p-8 sm:p-14 border border-purple-400/35 text-center relative overflow-hidden shadow-[0_30px_100px_rgba(126,34,206,.28)] card-3d flex flex-col justify-center">
        <div className="absolute inset-0 lucky-arena-grid opacity-25 pointer-events-none" />
        <div className="lucky-beam lucky-beam-left absolute pointer-events-none"/><div className="lucky-beam lucky-beam-right absolute pointer-events-none"/>
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-pink-500/20 via-purple-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-indigo-500/20 via-cyan-600/20 to-transparent rounded-full blur-3xl pointer-events-none" />

        {winner ? (
          <div className="space-y-6 animate-bounce-in">
            {selectedPrize.image && <div className="w-40 h-40 mx-auto"><img src={selectedPrize.image} alt={selectedPrize.name} className="w-full h-full object-contain drop-shadow-[0_20px_30px_rgba(251,191,36,.3)]"/></div>}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 to-yellow-600 p-0.5 mx-auto shadow-2xl shadow-yellow-500/30">
              <div className="w-full h-full bg-surface-2 rounded-[22px] flex items-center justify-center text-amber-400">
                <Crown className="w-10 h-10" />
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-mono font-bold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                LUCKY WINNER ANNOUNCED!
              </span>
              <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight pt-2">
                {winner.fullname}
              </h2>
              <p className="text-lg sm:text-xl text-indigo-200 font-light flex items-center justify-center gap-2 pt-1">
                <Building className="w-4 h-4 text-cyan-400 inline" />
                <span>{winner.company}</span>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 max-w-md mx-auto">
              <p className="text-xs text-slate-400 uppercase font-mono mb-1">{t.luckyDraw.stage.prizeWon}</p>
              <p className="text-base sm:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-amber-300">
                {winner.prize_name}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 relative z-10">
            <div className="lucky-prize-orbit w-44 h-44 sm:w-56 sm:h-56 rounded-full border border-dashed border-purple-300/35 flex items-center justify-center mx-auto relative">
              <div className="absolute inset-4 rounded-full border-2 border-dotted border-cyan-300/25"/>
              <div className="lucky-prize-float w-[72%] h-[72%] relative z-10 flex items-center justify-center">{selectedPrize.image ? <img src={selectedPrize.image} alt={selectedPrize.name} className="w-full h-full object-contain drop-shadow-[0_18px_25px_rgba(0,0,0,.5)]"/> : <Trophy className="w-20 h-20 text-amber-300" />}</div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-mono tracking-widest text-purple-300 uppercase">
                {spinning ? 'SPINNING CYBER WHEEL...' : 'READY FOR LUCKY DRAW'}
              </h3>
              
              {currentName ? (
                <div className="space-y-1 animate-pulse">
                  <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
                    {currentName}
                  </h2>
                  <p className="text-sm text-cyan-300 font-mono">{currentCompany}</p>
                </div>
              ) : (
                <div><h2 className="text-3xl sm:text-5xl font-black text-white lucky-prize-title">{selectedPrize.name}</h2>{selectedPrize.description && <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto mt-3">{selectedPrize.description}</p>}<div className="mt-3 inline-flex px-4 py-1.5 rounded-full bg-cyan-400/10 text-cyan-200 border border-cyan-300/20 text-xs font-mono">{t.luckyDraw.stage.readyRemaining(selectedPrize.remaining_count ?? selectedPrize.quantity)}</div></div>
              )}
            </div>
          </div>
        )}

        {/* Action Spin Button */}
        <div className="pt-8">
          <button
            onClick={handleSpin}
            disabled={spinning || participants.length === 0 || prizes.length === 0}
            className={`px-10 py-4 rounded-2xl text-base sm:text-lg font-extrabold transition-all shadow-2xl flex items-center justify-center gap-3 mx-auto ${
              spinning
                ? 'bg-white/[0.05] text-slate-500 cursor-not-allowed border border-white/5'
                : 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-on-accent shadow-purple-600/40 hover:scale-105 active:scale-95 border border-white/20'
            }`}
          >
            <RotateCw className={`w-5 h-5 ${spinning ? 'animate-spin' : ''}`} />
            <span>{spinning ? t.luckyDraw.stage.spinning : t.luckyDraw.stage.spin}</span>
          </button>
        </div>
      </div>

      {/* ── Winners Podium List ── */}
      {winners.length > 0 && (
        <div className="winner-hall glass-panel rounded-[2rem] p-6 sm:p-9 border border-amber-300/20 shadow-[0_25px_80px_rgba(245,158,11,.12)] space-y-6 relative overflow-hidden">
          <div className="winner-hall-glow absolute inset-0 pointer-events-none" />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-3">
              <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-300/25 to-orange-500/10 border border-amber-300/30 flex items-center justify-center shadow-[0_0_25px_rgba(251,191,36,.2)]"><Trophy className="w-7 h-7 text-amber-300" /></span>
              <span>{t.luckyDraw.winners.title} <strong className="text-amber-300">({winners.length})</strong></span>
            </h3>
            <span className="winner-live-badge text-sm text-emerald-200 font-mono inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-400/10 border border-emerald-300/20 self-start sm:self-auto"><i className="w-2 h-2 rounded-full bg-emerald-300" /> LIVE WINNERS</span>
          </div>

          <div className="relative space-y-4">
            {winners.map((w, idx) => (
              <div 
                key={idx} 
                className="winner-log-card group flex flex-col md:flex-row md:items-center justify-between gap-5 p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-500/[.07] via-white/[.045] to-purple-500/[.06] border border-amber-200/10 hover:border-amber-200/30 transition-all"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex items-center gap-4 sm:gap-5 min-w-0">
                  <div className={`winner-rank shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border flex items-center justify-center text-xl sm:text-2xl font-black font-mono ${idx === 0 ? 'bg-gradient-to-br from-yellow-300/30 to-amber-600/15 border-yellow-300/40 text-yellow-200 shadow-[0_0_28px_rgba(250,204,21,.18)]' : 'bg-white/[.06] border-white/10 text-slate-200'}`}>
                    #{idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xl sm:text-2xl font-extrabold text-white truncate group-hover:text-amber-100 transition-colors">{w.fullname}</h4>
                    <p className="text-base sm:text-lg text-slate-300 mt-1 flex items-center gap-2"><Building className="w-4 h-4 text-cyan-300 shrink-0"/><span className="truncate">{w.company || t.luckyDraw.winners.noCompany}</span></p>
                  </div>
                </div>

                <div className="md:text-right md:max-w-[45%] pl-[4.5rem] md:pl-0">
                  <span className="text-xs text-amber-200/60 uppercase tracking-[.18em] font-mono block mb-1">Prize Awarded</span>
                  <span className="text-lg sm:text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-amber-200 to-yellow-300 block">{w.prize_name}</span>
                  <span className="text-sm text-slate-400 font-mono flex items-center md:justify-end gap-1.5 mt-2">
                    <Clock className="w-4 h-4 text-cyan-300" />
                    {new Date(w.drawn_at).toLocaleTimeString(t.common.locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}{t.common.timeSuffix}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
