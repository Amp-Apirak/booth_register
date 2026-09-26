'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import Swal from 'sweetalert2';
import api, { CheckInError, OrganizationType, Participant, formatEventDateRange, formatEventTimeRange, formatEventLocation } from '@/lib/api';
import { orgKeyColor, orgTypeName, participantOrgKey } from '@/lib/orgTypes';
import OrganizationTypeField, { OrgChoice, orgChoiceOf } from '@/components/OrganizationTypeField';
import AnalyticsPanel from '@/components/analytics/AnalyticsPanel';
import useWebSocket from '@/lib/useWebSocket';
import { useSettings } from '@/contexts/SettingsContext';
import { usePreferences, useT } from '@/contexts/PreferencesContext';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
import { attendeeRows, downloadWorkbook } from '@/lib/backupExport';
import ParticipantImportModal from '@/components/ParticipantImportModal';
import StaffGate from '@/components/StaffGate';
import { useStaffSession } from '@/lib/staffSession';
import { 
  LayoutDashboard, 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp, 
  Search, 
  Plus, 
  Filter, 
  CheckCircle2, 
  Download, 
  Upload,
  Trash2, 
  Edit3, 
  X, 
  UserPlus, 
  Building,
  ShieldCheck,
  RefreshCw,
  Camera,
  Crown,
  UserCircle,
  QrCode,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  List
} from 'lucide-react';

type DashboardTab = 'participants' | 'analytics';

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ChevronDown className="w-3 h-3 opacity-20 ml-1 inline-block" />;
  return direction === 'asc'
    ? <ChevronUp className="w-3 h-3 text-cyan-400 ml-1 inline-block" />
    : <ChevronDown className="w-3 h-3 text-cyan-400 ml-1 inline-block" />;
}

// The tab lives in the URL (/dashboard?tab=analytics) so refresh and links keep it
export default function DashboardPage() {
  return (
    <StaffGate>
      <Suspense>
        <DashboardContent />
      </Suspense>
    </StaffGate>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: DashboardTab = searchParams.get('tab') === 'analytics' ? 'analytics' : 'participants';
  const setTab = (next: DashboardTab) => router.replace(`/dashboard?tab=${next}`, { scroll: false });
  const { settings } = useSettings();
  const t = useT();
  const { lang, theme } = usePreferences();
  const [orgTypes, setOrgTypes] = useState<OrganizationType[]>([]);
  const [orgFilter, setOrgFilter] = useState<string>('all'); // 'all' | 'other' | 'none' | type id
  const [newOrg, setNewOrg] = useState<{ choice: OrgChoice; other: string }>({ choice: null, other: '' });
  const [editOrg, setEditOrg] = useState<{ choice: OrgChoice; other: string }>({ choice: null, other: '' });
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortColumn, setSortColumn] = useState<string>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [qrModalParticipant, setQrModalParticipant] = useState<Participant | null>(null);
  const [downloadingQr, setDownloadingQr] = useState(false);

  const [filter, setFilter] = useState<'all' | 'Pending' | 'Checked-in'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [newAttendee, setNewAttendee] = useState({
    name: '',
    company: '',
    position: '',
    email: '',
    phone: '',
    profile_picture: '',
    attendee_type: 'General',
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Participant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const { stats, connected, participants: liveParticipants } = useWebSocket({ staff: true });
  // Staff role: event-day work only (no deleting, no bulk import) — the server enforces the same
  const { isAdmin } = useStaffSession();
  // after the first `participants:update` the live list (check-ins at the gate, other staff) is the source
  const list = liveParticipants ?? participants;

  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [croppingContext, setCroppingContext] = useState<'add' | 'edit'>('add');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setCroppingContext(isEdit ? 'edit' : 'add');
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
      if (rawImageSrc && croppedAreaPixels) {
        const croppedImageBase64 = await getCroppedImg(rawImageSrc, croppedAreaPixels);
        if (croppingContext === 'edit' && editingAttendee) {
          setEditingAttendee({ ...editingAttendee, profile_picture: croppedImageBase64 });
        } else {
          setNewAttendee({ ...newAttendee, profile_picture: croppedImageBase64 });
        }
        setIsCropping(false);
        setRawImageSrc(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchParticipants = async () => {
    try {
      const data = await api.getParticipants();
      setParticipants(data);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
    api.getOrganizationTypes().then(setOrgTypes);
  }, []);

  const orgPayload = (o: { choice: OrgChoice; other: string }) => ({
    organization_type_id: typeof o.choice === 'number' ? o.choice : null,
    organization_type_other: o.choice === 'other' ? o.other.trim() || null : null,
  });

  const openEdit = (p: Participant, forceOther = false) => {
    setEditingAttendee(p);
    setEditOrg({ choice: forceOther ? 'other' : orgChoiceOf(p), other: p.organization_type_other ?? '' });
    setIsEditModalOpen(true);
  };

  // Staff can pick the organization type on an attendee's behalf straight from the table
  const quickSetOrg = async (p: Participant, value: string) => {
    if (value === 'other') { openEdit(p, true); return; }
    const updated = await api.editParticipant(p.id, { ...p, organization_type_id: value === '' ? null : Number(value), organization_type_other: null });
    if (updated) setParticipants(prev => prev.map(x => x.id === updated.id ? { ...x, ...updated } : x));
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name || !newAttendee.company) return;

    setActionLoading(true);
    try {
      const created = await api.addParticipant({ ...newAttendee, ...orgPayload(newOrg) });
      if (created) {
        setParticipants(prev => [created, ...prev]);
        setIsAddModalOpen(false);
        setNewAttendee({ name: '', company: '', position: '', email: '', phone: '', profile_picture: '', attendee_type: 'General' });
        setNewOrg({ choice: null, other: '' });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendee?.name || !editingAttendee?.company) return;

    setActionLoading(true);
    try {
      const updated = await api.editParticipant(editingAttendee.id, { ...editingAttendee, ...orgPayload(editOrg) });
      if (updated) {
        setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
        setIsEditModalOpen(false);
        setEditingAttendee(null);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleQuickCheckin = async (ticketCode?: string) => {
    if (!ticketCode) return;
    try {
      const updated = await api.checkIn(ticketCode);
      setParticipants(prev => prev.map(p => p.id === updated.id ? { ...p, ...updated } : p));
    } catch (err) {
      const code = err instanceof CheckInError ? err.code : 'NETWORK_ERROR';
      Swal.fire({
        icon: 'error',
        title: t.dashboard.checkinFailed.title,
        text: code === 'ALREADY_CHECKED_IN' ? t.dashboard.checkinFailed.already : code === 'TICKET_NOT_FOUND' ? t.dashboard.checkinFailed.notFound : t.dashboard.checkinFailed.connection,
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t.dashboard.confirmDelete)) return;
    try {
      const ok = await api.deleteParticipant(id);
      if (ok) {
        setParticipants(prev => prev.filter(p => p.id !== id));
      }
    } catch {
      // Handled
    }
  };

    const filteredParticipants = useMemo(() => {
    let result = list.filter((p) => {
      const query = search.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(query) ||
        p.company.toLowerCase().includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.phone && p.phone.includes(query)) ||
        (p.position && p.position.toLowerCase().includes(query));
      const matchesFilter = filter === 'all' || p.status === filter;
      const matchesOrg = orgFilter === 'all' || String(participantOrgKey(p)) === orgFilter;
      return matchesSearch && matchesFilter && matchesOrg;
    });

    const orgRank = (p: Participant) => {
      const key = participantOrgKey(p);
      if (key === 'other') return orgTypes.length;
      if (key === 'none') return orgTypes.length + 1;
      const index = orgTypes.findIndex((type) => type.id === key);
      return index < 0 ? orgTypes.length : index;
    };

    result.sort((a, b) => {
      let valA = sortColumn === 'organization_type_id' ? orgRank(a) : (a as any)[sortColumn];
      let valB = sortColumn === 'organization_type_id' ? orgRank(b) : (b as any)[sortColumn];
      
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [list, search, filter, orgFilter, orgTypes, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParticipants, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, orgFilter, itemsPerPage]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const downloadQrCode = async () => {
    if (!qrModalParticipant) return;
    setDownloadingQr(true);
    try {
      const element = document.getElementById('dashboard-qr-ticket');
      if (element) {
        const rect = element.getBoundingClientRect();
        // the capture copies the card's own margin into the picture, which shifts it off-center — drop it
        const dataUrl = await htmlToImage.toPng(element, {
          backgroundColor: '#ffffff',
          pixelRatio: 2,
          width: rect.width,
          height: rect.height,
          style: { margin: '0', transform: 'none' },
        });
        const link = document.createElement('a');
        link.download = `QR_${qrModalParticipant.name.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDownloadingQr(false);
    }
  };

  const totalRegistered = stats.registered || list.length;
  const totalCheckedIn = stats.checked_in || list.filter(p => p.status === 'Checked-in').length;
  const totalPending = stats.pending || (totalRegistered - totalCheckedIn);
  const showUpRate = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

  // Same file as Settings → Backup & reset → Attendee data (headers follow the UI language; import accepts it back)
  const exportExcel = () => downloadWorkbook(
    [{ name: 'Attendees', rows: attendeeRows(list, orgTypes, t, lang) }],
    `event_attendees_${Date.now()}.xlsx`,
  );

  // ── Pieces shared by the table (≥1024px) and the card list (phones/tablets) ──
  const renderAvatar = (p: Participant, isChecked: boolean) => p.profile_picture ? (
    <img
      src={p.profile_picture}
      alt={p.name}
      onClick={() => setLightboxImage(p.profile_picture!)}
      className={`w-12 h-12 shrink-0 rounded-xl object-cover shadow-sm border cursor-pointer hover:scale-110 transition-transform ${isChecked ? 'border-emerald-500/30 hover:border-emerald-400' : 'border-indigo-500/30 hover:border-indigo-400'}`}
    />
  ) : (
    <div className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm uppercase shadow-sm ${
      isChecked
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
    }`}>
      {p.name.substring(0, 2)}
    </div>
  );

  const renderVip = (p: Participant) => p.attendee_type === 'VIP' && (
    <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1 shrink-0">
      <Crown className="w-3 h-3" /> VIP
    </span>
  );

  // Organization type — staff can choose on the attendee's behalf
  const renderOrgSelect = (p: Participant, selectClass: string) => (
    <div className="flex items-center gap-2 min-w-0">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: orgKeyColor(participantOrgKey(p), orgTypes, theme) }} aria-hidden="true" />
      <select
        value={typeof participantOrgKey(p) === 'number' ? String(p.organization_type_id) : participantOrgKey(p) === 'other' ? 'other' : ''}
        onChange={(e) => quickSetOrg(p, e.target.value)}
        title={t.orgTypes.changeTitle}
        aria-label={`${t.orgTypes.changeTitle}: ${p.name}`}
        className={`${selectClass} truncate bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
      >
        <option value="" className="bg-slate-900">{t.orgTypes.none}</option>
        {orgTypes.map((type) => <option key={type.id} value={type.id} className="bg-slate-900">{orgTypeName(type, lang)}</option>)}
        <option value="other" className="bg-slate-900">{p.organization_type_other ? `${t.orgTypes.other}: ${p.organization_type_other}` : t.orgTypes.otherOption}</option>
      </select>
    </div>
  );

  const renderStatus = (isChecked: boolean, compact = false) => (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-mono font-semibold border whitespace-nowrap ${compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'} ${
      isChecked
        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
        : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
    }`}>
      <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      <span>{isChecked ? t.common.status.checkedIn : t.common.status.pending}</span>
    </span>
  );

  const renderTicketCode = (p: Participant) => p.ticket_code ? (
    <span className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 text-cyan-300 select-all text-xs font-mono break-all">
      {p.ticket_code}
    </span>
  ) : (
    <span className="text-slate-600">-</span>
  );

  const renderActions = (p: Participant, isChecked: boolean) => (
    <div className="flex items-center justify-end gap-2">
      {!isChecked && (
        <button
          onClick={() => handleQuickCheckin(p.ticket_code)}
          className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-on-accent border border-emerald-500/30 text-sm font-semibold whitespace-nowrap transition-all"
          title={t.dashboard.rowActions.checkInNow}
        >
          {t.dashboard.rowActions.checkIn}
        </button>
      )}
      {p.ticket_code && (
        <button
          onClick={() => setQrModalParticipant(p)}
          className="p-2 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-colors"
          title={t.dashboard.rowActions.viewQr}
          aria-label={t.dashboard.rowActions.viewQr}
        >
          <QrCode className="w-5 h-5" />
        </button>
      )}
      <button
        onClick={() => openEdit(p)}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title={t.dashboard.rowActions.edit}
        aria-label={t.dashboard.rowActions.edit}
      >
        <Edit3 className="w-5 h-5" />
      </button>
      {isAdmin && (
        <button
          onClick={() => handleDelete(p.id)}
          className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
          title={t.dashboard.rowActions.delete}
          aria-label={t.dashboard.rowActions.delete}
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* ── Executive Header ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-2">
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Event Management & Analytics Operations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {t.dashboard.title}
          </h1>
          <p className="text-sm text-slate-400">
            {t.dashboard.subtitle}
          </p>
        </div>

        {tab === 'participants' && <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={fetchParticipants}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors"
            title={t.dashboard.actions.refresh}
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={exportExcel}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/10 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>{t.dashboard.actions.exportExcel}</span>
          </button>

          {isAdmin && <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/10 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>{t.dashboard.actions.importExcel}</span>
          </button>}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-on-accent text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>{t.dashboard.actions.addAttendee}</span>
          </button>
        </div>}
      </div>

      {/* ── Tabs: attendee list | reports & charts ── */}
      <div role="tablist" className="flex sm:inline-flex w-full sm:w-auto p-1.5 rounded-2xl bg-black/30 border border-white/10 gap-1">
        {([
          ['participants', t.analytics.tabParticipants, List],
          ['analytics', t.analytics.tabAnalytics, BarChart3],
        ] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
            className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${tab === id ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'analytics' ? (
        <AnalyticsPanel participants={list} loading={loading} />
      ) : (<>

      {/* ── 4 Executive 3D Metrics Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 perspective-1000">
        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-indigo-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">{t.dashboard.stats.registered}</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-heading">{totalRegistered}</div>
          <div className="text-[11px] text-indigo-400/80 mt-1 font-mono">100% Total Quota</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-emerald-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">{t.common.status.checkedIn}</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-heading">{totalCheckedIn}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">{showUpRate}% of Target</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-amber-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">{t.dashboard.stats.pending}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 font-heading">{totalPending}</div>
          <div className="text-[11px] text-amber-400/80 mt-1 font-mono">{100 - showUpRate}% In Transit</div>
        </div>

        <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-purple-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Show-up Rate</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-300 font-heading">{showUpRate}%</div>
          <div className="w-full bg-white/[0.08] h-1 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full" style={{ width: `${showUpRate}%` }} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col lg:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full lg:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white text-xs placeholder-slate-500"
            placeholder={t.dashboard.searchPlaceholder}
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            aria-label={t.orgTypes.column}
            className="w-full sm:w-auto sm:max-w-[14rem] sm:mr-1 px-3 py-2 sm:py-1.5 rounded-xl text-xs font-semibold bg-white/[0.04] text-slate-200 border border-white/10"
          >
            <option value="all" className="bg-slate-900">{t.orgTypes.filterAll}</option>
            {orgTypes.map((type) => <option key={type.id} value={type.id} className="bg-slate-900">{orgTypeName(type, lang)}</option>)}
            <option value="other" className="bg-slate-900">{t.orgTypes.other}</option>
            <option value="none" className="bg-slate-900">{t.orgTypes.none}</option>
          </select>
          {(['all', 'Pending', 'Checked-in'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 sm:flex-none px-3.5 py-2 sm:py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-indigo-600 text-on-accent shadow-md shadow-indigo-600/30'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
              }`}
            >
              {f === 'all' ? t.common.all : f === 'Pending' ? t.common.status.pending : t.common.status.checkedIn}
            </button>
          ))}
        </div>
      </div>

      {/* ── High-Tech Attendees Table ── */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        {/* Phones & tablets: one card per attendee (the table needs ≥1024px); 2 per row on tablets */}
        <div className="lg:hidden divide-y divide-white/[0.06] md:divide-y-0 md:grid md:grid-cols-2 md:gap-3 md:p-3">
          {loading ? (
            <div className="md:col-span-2 px-4 py-12 text-center text-slate-500">
              <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block mr-2 align-middle" />
              {t.dashboard.table.loading}
            </div>
          ) : paginatedParticipants.length === 0 ? (
            <div className="md:col-span-2 px-4 py-12 text-center text-slate-500">{t.dashboard.table.empty}</div>
          ) : paginatedParticipants.map((p) => {
            const isChecked = p.status === 'Checked-in';
            return (
              <div key={p.id} className="p-4 space-y-3 md:rounded-2xl md:border md:border-white/10 md:bg-white/[0.02]">
                <div className="flex items-start gap-3">
                  {renderAvatar(p, isChecked)}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-base leading-snug break-words">{p.name}</span>
                      {renderVip(p)}
                    </div>
                    {p.email && <div className="text-slate-400 text-xs font-mono truncate mt-0.5">{p.email}</div>}
                    {p.phone && <div className="text-slate-500 text-xs font-mono">{p.phone}</div>}
                  </div>
                  {renderStatus(isChecked, true)}
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-slate-200 break-words">{p.company}</span>
                  {p.position && <span className="text-indigo-400 font-mono text-xs uppercase tracking-wider block mt-0.5">{p.position}</span>}
                </div>
                {renderOrgSelect(p, 'flex-1 min-w-0')}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                  <span>{p.registered_at ? new Date(p.registered_at).toLocaleString(t.common.locale) : '-'}</span>
                  {renderTicketCode(p)}
                </div>
                {renderActions(p, isChecked)}
              </div>
            );
          })}
        </div>

        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 font-mono uppercase tracking-wider text-xs">
              <tr>
                <th className="px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('name')}>
                  {t.dashboard.table.attendee} <SortIcon active={sortColumn === 'name'} direction={sortDirection} />
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('company')}>
                  {t.dashboard.table.companyPosition} <SortIcon active={sortColumn === 'company'} direction={sortDirection} />
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('organization_type_id')}>
                  {t.orgTypes.column} <SortIcon active={sortColumn === 'organization_type_id'} direction={sortDirection} />
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('status')}>
                  {t.dashboard.table.status} <SortIcon active={sortColumn === 'status'} direction={sortDirection} />
                </th>
                <th className="px-4 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('registered_at')}>
                  {t.dashboard.table.registeredAt} <SortIcon active={sortColumn === 'registered_at'} direction={sortDirection} />
                </th>
                <th className="px-4 py-4 text-right sticky-actions">{t.dashboard.table.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    {t.dashboard.table.loading}
                  </td>
                </tr>
              ) : paginatedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    {t.dashboard.table.empty}
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map((p) => {
                  const isChecked = p.status === 'Checked-in';
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-4 px-4 relative">
                        <div className="flex items-center gap-4 group/item relative z-10">
                          {renderAvatar(p, isChecked)}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white block text-lg group-hover:text-cyan-300 transition-colors">
                                {p.name}
                              </span>
                              {renderVip(p)}
                            </div>
                            {p.email && <span className="text-slate-400 text-sm font-mono">{p.email}</span>}
                            {p.phone && <span className="text-slate-500 text-xs font-mono block mt-0.5">{p.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Company & Position */}
                      <td className="px-4 py-4 min-w-[180px]">
                        <span className="font-semibold text-slate-200 block text-base">{p.company}</span>
                        {p.position && (
                          <span className="text-indigo-400 font-mono text-sm uppercase tracking-wider block mt-1">
                            {p.position}
                          </span>
                        )}
                      </td>

                      {/* Organization type — staff can choose on the attendee's behalf */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderOrgSelect(p, 'w-40')}
                      </td>

                      {/* Status Tag */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        {renderStatus(isChecked)}
                      </td>

                      {/* Registered At & Ticket Code */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="text-slate-300 text-sm mb-1">
                          {p.registered_at ? new Date(p.registered_at).toLocaleString(t.common.locale) : '-'}
                        </div>
                        {renderTicketCode(p)}
                      </td>

                      {/* Quick Actions */}
                      <td className="px-4 py-4 text-right whitespace-nowrap sticky-actions">
                        {renderActions(p, isChecked)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-4 sm:px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">{t.dashboard.pagination.show}</span>
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="bg-white/[0.05] border border-white/10 rounded-lg text-white text-sm px-2 py-1 focus:outline-none focus:border-indigo-500"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-slate-400">{t.dashboard.pagination.perPage}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-white font-medium px-3">
              {t.dashboard.pagination.pageOf(currentPage, totalPages || 1)}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>

      </>)}

      {/* ── Add Attendee Modal ── */}
      {isImportModalOpen && (
        <ParticipantImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImported={fetchParticipants}
        />
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-glow rounded-3xl p-5 sm:p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 relative max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-surface-2/90 backdrop-blur pb-4 z-10 border-b border-white/5 -mt-2 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{t.dashboard.form.addTitle}</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-5 text-sm">
              {/* Profile & Type */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <div className="relative flex flex-col items-center w-full sm:w-1/3">
                  <div className="relative group cursor-pointer w-full max-w-[160px]" onClick={() => document.getElementById('admin_profile_upload')?.click()}>
                    <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-indigo-500/50 bg-indigo-950/30 flex flex-col items-center justify-center text-indigo-400 hover:border-cyan-400 hover:text-cyan-400 transition-all shadow-lg">
                      {newAttendee.profile_picture ? (
                        <img src={newAttendee.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 opacity-60 mb-1" />
                          <span className="text-[10px] font-semibold opacity-80">{t.dashboard.form.choosePhoto}</span>
                        </>
                      )}
                    </div>
                    {newAttendee.profile_picture && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <input 
                    id="admin_profile_upload"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, false)} 
                  />
                </div>
                
                <div className="flex-1 w-full flex flex-col gap-3">
                  <label className="block font-semibold text-slate-300">{t.dashboard.form.attendeeType}</label>
                  <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/10 w-full">
                    <button
                      type="button"
                      onClick={() => setNewAttendee({ ...newAttendee, attendee_type: 'General' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${newAttendee.attendee_type === 'General' ? 'bg-indigo-600 text-on-accent shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <UserCircle className="w-4 h-4" /> {t.common.attendeeType.General}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAttendee({ ...newAttendee, attendee_type: 'VIP' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${newAttendee.attendee_type === 'VIP' ? 'bg-amber-500 text-on-accent shadow-lg shadow-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Crown className="w-4 h-4" /> VIP
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="add-name" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.name} *</label>
                <input
                  id="add-name"
                  type="text"
                  required
                  value={newAttendee.name}
                  onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={t.dashboard.form.namePlaceholder}
                />
              </div>

              <div>
                <label htmlFor="add-company" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.company} *</label>
                <input
                  id="add-company"
                  type="text"
                  required
                  value={newAttendee.company}
                  onChange={(e) => setNewAttendee({ ...newAttendee, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={t.dashboard.form.companyPlaceholder}
                />
              </div>

              <div>
                <label htmlFor="add-position" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.position}</label>
                <input
                  id="add-position"
                  type="text"
                  value={newAttendee.position}
                  onChange={(e) => setNewAttendee({ ...newAttendee, position: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder={t.dashboard.form.positionPlaceholder}
                />
              </div>

              <OrganizationTypeField
                idPrefix="add-org"
                types={orgTypes}
                choice={newOrg.choice}
                other={newOrg.other}
                onChange={(choice, other) => setNewOrg({ choice, other })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="add-email" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.email}</label>
                  <input
                  id="add-email"
                    type="email"
                    value={newAttendee.email}
                    onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="mail@corp.com"
                  />
                </div>
                <div>
                  <label htmlFor="add-phone" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.phone}</label>
                  <input
                  id="add-phone"
                    type="tel"
                    value={newAttendee.phone}
                    onChange={(e) => setNewAttendee({ ...newAttendee, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-semibold transition-all border border-white/10"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent font-bold shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/50"
                >
                  {actionLoading ? t.common.saving : t.dashboard.form.saveNew}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Attendee Modal ── */}
      {isEditModalOpen && editingAttendee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-glow rounded-3xl p-5 sm:p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 relative max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-surface-2/90 backdrop-blur pb-4 z-10 border-b border-white/5 -mt-2 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
                  <Edit3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">{t.dashboard.form.editTitle}</h3>
              </div>
              <button
                onClick={() => { setIsEditModalOpen(false); setEditingAttendee(null); }}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-5 text-sm">
              {/* Profile & Type */}
              <div className="flex flex-col sm:flex-row items-center gap-6 mb-6">
                <div className="relative flex flex-col items-center w-full sm:w-1/3">
                  <div className="relative group cursor-pointer w-full max-w-[160px]" onClick={() => document.getElementById('admin_profile_edit')?.click()}>
                    <div className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-indigo-500/50 bg-indigo-950/30 flex flex-col items-center justify-center text-indigo-400 hover:border-cyan-400 hover:text-cyan-400 transition-all shadow-lg">
                      {editingAttendee.profile_picture ? (
                        <img src={editingAttendee.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <Camera className="w-8 h-8 opacity-60 mb-1" />
                          <span className="text-[10px] font-semibold opacity-80">{t.dashboard.form.changePhoto}</span>
                        </>
                      )}
                    </div>
                    {editingAttendee.profile_picture && (
                      <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <Camera className="w-6 h-6 text-white" />
                      </div>
                    )}
                  </div>
                  <input 
                    id="admin_profile_edit"
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => handleImageUpload(e, true)} 
                  />
                </div>
                
                <div className="flex-1 w-full flex flex-col gap-3">
                  <label className="block font-semibold text-slate-300">{t.dashboard.form.attendeeType}</label>
                  <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/10 w-full">
                    <button
                      type="button"
                      onClick={() => setEditingAttendee({ ...editingAttendee, attendee_type: 'General' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${editingAttendee.attendee_type === 'General' ? 'bg-indigo-600 text-on-accent shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <UserCircle className="w-4 h-4" /> {t.common.attendeeType.General}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAttendee({ ...editingAttendee, attendee_type: 'VIP' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${editingAttendee.attendee_type === 'VIP' ? 'bg-amber-500 text-on-accent shadow-lg shadow-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Crown className="w-4 h-4" /> VIP
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="edit-name" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.name} *</label>
                <input
                  id="edit-name"
                  type="text"
                  required
                  value={editingAttendee.name}
                  onChange={(e) => setEditingAttendee({ ...editingAttendee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="edit-company" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.company} *</label>
                <input
                  id="edit-company"
                  type="text"
                  required
                  value={editingAttendee.company}
                  onChange={(e) => setEditingAttendee({ ...editingAttendee, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label htmlFor="edit-position" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.position}</label>
                <input
                  id="edit-position"
                  type="text"
                  value={editingAttendee.position}
                  onChange={(e) => setEditingAttendee({ ...editingAttendee, position: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <OrganizationTypeField
                idPrefix="edit-org"
                types={orgTypes}
                choice={editOrg.choice}
                other={editOrg.other}
                onChange={(choice, other) => setEditOrg({ choice, other })}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-email" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.email}</label>
                  <input
                    id="edit-email"
                    type="email"
                    value={editingAttendee.email || ''}
                    onChange={(e) => setEditingAttendee({ ...editingAttendee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="mail@corp.com"
                  />
                </div>
                <div>
                  <label htmlFor="edit-phone" className="block font-semibold text-slate-300 mb-1">{t.dashboard.form.phone}</label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={editingAttendee.phone || ''}
                    onChange={(e) => setEditingAttendee({ ...editingAttendee, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="08x-xxx-xxxx"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingAttendee(null); }}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-semibold transition-all border border-white/10"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent font-bold shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/50"
                >
                  {actionLoading ? t.common.saving : t.dashboard.form.saveEdit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Cropping Modal for Dashboard ── */}
      {isCropping && rawImageSrc && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex flex-col">
          <div className="relative flex-1">
            <Cropper
              image={rawImageSrc}
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
              <label className="block text-sm font-semibold text-slate-300">{t.dashboard.crop.zoom}</label>
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
                  onClick={() => { setIsCropping(false); setRawImageSrc(null); }}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-semibold transition-all border border-white/10"
                >
                  {t.common.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-on-accent font-bold transition-all shadow-lg shadow-indigo-600/30 border border-indigo-500/50"
                >
                  {t.dashboard.crop.confirm}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Image Lightbox Modal ── */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full flex items-center justify-center">
            <button 
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Enlarged Profile" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl border border-white/20"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
      {/* ── QR Code Modal ── */}
      {qrModalParticipant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setQrModalParticipant(null)}>
          <div 
            className="bg-surface-2 border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrModalParticipant(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div id="dashboard-qr-ticket" className="theme-fixed bg-white p-6 rounded-2xl mb-6 flex flex-col items-center w-full text-center">
              <QRCodeSVG
                value={qrModalParticipant.ticket_code || ''}
                size={200}
                level="H"
                includeMargin={true}
              />
              <div className="mt-3 text-black font-bold text-lg break-words">{qrModalParticipant.name}</div>
              <div className="text-slate-600 text-sm font-mono mt-1 break-all">{qrModalParticipant.ticket_code}</div>
              {(formatEventDateRange(settings.event_start, settings.event_end, t.common.locale) || formatEventLocation(settings)) && (
                <div className="mt-3 pt-3 border-t border-slate-200 w-full text-center space-y-0.5">
                  {formatEventDateRange(settings.event_start, settings.event_end, t.common.locale) && (
                    <div className="text-slate-700 text-xs font-medium">
                      {formatEventDateRange(settings.event_start, settings.event_end, t.common.locale)}
                      {formatEventTimeRange(settings.event_start, settings.event_end, t.common.locale) ? ` • ${formatEventTimeRange(settings.event_start, settings.event_end, t.common.locale)}` : ''}
                    </div>
                  )}
                  {formatEventLocation(settings) && (
                    <div className="text-slate-500 text-xs">{formatEventLocation(settings)}</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={downloadQrCode}
              disabled={downloadingQr}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-on-accent font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {downloadingQr ? t.dashboard.qr.processing : t.dashboard.qr.save}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
