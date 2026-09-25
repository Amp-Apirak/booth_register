'use client';

import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { 
  Home, 
  UserPlus, 
  QrCode, 
  ScanLine, 
  LayoutDashboard, 
  Tv, 
  Sparkles,
  Zap,
  Menu,
  X,
  LogOut,
  LogIn,
  Settings
} from 'lucide-react';
import { useState, Suspense, useEffect } from 'react';
import useWebSocket from '@/lib/useWebSocket';
import { useSettings } from '@/contexts/SettingsContext';
import { useT } from '@/contexts/PreferencesContext';
import PreferenceToggles from '@/components/PreferenceToggles';

const navItems = [
  { href: '/', key: 'home', icon: Home, staffOnly: false },
  { href: '/register', key: 'register', icon: UserPlus, staffOnly: false },
  { href: '/ticket', key: 'ticket', icon: QrCode, staffOnly: false },
  { href: '/scanner', key: 'scanner', icon: ScanLine, staffOnly: true },
  { href: '/dashboard', key: 'dashboard', icon: LayoutDashboard, staffOnly: true },
  { href: '/settings', key: 'settings', icon: Settings, staffOnly: true },
  { href: '/signage', key: 'signage', icon: Tv, staffOnly: false },
  { href: '/lucky-draw', key: 'luckyDraw', icon: Sparkles, staffOnly: false },
] as const;

function NavigationContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { connected } = useWebSocket();
  const { settings } = useSettings();
  const t = useT();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('staff_token'));
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem('staff_token');
    localStorage.removeItem('staff_user');
    setIsLoggedIn(false);
    router.push('/login');
  };

  const visibleNavItems = navItems.filter(item => !item.staffOnly || isLoggedIn);
  // Staff see 8 items, the public 5. So every item fits on one row in TH and EN, the desktop bar starts at xl
  // (menu button below) and staff get a compact bar without icons or the year badge.
  const compact = isLoggedIn;

  // If in public/standalone mode (e.g. sent to attendees) or if it's the register page
  const isPublicMode = pathname === '/register' || searchParams.get('mode') === 'public' || searchParams.get('standalone') === 'true';

  if (isPublicMode) {
    return (
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3">
        {/* phones: event name on the first row, language/theme + "find my ticket" on the second (inside the card) */}
        <div className="glass-panel rounded-2xl mx-auto max-w-3xl px-5 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5 border border-white/10 shadow-2xl backdrop-blur-2xl">
          <Link href="/" className="flex items-center gap-3 sm:gap-4 min-w-0 group cursor-pointer hover:opacity-80 transition-opacity">
            {settings.event_logo ? (
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 shadow-lg p-1 group-hover:scale-105 transition-transform duration-300">
                <img src={settings.event_logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-surface-2 rounded-[11px] flex items-center justify-center">
                  <Zap className="w-5 h-5 sm:w-7 sm:h-7 text-cyan-400" />
                </div>
              </div>
            )}
            <div>
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white max-w-[200px] sm:max-w-xs truncate block drop-shadow-md group-hover:text-cyan-300 transition-colors">
                {settings.event_name || 'TECH INNOVATION SUMMIT 2026'}
              </span>
              <p className="text-[10px] sm:text-xs text-indigo-300 font-mono tracking-widest uppercase mt-0.5">
                {t.nav.attendeePortal}
              </p>
            </div>
          </Link>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
          <PreferenceToggles />
          <Link
            href="/ticket"
            className="text-sm font-bold text-on-accent bg-gradient-to-r from-cyan-600 to-blue-500 hover:from-cyan-500 hover:to-blue-400 px-4 py-2 rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 whitespace-nowrap transition-all border border-cyan-400/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            <QrCode className="w-4 h-4" />
            <span>{t.nav.findMyTicket}</span>
          </Link>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-8 py-3 w-full">
      <nav className="glass-panel rounded-2xl mx-auto max-w-[1600px] px-4 sm:px-6 py-2.5 flex items-center justify-between border border-white/10 shadow-2xl backdrop-blur-2xl w-full">
          
          {/* Left: Brand Logo */}
        <div className="flex items-center shrink-0">
          <Link href="/" className="flex items-center gap-3 group">
            {settings.event_logo ? (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 shadow-lg p-1 group-hover:scale-105 transition-transform duration-300">
                <img src={settings.event_logo} alt="Logo" className="w-full h-full object-cover rounded-lg" />
              </div>
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full bg-surface-2 rounded-[11px] flex items-center justify-center">
                  <Zap className="w-5 h-5 text-cyan-400 group-hover:text-indigo-300 transition-colors" />
                </div>
              </div>
            )}
            <div className="shrink-0 max-w-[150px] sm:max-w-xs md:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-base sm:text-lg tracking-tight holo-text truncate block">
                    {settings.event_name || 'SMART EVENT'}
                  </span>
                  <span className={`${compact ? 'hidden' : ''} text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-semibold tracking-wider`}>
                    2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 tracking-wider font-mono uppercase hidden xl:block whitespace-nowrap">
                  {t.nav.tagline}
                </p>
              </div>
            </Link>
          </div>

          {/* Center: Desktop Navigation Links */}
        <div className="hidden xl:flex flex-1 items-center justify-center px-4">
          <div className="flex items-center flex-wrap justify-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.05]">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex items-center gap-2 py-2 rounded-lg font-semibold transition-all duration-300 whitespace-nowrap shrink-0 ${compact ? 'px-2.5 text-[13px] 2xl:text-sm' : 'px-3.5 text-sm tracking-wide'} ${
                      isActive
                        ? 'text-on-accent bg-gradient-to-r from-indigo-600/80 to-purple-600/80 shadow-lg shadow-indigo-500/25 border border-indigo-400/30'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'
                    }`}
                  >
                    {!compact && <Icon className={`hidden 2xl:block w-4 h-4 ${isActive ? 'text-cyan-300' : 'text-slate-400'}`} />}
                    <span>{t.nav[item.key]}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          
          {/* Right Status & Auth (Inside the card) */}
        <div className="flex items-center gap-3 shrink-0">
          <div title={connected ? t.nav.liveSync : t.nav.disconnected} className={`hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-medium border whitespace-nowrap shrink-0 transition-all ${
            connected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-sm shadow-emerald-500/10' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span className="hidden 2xl:inline">{connected ? t.nav.liveSync : t.nav.disconnected}</span>
          </div>

          <PreferenceToggles className="hidden md:flex" />

          {isLoggedIn ? (
            <button
              onClick={handleLogout}
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-on-accent hover:bg-rose-500/80 border border-rose-500/20 transition-all duration-300 whitespace-nowrap shrink-0 group"
              title={t.nav.logout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden 2xl:inline">{t.nav.logout}</span>
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-400 hover:text-on-accent hover:bg-indigo-500/80 border border-indigo-500/20 transition-all duration-300 whitespace-nowrap shrink-0 group"
              title={t.nav.login}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{t.nav.login}</span>
            </Link>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="xl:hidden p-2 rounded-xl bg-white/[0.05] border border-white/10 text-slate-300 hover:text-white"
            aria-label={t.nav.toggleMenu}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="xl:hidden mt-2 glass-panel-glow rounded-2xl p-4 border border-white/10 shadow-2xl animate-fade-in max-w-[1600px] mx-auto w-full">
          <div className="flex flex-col gap-1.5">
            <PreferenceToggles className="md:hidden mb-2" />
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-indigo-600 text-on-accent shadow-lg shadow-indigo-600/30'
                      : 'text-slate-300 hover:bg-white/[0.05]'
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{t.nav[item.key]}</span>
                </Link>
              );
            })}

            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-sm font-semibold text-rose-400 hover:bg-rose-500/10 transition-all border border-rose-500/10"
              >
                <LogOut className="w-4 h-4" />
                <span>{t.nav.logout}</span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 px-4 py-3 mt-2 rounded-xl text-sm font-semibold text-indigo-400 hover:bg-indigo-500/10 transition-all border border-indigo-500/10"
              >
                <LogIn className="w-4 h-4" />
                <span>{t.nav.loginStaff}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default function Navigation() {
  return (
    <Suspense fallback={<div className="h-16" />}>
      <NavigationContent />
    </Suspense>
  );
}
