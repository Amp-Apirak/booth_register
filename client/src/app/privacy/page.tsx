'use client';

import Link from 'next/link';
import { ArrowLeft, Mail, Phone, ShieldCheck } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';
import { useT } from '@/contexts/PreferencesContext';
import { formatThaiPhone, telHref } from '@/lib/platform';

// Privacy policy text is written by the organizer in ตั้งค่าระบบ → ข้อมูลทั่วไป
export default function PrivacyPage() {
  const { settings } = useSettings();
  const t = useT();
  const owner = settings.organizer_name || settings.event_name;
  const paragraphs = (settings.privacy_policy || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <Link href="/register" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" />{t.privacy.backToRegister}</Link>

      <div className="glass-panel rounded-3xl border border-white/10 p-6 sm:p-10">
        <div className="flex items-center gap-3 mb-6">
          <span className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-cyan-300"><ShieldCheck className="w-6 h-6" /></span>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{t.privacy.title}</h1>
            <p className="text-sm text-slate-400 mt-1">{owner} · {t.privacy.legalBasis}</p>
          </div>
        </div>

        {paragraphs.length > 0 ? (
          <div className="space-y-4 text-base text-slate-300 leading-relaxed">
            {paragraphs.map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>)}
          </div>
        ) : (
          <p className="text-base text-slate-400 leading-relaxed">
            {t.privacy.notPublished}
          </p>
        )}

        {(settings.contact_email || settings.contact_phone) && (
          <div className="mt-8 pt-6 border-t border-white/10 text-sm text-slate-300 space-y-2">
            <div className="font-bold text-white">{t.privacy.contactHeading}</div>
            {settings.contact_email && <a href={`mailto:${settings.contact_email}`} className="flex items-center gap-2 hover:text-cyan-300"><Mail className="w-4 h-4 text-indigo-400" />{settings.contact_email}</a>}
            {settings.contact_phone && <a href={telHref(settings.contact_phone)} className="flex items-center gap-2 hover:text-cyan-300"><Phone className="w-4 h-4 text-emerald-400" />{formatThaiPhone(settings.contact_phone)}</a>}
          </div>
        )}
      </div>
    </div>
  );
}
