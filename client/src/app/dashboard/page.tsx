'use client';

import { useState, useEffect, useMemo } from 'react';
import * as htmlToImage from 'html-to-image';
import { QRCodeSVG } from 'qrcode.react';
import * as XLSX from 'xlsx';
import api, { Participant, formatEventDateRange, formatEventTimeRange, formatEventLocation } from '@/lib/api';
import useWebSocket from '@/lib/useWebSocket';
import { useSettings } from '@/contexts/SettingsContext';
import Cropper from 'react-easy-crop';
import getCroppedImg from '@/lib/cropImage';
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
  ChevronRight
} from 'lucide-react';

export default function DashboardPage() {
  const { settings } = useSettings();
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
  const { stats, connected } = useWebSocket();

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
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAttendee.name || !newAttendee.company) return;

    setActionLoading(true);
    try {
      const created = await api.addParticipant(newAttendee);
      if (created) {
        setParticipants(prev => [created, ...prev]);
        setIsAddModalOpen(false);
        setNewAttendee({ name: '', company: '', position: '', email: '', phone: '', profile_picture: '', attendee_type: 'General' });
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
      const updated = await api.editParticipant(editingAttendee.id, editingAttendee);
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
      if (updated) {
        setParticipants(prev => prev.map(p => p.id === updated.id ? updated : p));
      }
    } catch {
      // Handled
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผู้ร่วมงานรายนี้?')) return;
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
    let result = participants.filter((p) => {
      const query = search.toLowerCase();
      const matchesSearch = 
        p.name.toLowerCase().includes(query) ||
        p.company.toLowerCase().includes(query) ||
        (p.email && p.email.toLowerCase().includes(query)) ||
        (p.phone && p.phone.includes(query)) ||
        (p.position && p.position.toLowerCase().includes(query));
      const matchesFilter = filter === 'all' || p.status === filter;
      return matchesSearch && matchesFilter;
    });

    result.sort((a, b) => {
      let valA = (a as any)[sortColumn];
      let valB = (b as any)[sortColumn];
      
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [participants, search, filter, sortColumn, sortDirection]);

  const totalPages = Math.ceil(filteredParticipants.length / itemsPerPage);
  const paginatedParticipants = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredParticipants.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredParticipants, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filter, itemsPerPage]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <ChevronDown className="w-3 h-3 opacity-20 ml-1 inline-block" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-cyan-400 ml-1 inline-block" /> 
      : <ChevronDown className="w-3 h-3 text-cyan-400 ml-1 inline-block" />;
  };

  const downloadQrCode = async () => {
    if (!qrModalParticipant) return;
    setDownloadingQr(true);
    try {
      const element = document.getElementById('dashboard-qr-ticket');
      if (element) {
        const dataUrl = await htmlToImage.toPng(element, { backgroundColor: '#ffffff', pixelRatio: 2 });
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

  const totalRegistered = stats.registered || participants.length;
  const totalCheckedIn = stats.checked_in || participants.filter(p => p.status === 'Checked-in').length;
  const totalPending = stats.pending || (totalRegistered - totalCheckedIn);
  const showUpRate = totalRegistered > 0 ? Math.round((totalCheckedIn / totalRegistered) * 100) : 0;

    const exportExcel = () => {
    const dataToExport = participants.map(p => ({
      'รหัส ID': p.id,
      'ชื่อ-นามสกุล': p.name,
      'บริษัท/องค์กร': p.company,
      'ตำแหน่ง': p.position || '',
      'อีเมล': p.email || '',
      'เบอร์โทร': p.phone || '',
      'สถานะ': p.status,
      'รหัสตั๋ว': p.ticket_code || '',
      'วันเวลาที่ลงทะเบียน': p.registered_at ? new Date(p.registered_at).toLocaleString('th-TH') : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendees');
    XLSX.writeFile(workbook, `event_attendees_${Date.now()}.xlsx`);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* ── Executive Header ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-xs font-semibold text-purple-300 mb-2">
            <LayoutDashboard className="w-3.5 h-3.5 text-cyan-400" />
            <span>Event Management & Analytics Operations</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            แดชบอร์ดจัดการข้อมูล (CMS)
          </h1>
          <p className="text-sm text-slate-400">
            ระบบรายงานสถิติสดและบริหารจัดการรายชื่อผู้เข้าร่วมงานทั้งหมด
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchParticipants}
            className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/10 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={exportExcel}
            className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/10 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>ส่งออก Excel</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มผู้ร่วมงาน</span>
          </button>
        </div>
      </div>

      {/* ── 4 Executive 3D Metrics Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 perspective-1000">
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">ยอดลงทะเบียน</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white font-heading">{totalRegistered}</div>
          <div className="text-[11px] text-indigo-400/80 mt-1 font-mono">100% Total Quota</div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-emerald-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">เช็คอินแล้ว</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 font-heading">{totalCheckedIn}</div>
          <div className="text-[11px] text-emerald-400/80 mt-1 font-mono">{showUpRate}% of Target</div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">รอดำเนินการ</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 font-heading">{totalPending}</div>
          <div className="text-[11px] text-amber-400/80 mt-1 font-mono">{100 - showUpRate}% In Transit</div>
        </div>

        <div className="glass-panel rounded-2xl p-5 border border-purple-500/20 card-3d">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400">Show-up Rate</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-purple-300 font-heading">{showUpRate}%</div>
          <div className="w-full bg-white/[0.08] h-1 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full" style={{ width: `${showUpRate}%` }} />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="glass-panel rounded-2xl p-3 sm:p-4 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white/[0.04] border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-white text-xs placeholder-slate-500"
            placeholder="ค้นหาชื่อ, บริษัท, หรืออีเมล..."
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'Pending', 'Checked-in'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/5'
              }`}
            >
              {f === 'all' ? 'ทั้งหมด' : f === 'Pending' ? 'ยังไม่เช็คอิน' : 'เช็คอินแล้ว'}
            </button>
          ))}
        </div>
      </div>

      {/* ── High-Tech Attendees Table ── */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.02] border-b border-white/10 text-slate-400 font-mono uppercase tracking-wider text-xs">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('name')}>
                  ผู้เข้าร่วมงาน <SortIcon column="name" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('company')}>
                  บริษัท / ตำแหน่ง <SortIcon column="company" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('status')}>
                  สถานะ <SortIcon column="status" />
                </th>
                <th className="px-6 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap" onClick={() => handleSort('registered_at')}>
                  วันเวลาลงทะเบียน <SortIcon column="registered_at" />
                </th>
                <th className="px-6 py-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    <span className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin inline-block mr-2" />
                    กำลังโหลดข้อมูลผู้ร่วมงาน...
                  </td>
                </tr>
              ) : paginatedParticipants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    ไม่พบข้อมูลผู้ร่วมงานที่ตรงกับเงื่อนไขการค้นหา
                  </td>
                </tr>
              ) : (
                paginatedParticipants.map((p) => {
                  const isChecked = p.status === 'Checked-in';
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors group">
                      {/* Name & Avatar */}
                      <td className="py-4 px-6 relative whitespace-nowrap">
                        <div className="flex items-center gap-4 group/item relative z-10">
                          {p.profile_picture ? (
                            <img 
                              src={p.profile_picture} 
                              alt={p.name} 
                              onClick={() => setLightboxImage(p.profile_picture!)}
                              className={`w-12 h-12 rounded-xl object-cover shadow-sm border cursor-pointer hover:scale-110 transition-transform ${isChecked ? 'border-emerald-500/30 hover:border-emerald-400' : 'border-indigo-500/30 hover:border-indigo-400'}`} 
                            />
                          ) : (
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm uppercase shadow-sm ${
                              isChecked
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                            }`}>
                              {p.name.substring(0, 2)}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white block text-lg group-hover:text-cyan-300 transition-colors">
                                {p.name}
                              </span>
                              {p.attendee_type === 'VIP' && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                  <Crown className="w-3 h-3" /> VIP
                                </span>
                              )}
                            </div>
                            {p.email && <span className="text-slate-400 text-sm font-mono">{p.email}</span>}
                            {p.phone && <span className="text-slate-500 text-xs font-mono block mt-0.5">{p.phone}</span>}
                          </div>
                        </div>
                      </td>

                      {/* Company & Position */}
                      <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                        <span className="font-semibold text-slate-200 block text-base">{p.company}</span>
                        {p.position && (
                          <span className="text-indigo-400 font-mono text-sm uppercase tracking-wider block mt-1">
                            {p.position}
                          </span>
                        )}
                      </td>

                      {/* Status Tag */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-mono font-semibold border ${
                          isChecked
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        }`}>
                          <span className={`w-2 h-2 rounded-full ${isChecked ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          <span>{isChecked ? 'Checked-in' : 'Pending'}</span>
                        </span>
                      </td>

                      {/* Registered At & Ticket Code */}
                      <td className="px-6 py-4 whitespace-nowrap min-w-[200px]">
                        <div className="text-slate-300 text-sm mb-1">
                          {p.registered_at ? new Date(p.registered_at).toLocaleString('th-TH') : '-'}
                        </div>
                        {p.ticket_code ? (
                          <span className="bg-white/[0.04] px-2 py-0.5 rounded border border-white/5 text-cyan-300 select-all text-xs font-mono">
                            {p.ticket_code}
                          </span>
                        ) : (
                          <span className="text-slate-600">-</span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {!isChecked && (
                            <button
                              onClick={() => handleQuickCheckin(p.ticket_code)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-sm font-semibold transition-all"
                              title="เช็คอินทันที"
                            >
                              สแกนเข้า
                            </button>
                          )}
                          {p.ticket_code && (
                            <button
                              onClick={() => setQrModalParticipant(p)}
                              className="p-2 rounded-lg text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-colors"
                              title="ดู QR Code"
                            >
                              <QrCode className="w-5 h-5" />
                            </button>
                          )}
                          <button
                            onClick={() => { setEditingAttendee(p); setIsEditModalOpen(true); }}
                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="แก้ไขข้อมูล"
                          >
                            <Edit3 className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title="ลบข้อมูล"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        <div className="px-6 py-4 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">แสดงผล</span>
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
            <span className="text-sm text-slate-400">รายการ / หน้า</span>
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
              หน้า {currentPage} จาก {totalPages || 1}
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

      {/* ── Add Attendee Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-[#090d16]/90 backdrop-blur pb-4 z-10 border-b border-white/5 -mt-2 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
                  <UserPlus className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">เพิ่มผู้เข้าร่วมงานใหม่</h3>
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
                          <span className="text-[10px] font-semibold opacity-80">ถ่าย/เลือกรูป</span>
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
                  <label className="block font-semibold text-slate-300">ประเภทผู้เข้าร่วมงาน</label>
                  <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/10 w-full">
                    <button
                      type="button"
                      onClick={() => setNewAttendee({ ...newAttendee, attendee_type: 'General' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${newAttendee.attendee_type === 'General' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <UserCircle className="w-4 h-4" /> ทั่วไป
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAttendee({ ...newAttendee, attendee_type: 'VIP' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${newAttendee.attendee_type === 'VIP' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Crown className="w-4 h-4" /> VIP
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={newAttendee.name}
                  onChange={(e) => setNewAttendee({ ...newAttendee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น นัฐพงศ์ สิทธิโชค"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">บริษัท / องค์กร *</label>
                <input
                  type="text"
                  required
                  value={newAttendee.company}
                  onChange={(e) => setNewAttendee({ ...newAttendee, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น PTT Digital / KBTG"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ตำแหน่งงาน</label>
                <input
                  type="text"
                  value={newAttendee.position}
                  onChange={(e) => setNewAttendee({ ...newAttendee, position: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="เช่น Senior Tech Lead"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">อีเมล</label>
                  <input
                    type="email"
                    value={newAttendee.email}
                    onChange={(e) => setNewAttendee({ ...newAttendee, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                    placeholder="mail@corp.com"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">เบอร์โทรศัพท์</label>
                  <input
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
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/50"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลผู้เข้าร่วมงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Edit Attendee Modal ── */}
      {isEditModalOpen && editingAttendee && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 max-w-2xl w-full border border-indigo-500/30 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between sticky top-0 bg-[#090d16]/90 backdrop-blur pb-4 z-10 border-b border-white/5 -mt-2 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
                  <Edit3 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-white">แก้ไขข้อมูลผู้เข้าร่วมงาน</h3>
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
                          <span className="text-[10px] font-semibold opacity-80">เปลี่ยนรูปภาพ</span>
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
                  <label className="block font-semibold text-slate-300">ประเภทผู้เข้าร่วมงาน</label>
                  <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/10 w-full">
                    <button
                      type="button"
                      onClick={() => setEditingAttendee({ ...editingAttendee, attendee_type: 'General' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${editingAttendee.attendee_type === 'General' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <UserCircle className="w-4 h-4" /> ทั่วไป
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingAttendee({ ...editingAttendee, attendee_type: 'VIP' })}
                      className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold rounded-lg transition-all ${editingAttendee.attendee_type === 'VIP' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30' : 'text-slate-400 hover:text-white'}`}
                    >
                      <Crown className="w-4 h-4" /> VIP
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ชื่อ-นามสกุล *</label>
                <input
                  type="text"
                  required
                  value={editingAttendee.name}
                  onChange={(e) => setEditingAttendee({ ...editingAttendee, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">บริษัท / องค์กร *</label>
                <input
                  type="text"
                  required
                  value={editingAttendee.company}
                  onChange={(e) => setEditingAttendee({ ...editingAttendee, company: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">ตำแหน่งงาน</label>
                <input
                  type="text"
                  value={editingAttendee.position}
                  onChange={(e) => setEditingAttendee({ ...editingAttendee, position: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingAttendee(null); }}
                  className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/10 text-slate-300 font-semibold transition-all border border-white/10"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all border border-indigo-500/50"
                >
                  {actionLoading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขข้อมูล'}
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
          <div className="p-6 bg-[#090d16] border-t border-white/10">
            <div className="max-w-md mx-auto space-y-4 text-center">
              <label className="block text-sm font-semibold text-slate-300">ปรับขนาดรูปภาพ (ซูมเข้า-ออก)</label>
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
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleCropSave}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/30 border border-indigo-500/50"
                >
                  ยืนยันรูปภาพ
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
            className="bg-[#090d16] border border-white/10 rounded-3xl p-8 max-w-sm w-full shadow-2xl relative text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setQrModalParticipant(null)}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div id="dashboard-qr-ticket" className="bg-white p-6 rounded-2xl mb-6 flex flex-col items-center mx-auto" style={{ width: 'fit-content' }}>
              <QRCodeSVG
                value={qrModalParticipant.ticket_code || ''}
                size={200}
                level="H"
                includeMargin={true}
              />
              <div className="mt-3 text-black font-bold text-lg">{qrModalParticipant.name}</div>
              <div className="text-slate-600 text-sm font-mono mt-1">{qrModalParticipant.ticket_code}</div>
              {(formatEventDateRange(settings.event_start, settings.event_end) || formatEventLocation(settings)) && (
                <div className="mt-3 pt-3 border-t border-slate-200 w-full text-center space-y-0.5">
                  {formatEventDateRange(settings.event_start, settings.event_end) && (
                    <div className="text-slate-700 text-xs font-medium">
                      {formatEventDateRange(settings.event_start, settings.event_end)}
                      {formatEventTimeRange(settings.event_start, settings.event_end) ? ` • ${formatEventTimeRange(settings.event_start, settings.event_end)}` : ''}
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
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              {downloadingQr ? 'กำลังประมวลผล...' : 'บันทึกรูป QR Code'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
