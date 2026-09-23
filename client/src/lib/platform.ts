// Contact for organizers interested in using this platform for their own event.
// This belongs to the platform (not a single event), so it is fixed here rather
// than in the per-event settings.
export const PLATFORM_CONTACT = {
  name: 'คุณภัทราอร อมรโอภาคุณ (ซีน)',
  phone: '0619522111',
  line: '0619522111',
  email: 'Phattraorn@gmail.com',
};

// 0619522111 → 061-952-2111 (other formats are returned unchanged)
export const formatThaiPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
  return phone;
};

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

// LINE IDs open via line.me; accepts "@official", "~id" or a plain id
export const lineHref = (line: string) => {
  const id = line.trim().replace(/^~/, '');
  return id.startsWith('@') ? `https://line.me/R/ti/p/${encodeURIComponent(id)}` : `https://line.me/ti/p/~${encodeURIComponent(id)}`;
};

export const isWebUrl = (url: string) => /^https?:\/\//i.test(url.trim());
