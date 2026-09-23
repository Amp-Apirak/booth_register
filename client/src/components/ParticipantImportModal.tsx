'use client';

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '@/lib/api';
import {
  IMPORT_HEADERS,
  IMPORT_ISSUE_LABELS,
  SERVER_SKIP_LABELS,
  ImportRow,
  detectColumns,
  mapImportRows,
} from '@/lib/participantImport';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';

const MAX_ROWS = 5000;
const PREVIEW_LIMIT = 200;

type ImportResult = Awaited<ReturnType<typeof api.importParticipants>>;

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function ParticipantImportModal({ onClose, onImported }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState('');

  const validRows = rows.filter((r) => r.issues.length === 0);
  const invalidRows = rows.filter((r) => r.issues.length > 0);

  const reset = () => {
    setFileName('');
    setRows([]);
    setParseError('');
    setResult(null);
    setImportError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const header = (Object.keys(IMPORT_HEADERS) as (keyof typeof IMPORT_HEADERS)[]).map((f) => IMPORT_HEADERS[f][0]);
    const sheet = XLSX.utils.aoa_to_sheet([
      header,
      ['สมชาย ใจดี', 'บริษัท ตัวอย่าง จำกัด', 'ผู้จัดการฝ่ายไอที', 'somchai@example.com', '0812345678', 'General'],
      ['สมหญิง รักงาน', 'ACME Co., Ltd.', 'CEO', 'somying@example.com', '0898765432', 'VIP'],
    ]);
    // Keep phone numbers as text so Excel does not drop the leading 0
    for (let r = 1; r <= 2; r++) {
      const cell = sheet[XLSX.utils.encode_cell({ r, c: 4 })];
      if (cell) cell.t = 's';
    }
    sheet['!cols'] = [{ wch: 24 }, { wch: 28 }, { wch: 22 }, { wch: 28 }, { wch: 14 }, { wch: 12 }];
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Attendees');
    XLSX.writeFile(book, 'attendee_import_template.xlsx');
  };

  const handleFile = async (file: File) => {
    reset();
    setFileName(file.name);
    try {
      const book = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = book.Sheets[book.SheetNames[0]];
      const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
      const columns = detectColumns(records.length > 0 ? Object.keys(records[0]) : []);
      if (!columns.name || !columns.company) {
        setParseError('ไม่พบคอลัมน์ "ชื่อ-นามสกุล" หรือ "บริษัท/องค์กร" ในแถวแรกของไฟล์ — ลองดาวน์โหลดไฟล์ตัวอย่าง');
        return;
      }
      const mapped = mapImportRows(records);
      if (mapped.length === 0) {
        setParseError('ไม่พบข้อมูลในไฟล์');
        return;
      }
      if (mapped.length > MAX_ROWS) {
        setParseError(`ไฟล์มี ${mapped.length.toLocaleString()} แถว — นำเข้าได้สูงสุด ${MAX_ROWS.toLocaleString()} แถวต่อครั้ง`);
        return;
      }
      setRows(mapped);
    } catch {
      setParseError('อ่านไฟล์ไม่ได้ — รองรับเฉพาะ .xlsx, .xls และ .csv');
    }
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    setImportError('');
    try {
      const res = await api.importParticipants(
        validRows.map((r) => ({ row: r.row, name: r.name, company: r.company, position: r.position, email: r.email, phone: r.phone, attendee_type: r.attendee_type }))
      );
      setResult(res);
      if (res.imported_count > 0) onImported();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'นำเข้าไม่สำเร็จ');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 max-w-4xl w-full border border-indigo-500/30 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between sticky top-0 bg-[#090d16]/90 backdrop-blur pb-4 z-10 border-b border-white/5 -mt-2 pt-2">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">นำเข้ารายชื่อผู้เข้าร่วมงาน</h3>
              <p className="text-xs text-slate-400">รองรับไฟล์ Excel (.xlsx, .xls) และ CSV · สูงสุด {MAX_ROWS.toLocaleString()} แถว</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {result ? (
          /* ── Step 3: Result ── */
          <div className="space-y-5 text-sm">
            <div className="flex items-center gap-4 p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 shrink-0" />
              <div>
                <div className="text-lg font-bold text-white">นำเข้าสำเร็จ {result.imported_count.toLocaleString()} รายการ</div>
                <div className="text-slate-300">
                  {result.skipped_count + invalidRows.length > 0
                    ? `ข้าม ${(result.skipped_count + invalidRows.length).toLocaleString()} รายการ (รายละเอียดด้านล่าง)`
                    : 'ทุกแถวถูกนำเข้าเรียบร้อย'}
                  {' · '}ระบบสร้างรหัสตั๋ว QR ให้ทุกคนอัตโนมัติ
                </div>
              </div>
            </div>

            {(result.skipped.length > 0 || invalidRows.length > 0) && (
              <div className="rounded-2xl border border-white/10 overflow-hidden">
                <div className="px-4 py-2.5 bg-white/[0.04] text-xs font-semibold text-slate-300">แถวที่ไม่ได้นำเข้า</div>
                <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
                  {[
                    ...invalidRows.map((r) => ({ row: r.row, reason: r.issues.map((i) => IMPORT_ISSUE_LABELS[i]).join(', ') })),
                    ...result.skipped.map((s) => ({ row: s.row, reason: SERVER_SKIP_LABELS[s.reason] || s.reason })),
                  ]
                    .sort((a, b) => a.row - b.row)
                    .map((s) => (
                      <div key={s.row} className="px-4 py-2 flex gap-4 text-xs">
                        <span className="font-mono text-slate-500 w-16">แถว {s.row}</span>
                        <span className="text-amber-300">{s.reason}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button onClick={reset} className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/10">
                นำเข้าไฟล์อื่น
              </button>
              <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 text-white text-xs font-bold">
                เสร็จสิ้น
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-5 text-sm">
            {/* ── Step 1: Pick file ── */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-3 px-5 py-6 rounded-2xl border-2 border-dashed border-cyan-500/30 hover:border-cyan-400/60 bg-cyan-500/[0.04] hover:bg-cyan-500/[0.08] text-slate-200 transition-all"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFile(file);
                }}
              >
                <Upload className="w-6 h-6 text-cyan-400" />
                <span className="text-left">
                  <span className="block font-semibold">{fileName || 'เลือกไฟล์ หรือลากไฟล์มาวางที่นี่'}</span>
                  <span className="block text-xs text-slate-400">คอลัมน์ที่ต้องมี: ชื่อ-นามสกุล, บริษัท/องค์กร</span>
                </span>
              </button>
              <button
                type="button"
                onClick={downloadTemplate}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-slate-200 text-xs font-semibold"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                ดาวน์โหลดไฟล์ตัวอย่าง
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                }}
              />
            </div>

            {parseError && (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                {parseError}
              </div>
            )}

            {/* ── Step 2: Preview ── */}
            {rows.length > 0 && (
              <>
                <div className="flex flex-wrap gap-3 text-xs">
                  <span className="px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-300">ทั้งหมด {rows.length.toLocaleString()} แถว</span>
                  <span className="px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">พร้อมนำเข้า {validRows.length.toLocaleString()}</span>
                  {invalidRows.length > 0 && (
                    <span className="px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300">มีปัญหา (จะข้าม) {invalidRows.length.toLocaleString()}</span>
                  )}
                </div>

                <div className="rounded-2xl border border-white/10 overflow-hidden">
                  <div className="max-h-80 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-white/[0.04] text-slate-400 sticky top-0">
                        <tr>
                          {['แถว', 'ชื่อ-นามสกุล', 'บริษัท/องค์กร', 'ตำแหน่ง', 'อีเมล', 'เบอร์โทร', 'ประเภท', 'สถานะ'].map((h) => (
                            <th key={h} className="px-3 py-2.5 text-left font-semibold whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {rows.slice(0, PREVIEW_LIMIT).map((r) => (
                          <tr key={r.row} className={r.issues.length ? 'bg-amber-500/[0.06]' : ''}>
                            <td className="px-3 py-2 font-mono text-slate-500">{r.row}</td>
                            <td className="px-3 py-2 text-white">{r.name || '—'}</td>
                            <td className="px-3 py-2 text-slate-300">{r.company || '—'}</td>
                            <td className="px-3 py-2 text-slate-400">{r.position}</td>
                            <td className="px-3 py-2 text-slate-400">{r.email}</td>
                            <td className="px-3 py-2 text-slate-400 font-mono">{r.phone}</td>
                            <td className="px-3 py-2">{r.attendee_type === 'VIP' ? <span className="text-amber-300 font-bold">VIP</span> : <span className="text-slate-400">General</span>}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {r.issues.length ? (
                                <span className="text-amber-300">{r.issues.map((i) => IMPORT_ISSUE_LABELS[i]).join(', ')}</span>
                              ) : (
                                <span className="text-emerald-400">พร้อม</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > PREVIEW_LIMIT && (
                    <div className="px-4 py-2 text-xs text-slate-500 bg-white/[0.02]">แสดงตัวอย่าง {PREVIEW_LIMIT} แถวแรก จากทั้งหมด {rows.length.toLocaleString()} แถว</div>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  ผู้ที่มีอีเมลซ้ำกับข้อมูลในระบบจะถูกข้ามอัตโนมัติ · ระบบจะสร้างรหัสตั๋ว QR ให้ทุกคน (ไม่ส่งอีเมลตั๋ว)
                </p>

                {importError && (
                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    นำเข้าไม่สำเร็จ ไม่มีข้อมูลใดถูกบันทึก — {importError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 text-xs font-semibold border border-white/10">
                    ยกเลิก
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {importing ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    นำเข้า {validRows.length.toLocaleString()} รายการ
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
