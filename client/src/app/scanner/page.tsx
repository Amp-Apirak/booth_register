'use client';

import { useState, useEffect, useRef } from 'react';
import api, { Participant } from '@/lib/api';
import useWebSocket from '@/lib/useWebSocket';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  UserCheck,
  Clock,
  Volume2,
  VolumeX
} from 'lucide-react';

export default function ScannerPage() {
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<Participant | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { stats, connected } = useWebSocket();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Clear banner after 4 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess(false);
        setError('');
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  const playBeep = (isError = false) => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (isError) {
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.18);
      }
    } catch {
      // Audio not supported in background
    }
  };

  const handleCheckin = async (e?: React.FormEvent, codeToUse?: string) => {
    if (e) e.preventDefault();
    const code = codeToUse || ticketCode;
    if (!code.trim()) return;

    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await api.checkIn(code);
      if (result) {
        setLastCheckin(result);
        setSuccess(true);
        setTicketCode('');
        playBeep(false);
      } else {
        setError('ไม่พบรหัสตั๋วนี้ในระบบ หรือผู้ร่วมงานได้ทำการเช็คอินไปแล้ว');
        playBeep(true);
      }
    } catch {
      setError('เกิดข้อผิดพลาดในการเชื่อมต่อกับเกตเวย์เซิร์ฟเวอร์');
      playBeep(true);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 mb-2">
            <Zap className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fast Check-in Counter Gate 01</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            จุดสแกนบัตรผ่านประตู
          </h1>
          <p className="text-sm text-slate-400">
            ยิงสแกน Barcode / QR Code เพื่อบันทึกประวัติการเข้างานและส่งชื่อขึ้นจอ Signage
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2.5 rounded-xl border transition-all ${
              soundEnabled
                ? 'bg-white/[0.05] border-white/10 text-cyan-400'
                : 'bg-white/[0.02] border-white/5 text-slate-500'
            }`}
            title={soundEnabled ? 'ปิดเสียง Beep' : 'เปิดเสียง Beep'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-semibold border ${
            connected 
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
          }`}>
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            <span>{connected ? 'GATE ONLINE' : 'GATE OFFLINE'}</span>
          </div>
        </div>
      </div>

      {/* Live Gate Counters */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="relative overflow-hidden glass-panel rounded-2xl p-4 sm:p-5 border border-indigo-500/20 text-center hover:border-indigo-400/40 transition-all">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mx-auto mb-2 shadow-lg shadow-indigo-500/10">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-300 font-heading leading-none">
              {stats.registered}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1.5">ผู้ลงทะเบียนทั้งหมด</div>
          </div>
        </div>

        <div className="relative overflow-hidden glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/20 text-center hover:border-emerald-400/40 transition-all">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-2 shadow-lg shadow-emerald-500/10">
              <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-heading leading-none">
              {stats.checked_in}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1.5">ผ่านประตูเข้างานแล้ว</div>
          </div>
        </div>

        <div className="relative overflow-hidden glass-panel rounded-2xl p-4 sm:p-5 border border-amber-500/20 text-center hover:border-amber-400/40 transition-all">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto mb-2 shadow-lg shadow-amber-500/10">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-300 font-heading leading-none">
              {stats.pending}
            </div>
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1.5">ยังไม่ผ่านประตู</div>
          </div>
        </div>
      </div>

      {/* ── Futuristic HUD Viewfinder & Scanner Input ── */}
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* HUD Scanner Box Visual */}
        <div className="relative w-full max-w-[300px] sm:max-w-sm mx-auto aspect-square rounded-2xl bg-gradient-to-br from-[#0b1120] via-[#090d16] to-[#0b1a1f] border border-cyan-500/20 mb-6 flex items-center justify-center overflow-hidden shadow-[inset_0_0_40px_rgba(6,182,212,0.08)]">
          {/* Grid Overlay */}
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)',
              backgroundSize: '22px 22px',
            }}
          />

          {/* Laser Sweep Line */}
          <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-laser shadow-[0_0_15px_#22d3ee]" />

          {/* HUD Corner Brackets */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl-lg shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr-lg shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl-lg shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br-lg shadow-[0_0_8px_rgba(34,211,238,0.5)]" />

          {/* Center Target Icon */}
          <div className="relative text-center space-y-2">
            <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
              <ScanLine className="w-9 h-9 text-cyan-400 relative" />
            </div>
            <p className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
              OPTICAL BARCODE / QR SENSOR READY
            </p>
          </div>
        </div>

        {/* Input Barcode Scanner */}
        <form onSubmit={handleCheckin} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-cyan-400">
              <ScanLine className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={ticketCode}
              onChange={(e) => setTicketCode(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white/[0.04] border border-white/15 rounded-2xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white font-mono text-base sm:text-lg placeholder-slate-500 shadow-inner"
              placeholder="สแกน QR Code หรือกรอกรหัสตั๋วที่นี่..."
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ticketCode.trim()}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-400/30"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>ยืนยันเข้างาน</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Success Notification Banner */}
      {success && lastCheckin && (
        <div className="glass-panel-glow rounded-3xl p-6 border border-emerald-500/40 bg-emerald-950/20 animate-fade-in shadow-2xl relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">
                CHECK-IN VERIFIED
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1 truncate">
                {lastCheckin.name}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 flex items-center gap-2 mt-0.5">
                <span>{lastCheckin.company}</span>
                {lastCheckin.position && (
                  <>
                    <span>•</span>
                    <span className="text-cyan-400 font-mono">{lastCheckin.position}</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Notification Banner */}
      {error && (
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-rose-500/40 bg-rose-950/20 text-rose-300 flex items-center gap-3.5 animate-fade-in">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">ไม่สามารถดำเนินการได้</h4>
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
