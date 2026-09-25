'use client';

import { useState } from 'react';
import * as htmlToImage from 'html-to-image';
import api, { Participant, formatEventDateRange, formatEventTimeRange } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { usePreferences, useT } from '@/contexts/PreferencesContext';
import {
  QrCode,
  Search,
  Calendar,
  MapPin, 
  Building2, 
  UserCheck, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Download,
  Printer,
  Share2,
  Copy,
  Zap
} from 'lucide-react';

export default function TicketPage() {
  const { settings } = useSettings();
  const t = useT();
  const { theme } = usePreferences();
  const [ticketCode, setTicketCode] = useState('');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSearch = async (codeToSearch?: string) => {
    const raw = (codeToSearch ?? ticketCode).trim();
    if (!raw) return;

    setLoading(true);
    setError('');

    try {
      let found = await api.getParticipantByTicket(raw);
      if (!found) {
        const all = await api.getParticipants();
        const q = raw.toLowerCase();
        const qDigits = raw.replace(/[^0-9]/g, '');
        found = all.find(p =>
          p.ticket_code?.toLowerCase() === q ||
          `tkt_mock_${p.id}` === raw ||
          p.name?.toLowerCase().includes(q) ||
          (qDigits.length >= 4 && (p.phone?.replace(/[^0-9]/g, '') || '').includes(qDigits))
        ) || null;
      }

      if (found) {
        setParticipant(found);
      } else {
        setError(t.ticket.search.notFound);
        setParticipant(null);
      }
    } catch {
      setError(t.ticket.search.connectionError);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    const code = participant?.ticket_code || ticketCode;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQrCode = async () => {
    const code = participant?.ticket_code || ticketCode;
    if (!code) return;
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
        link.download = `ticket_pass_${code}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Failed to download image", err);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const eventDate = formatEventDateRange(settings.event_start, settings.event_end, t.common.locale) || t.ticket.pass.fallbackDate;
  const eventTime = formatEventTimeRange(settings.event_start, settings.event_end, t.common.locale) || t.ticket.pass.fallbackTime;
  const eventVenue = settings.event_venue || 'Grand Ballroom';
  const eventPlace = [settings.event_building, settings.event_floor, settings.event_address].filter(Boolean).join(', ') || 'Central Plaza Hotel, Bangkok';

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-sm font-semibold text-cyan-300">
          <QrCode className="w-3.5 h-3.5 text-cyan-400" />
          <span>Official Event Digital Pass</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          {t.ticket.title}
        </h1>
        <p className="text-base text-slate-400 max-w-md mx-auto">
          {t.ticket.subtitle}
        </p>
      </div>

      {/* Ticket Search Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="glass-panel rounded-2xl p-2.5 sm:p-3 border border-white/10 flex gap-2 shadow-xl">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-transparent text-white placeholder-slate-500 text-sm focus:outline-none"
            placeholder={t.ticket.search.placeholder}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-on-accent text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? t.ticket.search.searching : t.ticket.search.submit}
        </button>
      </form>

      {error && (
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/30 flex items-center gap-3 text-rose-300 animate-fade-in">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      )}

      {/* ── 3D Apple-Wallet Cyber Digital Pass ── */}
      {participant && (
        <div className="perspective-1000 space-y-4">
          <div className="glass-panel rounded-3xl overflow-hidden border border-white/15 shadow-2xl card-3d relative" id="printable-ticket">
            {/* Top Pass Header */}
            <div className="bg-gradient-to-r from-indigo-900/90 via-purple-900/90 to-slate-900/90 p-6 border-b border-white/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-cyan-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold tracking-wider uppercase text-cyan-300 font-mono">Digital Pass</span>
                    <h2 className="text-base font-extrabold text-white">{settings.event_name || 'SMART EVENT REGISTRATION'}</h2>
                  </div>
                </div>
                
                <span className={`px-3 py-1 rounded-full text-sm font-bold font-mono border flex items-center gap-1.5 ${
                  participant.status === 'Checked-in'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}>
                  {participant.status === 'Checked-in' ? (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>CHECKED-IN</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-3.5 h-3.5" />
                      <span>PENDING PASS</span>
                    </>
                  )}
                </span>
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {participant.name}
                </h3>
                <p className="text-base text-indigo-200 font-medium flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400 inline" />
                  <span>{participant.company}</span>
                </p>
                {participant.position && (
                  <p className="text-sm font-mono text-cyan-400 uppercase tracking-widest pt-0.5">
                    {participant.position}
                  </p>
                )}
              </div>
            </div>

            {/* Middle Perforated Line with Side Notches */}
            <div className="relative py-3 flex items-center justify-center bg-surface-2">
              <div className="absolute -left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-cyber-mesh rounded-full border border-white/10" />
              <div className="w-full border-t border-dashed border-white/20 mx-6" />
              <div className="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-cyber-mesh rounded-full border border-white/10" />
            </div>

            {/* Bottom Pass Body with QR Code */}
            <div className="p-6 sm:p-8 bg-surface-2/95 text-center space-y-6">
              {/* QR Code Frame */}
              <div className="theme-fixed inline-block p-4 rounded-2xl bg-white shadow-2xl shadow-indigo-500/10 relative group">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&color=090d16&data=${participant.ticket_code || ticketCode}`}
                  alt="QR Code"
                  className="w-44 h-44 sm:w-52 sm:h-52 mx-auto"
                />
                <div className="absolute inset-0 border-2 border-indigo-600/30 rounded-2xl pointer-events-none" />
              </div>

              {/* Ticket Code Tag */}
              <div className="max-w-xs mx-auto space-y-1">
                <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">TICKET SECURITY TOKEN</span>
                <div className="flex items-center justify-center gap-2 bg-white/[0.04] p-2 rounded-xl border border-white/10">
                  <span className="font-mono text-sm font-bold text-cyan-300">
                    {participant.ticket_code || ticketCode}
                  </span>
                  <button
                    onClick={copyCode}
                    className="p-1 rounded text-slate-400 hover:text-white transition-colors"
                    title={t.ticket.pass.copy}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                {copied && <p className="text-xs text-emerald-400">{t.ticket.pass.codeCopied}</p>}
              </div>

              {/* Event Coordinates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-left text-sm text-slate-300">
                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-400 font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{t.ticket.pass.dateTime}</span>
                  </div>
                  <p className="text-slate-200">{eventDate}</p>
                  <p className="text-slate-400 text-xs">{eventTime}</p>
                </div>

                <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{t.ticket.pass.venue}</span>
                  </div>
                  <p className="text-slate-200">{eventVenue}</p>
                  <p className="text-slate-400 text-xs">{eventPlace}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={downloadQrCode}
              disabled={downloading}
              className="py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-on-accent font-bold text-sm shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>{downloading ? t.ticket.actions.savingImage : t.ticket.actions.saveToPhone}</span>
            </button>

            <button
              onClick={handlePrint}
              className="py-3 px-4 rounded-xl bg-white/[0.06] hover:bg-white/10 text-slate-200 hover:text-white font-semibold text-sm border border-white/10 flex items-center justify-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              <span>{t.ticket.actions.printOrPdf}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
