'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import {
  CalendarPlus, ChevronLeft, ChevronRight, Download, FileSpreadsheet,
  ImagePlus, Loader2, RotateCcw, Save, Search, Trash2, Upload, X,
} from 'lucide-react';
import api, { AgendaItem } from '@/lib/api';

type SpreadsheetRow = Record<string, string | number | boolean | Date | null | undefined>;

// isNew marks cards added on this page and not saved yet (shown on top, never sent to the API)
type EditableAgendaItem = AgendaItem & { isNew?: boolean };

const emptyItem = (): EditableAgendaItem => ({
  title: '', description: '', speaker: '', location: '', start_at: '', end_at: '',
  speaker_image: '', is_highlight: false, isNew: true,
});

// Display order: unsaved new cards first (latest added on top), then saved items in their order
const displayOrder = (items: EditableAgendaItem[]) => items
  .map((item, index) => ({ item, index }))
  .sort((a, b) => Number(!!b.item.isNew) - Number(!!a.item.isNew) || (a.item.isNew ? b.index - a.index : a.index - b.index));

const formatCardTime = (start: string, end: string) => {
  if (!start) return 'ยังไม่ได้ระบุเวลา';
  const [date, time] = start.split('T');
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y} · ${time}${end ? `–${end.slice(11, 16)}` : ''}`;
};

const toLocalInput = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const pick = (row: SpreadsheetRow, keys: string[]) => {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
};

const pad = (value: number) => String(value).padStart(2, '0');

const parseExcelDay = (value: unknown): string => {
  if (value instanceof Date) return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  if (typeof value === 'number' && value >= 1) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${pad(parsed.m)}-${pad(parsed.d)}`;
  }
  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (match) return `${match[1]}-${pad(Number(match[2]))}-${pad(Number(match[3]))}`;
  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (match) {
    const year = Number(match[3]) > 2400 ? Number(match[3]) - 543 : Number(match[3]);
    return `${year}-${pad(Number(match[2]))}-${pad(Number(match[1]))}`;
  }
  return '';
};

const parseExcelTime = (value: unknown): string => {
  if (value instanceof Date) return `${pad(value.getHours())}:${pad(value.getMinutes())}`;
  if (typeof value === 'number') {
    const totalMinutes = Math.round(((value % 1) + 1) % 1 * 24 * 60) % (24 * 60);
    return `${pad(Math.floor(totalMinutes / 60))}:${pad(totalMinutes % 60)}`;
  }
  const match = String(value ?? '').match(/(?:T|\s|^)(\d{1,2})[:.](\d{2})(?::\d{2})?/);
  return match ? `${pad(Number(match[1]))}:${pad(Number(match[2]))}` : '';
};

const combineExcelDateTime = (dayValue: unknown, timeValue: unknown): string => {
  const day = parseExcelDay(dayValue) || parseExcelDay(timeValue);
  const time = parseExcelTime(timeValue);
  return day && time ? `${day}T${time}` : '';
};

// Export writes this instead of the (huge) uploaded image data; import maps it back to the stored photo
const PHOTO_IN_SYSTEM = 'จัดเก็บรูปในระบบแล้ว';

const TEMPLATE_GUIDE = [
  ['คอลัมน์', 'จำเป็น', 'รูปแบบ', 'ตัวอย่าง'],
  ['วันที่', 'ใช่', 'วัน/เดือน/ปี ค.ศ. หรือ พ.ศ.', '21/09/2026'],
  ['เวลาเริ่ม', 'ใช่', 'ชั่วโมง:นาที (24 ชม.)', '09:00'],
  ['เวลาสิ้นสุด', 'ใช่', 'ชั่วโมง:นาที ต้องหลังเวลาเริ่ม', '10:30'],
  ['หัวข้อ', 'ใช่', 'ข้อความ', 'พิธีเปิดงาน'],
  ['รายละเอียดย่อ', '', 'ข้อความสั้น ๆ แสดงบนจอ LED', 'กล่าวต้อนรับโดยประธานจัดงาน'],
  ['วิทยากร', '', 'ข้อความ', 'ดร.สมชาย ใจดี'],
  ['สถานที่', '', 'ข้อความ', 'Main Stage (Hall 5)'],
  ['ไฮไลต์', '', 'ใช่ / ไม่', 'ใช่'],
  ['รูปวิทยากร', '', 'ลิงก์รูป (https://...) หรือเว้นว่างแล้วอัปโหลดในหน้าเว็บ', ''],
];

const parseBoolean = (value: unknown) => ['true', '1', 'yes', 'y', 'ใช่'].includes(String(value).trim().toLowerCase());

const alertTheme = {
  background: '#111629',
  color: '#f8fafc',
  confirmButtonColor: '#4f46e5',
};

type ValidationError = { index: number; field: keyof AgendaItem; title: string; detail: string; example: string };

export default function AgendaManager() {
  const [items, setItems] = useState<EditableAgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [speakerQuery, setSpeakerQuery] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.getAgenda().then((data) => setItems(data.map(item => ({
      ...item,
      start_at: toLocalInput(item.start_at),
      end_at: toLocalInput(item.end_at),
    })))).finally(() => setLoading(false));
  }, []);

  const updateItem = <K extends keyof AgendaItem>(index: number, key: K, value: AgendaItem[K]) => {
    setItems(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  };

  const handleImage = (index: number, file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      void Swal.fire({ ...alertTheme, icon: 'error', title: 'รูปภาพมีขนาดใหญ่เกินไป', html: 'กรุณาใช้ไฟล์ PNG, JPG หรือ WebP ขนาดไม่เกิน <b>2 MB</b>' });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateItem(index, 'speaker_image', String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const validate = (): ValidationError | null => {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      if (!item.title.trim()) return { index, field: 'title', title: 'ยังไม่ได้กรอกหัวข้อ', detail: `รายการที่ ${index + 1}: กรุณากรอกช่อง “หัวข้อกำหนดการ”`, example: 'ตัวอย่าง: บรรยายเปิดงานเทคโนโลยีแห่งอนาคต' };
      if (!item.start_at) return { index, field: 'start_at', title: 'ยังไม่ได้ระบุวันและเวลาเริ่ม', detail: `รายการที่ ${index + 1}: กรุณาเลือกวันและเวลาเริ่ม`, example: 'ตัวอย่าง: 21/09/2026 15:30' };
      if (!item.end_at) return { index, field: 'end_at', title: 'ยังไม่ได้ระบุวันและเวลาสิ้นสุด', detail: `รายการที่ ${index + 1}: กรุณาเลือกวันและเวลาสิ้นสุด`, example: 'ตัวอย่าง: 21/09/2026 16:30' };
      if (Number.isNaN(new Date(item.start_at).getTime())) return { index, field: 'start_at', title: 'วันเวลาเริ่มไม่ถูกต้อง', detail: `รายการที่ ${index + 1}: ระบบไม่สามารถอ่านวันเวลาเริ่มได้`, example: 'ตัวอย่างที่ถูก: 21/09/2026 15:30' };
      if (Number.isNaN(new Date(item.end_at).getTime())) return { index, field: 'end_at', title: 'วันเวลาสิ้นสุดไม่ถูกต้อง', detail: `รายการที่ ${index + 1}: ระบบไม่สามารถอ่านวันเวลาสิ้นสุดได้`, example: 'ตัวอย่างที่ถูก: 21/09/2026 16:30' };
      if (new Date(item.end_at) <= new Date(item.start_at)) return { index, field: 'end_at', title: 'ช่วงเวลาไม่ถูกต้อง', detail: `รายการที่ ${index + 1}: เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่ม`, example: 'ตัวอย่าง: เริ่ม 15:30 และสิ้นสุด 16:30' };
    }
    return null;
  };

  const save = async () => {
    const error = validate();
    if (error) {
      setQuery('');
      setSpeakerQuery('');
      setFilterDate('');
      setTimeFrom('');
      setTimeTo('');
      setPage(Math.floor(displayOrder(items).findIndex(entry => entry.index === error.index) / pageSize) + 1);
      await Swal.fire({ ...alertTheme, icon: 'error', title: error.title, html: `<p>${error.detail}</p><p style="margin-top:10px;color:#67e8f9">${error.example}</p>`, confirmButtonText: 'กลับไปแก้ไข' });
      window.setTimeout(() => document.getElementById(`agenda-${error.index}-${error.field}`)?.focus(), 100);
      return;
    }
    setSaving(true);
    try {
      const payload = items.map(item => ({ ...item, isNew: undefined, start_at: new Date(item.start_at).toISOString(), end_at: new Date(item.end_at).toISOString() }));
      const saved = await api.replaceAgenda(payload);
      setItems(saved.map(item => ({ ...item, start_at: toLocalInput(item.start_at), end_at: toLocalInput(item.end_at) })));
      await Swal.fire({ ...alertTheme, icon: 'success', title: 'บันทึกสำเร็จ', text: `บันทึกกำหนดการ ${saved.length} รายการและอัปเดตจอ LED แล้ว`, confirmButtonText: 'ตกลง' });
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'ไม่สามารถเชื่อมต่อระบบได้';
      await Swal.fire({ ...alertTheme, icon: 'error', title: 'บันทึกกำหนดการไม่สำเร็จ', text: `${reason}\nกรุณาตรวจสอบการเข้าสู่ระบบ วันเวลา และลองบันทึกอีกครั้ง`, confirmButtonText: 'ตรวจสอบข้อมูล' });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const now = new Date();
    const day = `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()}`;
    const header = ['วันที่', 'เวลาเริ่ม', 'เวลาสิ้นสุด', 'หัวข้อ', 'รายละเอียดย่อ', 'วิทยากร', 'สถานที่', 'ไฮไลต์', 'รูปวิทยากร'];
    const sheet = XLSX.utils.aoa_to_sheet([
      header,
      [day, '09:00', '10:00', 'พิธีเปิดงาน', 'กล่าวต้อนรับโดยประธานจัดงาน', 'ดร.สมชาย ใจดี', 'Main Stage (Hall 5)', 'ใช่', ''],
      [day, '10:15', '11:30', 'เสวนา: อนาคตของ AI บนมือถือ', 'ผู้เชี่ยวชาญ 3 ท่านร่วมพูดคุย', 'คุณสมหญิง รักงาน', 'Conference Room A', 'ไม่', ''],
    ]);
    sheet['!cols'] = [{ wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 48 }, { wch: 28 }, { wch: 24 }, { wch: 10 }, { wch: 36 }];
    const guide = XLSX.utils.aoa_to_sheet(TEMPLATE_GUIDE);
    guide['!cols'] = [{ wch: 16 }, { wch: 8 }, { wch: 52 }, { wch: 28 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Agenda');
    XLSX.utils.book_append_sheet(workbook, guide, 'คำอธิบาย');
    XLSX.writeFile(workbook, 'agenda-import-template.xlsx');
  };

  const exportExcel = () => {
    const rows = items.map((item, index) => ({
      ลำดับ: index + 1,
      วันที่: item.start_at.slice(0, 10),
      เวลาเริ่ม: item.start_at.slice(11, 16),
      เวลาสิ้นสุด: item.end_at.slice(11, 16),
      หัวข้อ: item.title,
      รายละเอียดย่อ: item.description,
      วิทยากร: item.speaker,
      สถานที่: item.location,
      ไฮไลต์: item.is_highlight ? 'ใช่' : 'ไม่',
      รูปวิทยากร: item.speaker_image?.startsWith('data:') ? PHOTO_IN_SYSTEM : (item.speaker_image || ''),
    }));
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{
      ลำดับ: 1, วันที่: '', เวลาเริ่ม: '', เวลาสิ้นสุด: '', หัวข้อ: '', รายละเอียดย่อ: '', วิทยากร: '', สถานที่: '', ไฮไลต์: 'ไม่', รูปวิทยากร: '',
    }]);
    sheet['!cols'] = [{ wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 40 }, { wch: 48 }, { wch: 28 }, { wch: 24 }, { wch: 12 }, { wch: 36 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, 'Agenda');
    XLSX.writeFile(workbook, 'event-agenda.xlsx', { cellDates: true });
  };

  const importExcel = async (file?: File) => {
    if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, { defval: '' });
      // Re-importing an exported file: restore uploaded photos by matching title + start time
      const storedPhotos = new Map(items.filter(item => item.speaker_image).map(item => [`${item.title.trim()}|${item.start_at}`, item.speaker_image]));
      const imported = rows.map((row, index) => {
        const day = pick(row, ['วันที่', 'date', 'Date']);
        const startValue = pick(row, ['เวลาเริ่ม', 'start_at', 'Start', 'Start Time']);
        const endValue = pick(row, ['เวลาสิ้นสุด', 'end_at', 'End', 'End Time']);
        const startAt = combineExcelDateTime(day, startValue);
        const endAt = combineExcelDateTime(day || startValue, endValue);
        if (!parseExcelDay(day) && !parseExcelDay(startValue)) throw new Error(`กรุณากรอกวันที่ในแถวที่ ${index + 2}`);
        return {
        title: String(pick(row, ['หัวข้อ', 'title', 'Title'])).trim(),
        description: String(pick(row, ['รายละเอียดย่อ', 'รายละเอียด', 'description', 'Description'])).trim(),
        speaker: String(pick(row, ['วิทยากร', 'speaker', 'Speaker'])).trim(),
        location: String(pick(row, ['สถานที่', 'location', 'Location'])).trim(),
        start_at: startAt,
        end_at: endAt,
        is_highlight: parseBoolean(pick(row, ['ไฮไลต์', 'is_highlight', 'Highlight'])),
        speaker_image: String(pick(row, ['รูปวิทยากร', 'speaker_image', 'Speaker Image'])).trim(),
      }}).map(item => item.speaker_image === PHOTO_IN_SYSTEM
        ? { ...item, speaker_image: storedPhotos.get(`${item.title}|${item.start_at}`) || '' }
        : item
      ).filter(item => item.title || item.start_at || item.end_at);
      if (!imported.length) throw new Error('EMPTY_WORKBOOK');
      setItems(imported);
      setPage(1);
      await Swal.fire({ ...alertTheme, icon: 'success', title: 'นำเข้า Excel สำเร็จ', text: `นำเข้า ${imported.length} รายการ (แทนที่รายการเดิมบนหน้านี้) — ตรวจสอบแล้วกด "บันทึก" เพื่อใช้งานจริง หากไม่ต้องการให้รีเฟรชหน้าเพื่อยกเลิก`, confirmButtonText: 'ตรวจสอบข้อมูล' });
    } catch (error) {
      const reason = error instanceof Error && error.message !== 'EMPTY_WORKBOOK' ? error.message : 'ไม่พบข้อมูลในไฟล์ หรือรูปแบบไฟล์ไม่ถูกต้อง';
      await Swal.fire({ ...alertTheme, icon: 'error', title: 'นำเข้า Excel ไม่สำเร็จ', text: `${reason}\nตัวอย่าง: วันที่ 21/09/2026, เวลาเริ่ม 15:30, เวลาสิ้นสุด 16:30, หัวข้อ บรรยายเปิดงาน`, confirmButtonText: 'กลับไปตรวจไฟล์' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredItems = useMemo(() => displayOrder(items).filter(({ item }) => {
    const normalizedQuery = query.trim().toLocaleLowerCase('th');
    const normalizedSpeaker = speakerQuery.trim().toLocaleLowerCase('th');
    const startDate = item.start_at.slice(0, 10);
    const startTime = item.start_at.slice(11, 16);
    return (!normalizedQuery || item.title.toLocaleLowerCase('th').includes(normalizedQuery))
      && (!normalizedSpeaker || item.speaker.toLocaleLowerCase('th').includes(normalizedSpeaker))
      && (!filterDate || startDate === filterDate)
      && (!timeFrom || startTime >= timeFrom)
      && (!timeTo || startTime <= timeTo);
  }), [items, query, speakerQuery, filterDate, timeFrom, timeTo]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const resetFilters = () => {
    setQuery(''); setSpeakerQuery(''); setFilterDate(''); setTimeFrom(''); setTimeTo(''); setPage(1);
  };
  const addItem = () => {
    resetFilters();
    setPage(1);
    const newIndex = items.length;
    setItems(current => [...current, emptyItem()]);
    window.setTimeout(() => {
      const input = document.getElementById(`agenda-${newIndex}-title`);
      input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input?.focus({ preventScroll: true });
    }, 50);
  };

  if (loading) return <div className="glass-panel rounded-3xl p-12 text-center text-slate-400"><Loader2 className="w-7 h-7 animate-spin mx-auto mb-3" />กำลังโหลดกำหนดการ...</div>;

  return (
    <div className="space-y-5">
      <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/10">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2"><FileSpreadsheet className="w-5 h-5 text-emerald-400" />จัดการ Event Agenda</h2>
            <p className="text-sm text-slate-400 mt-1">นำเข้า Excel แล้วตรวจสอบข้อมูลก่อนบันทึก รูปวิทยากรเพิ่มได้จากแต่ละรายการ</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={event => importExcel(event.target.files?.[0])} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 font-semibold text-sm"><Upload className="w-4 h-4" />นำเข้า Excel</button>
            <button type="button" onClick={downloadTemplate} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 text-slate-200 border border-white/10 hover:bg-white/10 font-semibold text-sm"><FileSpreadsheet className="w-4 h-4 text-emerald-400" />ไฟล์ตัวอย่าง</button>
            <button type="button" onClick={exportExcel} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/25 hover:bg-cyan-500/20 font-semibold text-sm"><Download className="w-4 h-4" />ส่งออก Excel</button>
            <button type="button" onClick={addItem} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-on-accent hover:bg-indigo-500 font-semibold text-sm"><CalendarPlus className="w-4 h-4" />เพิ่มกำหนดการ</button>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">
          ดาวน์โหลด <b className="text-slate-300">ไฟล์ตัวอย่าง</b> (มีชีต &quot;คำอธิบาย&quot; บอกวิธีกรอก) หรือใช้ไฟล์จาก <b className="text-slate-300">ส่งออก Excel</b> มาแก้แล้วนำเข้ากลับได้ · คอลัมน์ที่ต้องมี: วันที่, เวลาเริ่ม, เวลาสิ้นสุด, หัวข้อ · การนำเข้าจะแทนที่รายการทั้งหมด (ยังไม่บันทึกจนกว่าจะกด &quot;บันทึก&quot;)
        </p>
      </div>

      <div className="glass-panel rounded-3xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2"><Search className="w-4 h-4 text-cyan-400" />ค้นหาและกรองกำหนดการ</h3>
            <p className="text-xs text-slate-500 mt-1">ค้นหาจากหัวข้อ วิทยากร วันที่ หรือช่วงเวลาเริ่ม</p>
          </div>
          <button type="button" onClick={resetFilters} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-white/5 hover:bg-white/10 border border-white/10"><RotateCcw className="w-3.5 h-3.5" />ล้างตัวกรอง</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <label className="space-y-1"><span className="text-xs text-slate-400">หัวข้อ</span><input value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} placeholder="ค้นหาหัวข้อ..." className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">ชื่อวิทยากร</span><input value={speakerQuery} onChange={event => { setSpeakerQuery(event.target.value); setPage(1); }} placeholder="ค้นหาวิทยากร..." className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">วันที่</span><input type="date" value={filterDate} onChange={event => { setFilterDate(event.target.value); setPage(1); }} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white scheme-dark" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">เวลาเริ่ม ตั้งแต่</span><input type="time" value={timeFrom} onChange={event => { setTimeFrom(event.target.value); setPage(1); }} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white scheme-dark" /></label>
          <label className="space-y-1"><span className="text-xs text-slate-400">เวลาเริ่ม ถึง</span><input type="time" value={timeTo} onChange={event => { setTimeTo(event.target.value); setPage(1); }} className="w-full bg-surface/60 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white scheme-dark" /></label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-400">พบ <b className="text-white">{filteredItems.length}</b> จาก {items.length} รายการ</span>
          <label className="flex items-center gap-2 text-slate-400">แสดงต่อหน้า
            <select value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="bg-surface border border-white/10 rounded-lg px-3 py-2 text-white">
              {[5, 10, 20, 50].map(size => <option key={size} value={size}>{size} รายการ</option>)}
            </select>
          </label>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="glass-panel rounded-3xl p-12 text-center border border-dashed border-white/15">
          <CalendarPlus className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold">ยังไม่มีกำหนดการ</p>
          <p className="text-sm text-slate-500 mt-1">นำเข้า Excel หรือเพิ่มรายการแรกได้ทันที</p>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="glass-panel rounded-3xl p-10 text-center border border-dashed border-white/15">
          <Search className="w-9 h-9 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-300 font-semibold">ไม่พบกำหนดการที่ตรงกับตัวกรอง</p>
          <button type="button" onClick={resetFilters} className="mt-3 text-sm text-cyan-300 hover:text-cyan-200">ล้างตัวกรองทั้งหมด</button>
        </div>
      ) : visibleItems.map(({ item, index }) => (
        <div key={item.id ?? `new-${index}`} className={`glass-panel rounded-3xl p-5 sm:p-6 border relative overflow-hidden ${item.isNew ? 'border-emerald-400/50 shadow-[0_0_30px_rgba(52,211,153,.12)]' : 'border-white/10'}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${item.isNew ? 'from-emerald-400 to-cyan-400' : 'from-indigo-500 to-cyan-400'}`} />
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-xl text-sm font-extrabold ${item.isNew ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/40' : 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30'}`}>{index + 1}</span>
            <span className="text-sm font-bold text-white">ลำดับที่ {index + 1}</span>
            {item.isNew && <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-400/30">ใหม่ · ยังไม่บันทึก</span>}
            <span className="ml-auto text-xs font-mono text-cyan-300/80">{formatCardTime(item.start_at, item.end_at)}</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center">
              {item.speaker_image ? (
                // Data URLs come from staff uploads and cannot use the Next image optimizer.
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.speaker_image} alt={item.speaker || item.title} className="w-full h-full object-cover" />
              ) : <ImagePlus className="w-8 h-8 text-slate-600" />}
              <label className="absolute inset-0 bg-black/60 opacity-0 hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center text-xs font-bold text-on-accent">
                เลือกรูป
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={event => handleImage(index, event.target.files?.[0])} />
              </label>
            </div>
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
              <input id={`agenda-${index}-title`} value={item.title} onChange={event => updateItem(index, 'title', event.target.value)} placeholder="หัวข้อกำหนดการ *" className="md:col-span-2 bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white font-semibold" />
              <textarea value={item.description} onChange={event => updateItem(index, 'description', event.target.value)} placeholder="รายละเอียดย่อสำหรับแสดงบนจอ LED" rows={2} className="md:col-span-2 bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white resize-none" />
              <input value={item.speaker} onChange={event => updateItem(index, 'speaker', event.target.value)} placeholder="ชื่อวิทยากร / รายละเอียด" className="bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white" />
              <input value={item.location} onChange={event => updateItem(index, 'location', event.target.value)} placeholder="ห้อง / เวที / สถานที่" className="bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white" />
              <label className="space-y-1"><span className="text-xs text-slate-400">เวลาเริ่ม *</span><input id={`agenda-${index}-start_at`} type="datetime-local" value={item.start_at} onChange={event => updateItem(index, 'start_at', event.target.value)} className="w-full bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white scheme-dark" /></label>
              <label className="space-y-1"><span className="text-xs text-slate-400">เวลาสิ้นสุด *</span><input id={`agenda-${index}-end_at`} type="datetime-local" min={item.start_at || undefined} value={item.end_at} onChange={event => updateItem(index, 'end_at', event.target.value)} className="w-full bg-surface/60 border border-white/10 rounded-xl px-4 py-3 text-white scheme-dark" /></label>
            </div>
            <div className="flex flex-col gap-2">
              {item.speaker_image && <button type="button" title="ลบรูป" onClick={() => updateItem(index, 'speaker_image', '')} className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"><X className="w-4 h-4" /></button>}
              <button type="button" title="ลบรายการ" onClick={() => setItems(current => current.filter((_, itemIndex) => itemIndex !== index))} className="p-2 rounded-lg text-slate-400 hover:text-rose-300 hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
          <label className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input type="checkbox" checked={item.is_highlight} onChange={event => updateItem(index, 'is_highlight', event.target.checked)} className="w-4 h-4 accent-purple-500" /> แสดงเป็นรายการไฮไลต์
          </label>
        </div>
      ))}

      {filteredItems.length > 0 && (
        <div className="glass-panel rounded-2xl px-4 py-3 border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="text-sm text-slate-400">หน้า <b className="text-white">{currentPage}</b> จาก {totalPages} · รายการ {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredItems.length)}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={currentPage === 1} onClick={() => setPage(value => Math.max(1, value - 1))} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 disabled:opacity-30"><ChevronLeft className="w-4 h-4" />ก่อนหน้า</button>
            {Array.from({ length: totalPages }, (_, index) => index + 1).filter(number => totalPages <= 7 || number === 1 || number === totalPages || Math.abs(number - currentPage) <= 1).map((number, index, pages) => <span key={number} className="contents">{index > 0 && number - pages[index - 1] > 1 && <span className="text-slate-500">…</span>}<button type="button" onClick={() => setPage(number)} className={`w-9 h-9 rounded-xl text-sm font-bold border ${currentPage === number ? 'bg-indigo-600 border-indigo-400 text-on-accent' : 'bg-white/5 border-white/10 text-slate-300'}`}>{number}</button></span>)}
            <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(value => Math.min(totalPages, value + 1))} className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-sm text-slate-300 disabled:opacity-30">ถัดไป<ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <button type="button" onClick={save} disabled={saving} className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-on-accent font-bold shadow-lg shadow-indigo-500/25 disabled:opacity-50">
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}บันทึกกำหนดการทั้งหมด
        </button>
      </div>
    </div>
  );
}
