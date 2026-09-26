'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import jsQR from 'jsqr';
import api, { CheckInError, Participant } from '@/lib/api';
import useWebSocket from '@/lib/useWebSocket';
import { useT } from '@/contexts/PreferencesContext';
import StaffGate from '@/components/StaffGate';
import {
  ScanLine,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  UserCheck,
  Clock,
  Volume2,
  VolumeX,
  Camera,
  CameraOff
} from 'lucide-react';

// Ignore repeat reads of the same QR while it is still in front of the camera
const SAME_CODE_COOLDOWN_MS = 3000;
// Decode a few times per second — plenty for a gate, and keeps CPU low
const SCAN_INTERVAL_MS = 150;

// Staff only (any role): the gate shows a login button that returns here
export default function ScannerPage() {
  return (
    <StaffGate>
      <ScannerPageContent />
    </StaffGate>
  );
}

function ScannerPageContent() {
  const t = useT();
  const [ticketCode, setTicketCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCheckin, setLastCheckin] = useState<Participant | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { stats, connected } = useWebSocket();

  // Camera QR scanning
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const busyRef = useRef(false);
  const lastScanRef = useRef({ code: '', at: 0 });

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

  const handleCheckin = async (e?: React.FormEvent | null, codeToUse?: string) => {
    if (e) e.preventDefault();
    const code = codeToUse || ticketCode;
    if (!code.trim()) return;

    busyRef.current = true;
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await api.checkIn(code);
      setLastCheckin(result);
      setSuccess(true);
      setTicketCode('');
      playBeep(false);
    } catch (err) {
      const failure = err instanceof CheckInError ? err : null;
      if (failure?.code === 'ALREADY_CHECKED_IN') {
        const when = failure.participant?.checked_in_at
          ? new Date(failure.participant.checked_in_at).toLocaleTimeString(t.common.locale, { hour: '2-digit', minute: '2-digit' })
          : '';
        setError(failure.participant ? t.scanner.result.alreadyCheckedIn(failure.participant.name, when) : t.scanner.result.alreadyCheckedInUnknown);
      } else if (failure?.code === 'TICKET_NOT_FOUND') {
        setError(t.scanner.result.notFound);
      } else {
        setError(t.scanner.result.connectionError);
      }
      playBeep(true);
    } finally {
      busyRef.current = false;
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // The scan loop runs outside React renders, so it calls the latest handler via a ref
  const checkinRef = useRef(handleCheckin);
  useEffect(() => {
    checkinRef.current = handleCheckin;
  });

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  const startCamera = useCallback(async (deviceId?: string) => {
    setCameraError('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.scanner.camera.unsupported);
      return;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
      setCameraId(stream.getVideoTracks()[0]?.getSettings().deviceId || deviceId || '');
      // Device labels are only available after permission is granted
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameras(devices.filter((d) => d.kind === 'videoinput'));
    } catch (err) {
      const name = (err as DOMException)?.name;
      setCameraError(
        name === 'NotAllowedError'
          ? t.scanner.camera.notAllowed
          : name === 'NotFoundError'
            ? t.scanner.camera.notFound
            : name === 'NotReadableError'
              ? t.scanner.camera.inUse
              : t.scanner.camera.failed
      );
      setCameraOn(false);
    }
  }, [t]);

  // Decode QR codes from the live video
  useEffect(() => {
    if (!cameraOn) return;
    let rafId = 0;
    let lastTick = 0;

    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      const video = videoRef.current;
      if (!video || video.readyState < video.HAVE_ENOUGH_DATA) return;
      if (now - lastTick < SCAN_INTERVAL_MS || busyRef.current) return;
      lastTick = now;

      // Downscale large frames before decoding
      const scale = Math.min(1, 640 / video.videoWidth);
      const w = Math.round(video.videoWidth * scale);
      const h = Math.round(video.videoHeight * scale);
      const canvas = (canvasRef.current ??= document.createElement('canvas'));
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, w, h);
      const result = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      const code = result?.data.trim();
      if (!code) return;

      const last = lastScanRef.current;
      if (code === last.code && now - last.at < SAME_CODE_COOLDOWN_MS) return;
      lastScanRef.current = { code, at: now };
      setTicketCode(code);
      checkinRef.current(null, code);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraOn]);

  // Release the camera when leaving the page
  useEffect(() => stopCamera, [stopCamera]);

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
            {t.scanner.title}
          </h1>
          <p className="text-sm text-slate-400">
            {t.scanner.subtitle}
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
            title={soundEnabled ? t.scanner.beepOff : t.scanner.beepOn}
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
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1.5">{t.scanner.stats.registered}</div>
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
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1.5">{t.scanner.stats.checkedIn}</div>
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
            <div className="text-[11px] sm:text-xs text-slate-400 font-medium mt-1.5">{t.scanner.stats.pending}</div>
          </div>
        </div>
      </div>

      {/* ── Futuristic HUD Viewfinder & Scanner Input ── */}
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* HUD Scanner Box Visual */}
        <div className="theme-fixed relative w-full max-w-[300px] sm:max-w-sm mx-auto aspect-square rounded-2xl bg-gradient-to-br from-surface-3 via-surface-2 to-surface-4 border border-cyan-500/20 mb-4 flex items-center justify-center overflow-hidden shadow-[inset_0_0_40px_rgba(6,182,212,0.08)]">
          {/* Live Camera Feed */}
          <video
            ref={videoRef}
            muted
            playsInline
            className={`absolute inset-0 w-full h-full object-cover ${cameraOn ? '' : 'hidden'}`}
          />

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
          {!cameraOn && (
          <div className="relative text-center space-y-2 px-4">
            <div className="relative mx-auto w-12 h-12 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping" />
              <ScanLine className="w-9 h-9 text-cyan-400 relative" />
            </div>
            <p className="text-[11px] font-mono tracking-widest text-slate-400 uppercase">
              OPTICAL BARCODE / QR SENSOR READY
            </p>
            {cameraError && <p className="text-xs text-rose-300">{cameraError}</p>}
          </div>
          )}
        </div>

        {/* Camera Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => (cameraOn ? stopCamera() : startCamera(cameraId || undefined))}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
              cameraOn
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
            }`}
          >
            {cameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span>{cameraOn ? t.scanner.camera.stop : t.scanner.camera.start}</span>
          </button>
          {cameraOn && cameras.length > 1 && (
            <select
              value={cameraId}
              onChange={(e) => startCamera(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/15 text-sm text-slate-200 max-w-[260px]"
            >
              {cameras.map((c, i) => (
                <option key={c.deviceId} value={c.deviceId} className="bg-slate-900">
                  {c.label || t.scanner.camera.deviceFallback(i + 1)}
                </option>
              ))}
            </select>
          )}
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
              placeholder={t.scanner.form.placeholder}
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ticketCode.trim()}
            className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-on-accent font-bold text-sm sm:text-base rounded-2xl shadow-xl shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-emerald-400/30"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>{t.scanner.form.submit}</span>
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
            <h4 className="text-sm font-bold text-white">{t.scanner.result.errorTitle}</h4>
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
}
