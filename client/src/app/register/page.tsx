'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import * as htmlToImage from 'html-to-image';
import Swal from 'sweetalert2';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import api, { formatEventDateRange, formatEventTimeRange, formatEventLocation } from '@/lib/api';
import OrganizationTypeField, { OrgChoice } from '@/components/OrganizationTypeField';
import type { OrganizationType } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { usePreferences, useT } from '@/contexts/PreferencesContext';
import { 
  User, 
  Building, 
  Briefcase, 
  Mail, 
  Phone, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  QrCode, 
  Sparkles, 
  Copy, 
  Download, 
  Printer, 
  Share2, 
  ExternalLink,
  Link2,
  Calendar,
  MapPin,
  Zap,
  Camera,
  Crown,
  UserCircle,
  Info,
  Target,
  ClipboardCheck
} from 'lucide-react';

function RegisterPageContent() {
  const searchParams = useSearchParams();
  const { settings } = useSettings();
  const t = useT();
  const { theme } = usePreferences();
  const isPublicMode = searchParams.get('mode') === 'public' || searchParams.get('standalone') === 'true';

  const [form, setForm] = useState({
    fullname: '',
    company: '',
    position: '',
    email: '',
    phone: '',
    profile_picture: '',
    attendee_type: 'General',
    pdpa_consent: true,
  });
  // Organization type is required on the public form ("อื่นๆ" needs a typed answer)
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [orgChoice, setOrgChoice] = useState<OrgChoice>(null);
  const [orgOther, setOrgOther] = useState('');
  const [orgError, setOrgError] = useState('');
  useEffect(() => { api.getOrganizationTypes(true).then(setOrgTypes); }, []);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    ticket_code?: string;
    message?: string;
  } | null>(null);

  const eventDate = formatEventDateRange(settings.event_start, settings.event_end, t.common.locale);
  const eventTime = formatEventTimeRange(settings.event_start, settings.event_end, t.common.locale);
  // only what the organizer set in Settings (no sample values)
  const eventDateTime = [eventDate, eventTime].filter(Boolean).join(' | ');
  const eventLocation = formatEventLocation(settings);

  const [publicUrl, setPublicUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setPublicUrl(`${window.location.origin}/register?mode=public`);
    }
  }, []);

  // Cropping states
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImageSrc(reader.result as string);
        setIsCropping(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const onCropComplete = (croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropSave = async () => {
    try {
      if (imageSrc && croppedAreaPixels) {
        const croppedImageBase64 = await getCroppedImg(imageSrc, croppedAreaPixels);
        setForm({ ...form, profile_picture: croppedImageBase64 });
        setIsCropping(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Explicit manual validation
    if (!form.fullname || !form.company || !form.phone) {
      Swal.fire({
        title: t.register.alerts.incompleteTitle,
        text: t.register.alerts.incompleteText,
        icon: 'warning',
        confirmButtonText: t.register.alerts.ok,
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    const orgMissing = orgChoice === null ? t.orgTypes.required : orgChoice === 'other' && !orgOther.trim() ? t.orgTypes.otherRequired : '';
    if (orgMissing) {
      setOrgError(orgMissing);
      Swal.fire({
        title: t.register.alerts.incompleteTitle,
        text: orgMissing,
        icon: 'warning',
        confirmButtonText: t.register.alerts.ok,
        confirmButtonColor: '#6366f1'
      }).then(() => document.getElementById(orgChoice === 'other' ? 'register-org-other' : 'register-org-select')?.focus());
      document.getElementById('register-org-type')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!form.pdpa_consent) {
      Swal.fire({
        title: t.register.alerts.consentTitle,
        text: t.register.alerts.consentText,
        icon: 'warning',
        confirmButtonText: t.register.alerts.ok,
        confirmButtonColor: '#6366f1'
      });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const data = await api.register({
        ...form,
        organization_type_id: typeof orgChoice === 'number' ? orgChoice : null,
        organization_type_other: orgChoice === 'other' ? orgOther.trim() : null,
      });
      if (data) {
        setResult({
          success: true,
          ticket_code: data.ticket_code,
          message: t.register.success.message,
        });
        setForm({ fullname: '', company: '', position: '', email: '', phone: '', profile_picture: '', attendee_type: 'General', pdpa_consent: true });
        setOrgChoice(null);
        setOrgOther('');
        
        Swal.fire({
          title: t.register.alerts.successTitle,
          text: t.register.alerts.successText,
          icon: 'success',
          confirmButtonText: t.register.alerts.viewTicket,
          confirmButtonColor: '#10b981',
          timer: 3000,
          timerProgressBar: true
        });
        
        // Scroll to top to show QR code immediately
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
      } else {
        Swal.fire({
          title: t.register.alerts.connectionTitle,
          text: t.register.alerts.connectionText,
          icon: 'error',
          confirmButtonText: t.register.alerts.ok,
          confirmButtonColor: '#f43f5e'
        });
      }
    } catch (err) {
      // refused by the server (e.g. invalid e-mail, photo too large): say why
      const code = (err as { code?: string }).code || '';
      Swal.fire({
        title: t.common.error,
        text: t.register.errors[code] || t.register.alerts.failedText,
        icon: 'error',
        confirmButtonText: t.register.alerts.ok,
        confirmButtonColor: '#f43f5e'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyTicket = () => {
    if (result?.ticket_code) {
      navigator.clipboard.writeText(result.ticket_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const copyPublicLink = () => {
    if (publicUrl) {
      navigator.clipboard.writeText(publicUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    }
  };

  // Download beautifully formatted ticket image using html-to-image
  const downloadQrCode = async () => {
    if (!result?.ticket_code) return;
    setDownloading(true);
    try {
      const element = document.getElementById('printable-ticket');
      if (element) {
        // the saved pass keeps the on-screen look: dark card in the dark theme, white in the light theme
        const passBackground = theme === 'light' ? '#ffffff' : '#090d16';
        const originalBg = element.style.background;
        element.style.background = passBackground;
        
        const rect = element.getBoundingClientRect();
        
        const dataUrl = await htmlToImage.toPng(element, {
          backgroundColor: passBackground,
          pixelRatio: 2,
          width: rect.width,
          height: rect.height,
          style: {
            margin: '0',
            transform: 'none',
            top: '0',
            left: '0'
          }
        });
        
        element.style.background = originalBg;

        const link = document.createElement('a');
        link.download = `ticket_pass_${result.ticket_code}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setDownloading(false);
    }
  };

  // Trigger Print / Save as PDF Pass
  const handlePrint = () => {
    window.print();
  };

  // Native Mobile Share
  const handleShare = async () => {
    if (!result?.ticket_code) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: t.register.success.shareTitle(settings.event_name),
          text: t.register.success.shareText(result.ticket_code),
          url: `${window.location.origin}/ticket`,
        });
      } catch {
        // Cancelled share
      }
    } else {
      copyTicket();
    }
  };

  return (
    <>
    <div className="max-w-5xl mx-auto space-y-7 pb-12 pt-8">
      {settings.registration_hero_image && (
        <div className="registration-hero-card relative aspect-[16/7] rounded-xl overflow-hidden border border-cyan-300/20 shadow-[0_25px_80px_rgba(37,99,235,.2)] animate-fade-in">
          <img src={settings.registration_hero_image} alt={t.register.heroAlt(settings.event_name)} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface-5/80 via-transparent to-indigo-950/10" />
          <div className="absolute left-5 right-5 bottom-5 flex items-end justify-between gap-3"><div><span className="text-[10px] font-mono tracking-[.2em] text-cyan-200 uppercase">Official Event</span><h2 className="text-xl sm:text-3xl font-black text-white drop-shadow-xl">{settings.event_name}</h2></div><Sparkles className="w-7 h-7 text-cyan-200 animate-pulse"/></div>
        </div>
      )}
      {/* Header */}
      <div className="text-center space-y-2 max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>{settings.event_name}</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {t.register.title}
        </h1>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          {settings.registration_intro || t.register.introFallback}
        </p>
      </div>

      {/* ── Success Card with Download, Print & Share Buttons ── */}
      {result?.success && result.ticket_code && (
        <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-emerald-500/30 text-center animate-fade-in shadow-2xl relative overflow-hidden space-y-6 max-w-2xl mx-auto">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
          
          <div>
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{t.register.success.heading}</h2>
            <p className="text-xs text-slate-300">{result.message}</p>
          </div>

          {/* Printable Ticket Pass Box */}
          <div className="bg-surface-2/95 border border-white/15 rounded-3xl p-6 max-w-md mx-auto shadow-2xl text-center space-y-5" id="printable-ticket">
            {/* Event Header in Pass */}
            <div className="border-b border-white/10 pb-4">
              <span className="text-xs sm:text-sm font-mono font-bold tracking-widest text-cyan-400 uppercase">OFFICIAL DIGITAL PASS</span>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">{settings.event_name || 'SMART EVENT REGISTRATION'}</h3>
            </div>

            {/* QR Code */}
            <div className="theme-fixed bg-white p-3.5 rounded-2xl inline-block shadow-2xl relative group">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&color=090d16&data=${result.ticket_code}`}
                alt="Ticket QR Code"
                className="w-48 h-48 sm:w-56 sm:h-56 mx-auto"
              />
            </div>

            {/* Security Token Code */}
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-mono uppercase text-slate-400 tracking-wider">{t.register.success.ticketCode}</span>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-sm sm:text-base font-bold text-cyan-300 bg-white/[0.04] px-3.5 py-1.5 rounded-xl border border-white/10 select-all">
                  {result.ticket_code}
                </span>
                <button
                  onClick={copyTicket}
                  className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                  title={t.register.success.copyCode}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              {copied && <p className="text-[11px] text-emerald-400 font-medium">{t.register.success.codeCopied}</p>}
            </div>

            {/* Event Time & Place (hidden until set in Settings) */}
            {(eventDateTime || eventLocation) && <div className="text-left text-xs sm:text-sm text-slate-400 bg-white/[0.03] p-4 rounded-xl border border-white/5 space-y-2">
              {eventDateTime && <div className="flex items-center gap-1.5 text-slate-200">
                <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>{eventDateTime}</span>
              </div>}
              {eventLocation && <div className="flex items-center gap-1.5 text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                <span>{eventLocation}</span>
              </div>}
            </div>}
          </div>

          {/* Action Buttons: Save Image, Print, Share */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto">
              <button
                onClick={downloadQrCode}
                disabled={downloading}
                className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-on-accent font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{downloading ? t.register.success.savingImage : t.register.success.saveQrImage}</span>
              </button>

              <button
                onClick={handlePrint}
                className="py-3.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-sm border border-white/10 flex items-center justify-center gap-2 transition-all"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>{t.register.success.printOrPdf}</span>
              </button>
            </div>

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={handleShare}
                className="text-sm text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{t.register.success.share}</span>
              </button>

              <span className="text-slate-600">•</span>

              <Link
                href="/ticket"
                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{t.register.success.openTicketPage}</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {result && !result.success && (
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/30 flex items-center gap-3 text-rose-300 animate-fade-in max-w-2xl mx-auto">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <p className="text-xs sm:text-sm font-medium">{result.message}</p>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit} className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6 max-w-2xl mx-auto">
        <div className="space-y-4">
          {/* Profile Picture Upload */}
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="relative group cursor-pointer w-full max-w-[200px]" onClick={() => document.getElementById('profile_upload')?.click()}>
              <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-indigo-500/50 bg-indigo-950/30 flex flex-col items-center justify-center text-indigo-400 group-hover:border-cyan-400 group-hover:text-cyan-400 transition-all shadow-lg">
                {form.profile_picture ? (
                  <img src={form.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <Camera className="w-8 h-8 mb-1 opacity-60" />
                    <span className="text-[10px] font-semibold opacity-80">{t.register.form.takePhoto}</span>
                  </>
                )}
              </div>
              {form.profile_picture && (
                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
            <input 
              id="profile_upload"
              type="file" 
              accept="image/*" 
              capture="user"
              className="hidden" 
              onChange={handleImageUpload} 
            />
            <p className="text-[11px] text-slate-400 mt-3 text-center">
              {t.register.form.photoHint}
            </p>
          </div>

          {/* Fullname */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              {t.register.form.fullName} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={form.fullname}
                maxLength={150}
                onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 text-sm transition-all"
                placeholder={t.register.form.fullNamePlaceholder}
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              {t.register.form.company} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Building className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={form.company}
                maxLength={150}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 text-sm transition-all"
                placeholder={t.register.form.companyPlaceholder}
              />
            </div>
          </div>

          {/* Position */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1.5">
              {t.register.form.position}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={form.position}
                maxLength={100}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 text-sm transition-all"
                placeholder={t.register.form.positionPlaceholder}
              />
            </div>
          </div>

          {/* Organization type (required) */}
          <div id="register-org-type">
            <OrganizationTypeField
              variant="form"
              required
              idPrefix="register-org"
              types={orgTypes}
              choice={orgChoice}
              other={orgOther}
              error={orgError}
              onChange={(choice, other) => { setOrgChoice(choice); setOrgOther(other); setOrgError(''); }}
            />
          </div>

          {/* Email & Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                {t.register.form.email}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={form.email}
                maxLength={255}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 text-sm transition-all"
                  placeholder="contact@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1.5">
                {t.register.form.phone} <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={form.phone}
                maxLength={50}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.03] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white placeholder-slate-500 text-sm transition-all"
                  placeholder="08x-xxx-xxxx"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PDPA Consent Box (REQ-02) */}
        <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={form.pdpa_consent}
              onChange={(e) => setForm({ ...form, pdpa_consent: e.target.checked })}
              className="mt-1 w-4 h-4 text-indigo-600 bg-gray-900 border-gray-700 rounded focus:ring-indigo-500 focus:ring-offset-gray-900"
            />
            <div className="text-sm text-slate-300 leading-relaxed">
              <span className="font-semibold text-indigo-300 flex items-center gap-1 mb-0.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400 inline" />
                {t.register.consent.title}
              </span>
              {t.register.consent.text}
              {' '}<Link href="/privacy" target="_blank" className="text-cyan-300 underline underline-offset-2 hover:text-cyan-200">{t.register.consent.readPolicy}</Link>
            </div>
          </label>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-on-accent font-bold text-sm shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-white/10"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t.register.form.submitting}</span>
            </>
          ) : (
            <>
              <span>{t.register.form.submit}</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {(settings.registration_brochure_image || settings.registration_objectives || settings.registration_terms) && (
        <section className="registration-info-card glass-panel rounded-2xl p-6 sm:p-8 border border-indigo-300/15 shadow-2xl space-y-7 relative overflow-hidden max-w-4xl mx-auto">
          <div className="absolute -right-28 -top-28 w-72 h-72 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
          {settings.registration_brochure_image && <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black/20"><img src={settings.registration_brochure_image} alt={t.register.info.brochureAlt(settings.event_name)} className="w-full h-auto object-contain" /></div>}
          {settings.registration_objectives && <div className="relative"><h3 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-3 mb-4"><span className="w-10 h-10 rounded-xl bg-cyan-400/10 border border-cyan-300/20 flex items-center justify-center"><Target className="w-5 h-5 text-cyan-300"/></span>{t.register.info.objectives}</h3><div className="space-y-3">{settings.registration_objectives.split('\n').filter(Boolean).map((line,index)=><div key={index} className="flex items-start gap-3 text-sm sm:text-base text-slate-300 leading-relaxed"><span className="mt-2 w-2 h-2 rounded-full bg-gradient-to-r from-indigo-400 to-cyan-300 shadow-[0_0_10px_rgba(103,232,249,.65)] shrink-0"/><span>{line}</span></div>)}</div></div>}
          {settings.registration_terms && <div className="relative rounded-2xl bg-amber-500/[.055] border border-amber-300/15 p-5"><h3 className="text-lg sm:text-xl font-extrabold text-amber-100 flex items-center gap-2 mb-3"><ClipboardCheck className="w-5 h-5 text-amber-300"/>{t.register.info.terms}</h3><div className="space-y-2">{settings.registration_terms.split('\n').filter(Boolean).map((line,index)=><p key={index} className="text-sm sm:text-base text-slate-300 leading-relaxed flex gap-2"><span className="text-amber-300 font-bold">{index+1}.</span>{line}</p>)}</div></div>}
          <div className="relative text-xs text-slate-500 flex items-center gap-2"><Info className="w-4 h-4"/>{t.register.info.readBefore}</div>
        </section>
      )}

    </div>

      {/* Cropping Modal */}
      {isCropping && imageSrc && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="relative flex-1">
            <Cropper
              image={imageSrc as string}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
            />
          </div>
          <div className="p-6 bg-surface-2 border-t border-white/10">
            <div className="max-w-md mx-auto space-y-4 text-center">
              <label className="block text-xs font-semibold text-slate-300">{t.register.crop.zoomLabel}</label>
              <input
                type="range"
                value={zoom}
                min={1}
                max={3}
                step={0.1}
                aria-labelledby="Zoom"
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCropping(false)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-semibold transition-all border border-white/10"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-on-accent font-bold transition-all shadow-lg shadow-indigo-600/30 border border-indigo-500/50"
                >
                  {t.register.crop.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function RegisterPage() {
  const t = useT();
  return (
    <Suspense fallback={<div className="text-center py-12 text-slate-500">{t.common.loading}</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
