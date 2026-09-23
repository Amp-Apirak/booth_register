'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';
import { FileImage, ImagePlus, Save, Trash2 } from 'lucide-react';
import Cropper from 'react-easy-crop';
import api from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import getCroppedImg from '@/lib/cropImage';

type CropTarget = 'hero' | 'brochure';

export default function RegistrationPageManager() {
  const { settings, updateSettingsContext } = useSettings();
  const [hero, setHero] = useState(settings.registration_hero_image || '');
  const [brochure, setBrochure] = useState(settings.registration_brochure_image || '');
  const [intro, setIntro] = useState(settings.registration_intro || '');
  const [objectives, setObjectives] = useState(settings.registration_objectives || '');
  const [terms, setTerms] = useState(settings.registration_terms || '');
  const [saving, setSaving] = useState(false);
  const [cropTarget, setCropTarget] = useState<CropTarget | null>(null);
  const [imageToCrop, setImageToCrop] = useState('');
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  const loadImage = (file: File, target: CropTarget) => {
    if (file.size > 5 * 1024 * 1024) { Swal.fire('ไฟล์ใหญ่เกินไป', 'กรุณาใช้ไฟล์ JPG, PNG หรือ WebP ขนาดไม่เกิน 5 MB', 'warning'); return; }
    const reader = new FileReader(); reader.onload = () => { setImageToCrop(String(reader.result)); setCropTarget(target); setCrop({x:0,y:0}); setZoom(1); }; reader.readAsDataURL(file);
  };
  const confirmCrop = async () => {
    if (!cropTarget || !cropPixels) return;
    try { const result = await getCroppedImg(imageToCrop, cropPixels); if (cropTarget === 'hero') setHero(result); else setBrochure(result); setCropTarget(null); }
    catch { Swal.fire('ปรับภาพไม่สำเร็จ', 'กรุณาลองเลือกไฟล์ภาพใหม่', 'error'); }
  };
  const save = async () => {
    setSaving(true);
    const payload = { registration_hero_image: hero, registration_brochure_image: brochure, registration_intro: intro, registration_objectives: objectives, registration_terms: terms };
    try { await api.updateSettings(payload); updateSettingsContext(payload); await Swal.fire({ icon: 'success', title: 'บันทึกหน้าลงทะเบียนแล้ว', timer: 1500, showConfirmButton: false }); }
    catch (e) { Swal.fire('บันทึกไม่สำเร็จ', e instanceof Error ? e.message : 'กรุณาตรวจสอบการเชื่อมต่อ', 'error'); }
    finally { setSaving(false); }
  };
  const upload = (title: string, value: string, setter: (value: string) => void, ratio: string, target: CropTarget) => <div className="space-y-3">
    <div className="flex items-center justify-between"><label className="font-bold text-white flex items-center gap-2"><FileImage className="w-5 h-5 text-cyan-300"/>{title}</label>{value && <button onClick={()=>setter('')} className="text-xs text-rose-300 flex gap-1"><Trash2 className="w-4 h-4"/>ลบภาพ</button>}</div>
    <label className={`relative ${ratio} rounded-xl border border-dashed border-indigo-300/30 bg-black/20 overflow-hidden flex items-center justify-center cursor-pointer group`}>
      {value ? <img src={value} alt={title} className="w-full h-full object-cover"/> : <div className="text-center text-slate-500"><ImagePlus className="w-10 h-10 mx-auto mb-2 group-hover:text-cyan-300 transition-colors"/><span className="text-sm">คลิกเพื่ออัปโหลดและปรับตำแหน่งภาพ</span><small className="block mt-1">JPG, PNG, WebP ไม่เกิน 5 MB</small></div>}
      <input type="file" accept="image/png,image/jpeg,image/webp" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e=>e.target.files?.[0]&&loadImage(e.target.files[0],target)}/>
    </label>
  </div>;
  const textarea = 'w-full min-h-32 bg-[#060913]/65 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400/60 resize-y leading-relaxed';
  return <div className="space-y-6">
    <div className="glass-panel rounded-3xl p-6 border border-white/10"><h2 className="text-2xl font-extrabold text-white">เนื้อหาหน้าลงทะเบียน</h2><p className="text-sm text-slate-400 mt-1">จัดภาพประชาสัมพันธ์ รายละเอียด วัตถุประสงค์ และเงื่อนไขที่ผู้สมัครจะเห็นก่อนลงทะเบียน</p></div>
    <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white/10 space-y-8">{upload('ภาพกิจกรรมหลักด้านบน (Hero Banner)',hero,setHero,'aspect-[16/7]', 'hero')}{upload('ภาพโบรชัวร์ด้านล่าง',brochure,setBrochure,'aspect-[4/5] max-w-2xl', 'brochure')}
      <div className="grid lg:grid-cols-2 gap-5"><label className="space-y-2"><span className="font-bold text-white">คำแนะนำเกี่ยวกับงาน</span><textarea className={textarea} value={intro} onChange={e=>setIntro(e.target.value)} placeholder="แนะนำภาพรวมและจุดเด่นของงาน..."/></label><label className="space-y-2"><span className="font-bold text-white">วัตถุประสงค์ของงาน</span><textarea className={textarea} value={objectives} onChange={e=>setObjectives(e.target.value)} placeholder={'หนึ่งหัวข้อต่อหนึ่งบรรทัด เช่น\nพบกับผู้เชี่ยวชาญด้านเทคโนโลยี\nสร้างเครือข่ายทางธุรกิจ'}/></label></div>
      <label className="space-y-2 block"><span className="font-bold text-white">เงื่อนไขและข้อมูลสำคัญ</span><textarea className={textarea} value={terms} onChange={e=>setTerms(e.target.value)} placeholder={'หนึ่งเงื่อนไขต่อหนึ่งบรรทัด เช่น\nกรุณานำ QR Code มาแสดง ณ จุดลงทะเบียน\nสงวนสิทธิ์เฉพาะผู้ลงทะเบียนล่วงหน้า'}/></label>
      <button onClick={save} disabled={saving} className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 text-white font-extrabold flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"><Save className="w-5 h-5"/>{saving?'กำลังบันทึก...':'บันทึกเนื้อหาหน้าลงทะเบียน'}</button>
    </div>
    {cropTarget && <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col"><div className="p-5 text-center"><h3 className="text-xl font-extrabold text-white">ปรับขนาดและตำแหน่ง{cropTarget==='hero'?'ภาพ Hero Banner':'ภาพโบรชัวร์'}</h3><p className="text-sm text-slate-400">เลื่อนภาพและซูมจนเนื้อหาสำคัญอยู่ภายในกรอบ</p></div><div className="relative flex-1 min-h-[320px]"><Cropper image={imageToCrop} crop={crop} zoom={zoom} aspect={cropTarget==='hero'?16/7:4/5} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_,pixels)=>setCropPixels(pixels)} objectFit="cover" showGrid/></div><div className="p-5 sm:p-6 bg-[#090d16] border-t border-white/10"><div className="max-w-xl mx-auto space-y-4"><label className="text-sm text-slate-300 flex items-center gap-4"><span>ซูม</span><input type="range" min="1" max="3" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="flex-1 accent-cyan-400"/><strong>{zoom.toFixed(1)}×</strong></label><div className="grid grid-cols-2 gap-3"><button onClick={()=>setCropTarget(null)} className="py-3 rounded-xl bg-white/5 text-slate-300 border border-white/10">ยกเลิก</button><button onClick={confirmCrop} className="py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold">ใช้ภาพนี้</button></div></div></div></div>}
  </div>;
}
