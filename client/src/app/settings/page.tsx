'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Save, Image as ImageIcon, Settings, LayoutTemplate, Check, X as XIcon, MapPin, Map, Building2, Layers, CalendarClock, CalendarRange, Gift, PanelsTopLeft, Phone, Mail, MessageCircle, Users, ShieldCheck, LifeBuoy, Archive } from 'lucide-react';
import api from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { usePreferences } from '@/contexts/PreferencesContext';
import Cropper from 'react-easy-crop';
import AgendaManager from '@/components/AgendaManager';
import PrizeManager from '@/components/PrizeManager';
import RegistrationPageManager from '@/components/RegistrationPageManager';
import OrganizationTypeManager from '@/components/OrganizationTypeManager';
import StaffGate from '@/components/StaffGate';
import BackupResetManager from '@/components/BackupResetManager';
import { ExportExcelButton, ResetSectionButton } from '@/components/DataResetControls';
import { exportSection } from '@/lib/sectionExport';
import type { ResetResult } from '@/lib/api';

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  
  return canvas.toDataURL('image/png');
};

const formatDT = (v: string, locale: string): string => {
  if (!v) return '';
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  return d.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
};

const EMPTY_FOOTER_INFO = { organizer_name: '', contact_phone: '', contact_email: '', contact_line: '', event_map_url: '', privacy_policy: '' };

type SettingsTab = 'general' | 'registration' | 'organizations' | 'agenda' | 'prizes' | 'backup';
const SETTINGS_TABS: SettingsTab[] = ['general', 'registration', 'organizations', 'agenda', 'prizes', 'backup'];

// The active tab lives in the URL (/settings?tab=agenda) so it survives a refresh
// Event configuration is for administrators (server: ADR-0015)
export default function SettingsPage() {
  return (
    <StaffGate roles={['Admin']}>
      <Suspense>
        <SettingsContent />
      </Suspense>
    </StaffGate>
  );
}

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get('tab') as SettingsTab | null;
  const activeTab: SettingsTab = requestedTab && SETTINGS_TABS.includes(requestedTab) ? requestedTab : 'general';
  const setActiveTab = (tab: SettingsTab) => router.replace(`/settings?tab=${tab}`, { scroll: false });
  const { settings, updateSettingsContext } = useSettings();
  const { t, lang } = usePreferences();
  const [eventName, setEventName] = useState('');
  const [eventLogo, setEventLogo] = useState('');
  const [eventVenue, setEventVenue] = useState('');
  const [eventAddress, setEventAddress] = useState('');
  const [eventBuilding, setEventBuilding] = useState('');
  const [eventFloor, setEventFloor] = useState('');
  const [eventStart, setEventStart] = useState('');
  const [eventEnd, setEventEnd] = useState('');
  // Shown in the site footer and on /privacy
  const [footerInfo, setFooterInfo] = useState({ ...EMPTY_FOOTER_INFO });
  const setFooterField = (key: keyof typeof EMPTY_FOOTER_INFO, value: string) => setFooterInfo(current => ({ ...current, [key]: value }));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // Cropper state
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    setEventName(settings.event_name);
    setEventLogo(settings.event_logo);
    setEventVenue(settings.event_venue || '');
    setEventAddress(settings.event_address || '');
    setEventBuilding(settings.event_building || '');
    setEventFloor(settings.event_floor || '');
    setEventStart(settings.event_start || '');
    setEventEnd(settings.event_end || '');
    setFooterInfo({
      organizer_name: settings.organizer_name || '',
      contact_phone: settings.contact_phone || '',
      contact_email: settings.contact_email || '',
      contact_line: settings.contact_line || '',
      event_map_url: settings.event_map_url || '',
      privacy_policy: settings.privacy_policy || '',
    });
  }, [settings, router]);

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleConfirmCrop = async () => {
    if (imageToCrop && croppedAreaPixels) {
      try {
        const croppedImage = await getCroppedImg(imageToCrop, croppedAreaPixels);
        setEventLogo(croppedImage);
        setImageToCrop(null);
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Saved on the server (after a confirmation popup); the form follows the settings context
  const handleResetDone = (result: ResetResult) => {
    updateSettingsContext(result.settings);
    setImageToCrop(null);
    setMessage({ text: '', type: '' });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (footerInfo.event_map_url && !/^https?:\/\//i.test(footerInfo.event_map_url.trim())) {
      setMessage({ text: t.settings.messages.mapUrlInvalid, type: 'error' });
      return;
    }
    setIsSaving(true);
    setMessage({ text: '', type: '' });

    try {
      const payload = {
        event_name: eventName,
        event_logo: eventLogo,
        event_venue: eventVenue,
        event_address: eventAddress,
        event_building: eventBuilding,
        event_floor: eventFloor,
        event_start: eventStart,
        event_end: eventEnd,
        ...footerInfo
      };
      const result = await api.updateSettings(payload);

      if (result.success) {
        setMessage({ text: t.settings.messages.saved, type: 'success' });
        updateSettingsContext(payload);
      } else {
        setMessage({ text: result.message || t.settings.messages.saveFailed, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: t.settings.messages.serverUnreachable, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-fade-in pb-12 sm:px-6">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">{t.settings.title}</h1>
          <p className="text-sm text-slate-400 mt-1">
            {t.settings.subtitle}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:inline-flex lg:flex-wrap w-full lg:w-auto p-1.5 rounded-2xl bg-black/30 border border-white/10 gap-1">
        <button type="button" onClick={() => setActiveTab('general')} className={`inline-flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-3.5 xl:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'general' ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Settings className="w-4 h-4" />{t.settings.tabs.general}
        </button>
        <button type="button" onClick={() => setActiveTab('agenda')} className={`inline-flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-3.5 xl:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'agenda' ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <CalendarRange className="w-4 h-4" />{t.settings.tabs.agenda}
        </button>
        <button type="button" onClick={() => setActiveTab('registration')} className={`inline-flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-3.5 xl:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'registration' ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <PanelsTopLeft className="w-4 h-4" />{t.settings.tabs.registration}
        </button>
        <button type="button" onClick={() => setActiveTab('organizations')} className={`inline-flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-3.5 xl:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'organizations' ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Building2 className="w-4 h-4" />{t.orgTypes.tab}
        </button>
        <button type="button" onClick={() => setActiveTab('prizes')} className={`inline-flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-3.5 xl:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'prizes' ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Gift className="w-4 h-4" />{t.settings.tabs.prizes}
        </button>
        <button type="button" onClick={() => setActiveTab('backup')} className={`inline-flex items-center justify-center lg:justify-start gap-2 px-3 lg:px-3.5 xl:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${activeTab === 'backup' ? 'bg-gradient-to-r from-rose-600 to-orange-500 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
          <Archive className="w-4 h-4" />{t.settings.tabs.backup}
        </button>
      </div>

      {activeTab === 'general' ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="glass-panel p-5 sm:p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="space-y-6 relative z-10">
              {/* Event Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-indigo-400" />
                  {t.settings.event.name}
                </label>
                <input
                  type="text"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  placeholder={t.settings.event.namePlaceholder}
                  className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                  required
                />
                <p className="text-xs text-slate-500">{t.settings.event.nameHint}</p>
              </div>

              {/* Event Location & Schedule */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Venue */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-cyan-400" />
                      {t.settings.event.venue}
                    </label>
                    <input
                      type="text"
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      placeholder={t.settings.event.venuePlaceholder}
                      className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>

                  {/* Address / Location */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Map className="w-4 h-4 text-indigo-400" />
                      {t.settings.event.address}
                    </label>
                    <input
                      type="text"
                      value={eventAddress}
                      onChange={(e) => setEventAddress(e.target.value)}
                      placeholder={t.settings.event.addressPlaceholder}
                      className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>

                  {/* Building */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-cyan-400" />
                      {t.settings.event.building}
                    </label>
                    <input
                      type="text"
                      value={eventBuilding}
                      onChange={(e) => setEventBuilding(e.target.value)}
                      placeholder={t.settings.event.buildingPlaceholder}
                      className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>

                  {/* Floor */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      {t.settings.event.floor}
                    </label>
                    <input
                      type="text"
                      value={eventFloor}
                      onChange={(e) => setEventFloor(e.target.value)}
                      placeholder={t.settings.event.floorPlaceholder}
                      className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium"
                    />
                  </div>

                  {/* Start */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-emerald-400" />
                      {t.settings.event.start}
                    </label>
                    <input
                      type="datetime-local"
                      value={eventStart}
                      onChange={(e) => setEventStart(e.target.value)}
                      className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium scheme-dark"
                    />
                  </div>

                  {/* End */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4 text-rose-400" />
                      {t.settings.event.end}
                    </label>
                    <input
                      type="datetime-local"
                      value={eventEnd}
                      min={eventStart || undefined}
                      onChange={(e) => setEventEnd(e.target.value)}
                      className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium scheme-dark"
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500">{t.settings.event.locationHint}</p>
              </div>

              {/* Organizer, attendee help contacts, map and privacy policy (site footer) */}
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2"><LifeBuoy className="w-4 h-4 text-emerald-400" />{t.settings.contact.heading}</h3>
                  <p className="text-xs text-slate-500 mt-1">{t.settings.contact.hint}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-400" />{t.settings.contact.organizer}</label>
                    <input type="text" value={footerInfo.organizer_name} onChange={(e) => setFooterField('organizer_name', e.target.value)} placeholder={t.settings.contact.organizerPlaceholder} className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Map className="w-4 h-4 text-cyan-400" />{t.settings.contact.mapUrl}</label>
                    <input type="url" value={footerInfo.event_map_url} onChange={(e) => setFooterField('event_map_url', e.target.value)} placeholder="https://maps.app.goo.gl/..." className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Phone className="w-4 h-4 text-emerald-400" />{t.settings.contact.phone}</label>
                    <input type="tel" value={footerInfo.contact_phone} onChange={(e) => setFooterField('contact_phone', e.target.value)} placeholder={t.settings.contact.phonePlaceholder} className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><Mail className="w-4 h-4 text-indigo-400" />{t.settings.contact.email}</label>
                    <input type="email" value={footerInfo.contact_email} onChange={(e) => setFooterField('contact_email', e.target.value)} placeholder={t.settings.contact.emailPlaceholder} className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><MessageCircle className="w-4 h-4 text-green-400" />LINE ID</label>
                    <input type="text" value={footerInfo.contact_line} onChange={(e) => setFooterField('contact_line', e.target.value)} placeholder={t.settings.contact.linePlaceholder} className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-medium" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-cyan-400" />{t.settings.contact.privacyPolicy}</label>
                  <textarea value={footerInfo.privacy_policy} onChange={(e) => setFooterField('privacy_policy', e.target.value)} rows={6} placeholder={t.settings.contact.privacyPlaceholder} className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-y" />
                  <p className="text-xs text-slate-500">{t.settings.contact.privacyShownOn} <a href="/privacy" target="_blank" className="text-cyan-400 hover:text-cyan-300">/privacy</a> {t.settings.contact.privacyLinkedFrom}</p>
                </div>
              </div>

              {/* Event Logo */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-cyan-400" />
                  {t.settings.logo.label}
                </label>
                
                {imageToCrop ? (
                  <div className="space-y-4">
                    <div className="relative w-full h-64 sm:h-80 bg-black/50 rounded-2xl overflow-hidden border border-white/10">
                      <Cropper
                        image={imageToCrop}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                      />
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmCrop}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold transition-all"
                      >
                        <Check className="w-4 h-4" />
                        {t.settings.logo.confirmCrop}
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageToCrop(null)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold transition-all border border-rose-500/20"
                      >
                        <XIcon className="w-4 h-4" />
                        {t.common.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="relative group">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              setImageToCrop(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="w-full bg-surface/50 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between group-hover:border-cyan-500/50 transition-all">
                        <span className="text-slate-400 text-sm">
                          {eventLogo && eventLogo.startsWith('data:image') 
                            ? t.settings.logo.chooseNew
                            : (eventLogo ? t.settings.logo.change : t.settings.logo.choose)}
                        </span>
                        <span className="text-cyan-400 text-xs font-semibold px-2 py-1 bg-cyan-500/10 rounded-lg">Browse</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{t.settings.logo.hint}</p>
                    {eventLogo && (
                      <button 
                        type="button" 
                        onClick={() => setEventLogo('')}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                      >
                        {t.settings.logo.remove}
                      </button>
                    )}
                  </>
                )}
              </div>

              {message.text && (
                <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${
                  message.type === 'success' 
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                }`}>
                  <span className={`w-2 h-2 rounded-full ${message.type === 'success' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                  {message.text}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving || imageToCrop !== null}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-on-accent font-bold shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none border border-white/10"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  <span>{t.settings.save}</span>
                </button>
                <ExportExcelButton onExport={() => exportSection('general', t, lang)} className="sm:py-3.5" />
                <ResetSectionButton section="general" onExport={() => exportSection('general', t, lang)} onDone={handleResetDone} className="sm:py-3.5" />
              </div>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-1">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 shadow-xl sticky top-24">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Live Preview
            </h3>
            
            <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-white/[0.02] border border-white/5 relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              
              {eventLogo ? (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl mb-5 shadow-2xl relative z-10 flex items-center justify-center bg-white/5 backdrop-blur-md border border-white/10 overflow-hidden">
                  <img 
                    src={eventLogo} 
                    alt="Event Logo Preview" 
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-[2px] mb-5 shadow-xl relative z-10">
                  <div className="w-full h-full bg-surface-2 rounded-xl flex items-center justify-center">
                    <span className="text-3xl">⚡</span>
                  </div>
                </div>
              )}

              <h2 className="text-xl sm:text-2xl font-extrabold text-white font-heading tracking-tight drop-shadow-md relative z-10">
                {eventName || 'SMART EVENT REGISTRATION'}
              </h2>
              <p className="text-[10px] sm:text-xs text-indigo-300 font-mono tracking-widest mt-2 uppercase relative z-10">
                Preview Mode
              </p>

              {(eventVenue || eventAddress || eventBuilding || eventFloor || eventStart) && (
                <div className="w-full mt-5 pt-5 border-t border-white/5 space-y-2 text-left relative z-10">
                  {(eventVenue || eventAddress || eventBuilding || eventFloor) && (
                    <div className="flex items-start gap-2 text-xs text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 mt-0.5 shrink-0" />
                      <span>{[eventVenue, eventBuilding, eventFloor, eventAddress].filter(Boolean).join(' • ')}</span>
                    </div>
                  )}
                  {eventStart && (
                    <div className="flex items-start gap-2 text-xs text-slate-300">
                      <CalendarClock className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                      <span>{formatDT(eventStart, t.common.locale)}{eventEnd ? ` - ${formatDT(eventEnd, t.common.locale)}` : ''}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      ) : activeTab === 'registration' ? (
        <RegistrationPageManager />
      ) : activeTab === 'organizations' ? (
        <OrganizationTypeManager />
      ) : activeTab === 'agenda' ? (
        <AgendaManager />
      ) : activeTab === 'prizes' ? (
        <PrizeManager />
      ) : (
        <BackupResetManager />
      )}
    </div>
  );
}
