'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { Gift, ImagePlus, Plus, Save, Trash2 } from 'lucide-react';
import api, { Prize } from '@/lib/api';

const blank = (): Prize => ({ name: '', code: '', description: '', image: '', quantity: 1, is_active: true, sort_order: 0 });

export default function PrizeManager() {
  const [items, setItems] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | 'new' | null>(null);
  const [draft, setDraft] = useState<Prize>(blank());

  const load = async () => { try { setItems(await api.getPrizes()); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const readImage = (file: File, callback: (value: string) => void) => {
    if (file.size > 2 * 1024 * 1024) return Swal.fire('ไฟล์ใหญ่เกินไป', 'กรุณาใช้รูปภาพไม่เกิน 2 MB เช่น JPG หรือ PNG', 'warning');
    const reader = new FileReader(); reader.onload = () => callback(String(reader.result)); reader.readAsDataURL(file);
  };
  const validate = (item: Prize) => {
    if (!item.name.trim()) { Swal.fire('กรอกข้อมูลไม่ครบ', 'ชื่อของรางวัล: ตัวอย่าง “iPhone 16 Pro Max 256GB”', 'warning'); return false; }
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1) { Swal.fire('จำนวนไม่ถูกต้อง', 'จำนวนรางวัลต้องเป็นเลขจำนวนเต็มตั้งแต่ 1 ขึ้นไป เช่น 3', 'warning'); return false; }
    return true;
  };
  const save = async (item: Prize, index?: number) => {
    if (!validate(item)) return;
    const key = index === undefined ? 'new' : index; setSaving(key);
    try {
      if (item.prize_id) await api.updatePrize(item.prize_id, item); else await api.createPrize(item);
      if (index === undefined) setDraft(blank());
      await load(); await Swal.fire({ icon: 'success', title: 'บันทึกของรางวัลสำเร็จ', timer: 1400, showConfirmButton: false });
    } catch (e) { Swal.fire('บันทึกไม่สำเร็จ', e instanceof Error ? e.message : 'กรุณาตรวจสอบการเชื่อมต่อ', 'error'); }
    finally { setSaving(null); }
  };
  const remove = async (item: Prize) => {
    if (!item.prize_id) return;
    const result = await Swal.fire({ icon: 'warning', title: 'ลบของรางวัลนี้?', text: item.name, showCancelButton: true, confirmButtonText: 'ลบ', cancelButtonText: 'ยกเลิก', confirmButtonColor: '#e11d48' });
    if (!result.isConfirmed) return;
    try { await api.deletePrize(item.prize_id); await load(); Swal.fire({ icon: 'success', title: 'ลบแล้ว', timer: 1100, showConfirmButton: false }); }
    catch (e) { Swal.fire('ลบไม่สำเร็จ', e instanceof Error ? e.message : 'เกิดข้อผิดพลาด', 'error'); }
  };
  const field = 'w-full bg-[#060913]/65 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-400/60';
  const card = (item: Prize, setItem: (p: Prize) => void, index?: number) => <div className="rounded-3xl border border-white/10 bg-white/[.035] p-5 grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-5">
    <label className="relative h-40 rounded-2xl border border-dashed border-purple-400/30 bg-purple-500/5 overflow-hidden flex items-center justify-center cursor-pointer group">
      {item.image ? <img src={item.image} alt={item.name || 'ของรางวัล'} className="w-full h-full object-contain p-2" /> : <div className="text-center text-slate-500"><ImagePlus className="w-8 h-8 mx-auto mb-2"/><span className="text-xs">เพิ่มรูปภาพ</span></div>}
      <input type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && readImage(e.target.files[0], image => setItem({ ...item, image }))}/>
    </label>
    <div className="space-y-3">
      <div className="grid sm:grid-cols-[1fr_180px] gap-3"><input className={field} value={item.name} onChange={e => setItem({...item,name:e.target.value})} placeholder="ชื่อของรางวัล *"/><input className={field} value={item.code} onChange={e => setItem({...item,code:e.target.value})} placeholder="รหัส เช่น GRAND-01"/></div>
      <textarea className={`${field} min-h-20 resize-y`} value={item.description} onChange={e => setItem({...item,description:e.target.value})} placeholder="รายละเอียดของรางวัล เช่น สี ความจุ หรือเงื่อนไขการรับรางวัล"/>
      <div className="flex flex-wrap items-center gap-3"><label className="text-xs text-slate-400">จำนวน <input type="number" min="1" className="ml-2 w-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-white" value={item.quantity} onChange={e=>setItem({...item,quantity:Number(e.target.value)})}/></label><label className="flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={item.is_active} onChange={e=>setItem({...item,is_active:e.target.checked})}/> เปิดให้เลือกสุ่ม</label>{item.awarded_count !== undefined && <span className="text-xs text-cyan-300">แจกแล้ว {item.awarded_count}/{item.quantity}</span>}<div className="ml-auto flex gap-2"><button onClick={()=>save(item,index)} disabled={saving === (index ?? 'new')} className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-bold inline-flex gap-2"><Save className="w-4 h-4"/>บันทึก</button>{item.prize_id && <button onClick={()=>remove(item)} className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20"><Trash2 className="w-5 h-5"/></button>}</div></div>
    </div>
  </div>;
  return <div className="space-y-6"><div className="glass-panel rounded-3xl border border-white/10 p-6"><h2 className="text-xl font-extrabold text-white flex items-center gap-2"><Gift className="text-fuchsia-400"/>จัดการของรางวัล Lucky Draw</h2><p className="text-sm text-slate-400 mt-1">เพิ่มรูป รายละเอียด จำนวน และกำหนดรายการที่เจ้าหน้าที่สามารถเลือกใช้ในการสุ่ม</p></div>{card(draft,setDraft)}{loading ? <div className="text-center text-slate-500 py-10">กำลังโหลด...</div> : items.map((item,index)=> <div key={item.prize_id}>{card(item,p=>setItems(v=>v.map((x,i)=>i===index?p:x)),index)}</div>)}{items.length===0&&!loading&&<div className="text-center py-8 text-slate-500"><Plus className="mx-auto mb-2"/>ยังไม่มีของรางวัล กรุณาเพิ่มรายการแรกด้านบน</div>}</div>;
}
