'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import api, { Stats } from '@/lib/api';
import EventExperience, { EventWelcome } from '@/components/EventExperience';
import { useBackdrop } from '@/components/SiteBackdrop';
import useWebSocket from '@/lib/useWebSocket';
import { 
  UserPlus, 
  QrCode, 
  ScanLine, 
  LayoutDashboard, 
  Tv, 
  Sparkles, 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useT } from '@/contexts/PreferencesContext';

function subscribeToSession(onChange: () => void) {
  window.addEventListener('storage', onChange);
  return () => window.removeEventListener('storage', onChange);
}

function hasSeenEntrance() {
  try {
    return Boolean(sessionStorage.getItem('splash_shown'));
  } catch {
    return false;
  }
}

export default function HomePage() {
  const { settings, isLoading } = useSettings();
  const t = useT();
  const { paused: effectsPaused, togglePaused: toggleMotion, setHidden: setBackdropHidden } = useBackdrop();
  const seenEntrance = useSyncExternalStore(subscribeToSession, hasSeenEntrance, () => false);
  const [entranceOverride, setShowSplash] = useState<boolean | null>(null);
  const showSplash = entranceOverride ?? !seenEntrance;

  // The welcome dialog brings its own aurora; don't animate a second one behind it.
  useEffect(() => {
    setBackdropHidden(showSplash);
    return () => setBackdropHidden(false);
  }, [showSplash, setBackdropHidden]);
  const [stats, setStats] = useState<Stats>({ registered: 0, checked_in: 0, pending: 0, show_up_percent: 0 });
  const { stats: wsStats } = useWebSocket();

  const handleSplashClick = () => {
    setShowSplash(false);
    try {
      sessionStorage.setItem('splash_shown', 'true');
    } catch {
      // Remembering the entrance is optional.
    }
    requestAnimationFrame(() => document.getElementById('event-home-title')?.focus({ preventScroll: true }));
  };

  useEffect(() => {
    const fetchStats = async () => {
      const data = await api.getStats();
      setStats(data);
    };
    fetchStats();
  }, []);

  // Prefer live WebSocket stats if updated
  const activeStats = wsStats.registered > 0 ? wsStats : stats;
  const showUpRate = activeStats.registered > 0 
    ? Math.round((activeStats.checked_in / activeStats.registered) * 100) 
    : 0;

  const quickLinks = [
    {
      href: '/register',
      title: t.home.modules.register.title,
      subtitle: 'Self-Registration & PDPA',
      desc: t.home.modules.register.desc,
      icon: UserPlus,
      color: 'from-indigo-500/20 via-indigo-600/10 to-transparent',
      borderColor: 'group-hover:border-indigo-500/50',
      iconColor: 'text-indigo-400',
      badge: 'Step 1'
    },
    {
      href: '/ticket',
      title: t.home.modules.ticket.title,
      subtitle: 'Holographic QR Wallet',
      desc: t.home.modules.ticket.desc,
      icon: QrCode,
      color: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
      borderColor: 'group-hover:border-cyan-500/50',
      iconColor: 'text-cyan-400',
      badge: 'Step 2'
    },
    {
      href: '/scanner',
      title: t.home.modules.scanner.title,
      subtitle: 'Fast Check-in Counter',
      desc: t.home.modules.scanner.desc,
      icon: ScanLine,
      color: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
      borderColor: 'group-hover:border-emerald-500/50',
      iconColor: 'text-emerald-400',
      badge: 'Step 3'
    },
    {
      href: '/signage',
      title: t.home.modules.signage.title,
      subtitle: 'Real-Time Welcome Display',
      desc: t.home.modules.signage.desc,
      icon: Tv,
      color: 'from-amber-500/20 via-amber-600/10 to-transparent',
      borderColor: 'group-hover:border-amber-500/50',
      iconColor: 'text-amber-400',
      badge: 'Live Screen'
    },
    {
      href: '/lucky-draw',
      title: t.home.modules.luckyDraw.title,
      subtitle: 'Lucky Draw Engine',
      desc: t.home.modules.luckyDraw.desc,
      icon: Sparkles,
      color: 'from-pink-500/20 via-pink-600/10 to-transparent',
      borderColor: 'group-hover:border-pink-500/50',
      iconColor: 'text-pink-400',
      badge: 'Interactive'
    },
    {
      href: '/dashboard',
      title: t.home.modules.dashboard.title,
      subtitle: 'Executive Operations',
      desc: t.home.modules.dashboard.desc,
      icon: LayoutDashboard,
      color: 'from-purple-500/20 via-purple-600/10 to-transparent',
      borderColor: 'group-hover:border-purple-500/50',
      iconColor: 'text-purple-400',
      badge: 'Admin'
    },
  ];

  if (isLoading) {
    return <div className="fixed inset-0 bg-surface z-[200]"></div>;
  }

  return (
    <div>
      {showSplash && <EventWelcome settings={settings} onEnter={handleSplashClick} paused={effectsPaused} onToggleMotion={toggleMotion} />}

      <div className="space-y-12 pb-12">
        {!showSplash && <EventExperience settings={settings} onReplay={() => setShowSplash(true)} paused={effectsPaused} onToggleMotion={toggleMotion} />}

      {/* ── 4 Executive 3D Metrics Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 perspective-1000">
        {/* Card 1: Registered */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-indigo-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">{t.home.stats.registered}</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white font-heading tracking-tight mb-2">
            {activeStats.registered.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-indigo-300/80">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>{t.home.stats.registeredNote}</span>
          </div>
        </div>

        {/* Card 2: Checked-in */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-emerald-300 uppercase tracking-wider">{t.home.stats.checkedIn}</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-heading tracking-tight mb-2">
            {activeStats.checked_in.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-emerald-300/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>{t.home.stats.checkedInNote}</span>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-amber-300 uppercase tracking-wider">{t.common.status.pending}</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-heading tracking-tight mb-2">
            {activeStats.pending.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-sm text-amber-300/80">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>{t.home.stats.pendingNote}</span>
          </div>
        </div>

        {/* Card 4: Show-up Rate */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-purple-300 uppercase tracking-wider">Show-up Rate</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-purple-300 font-heading tracking-tight mb-2">
            {showUpRate}%
          </div>
          <div className="w-full bg-white/[0.08] h-1.5 rounded-full overflow-hidden mt-2">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-700" 
              style={{ width: `${showUpRate}%` }} 
            />
          </div>
        </div>
      </section>

      {/* ── 6 Modern 3D Feature Portals ── */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t.home.modules.title}
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              {t.home.modules.subtitle}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4" />
            <span>ISO 9002 Ready</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 perspective-1000">
          {quickLinks.map((item, idx) => {
            const Icon = item.icon;
            return (
              <Link
                key={idx}
                href={item.href}
                className={`group glass-panel rounded-2xl p-6 sm:p-7 border border-white/[0.08] ${item.borderColor} transition-all duration-400 card-3d relative overflow-hidden flex flex-col justify-between`}
              >
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${item.color} rounded-full blur-2xl pointer-events-none group-hover:scale-150 transition-transform duration-500`} />
                
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center ${item.iconColor} group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-inner`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-slate-400 group-hover:text-white group-hover:border-white/20 transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm font-medium text-indigo-300/90 mb-3">
                    {item.subtitle}
                  </p>
                  <p className="text-sm text-slate-400 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-sm font-semibold text-slate-400 group-hover:text-white transition-colors">
                  <span>{t.home.modules.open}</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform text-cyan-400" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      </div>
    </div>
  );
}
