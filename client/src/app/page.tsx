'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api, { Stats, formatEventDateRange, formatEventTimeRange, formatEventLocation } from '@/lib/api';
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
  CalendarDays,
  MapPin,
  Zap
} from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export default function HomePage() {
  const router = useRouter();
  const { settings, isLoading } = useSettings();
  const [showSplash, setShowSplash] = useState(true); // Default true for SSR, then check sessionStorage
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [stats, setStats] = useState<Stats>({ registered: 0, checked_in: 0, pending: 0, show_up_percent: 0 });
  const { stats: wsStats, connected } = useWebSocket();

  useEffect(() => {
    if (sessionStorage.getItem('splash_shown')) {
      setShowSplash(false);
    }
  }, []);

  const handleSplashClick = () => {
    setIsFadingOut(true);
    setTimeout(() => {
      setShowSplash(false);
      sessionStorage.setItem('splash_shown', 'true');
    }, 800); // Wait for fade out animation
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
      title: 'ลงทะเบียนออนไลน์',
      subtitle: 'Self-Registration & PDPA',
      desc: 'ลงทะเบียนเข้าร่วมงานสัมมนาล่วงหน้า พร้อมขอความยินยอมตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
      icon: UserPlus,
      color: 'from-indigo-500/20 via-indigo-600/10 to-transparent',
      borderColor: 'group-hover:border-indigo-500/50',
      iconColor: 'text-indigo-400',
      badge: 'Step 1'
    },
    {
      href: '/ticket',
      title: 'ตั๋วเข้างานดิจิทัล',
      subtitle: 'Holographic QR Wallet',
      desc: 'แสดงบัตรผ่านประตูดิจิทัล (Digital Pass) พร้อมรหัส QR Code เข้ารหัสสำหรับยิงสแกนหน้างาน',
      icon: QrCode,
      color: 'from-cyan-500/20 via-cyan-600/10 to-transparent',
      borderColor: 'group-hover:border-cyan-500/50',
      iconColor: 'text-cyan-400',
      badge: 'Step 2'
    },
    {
      href: '/scanner',
      title: 'จุดสแกนเข้าประตู',
      subtitle: 'Fast Check-in Counter',
      desc: 'ระบบสแกนผ่านประตูสำหรับเจ้าหน้าที่ ตรวจสอบตั๋วใน 0.1 วินาที พร้อมระบบบล็อกการสแกนซ้ำ',
      icon: ScanLine,
      color: 'from-emerald-500/20 via-emerald-600/10 to-transparent',
      borderColor: 'group-hover:border-emerald-500/50',
      iconColor: 'text-emerald-400',
      badge: 'Step 3'
    },
    {
      href: '/signage',
      title: 'จอ LED Signage หน้างาน',
      subtitle: 'Real-Time Welcome Display',
      desc: 'ป้ายไฟ LED ต้อนรับผู้เข้าร่วมงานแบบสดๆ ขึ้นชื่อและบริษัทอัตโนมัติทันทีที่สแกนผ่านประตู',
      icon: Tv,
      color: 'from-amber-500/20 via-amber-600/10 to-transparent',
      borderColor: 'group-hover:border-amber-500/50',
      iconColor: 'text-amber-400',
      badge: 'Live Screen'
    },
    {
      href: '/lucky-draw',
      title: 'วงล้อสุ่มรางวัล',
      subtitle: 'Lucky Draw Engine',
      desc: 'ระบบสุ่มจับรางวัลผู้โชคดีเฉพาะคนที่เช็คอินเข้างานแล้ว ตัดสิทธิ์สตาฟและผู้เคยได้รางวัลอัตโนมัติ',
      icon: Sparkles,
      color: 'from-pink-500/20 via-pink-600/10 to-transparent',
      borderColor: 'group-hover:border-pink-500/50',
      iconColor: 'text-pink-400',
      badge: 'Interactive'
    },
    {
      href: '/dashboard',
      title: 'แดชบอร์ดจัดการ CMS',
      subtitle: 'Executive Operations',
      desc: 'ศูนย์ควบคุมสำหรับผู้จัดงาน ดูสถิติสด กราฟ Show-up rate จัดการรายชื่อ และส่งออกข้อมูล',
      icon: LayoutDashboard,
      color: 'from-purple-500/20 via-purple-600/10 to-transparent',
      borderColor: 'group-hover:border-purple-500/50',
      iconColor: 'text-purple-400',
      badge: 'Admin'
    },
  ];

  if (isLoading) {
    return <div className="fixed inset-0 bg-[#060913] z-[200]"></div>;
  }

  return (
    <>
      {/* ── SPLASH SCREEN OVERLAY ── */}
      {showSplash && (
        <div 
          onClick={handleSplashClick}
          className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#060913] cursor-pointer transition-opacity duration-700 ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}
        >
          {/* Animated Background Orbs */}
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/30 rounded-full blur-[128px] animate-pulse pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-600/30 rounded-full blur-[128px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-cyber-mesh opacity-50 pointer-events-none" />

          {/* Main Logo Card */}
          <div className="relative z-10 flex flex-col items-center text-center animate-bounce-in">
            {settings.event_logo ? (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 shadow-2xl p-2 mb-8 animate-float">
                <img src={settings.event_logo} alt="Event Logo" className="w-full h-full object-cover rounded-2xl" />
              </div>
            ) : (
              <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-1 mb-8 shadow-2xl shadow-indigo-500/50 animate-float">
                <div className="w-full h-full bg-[#090d16] rounded-[22px] flex items-center justify-center">
                  <Zap className="w-12 h-12 sm:w-16 sm:h-16 text-cyan-400" />
                </div>
              </div>
            )}

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight mb-4 font-heading max-w-4xl leading-tight">
              <span className="block text-white drop-shadow-2xl px-4">{settings.event_name || 'SMART EVENT REGISTRATION'}</span>
            </h1>
            
            <p className="text-indigo-300/80 font-mono tracking-widest uppercase text-sm sm:text-base mt-4 mb-12">
              Next-Gen Event Experience Platform
            </p>

            {(formatEventDateRange(settings.event_start, settings.event_end) || formatEventLocation(settings)) && (
              <div className="flex flex-col items-center gap-2 text-slate-300 text-sm sm:text-base mb-10">
                {formatEventDateRange(settings.event_start, settings.event_end) && (
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-cyan-400" />
                    {formatEventDateRange(settings.event_start, settings.event_end)}
                    {formatEventTimeRange(settings.event_start, settings.event_end) ? ` • ${formatEventTimeRange(settings.event_start, settings.event_end)}` : ''}
                  </span>
                )}
                {formatEventLocation(settings) && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-pink-400" />
                    {formatEventLocation(settings)}
                  </span>
                )}
              </div>
            )}

            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-slate-300 font-semibold animate-pulse hover:bg-white/10 transition-colors">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span>คลิกที่ใดก็ได้เพื่อเข้าสู่ระบบ (Click to Enter)</span>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN HOME PAGE ── */}
      <div className={`space-y-12 pb-12 transition-opacity duration-1000 ${showSplash && !isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
      {/* ── Grand Hero Section ── */}
      <section className="relative text-center pt-8 pb-12 px-4 overflow-hidden rounded-3xl glass-panel-glow border border-indigo-500/20 shadow-2xl">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-gradient-to-tr from-indigo-600/30 via-purple-600/20 to-cyan-400/20 blur-3xl pointer-events-none rounded-full" />
        
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs font-semibold text-indigo-300 mb-6 backdrop-blur-xl animate-float shadow-inner">
          <Zap className="w-3.5 h-3.5 text-cyan-400" />
          <span>Next-Gen Event Experience Platform</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4 font-heading">
          <span className="block text-white px-4">{settings.event_name || 'SMART EVENT REGISTRATION'}</span>
        </h1>

        <div className="flex items-center justify-center gap-3 text-xs sm:text-sm font-mono tracking-widest text-slate-400 uppercase mb-6">
          <span className="px-2.5 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">SCAN</span>
          <span className="text-slate-600">•</span>
          <span className="px-2.5 py-1 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">CHECK-IN</span>
          <span className="text-slate-600">•</span>
          <span className="px-2.5 py-1 rounded bg-pink-500/10 border border-pink-500/20 text-pink-300">SHOW</span>
        </div>

        {(formatEventDateRange(settings.event_start, settings.event_end) || formatEventLocation(settings)) && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6 text-sm sm:text-base text-slate-300 mb-8">
            {formatEventDateRange(settings.event_start, settings.event_end) && (
              <span className="inline-flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-cyan-400" />
                {formatEventDateRange(settings.event_start, settings.event_end)}
                {formatEventTimeRange(settings.event_start, settings.event_end) ? ` • ${formatEventTimeRange(settings.event_start, settings.event_end)}` : ''}
              </span>
            )}
            {formatEventLocation(settings) && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="w-4 h-4 text-pink-400" />
                {formatEventLocation(settings)}
              </span>
            )}
          </div>
        )}

        <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto font-light leading-relaxed mb-8">
          ระบบบริหารจัดการลงทะเบียน สแกนเข้าประตูความเร็วสูง พร้อมแสดงป้ายต้อนรับ LED Signage และจับรางวัล Lucky Draw แบบเรียลไทม์
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white text-sm font-bold shadow-xl shadow-indigo-500/25 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border border-indigo-300/30"
          >
            <UserPlus className="w-4 h-4" />
            <span>ทดลองลงทะเบียนทันที</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
          <Link
            href="/scanner"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 hover:text-white text-sm font-bold border border-white/10 hover:border-white/20 transition-all duration-300"
          >
            <ScanLine className="w-4 h-4 text-cyan-400" />
            <span>เปิดจุดสแกนสตาฟ</span>
          </Link>
        </div>
      </section>

      {/* ── 4 Executive 3D Metrics Cards ── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 perspective-1000">
        {/* Card 1: Registered */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-indigo-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">ยอดลงทะเบียน</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white font-heading tracking-tight mb-2">
            {activeStats.registered.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-indigo-300/80">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span>ผู้สมัครเข้าร่วมงานทั้งหมด</span>
          </div>
        </div>

        {/* Card 2: Checked-in */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">เช็คอินเข้างานแล้ว</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-heading tracking-tight mb-2">
            {activeStats.checked_in.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-300/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>ผ่านจุดสแกนประตูแล้ว</span>
          </div>
        </div>

        {/* Card 3: Pending */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-amber-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">ยังไม่เช็คอิน</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-heading tracking-tight mb-2">
            {activeStats.pending.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-300/80">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>อยู่ระหว่างการเดินทาง</span>
          </div>
        </div>

        {/* Card 4: Show-up Rate */}
        <div className="glass-panel rounded-2xl p-6 relative overflow-hidden card-3d border border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Show-up Rate</span>
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
              ศูนย์ปฏิบัติการและเมนูระบบ
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              เลือกระบบที่ต้องการเปิดใช้งานเพื่อทดสอบกระบวนการทำงาน
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-indigo-400 font-semibold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl">
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
                    <span className="text-[11px] font-mono font-semibold px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/10 text-slate-400 group-hover:text-white group-hover:border-white/20 transition-colors">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-cyan-300 transition-colors mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs font-medium text-indigo-300/90 mb-3">
                    {item.subtitle}
                  </p>
                  <p className="text-xs text-slate-400 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                  <span>เข้าสู่หน้าการทำงาน</span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform text-cyan-400" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
      </div>
    </>
  );
}
