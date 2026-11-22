import type { ButtonIconId } from '../types/builder.ts';
import { sanitizeExternalUrl } from './urlHelpers.ts';

export type ButtonIconCategory =
  | 'Semua'
  | 'Komunikasi'
  | 'Belanja'
  | 'Navigasi'
  | 'Media'
  | 'Informasi';

export interface ButtonIconMeta {
  id: ButtonIconId;
  label: string;
  svgInner: string;
  category?: Exclude<ButtonIconCategory, 'Semua'>;
}

export const BUTTON_ICON_CATEGORIES: ButtonIconCategory[] = [
  'Semua',
  'Komunikasi',
  'Belanja',
  'Navigasi',
  'Media',
  'Informasi',
];

const ICON_CATEGORY_MAP: Partial<Record<ButtonIconId, Exclude<ButtonIconCategory, 'Semua'>>> = {
  'message-circle': 'Komunikasi',
  whatsapp: 'Komunikasi',
  phone: 'Komunikasi',
  mail: 'Komunikasi',
  send: 'Komunikasi',
  users: 'Komunikasi',
  'share-2': 'Komunikasi',
  'shopping-bag': 'Belanja',
  'shopping-cart': 'Belanja',
  store: 'Belanja',
  tag: 'Belanja',
  ticket: 'Belanja',
  gift: 'Belanja',
  'credit-card': 'Belanja',
  wallet: 'Belanja',
  truck: 'Belanja',
  package: 'Belanja',
  home: 'Navigasi',
  'map-pin': 'Navigasi',
  navigation: 'Navigasi',
  globe: 'Navigasi',
  'external-link': 'Navigasi',
  'arrow-left': 'Navigasi',
  'chevron-left': 'Navigasi',
  download: 'Navigasi',
  image: 'Media',
  camera: 'Media',
  play: 'Media',
  music: 'Media',
  'file-text': 'Media',
  'book-open': 'Media',
  'graduation-cap': 'Informasi',
  award: 'Informasi',
  calendar: 'Informasi',
  clock: 'Informasi',
  user: 'Informasi',
  star: 'Informasi',
  heart: 'Informasi',
  sparkles: 'Informasi',
  'shield-check': 'Informasi',
  bell: 'Informasi',
  info: 'Informasi',
  'help-circle': 'Informasi',
  eye: 'Informasi',
};

export function getButtonIconCategory(id: ButtonIconId): Exclude<ButtonIconCategory, 'Semua'> {
  return ICON_CATEGORY_MAP[id] ?? 'Informasi';
}

export const BUTTON_ICON_LIST: ButtonIconMeta[] = [
  { id: 'none', label: 'Tanpa', svgInner: '' },
  {
    id: 'home',
    label: 'Home',
    svgInner:
      '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  },
  {
    id: 'message-circle',
    label: 'Chat',
    svgInner:
      '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    svgInner:
      '<path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21"/><path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1a5 5 0 0 0 5 5h1a.5.5 0 0 0 0-1h-1a.5.5 0 0 0 0 1"/>',
  },
  {
    id: 'phone',
    label: 'Kontak',
    svgInner:
      '<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>',
  },
  {
    id: 'mail',
    label: 'Email',
    svgInner:
      '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
  },
  {
    id: 'send',
    label: 'Kirim',
    svgInner:
      '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  },
  {
    id: 'map-pin',
    label: 'Lokasi',
    svgInner:
      '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  },
  {
    id: 'navigation',
    label: 'Rute',
    svgInner: '<polygon points="3 11 22 2 13 21 11 13 3 11"/>',
  },
  {
    id: 'shopping-bag',
    label: 'Belanja',
    svgInner:
      '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  },
  {
    id: 'shopping-cart',
    label: 'Keranjang',
    svgInner:
      '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  },
  {
    id: 'store',
    label: 'Toko',
    svgInner:
      '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  },
  {
    id: 'tag',
    label: 'Promo',
    svgInner:
      '<path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5" fill="currentColor"/>',
  },
  {
    id: 'ticket',
    label: 'Voucher',
    svgInner:
      '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>',
  },
  {
    id: 'gift',
    label: 'Hadiah',
    svgInner:
      '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  },
  {
    id: 'credit-card',
    label: 'Bayar',
    svgInner:
      '<rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>',
  },
  {
    id: 'wallet',
    label: 'Biaya',
    svgInner:
      '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  },
  {
    id: 'truck',
    label: 'Kurir',
    svgInner:
      '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  },
  {
    id: 'package',
    label: 'Paket',
    svgInner:
      '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  },
  {
    id: 'image',
    label: 'Foto',
    svgInner:
      '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
  },
  {
    id: 'camera',
    label: 'Kamera',
    svgInner:
      '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  },
  {
    id: 'play',
    label: 'Video',
    svgInner:
      '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  },
  {
    id: 'music',
    label: 'Audio',
    svgInner:
      '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  },
  {
    id: 'file-text',
    label: 'Berkas',
    svgInner:
      '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
  },
  {
    id: 'book-open',
    label: 'Modul',
    svgInner:
      '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  },
  {
    id: 'graduation-cap',
    label: 'Pelatihan',
    svgInner:
      '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  },
  {
    id: 'award',
    label: 'Sertifikat',
    svgInner:
      '<path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/>',
  },
  {
    id: 'calendar',
    label: 'Jadwal',
    svgInner:
      '<rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/>',
  },
  {
    id: 'clock',
    label: 'Jam',
    svgInner:
      '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  },
  {
    id: 'users',
    label: 'Grup',
    svgInner:
      '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  },
  {
    id: 'user',
    label: 'Profil',
    svgInner:
      '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  },
  {
    id: 'star',
    label: 'Favorit',
    svgInner:
      '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  },
  {
    id: 'heart',
    label: 'Suka',
    svgInner:
      '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  },
  {
    id: 'sparkles',
    label: 'Unggulan',
    svgInner:
      '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
  },
  {
    id: 'shield-check',
    label: 'Aman',
    svgInner:
      '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
  },
  {
    id: 'bell',
    label: 'Notif',
    svgInner:
      '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  },
  {
    id: 'info',
    label: 'Info',
    svgInner:
      '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  },
  {
    id: 'help-circle',
    label: 'Bantuan',
    svgInner:
      '<circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/>',
  },
  {
    id: 'eye',
    label: 'Lihat',
    svgInner:
      '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  },
  {
    id: 'globe',
    label: 'Web',
    svgInner:
      '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
  },
  {
    id: 'share-2',
    label: 'Bagikan',
    svgInner:
      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"/><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"/>',
  },
  {
    id: 'download',
    label: 'Unduh',
    svgInner:
      '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
  },
  {
    id: 'external-link',
    label: 'Tautan',
    svgInner:
      '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
  },
  {
    id: 'arrow-left',
    label: 'Kembali',
    svgInner: '<path d="m12 19-7-7 7-7"/><path d="M19 12H5"/>',
  },
  {
    id: 'chevron-left',
    label: 'Panah Kiri',
    svgInner: '<path d="m15 18-6-6 6-6"/>',
  },
];

export const BUTTON_ICONS_MAP: Record<ButtonIconId, ButtonIconMeta> = BUTTON_ICON_LIST.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ButtonIconId, ButtonIconMeta>
);

export function resolveButtonIcon(explicitIcon?: ButtonIconId, label?: string): ButtonIconId {
  if (explicitIcon) return explicitIcon;
  if (label && /whatsapp|wa\b/i.test(label)) {
    return 'whatsapp';
  }
  if (label && /chat|pesan|tanya|konsultasi|admin|cs/i.test(label)) {
    return 'message-circle';
  }
  if (label && /lokasi|maps|alamat|tempat|rute/i.test(label)) {
    return 'map-pin';
  }
  return 'none';
}

export function sanitizeIconUrl(raw?: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml);/i.test(trimmed)) {
    return trimmed;
  }
  return sanitizeExternalUrl(trimmed, '');
}

function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function renderButtonIconSvgString(
  iconId: ButtonIconId,
  size = 16,
  iconUrl?: string
): string {
  const safeUrl = sanitizeIconUrl(iconUrl);
  if (safeUrl) {
    return `<img src="${escapeHtmlAttr(safeUrl)}" alt="" referrerpolicy="no-referrer" style="width:${size}px; height:${size}px; object-fit:contain; flex-shrink:0; display:block;" />`;
  }
  if (!iconId || iconId === 'none') return '';
  const meta = BUTTON_ICONS_MAP[iconId];
  if (!meta || !meta.svgInner) return '';
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;" aria-hidden="true">${meta.svgInner}</svg>`;
}
