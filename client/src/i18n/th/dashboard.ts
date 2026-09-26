// Thai UI text for the "dashboard" area (source of truth — en/dashboard.ts must mirror every key)
export const dashboard = {
  title: 'แดชบอร์ดจัดการข้อมูล (CMS)',
  subtitle: 'ระบบรายงานสถิติสดและบริหารจัดการรายชื่อผู้เข้าร่วมงานทั้งหมด',
  actions: {
    refresh: 'รีเฟรชข้อมูล',
    exportExcel: 'ส่งออก Excel',
    importExcel: 'นำเข้า Excel',
    addAttendee: 'เพิ่มผู้ร่วมงาน',
  },
  // Metric cards ("checked in" uses common.status.checkedIn)
  stats: {
    registered: 'ยอดลงทะเบียน',
    pending: 'รอดำเนินการ',
  },
  searchPlaceholder: 'ค้นหาชื่อ, บริษัท, หรืออีเมล...',
  table: {
    attendee: 'ผู้เข้าร่วมงาน',
    companyPosition: 'บริษัท / ตำแหน่ง',
    status: 'สถานะ',
    registeredAt: 'วันเวลาลงทะเบียน',
    actions: 'การจัดการ',
    loading: 'กำลังโหลดข้อมูลผู้ร่วมงาน...',
    empty: 'ไม่พบข้อมูลผู้ร่วมงานที่ตรงกับเงื่อนไขการค้นหา',
  },
  rowActions: {
    checkInNow: 'เช็คอินทันที',
    checkIn: 'สแกนเข้า',
    viewQr: 'ดู QR Code',
    edit: 'แก้ไขข้อมูล',
    delete: 'ลบข้อมูล',
  },
  confirmDelete: 'คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลผู้ร่วมงานรายนี้?',
  // "สแกนเข้า" button failed
  checkinFailed: {
    title: 'เช็คอินไม่สำเร็จ',
    already: 'ผู้ร่วมงานคนนี้เช็คอินไปแล้ว',
    notFound: 'ไม่พบรหัสตั๋วนี้ในระบบ',
    connection: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาลองใหม่',
  },
  pagination: {
    show: 'แสดงผล',
    perPage: 'รายการ / หน้า',
    pageOf: (page: number, total: number) => `หน้า ${page} จาก ${total}`,
  },
  // Add / edit attendee modals
  form: {
    addTitle: 'เพิ่มผู้เข้าร่วมงานใหม่',
    editTitle: 'แก้ไขข้อมูลผู้เข้าร่วมงาน',
    choosePhoto: 'ถ่าย/เลือกรูป',
    changePhoto: 'เปลี่ยนรูปภาพ',
    attendeeType: 'ประเภทผู้เข้าร่วมงาน',
    name: 'ชื่อ-นามสกุล',
    namePlaceholder: 'เช่น นัฐพงศ์ สิทธิโชค',
    company: 'บริษัท / องค์กร',
    companyPlaceholder: 'เช่น PTT Digital / KBTG',
    position: 'ตำแหน่งงาน',
    positionPlaceholder: 'เช่น Senior Tech Lead',
    email: 'อีเมล',
    phone: 'เบอร์โทรศัพท์',
    saveNew: 'บันทึกข้อมูลผู้เข้าร่วมงาน',
    saveEdit: 'บันทึกการแก้ไขข้อมูล',
  },
  crop: {
    zoom: 'ปรับขนาดรูปภาพ (ซูมเข้า-ออก)',
    confirm: 'ยืนยันรูปภาพ',
  },
  qr: {
    processing: 'กำลังประมวลผล...',
    save: 'บันทึกรูป QR Code',
  },
  // Extra columns of the "Export Excel" file. The name/company/position/email/phone
  // headers come from lib/participantImport.ts so the export can be imported back.
  exportColumns: {
    id: 'รหัส ID',
    status: 'สถานะ',
    ticketCode: 'รหัสตั๋ว',
    registeredAt: 'วันเวลาที่ลงทะเบียน',
    checkedInAt: 'วันเวลาที่เช็คอิน',
  },
};
