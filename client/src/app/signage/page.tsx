'use client';

import { useState, useEffect, useRef, type CSSProperties } from 'react';
import Image from 'next/image';
import useWebSocket from '@/lib/useWebSocket';
import api, { AgendaItem } from '@/lib/api';
import { getAgendaForDate, getAgendaStatus } from '@/lib/agenda';
import { useSettings } from '@/contexts/SettingsContext';
import confetti from 'canvas-confetti';
import { 
  Tv, 
  Sparkles, 
  Users, 
  UserCheck, 
  Clock, 
  Calendar, 
  Trophy, 
  Zap, 
  Radio, 
  ShieldCheck, 
  Building,
  CheckCircle2,
  Crown
} from 'lucide-react';

type ScreenType = 'welcome' | 'overview' | 'agenda' | 'lucky';

export default function SignagePage() {
  const [screen, setScreen] = useState<ScreenType>('welcome');
  const { settings } = useSettings();
  const { stats, latestCheckin, connected, agenda: liveAgenda } = useWebSocket();
  const [fetchedAgenda, setFetchedAgenda] = useState<AgendaItem[]>([]);
  const [now, setNow] = useState(() => new Date());
  const [welcomeQueue, setWelcomeQueue] = useState<{ fullname: string; company: string; position?: string; profile_picture?: string; attendee_type?: string }[]>([
    { fullname: "Dr. Yanisa Prasert", company: "Zoom Information System", position: "Keynote Speaker", attendee_type: "VIP" },
    { fullname: "Kitipong Tan", company: "EdTech Startup Group", position: "Founder & CEO" }
  ]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const agendaScrollRef = useRef<HTMLDivElement>(null);
  const agendaFocusRef = useRef<HTMLDivElement>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement>(null);
  const confettiFireRef = useRef<ReturnType<typeof confetti.create> | null>(null);

  // Bind a confetti instance to a canvas INSIDE the container so it stays
  // visible even in native fullscreen mode (default canvas is appended to body).
  useEffect(() => {
    if (confettiCanvasRef.current && !confettiFireRef.current) {
      confettiFireRef.current = confetti.create(confettiCanvasRef.current, {
        resize: true,
        useWorker: true,
      });
    }
  }, []);

  useEffect(() => {
    api.getAgenda().then(setFetchedAgenda);
    const timer = window.setInterval(() => setNow(new Date()), 15_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(err => console.error(err));
    }
  };

  // Add to welcome queue on new incoming check-in from WebSocket
  useEffect(() => {
    if (latestCheckin) {
      setWelcomeQueue(prev => {
        // Prevent duplicate immediate additions
        if (prev.length > 0 && prev[0].fullname === latestCheckin.fullname) return prev;
        return [
          { fullname: latestCheckin.fullname, company: latestCheckin.company, position: latestCheckin.position, profile_picture: latestCheckin.profile_picture, attendee_type: latestCheckin.attendee_type },
          ...prev.slice(0, 4)
        ];
      });
      setCurrentIdx(0); // Force UI to show the newest person immediately
      setScreen('welcome');
      
      // Fire confetti! Use the canvas-bound instance so it shows in fullscreen.
      const fire = confettiFireRef.current ?? confetti;
      const isVip = latestCheckin.attendee_type === 'VIP';

      if (isVip) {
        // VIP: Grand gold confetti
        fire({
          particleCount: 150,
          spread: 100,
          origin: { y: 0.6 },
          colors: ['#F59E0B', '#FCD34D', '#FFFBEB', '#D97706'],
          zIndex: 100
        });
        setTimeout(() => {
          fire({
            particleCount: 100,
            spread: 120,
            origin: { y: 0.6 },
            colors: ['#F59E0B', '#FCD34D', '#FFFBEB'],
            zIndex: 100
          });
        }, 300);
      } else {
        // General: Colorful festival confetti
        fire({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#6366F1', '#22D3EE', '#38BDF8', '#818CF8', '#A78BFA'],
          zIndex: 100
        });
      }
    }
  }, [latestCheckin]);

  const activePerson = welcomeQueue[currentIdx] || welcomeQueue[0];
  const agenda = liveAgenda ?? fetchedAgenda;
  const todayAgenda = getAgendaForDate(agenda, now);
  const activeAgenda = todayAgenda.find(item => getAgendaStatus(item, now) === 'active');
  const nextAgenda = todayAgenda.find(item => getAgendaStatus(item, now) === 'upcoming');
  const nextAgendaId = nextAgenda?.id;
  const agendaFocusKey = activeAgenda?.id ?? activeAgenda?.start_at ?? nextAgenda?.id ?? nextAgenda?.start_at;
  const pastAgendaCount = todayAgenda.filter(item => getAgendaStatus(item, now) === 'past').length;
  const showUpRate = stats.registered > 0 
    ? Math.round((stats.checked_in / stats.registered) * 100) 
    : 0;

  useEffect(() => {
    if (screen !== 'agenda' || !agendaFocusKey) return;
    let layoutFrame = 0;
    const renderFrame = window.requestAnimationFrame(() => {
      layoutFrame = window.requestAnimationFrame(() => {
        const scroller = agendaScrollRef.current;
        const focusedCard = agendaFocusRef.current;
        if (!scroller || !focusedCard) return;
        // Sum layout offsets through every offset parent until the scroll area.
        // This avoids transforms from the entry animation and nested-grid offsets.
        let targetTop = 0;
        let node: HTMLElement | null = focusedCard;
        while (node && node !== scroller) {
          targetTop += node.offsetTop;
          node = node.offsetParent as HTMLElement | null;
        }
        if (node !== scroller) {
          targetTop = focusedCard.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
        }
        scroller.scrollTo({
          top: Math.max(0, targetTop - 16),
          behavior: 'auto',
        });
      });
    });
    return () => {
      window.cancelAnimationFrame(renderFrame);
      window.cancelAnimationFrame(layoutFrame);
    };
  }, [screen, agendaFocusKey, isFullscreen]);

  return (
    <div ref={containerRef} className={`h-screen w-full flex flex-col justify-between relative ${isFullscreen ? 'bg-[#090d16] p-8' : 'p-6'}`}>

      {/* Confetti canvas (child of container so it renders in fullscreen too) */}
      <canvas
        ref={confettiCanvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[100]"
      />

      {/* ── Screen Controller Bar ── */}
      {!isFullscreen && (
        <div className="flex flex-wrap items-center justify-between gap-5 glass-panel rounded-2xl px-4 py-3.5 lg:px-5 lg:py-4 border border-white/10 mb-8 shadow-2xl z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_18px_rgba(34,211,238,.12)]">
            <Tv className="w-5 h-5 lg:w-5.5 lg:h-5.5" />
          </div>
          <div>
            <h2 className="text-sm lg:text-base font-extrabold text-white uppercase tracking-wider leading-tight">LED Signage Mode</h2>
            <p className="text-xs lg:text-sm text-slate-400 font-mono mt-0.5">Main Hall Grand Display</p>
          </div>
        </div>

        {/* Screen Selector Pills */}
        <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
          {([
            { id: 'welcome', label: 'Welcome Screen', icon: Sparkles },
            { id: 'overview', label: 'Live Overview', icon: Users },
            { id: 'agenda', label: 'Event Agenda', icon: Calendar },
            { id: 'lucky', label: 'Lucky Standby', icon: Trophy },
          ] as const).map((s) => {
            const Icon = s.icon;
            const isActive = screen === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setScreen(s.id)}
                className={`flex items-center gap-2 px-3.5 lg:px-4 py-2 lg:py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-lg shadow-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          {/* Fullscreen Toggle */}
          <button
            onClick={enterFullscreen}
            className="flex items-center gap-2 px-3.5 lg:px-4 py-2 lg:py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-semibold text-slate-300 transition-all"
            title="เข้าสู่โหมดเต็มจอ (กด ESC เพื่อออก)"
          >
            <Tv className="w-4 h-4" />
            <span>เต็มจอ</span>
          </button>

          {/* Live Broadcast Badge */}
          <div className={`flex items-center gap-2.5 px-4 py-2 lg:py-2.5 rounded-full text-sm font-mono font-bold border ${
          connected 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
        }`}>
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-400 animate-ping' : 'bg-rose-400'}`} />
          <span>{connected ? 'LIVE BROADCAST' : 'OFFLINE'}</span>
        </div>
        </div>
        </div>
      )}

      {/* ── Screen 1: Grand Welcome Display (REQ-05) ── */}
      {screen === 'welcome' && (
        <div className="welcome-stage flex-1 flex flex-col items-center justify-center text-center p-8 sm:p-16 glass-panel-glow rounded-3xl border border-indigo-500/30 relative overflow-hidden shadow-2xl animate-fade-in my-auto">
          {/* Ambient Lighting Orbs */}
          <div className="welcome-spotlight absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/25 rounded-full blur-3xl pointer-events-none" />
          <div className="welcome-spotlight absolute bottom-1/4 -right-20 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none [animation-delay:-4.5s]" />
          <div className="absolute inset-x-[16%] top-[30%] h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent pointer-events-none" />
          {[
            ['18%', '23%', '3px', '2.8s', '-1s'], ['78%', '19%', '4px', '3.6s', '-2s'], ['86%', '68%', '3px', '3.1s', '-.5s'], ['24%', '76%', '4px', '4s', '-2.8s'],
          ].map(([left, top, size, speed, delay], index) => <span key={index} className="welcome-twinkle absolute rounded-full bg-cyan-200 shadow-[0_0_12px_rgba(165,243,252,.8)] pointer-events-none" style={{ left, top, width: size, height: size, '--twinkle-speed': speed, '--twinkle-delay': delay } as CSSProperties} />)}

          <div className={`inline-flex items-center gap-2 rounded-full bg-white/[0.05] border border-white/10 font-mono tracking-widest text-cyan-300 uppercase shadow-inner ${isFullscreen ? 'px-6 py-2 text-base mb-10' : 'px-4 py-1.5 text-xs mb-8'}`}>
            <Zap className={`text-cyan-400 ${isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'}`} />
            <span>Tech Innovation Summit 2026</span>
          </div>

          <div className={`space-y-4 mx-auto ${isFullscreen ? 'max-w-6xl' : 'max-w-4xl'}`}>
            <h1 className={`welcome-title font-extrabold tracking-tight holo-text ${isFullscreen ? 'text-7xl sm:text-8xl lg:text-9xl' : 'text-4xl sm:text-6xl lg:text-7xl'}`}>
              WELCOME
            </h1>

            {activePerson ? (
              <div className={`welcome-guest flex flex-col items-center ${isFullscreen ? 'space-y-6 pt-8' : 'space-y-3 pt-4'}`} key={activePerson.fullname}>
                {activePerson.profile_picture && (
                  <div className="relative inline-block mb-2 animate-fade-in">
                    {/* Thai-style ornate square frame */}
                    <div className={`p-[3px] rounded-2xl bg-gradient-to-br shadow-2xl ${activePerson.attendee_type === 'VIP' ? 'from-amber-200 via-amber-400 to-amber-600 shadow-amber-500/40' : 'from-indigo-400 via-purple-500 to-cyan-400 shadow-indigo-500/40'}`}>
                      <div className="p-1.5 rounded-xl bg-[#0b1120]">
                        <img
                          src={activePerson.profile_picture}
                          alt="Profile"
                          className={`rounded-lg object-cover ${isFullscreen ? 'w-56 h-56 lg:w-64 lg:h-64' : 'w-36 h-36 sm:w-48 sm:h-48'}`}
                        />
                      </div>
                    </div>
                    {/* Corner ornaments (Thai-inspired brackets) */}
                    {([
                      '-top-2 -left-2 border-t-2 border-l-2 rounded-tl-xl',
                      '-top-2 -right-2 border-t-2 border-r-2 rounded-tr-xl',
                      '-bottom-2 -left-2 border-b-2 border-l-2 rounded-bl-xl',
                      '-bottom-2 -right-2 border-b-2 border-r-2 rounded-br-xl',
                    ] as const).map((c, i) => (
                      <span
                        key={i}
                        className={`absolute ${isFullscreen ? 'w-8 h-8' : 'w-6 h-6'} ${c} ${activePerson.attendee_type === 'VIP' ? 'border-amber-300' : 'border-cyan-300'}`}
                      />
                    ))}
                  </div>
                )}

                <div className={`welcome-live-badge inline-flex items-center gap-2 rounded-full font-mono border ${isFullscreen ? 'px-5 py-2 text-base' : 'px-3 py-1 text-xs'} ${activePerson.attendee_type === 'VIP' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
                  {activePerson.attendee_type === 'VIP' ? <Crown className={isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'} /> : <CheckCircle2 className={isFullscreen ? 'w-5 h-5' : 'w-3.5 h-3.5'} />}
                  <span>{activePerson.attendee_type === 'VIP' ? 'VIP GUEST CHECKED IN' : 'JUST CHECKED IN'}</span>
                </div>

                <h2 className={`font-extrabold tracking-tight ${isFullscreen ? 'text-6xl sm:text-7xl lg:text-8xl' : 'text-3xl sm:text-5xl lg:text-6xl'} ${activePerson.attendee_type === 'VIP' ? 'text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-amber-500' : 'text-white'}`}>
                  {activePerson.fullname}
                </h2>
                <p className={`text-indigo-200 font-light flex items-center justify-center gap-2 mt-2 ${isFullscreen ? 'text-3xl sm:text-4xl' : 'text-lg sm:text-2xl'}`}>
                  <Building className={`text-cyan-400 inline ${isFullscreen ? 'w-8 h-8' : 'w-5 h-5'}`} />
                  <span>{activePerson.company}</span>
                </p>
                {activePerson.position && (
                  <p className={`font-mono text-cyan-400 uppercase tracking-widest pt-1 ${isFullscreen ? 'text-lg sm:text-xl' : 'text-xs sm:text-sm'}`}>
                    {activePerson.position}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xl text-slate-400 pt-6">
                กำลังรอผู้ร่วมงานสแกนผ่านประตูทางเข้า...
              </p>
            )}
          </div>

          <div className="mt-16 text-xs font-mono text-slate-500 uppercase tracking-widest">
            SCAN • CHECK-IN • SHOW • REAL-TIME DIGITAL SIGNAGE
          </div>
        </div>
      )}

      {/* ── Screen 2: Live Overview Display ── */}
      {screen === 'overview' && (
        <div className={`overview-stage flex-1 relative overflow-hidden glass-panel rounded-3xl border border-indigo-400/20 shadow-[0_30px_100px_rgba(0,0,0,0.55)] animate-fade-in my-auto ${isFullscreen ? 'p-10 lg:p-14' : 'p-7 lg:p-10'}`}>
          <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.16) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.12) 1px, transparent 1px)', backgroundSize: '54px 54px', maskImage: 'linear-gradient(to bottom, black, transparent 85%)' }} />
          <div className="absolute -top-40 -left-32 w-[34rem] h-[34rem] rounded-full bg-indigo-600/20 blur-[110px] pointer-events-none animate-pulse" />
          <div className="absolute -bottom-44 right-0 w-[38rem] h-[38rem] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none" />
          <div className="absolute top-1/3 left-1/2 w-72 h-72 rounded-full bg-purple-600/10 blur-[100px] pointer-events-none animate-float" />
          {[
            ['12%', '26%', '6px', '7s', '-1s'], ['24%', '72%', '4px', '9s', '-4s'], ['43%', '14%', '5px', '8s', '-2s'],
            ['58%', '86%', '7px', '10s', '-6s'], ['73%', '34%', '4px', '6s', '-3s'], ['86%', '68%', '5px', '9s', '-5s'],
          ].map(([left, top, size, speed, delay], index) => <span key={index} className="overview-particle absolute rounded-full bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,.85)] pointer-events-none" style={{ left, top, width: size, height: size, '--particle-speed': speed, '--particle-delay': delay } as CSSProperties} />)}

          <div className="relative z-10 h-full flex flex-col justify-center max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7 lg:mb-9">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 text-emerald-300 text-xs font-mono tracking-[0.18em] uppercase mb-3">
                  <Radio className="w-3.5 h-3.5 animate-pulse" /> Live Gate Intelligence
                </div>
                <h2 className={`${isFullscreen ? 'text-5xl lg:text-7xl' : 'text-4xl lg:text-6xl'} font-black text-white tracking-tight leading-none`}>
                  Attendance <span className="holo-text">Overview</span>
                </h2>
                <p className={`${isFullscreen ? 'text-xl' : 'text-base'} text-slate-400 mt-3`}>ภาพรวมผู้เข้าร่วมงานแบบเรียลไทม์ · {settings.event_name || 'Smart Event Registration'}</p>
              </div>
              <div className="md:text-right shrink-0">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live updated</div>
                <div className={`${isFullscreen ? 'text-4xl' : 'text-3xl'} font-black font-mono text-cyan-300 mt-1`}>{now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6 perspective-1000">
              {[
                { label: 'REGISTERED', thai: 'ลงทะเบียนทั้งหมด', value: stats.registered, Icon: Users, gradient: 'from-indigo-500/25 via-indigo-500/10 to-transparent', text: 'text-indigo-300', border: 'border-indigo-400/35', glow: 'shadow-indigo-500/15', orb: 'bg-indigo-400/10', iconBg: 'bg-indigo-400/15' },
                { label: 'CHECKED-IN', thai: 'เข้างานแล้ว', value: stats.checked_in, Icon: UserCheck, gradient: 'from-emerald-500/25 via-emerald-500/10 to-transparent', text: 'text-emerald-300', border: 'border-emerald-400/40', glow: 'shadow-emerald-500/20', orb: 'bg-emerald-400/10', iconBg: 'bg-emerald-400/15' },
                { label: 'PENDING', thai: 'ยังไม่มา', value: stats.pending, Icon: Clock, gradient: 'from-amber-500/25 via-amber-500/10 to-transparent', text: 'text-amber-300', border: 'border-amber-400/35', glow: 'shadow-amber-500/15', orb: 'bg-amber-400/10', iconBg: 'bg-amber-400/15' },
              ].map(({ label, thai, value, Icon, gradient, text, border, glow, orb, iconBg }, cardIndex) => (
                <div key={label} className={`overview-stat-card group relative overflow-hidden rounded-[1.75rem] border ${border} bg-gradient-to-br ${gradient} p-5 lg:p-7 shadow-2xl ${glow} card-3d`} style={{ '--card-delay': `${cardIndex * -1.15}s` } as CSSProperties}>
                  <div className={`absolute -right-12 -top-12 w-40 h-40 rounded-full ${orb} blur-2xl group-hover:scale-125 transition-transform duration-700`} />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[11px] lg:text-xs font-mono font-bold tracking-[0.22em] text-slate-400">{label}</div>
                      <div key={`${label}-${value}`} className={`overview-number-pop ${isFullscreen ? 'text-7xl lg:text-8xl' : 'text-6xl lg:text-7xl'} font-black font-heading ${text} leading-none mt-4 drop-shadow-[0_0_22px_currentColor]`}>{value.toLocaleString('th-TH')}</div>
                      <div className="text-base lg:text-lg font-semibold text-white mt-3">{thai}</div>
                    </div>
                    <div className={`w-12 h-12 lg:w-14 lg:h-14 rounded-2xl ${iconBg} border ${border} flex items-center justify-center ${text} shadow-lg`}><Icon className="w-6 h-6 lg:w-7 lg:h-7" /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-60" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-5 lg:gap-7 mt-5 lg:mt-7">
              <div className="rounded-[1.75rem] border border-white/10 bg-black/20 backdrop-blur-xl p-5 lg:p-7 flex flex-col justify-center">
                <div className="flex items-center justify-between gap-4 mb-4">
                  <div>
                    <div className="text-lg lg:text-xl font-bold text-white">Show-up Progress</div>
                    <div className="text-sm text-slate-400 mt-0.5">อัตราผู้เข้าร่วมงานจริง ณ เวลาปัจจุบัน</div>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-mono"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />SYNCED</div>
                </div>
                <div className="relative h-6 rounded-full bg-white/[0.05] border border-white/10 overflow-hidden p-1 shadow-inner">
                  <div className="overview-progress-shine relative h-full rounded-full holo-gradient transition-[width] duration-1000 ease-out shadow-[0_0_24px_rgba(34,211,238,.45)] overflow-hidden" style={{ width: `${showUpRate}%` }}>
                    <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent" />
                  </div>
                </div>
                <div className="flex justify-between mt-3 text-xs text-slate-500 font-mono"><span>0%</span><span>LIVE CAPACITY TRACKING</span><span>100%</span></div>
                {latestCheckin && <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-3 text-sm"><span className="w-8 h-8 rounded-full bg-emerald-400/15 border border-emerald-400/25 flex items-center justify-center"><ShieldCheck className="w-4 h-4 text-emerald-300" /></span><span className="text-slate-400">เช็คอินล่าสุด</span><b className="text-white truncate">{latestCheckin.fullname}</b><span className="text-cyan-300 truncate hidden sm:inline">{latestCheckin.company}</span></div>}
              </div>

              <div className="relative w-full lg:w-56 rounded-[1.75rem] border border-cyan-400/25 bg-cyan-500/[0.06] p-4 flex items-center justify-center shadow-[0_0_35px_rgba(34,211,238,.1)]">
                <svg viewBox="0 0 120 120" className="w-36 h-36 lg:w-44 lg:h-44 -rotate-90 drop-shadow-[0_0_16px_rgba(34,211,238,.35)]" aria-label={`Show-up rate ${showUpRate}%`}>
                  <circle cx="60" cy="60" r="49" fill="none" stroke="rgba(255,255,255,.07)" strokeWidth="9" />
                  <circle cx="60" cy="60" r="55" fill="none" stroke="rgba(103,232,249,.32)" strokeWidth="1" strokeDasharray="3 8" className="overview-orbit" />
                  <circle cx="60" cy="60" r="49" fill="none" stroke="url(#attendance-ring)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray="100" strokeDashoffset={100 - showUpRate} className="transition-all duration-1000 ease-out" />
                  <defs><linearGradient id="attendance-ring"><stop stopColor="#6366f1" /><stop offset=".5" stopColor="#a855f7" /><stop offset="1" stopColor="#22d3ee" /></linearGradient></defs>
                </svg>
                <div className="absolute text-center"><div className={`${isFullscreen ? 'text-5xl' : 'text-4xl'} font-black text-white font-mono`}>{showUpRate}<span className="text-xl text-cyan-300">%</span></div><div className="text-[10px] text-slate-400 uppercase tracking-[0.2em] mt-1">Show-up rate</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Screen 3: Agenda Display ── */}
      {screen === 'agenda' && (
        <div className={`agenda-stage flex-1 relative glass-panel rounded-3xl border border-white/10 shadow-2xl animate-fade-in my-auto flex flex-col overflow-hidden ${isFullscreen ? 'p-10 lg:p-14' : 'p-7 lg:p-10'}`}>
          <div className="absolute -top-40 -right-32 w-[32rem] h-[32rem] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-pulse" />
          <div className="absolute -bottom-52 left-1/4 w-[38rem] h-[30rem] rounded-full bg-purple-600/10 blur-[130px] pointer-events-none animate-float" />
          <div className="absolute inset-0 opacity-[0.06] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(99,102,241,.3) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.24) 1px, transparent 1px)', backgroundSize: '64px 64px', maskImage: 'linear-gradient(to bottom, black, transparent 72%)' }} />
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-cyan-300 font-mono text-sm uppercase tracking-[0.2em]"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />Live Event Programme</div>
              <h2 className={`${isFullscreen ? 'text-5xl lg:text-6xl' : 'text-3xl lg:text-5xl'} font-extrabold text-white tracking-tight`}>Event Agenda</h2>
              <p className={`${isFullscreen ? 'text-xl' : 'text-base'} text-slate-300`}>{settings.event_name || 'Smart Event Registration'}</p>
            </div>
            <div className="md:text-right">
              <div className={`${isFullscreen ? 'text-4xl' : 'text-2xl'} font-extrabold font-mono text-cyan-300`}>{now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-sm text-slate-400 mt-1">{now.toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
          </div>

          {todayAgenda.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 bg-white/[0.02] text-center p-12">
              <Calendar className="w-14 h-14 text-slate-600 mb-4" />
              <h3 className="text-2xl font-bold text-white">ไม่มีกำหนดการสำหรับวันนี้</h3>
              <p className="text-slate-400 mt-2">จอจะแสดงเฉพาะรายการที่ตรงกับวันที่ปัจจุบัน กรุณาตรวจสอบวันที่ในเมนูตั้งค่าระบบ</p>
            </div>
          ) : (
          <div ref={agendaScrollRef} className="relative z-10 grid grid-cols-1 xl:grid-cols-2 gap-4 w-full content-start overflow-y-auto pr-1 pb-1 scroll-smooth">
            {todayAgenda.map((item, idx) => {
              const start = new Date(item.start_at);
              const end = new Date(item.end_at);
              const status = getAgendaStatus(item, now);
              const isActive = status === 'active';
              const isPast = status === 'past';
              const isNext = !isActive && !isPast && item.id === nextAgendaId;
              const isFocus = (item.id ?? item.start_at) === agendaFocusKey;
              const progress = isActive ? Math.min(100, Math.max(0, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100)) : 0;
              return (
              <div 
                key={item.id ?? idx}
                ref={isFocus ? agendaFocusRef : undefined}
                style={{ '--agenda-delay': `${Math.min(idx, 8) * 0.07}s` } as CSSProperties}
                className={`agenda-card ${isActive ? 'agenda-card-active' : ''} relative rounded-2xl border transition-[transform,border-color,background-color,box-shadow] duration-500 overflow-hidden flex ${isActive ? `${isFullscreen ? 'min-h-52' : 'min-h-44'} xl:col-span-2 z-10` : isFullscreen ? 'min-h-40' : 'min-h-32'} ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600/50 via-purple-600/35 to-cyan-500/25 border-cyan-300 shadow-[0_0_45px_rgba(34,211,238,0.3)] z-10'
                    : isPast
                      ? 'bg-white/[0.025] border-white/5 opacity-55'
                      : isNext
                        ? 'bg-indigo-950/25 border-indigo-400/30 shadow-[0_12px_35px_rgba(99,102,241,.1)]'
                      : item.is_highlight
                        ? 'bg-purple-950/30 border-purple-500/40'
                        : 'bg-white/[0.045] border-white/10'
                }`}
              >
                {isActive && <><div className="absolute -right-16 -top-20 w-64 h-64 rounded-full bg-cyan-300/10 blur-3xl" /><div className="absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-emerald-300 via-cyan-300 to-indigo-400 animate-pulse" /></>}
                {item.speaker_image && <div className={`${isActive ? 'w-40 sm:w-52' : 'w-28 sm:w-36'} shrink-0 bg-slate-900`}>
                  {/* Data URLs come from staff uploads and cannot use the Next image optimizer. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.speaker_image} alt={item.speaker || item.title} className="w-full h-full object-cover" />
                </div>}
                <div className={`${isFullscreen ? 'px-7 py-6 lg:px-8 lg:py-7' : 'p-5'} flex-1 min-w-0 flex flex-col justify-center`}>
                  <div className={`flex flex-wrap items-center justify-between gap-2 ${isFullscreen ? 'mb-3' : 'mb-2'}`}>
                    <span className={`${isFullscreen ? 'text-xl' : 'text-base'} font-mono font-bold ${isActive ? 'text-cyan-200' : 'text-cyan-400'}`}>
                      {start.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isActive ? <span className="px-3 py-1 rounded-full bg-emerald-400 text-emerald-950 font-extrabold text-xs tracking-wider flex items-center gap-2"><span className="agenda-live-dot w-1.5 h-1.5 rounded-full bg-emerald-950" />กำลังดำเนินรายการ</span> : isNext ? <span className="px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-200 border border-indigo-400/25 font-bold text-xs">รายการถัดไป</span> : item.is_highlight ? <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 font-bold text-xs">HIGHLIGHT</span> : null}
                  </div>
                  <h4 className={`${isFullscreen ? 'text-2xl lg:text-[1.7rem] leading-snug' : 'text-lg lg:text-2xl leading-tight'} font-extrabold text-white`}>{item.title}</h4>
                  {item.description && <p className={`${isFullscreen ? 'text-base lg:text-lg' : 'text-sm lg:text-base'} text-slate-200/90 mt-2 leading-relaxed line-clamp-2`}>{item.description}</p>}
                  <div className={`${isFullscreen ? 'text-base lg:text-lg mt-3' : 'text-sm mt-2'} text-slate-300 flex flex-wrap gap-x-5 gap-y-1.5`}>
                    {item.speaker && <span>{item.speaker}</span>}
                    {item.location && <span className="text-indigo-300">{item.location}</span>}
                  </div>
                  {isActive && <div className="mt-4"><div className="flex items-center justify-between text-[10px] font-mono text-cyan-100/70 mb-1.5"><span>SESSION PROGRESS</span><span>{Math.round(progress)}%</span></div><div className="h-1.5 rounded-full bg-black/25 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-300 via-cyan-300 to-emerald-300 shadow-[0_0_12px_rgba(103,232,249,.8)] transition-[width] duration-1000" style={{ width: `${progress}%` }} /></div></div>}
                  {isActive && pastAgendaCount > 0 && <div className="mt-2 text-[10px] text-slate-300/55 font-mono">↑ เลื่อนขึ้นเพื่อดู {pastAgendaCount} รายการที่ผ่านมา</div>}
                </div>
              </div>
            )})}
            {agendaFocusKey && pastAgendaCount > 0 && <div aria-hidden="true" className="xl:col-span-2 h-[45vh] min-h-64 pointer-events-none" />}
          </div>
          )}
        </div>
      )}

      {/* ── Screen 4: Lucky Standby ── */}
      {screen === 'lucky' && (
        <div className={`lucky-stage flex-1 relative flex flex-col items-center justify-center text-center overflow-hidden glass-panel-glow rounded-3xl border border-purple-400/30 shadow-[0_25px_90px_rgba(88,28,135,.28)] animate-fade-in my-auto ${isFullscreen ? 'p-16' : 'p-10 sm:p-12'}`}>
          <div className="absolute inset-0 opacity-[0.12] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(216,180,254,.7) 1px, transparent 1.5px)', backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at center, black, transparent 72%)' }} />
          <div className="absolute -top-48 left-[8%] w-[34rem] h-[34rem] rounded-full bg-purple-600/20 blur-[120px] animate-pulse pointer-events-none" />
          <div className="absolute -bottom-52 right-[5%] w-[38rem] h-[38rem] rounded-full bg-cyan-500/14 blur-[130px] animate-float pointer-events-none" />
          {[
            ['13%', '22%', '5px', '7s', '-2s'], ['26%', '74%', '4px', '9s', '-5s'], ['72%', '18%', '6px', '8s', '-3s'], ['87%', '68%', '4px', '6s', '-1s'], ['63%', '82%', '5px', '10s', '-7s'],
          ].map(([left, top, size, speed, delay], index) => <span key={index} className="overview-particle absolute rounded-full bg-amber-200 shadow-[0_0_16px_rgba(251,191,36,.8)] pointer-events-none" style={{ left, top, width: size, height: size, '--particle-speed': speed, '--particle-delay': delay } as CSSProperties} />)}

          <div className="relative z-10 flex flex-col items-center">
            <div className={`lucky-ready inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-300/25 text-amber-200 font-mono font-bold uppercase ${isFullscreen ? 'px-6 py-2.5 text-base mb-9' : 'px-4 py-2 text-xs mb-7'}`}>
              <Sparkles className="w-4 h-4" /> Get Ready · Grand Prize
            </div>

            <div className={`relative flex items-center justify-center ${isFullscreen ? 'w-[26rem] h-[26rem] mb-5' : 'w-64 h-64 sm:w-72 sm:h-72 mb-5'}`}>
              <div className="lucky-ring absolute inset-0 rounded-full border border-dashed border-purple-300/35" />
              <div className="lucky-ring-reverse absolute inset-[8%] rounded-full border-2 border-dotted border-cyan-300/30" />
              <div className="absolute inset-[15%] rounded-full bg-gradient-to-br from-purple-500/30 via-fuchsia-500/15 to-amber-400/15 border border-white/10 shadow-[0_0_75px_rgba(168,85,247,.42)]" />
              <div className="lucky-trophy relative w-[78%] h-[78%] flex items-center justify-center">
                <span className="absolute inset-[12%] rounded-full bg-amber-300/20 blur-3xl -z-10" />
                <Image
                  src="/lucky-draw-trophy.png"
                  alt="ถ้วยรางวัล Lucky Draw"
                  fill
                  priority
                  sizes={isFullscreen ? '416px' : '(min-width: 640px) 288px, 256px'}
                  className="object-contain drop-shadow-[0_22px_35px_rgba(0,0,0,.55)]"
                />
              </div>
            </div>

            <h1 className={`lucky-title font-black tracking-[-0.04em] leading-none ${isFullscreen ? 'text-7xl lg:text-9xl' : 'text-5xl sm:text-7xl lg:text-8xl'}`}>LUCKY DRAW</h1>
            <div className={`${isFullscreen ? 'text-3xl lg:text-4xl mt-4' : 'text-xl lg:text-2xl mt-3'} font-bold text-purple-200 tracking-[0.3em] uppercase`}>Stage</div>
            <p className={`${isFullscreen ? 'text-2xl max-w-3xl mt-8 mb-10' : 'text-lg lg:text-xl max-w-2xl mt-6 mb-8'} text-slate-300 font-light leading-relaxed`}>
              เตรียมพร้อมสำหรับการสุ่มรางวัลใหญ่<br className="hidden sm:block" /> ขอให้ผู้ร่วมงานทุกท่านโชคดี!
            </p>

            <div className={`relative overflow-hidden rounded-2xl bg-white/[0.05] border border-white/10 font-mono text-slate-300 shadow-xl ${isFullscreen ? 'px-9 py-4 text-base' : 'px-6 py-3 text-xs lg:text-sm'}`}>
              <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-purple-400 via-amber-300 to-cyan-300 animate-pulse" />
              กดปุ่มสุ่มรางวัล (SPIN) จากแผงควบคุมระบบ เพื่อเริ่มการหมุนวงล้อ
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
