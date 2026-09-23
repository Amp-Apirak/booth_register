'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Mail, MapPin, MessageCircle, Phone, Rocket, ShieldCheck, Zap } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { formatEventDateRange, formatEventLocation, formatEventTimeRange } from '@/lib/api';
import { PLATFORM_CONTACT, formatThaiPhone, isWebUrl, lineHref, telHref } from '@/lib/platform';

// Full-screen displays and kiosks: a footer would waste space or push content off screen
const NO_FOOTER = ['/signage', '/lucky-draw', '/scanner'];
// Staff back-office pages get a slim one-line footer
const STAFF_PAGES = ['/dashboard', '/settings'];

export default function SiteFooter() {
  const pathname = usePathname();
  const { settings } = useSettings();

  if (NO_FOOTER.some((p) => pathname.startsWith(p))) return null;

  const eventName = settings.event_name || 'Smart Event Registration';
  const owner = settings.organizer_name || eventName;
  const copyright = `© ${new Date().getFullYear()} ${owner}`;

  if (STAFF_PAGES.some((p) => pathname.startsWith(p))) {
    return (
      <footer className="border-t border-white/5 mt-8">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <span>{copyright} · ระบบบริหารงานอีเว้นท์ (สำหรับเจ้าหน้าที่)</span>
          <span>
            ติดต่อทีมดูแลแพลตฟอร์ม:{' '}
            <a href={telHref(PLATFORM_CONTACT.phone)} className="text-slate-300 hover:text-white">
              {PLATFORM_CONTACT.name} · {formatThaiPhone(PLATFORM_CONTACT.phone)}
            </a>
          </span>
        </div>
      </footer>
    );
  }

  const date = formatEventDateRange(settings.event_start, settings.event_end);
  const time = formatEventTimeRange(settings.event_start, settings.event_end);
  const location = formatEventLocation(settings);
  const mapUrl = isWebUrl(settings.event_map_url || '') ? settings.event_map_url : '';
  const hasContact = settings.contact_phone || settings.contact_email || settings.contact_line;

  const heading = 'text-sm font-bold text-white uppercase tracking-wider mb-4';
  const link = 'text-sm text-slate-400 hover:text-cyan-300 transition-colors';

  return (
    <footer className="relative mt-12 border-t border-white/10 bg-[#060913]/70 backdrop-blur-xl">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />
      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1.2fr] gap-10">
        {/* Event */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            {settings.event_logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.event_logo} alt={eventName} className="w-11 h-11 rounded-xl object-cover border border-white/10" />
            ) : (
              <span className="w-11 h-11 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400"><Zap className="w-5 h-5" /></span>
            )}
            <div>
              <div className="text-lg font-extrabold text-white leading-tight">{eventName}</div>
              {settings.organizer_name && <div className="text-sm text-slate-400">จัดโดย {settings.organizer_name}</div>}
            </div>
          </div>
          <div className="space-y-2.5 text-sm text-slate-300">
            {date && (
              <div className="flex items-start gap-2.5">
                <Calendar className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                <span>{date}{time && <span className="text-slate-400"> · {time}</span>}</span>
              </div>
            )}
            {location && (
              <div className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-cyan-400 mt-0.5 shrink-0" />
                <span>
                  {location}
                  {mapUrl && <> · <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:text-cyan-200 underline underline-offset-2">ดูแผนที่</a></>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick links */}
        <div>
          <div className={heading}>ลิงก์ด่วน</div>
          <ul className="space-y-2.5">
            <li><Link href="/register" className={link}>ลงทะเบียนเข้าร่วมงาน</Link></li>
            <li><Link href="/ticket" className={link}>ค้นหาตั๋วของฉัน</Link></li>
            <li><Link href="/" className={link}>หน้าแรก</Link></li>
            <li><Link href="/privacy" className={link}>นโยบายความเป็นส่วนตัว (PDPA)</Link></li>
          </ul>
        </div>

        {/* Help */}
        <div>
          <div className={heading}>ติดต่อ / ช่วยเหลือ</div>
          {hasContact ? (
            <ul className="space-y-2.5 text-sm">
              {settings.contact_phone && (
                <li className="flex items-center gap-2.5"><Phone className="w-4 h-4 text-emerald-400" /><a href={telHref(settings.contact_phone)} className={link}>{formatThaiPhone(settings.contact_phone)}</a></li>
              )}
              {settings.contact_email && (
                <li className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-indigo-400" /><a href={`mailto:${settings.contact_email}`} className={`${link} break-all`}>{settings.contact_email}</a></li>
              )}
              {settings.contact_line && (
                <li className="flex items-center gap-2.5"><MessageCircle className="w-4 h-4 text-green-400" /><a href={lineHref(settings.contact_line)} target="_blank" rel="noopener noreferrer" className={link}>LINE: {settings.contact_line}</a></li>
              )}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">ทำตั๋วหายหรือไม่ได้รับอีเมล? ติดต่อเจ้าหน้าที่ที่จุดลงทะเบียนหน้างาน</p>
          )}
        </div>
      </div>

      {/* Platform contact */}
      <div className="border-t border-white/5 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-cyan-950/30">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5 flex flex-col lg:flex-row items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2.5 text-slate-200 font-semibold">
            <Rocket className="w-4 h-4 text-fuchsia-400" />
            สนใจใช้แพลตฟอร์มลงทะเบียนและเช็คอินนี้กับงานของคุณ?
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-slate-400">
            <span className="text-slate-300">{PLATFORM_CONTACT.name}</span>
            <a href={telHref(PLATFORM_CONTACT.phone)} className="inline-flex items-center gap-1.5 hover:text-white"><Phone className="w-3.5 h-3.5" />{formatThaiPhone(PLATFORM_CONTACT.phone)}</a>
            <a href={lineHref(PLATFORM_CONTACT.line)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-white"><MessageCircle className="w-3.5 h-3.5" />LINE: {PLATFORM_CONTACT.line}</a>
            <a href={`mailto:${PLATFORM_CONTACT.email}`} className="inline-flex items-center gap-1.5 hover:text-white"><Mail className="w-3.5 h-3.5" />{PLATFORM_CONTACT.email}</a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-slate-500">
          <span>{copyright} · สงวนลิขสิทธิ์</span>
          <Link href="/privacy" className="inline-flex items-center gap-1.5 hover:text-slate-300"><ShieldCheck className="w-4 h-4" />นโยบายความเป็นส่วนตัว</Link>
        </div>
      </div>
    </footer>
  );
}
