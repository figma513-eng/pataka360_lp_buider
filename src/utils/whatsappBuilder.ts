import type {
  BuilderProject,
  WhatsappCenterConfig,
  WhatsappLinkItem,
  WhatsappTemplate,
  WhatsappTemplateType,
} from '../types/builder.ts';

export const WHATSAPP_TEMPLATE_TYPE_LABELS: Record<WhatsappTemplateType, string> = {
  pesanan_baru: 'Pesanan Baru',
  checkout_keranjang: 'Checkout Keranjang',
  pendaftaran: 'Pendaftaran',
  booking: 'Booking',
  konsultasi: 'Konsultasi',
  templat_khusus: 'Templat Khusus',
};

export interface WhatsappVariableItem {
  token: string;
  key: string;
  label: string;
  fallback: string;
  sample: string;
}

export interface WhatsappVariableGroup {
  id: string;
  label: string;
  items: WhatsappVariableItem[];
}

export const WHATSAPP_VARIABLE_GROUPS: WhatsappVariableGroup[] = [
  {
    id: 'usaha',
    label: 'Usaha',
    items: [
      { token: '{{nama_usaha}}', key: 'nama_usaha', label: 'Nama Usaha', fallback: 'Usaha Kami', sample: 'Kedai Nusantara' },
      { token: '{{nomor_wa_usaha}}', key: 'nomor_wa_usaha', label: 'Nomor WA Usaha', fallback: '-', sample: '6281234567890' },
      { token: '{{info_usaha}}', key: 'info_usaha', label: 'Info Usaha', fallback: '-', sample: 'Buka Setiap Hari 08.00 - 21.00' },
      { token: '{{tautan_halaman}}', key: 'tautan_halaman', label: 'Tautan Halaman', fallback: '-', sample: 'https://usaha.id/p/kedai' },
    ],
  },
  {
    id: 'pelanggan',
    label: 'Pelanggan',
    items: [
      { token: '{{nama_pelanggan}}', key: 'nama_pelanggan', label: 'Nama Pelanggan', fallback: 'Pelanggan', sample: 'Budi Santoso' },
      { token: '{{nomor_hp}}', key: 'nomor_hp', label: 'Nomor Telepon', fallback: '-', sample: '081298765432' },
      { token: '{{email_pelanggan}}', key: 'email_pelanggan', label: 'Email Pelanggan', fallback: '-', sample: 'budi@contoh.id' },
      { token: '{{alamat_pelanggan}}', key: 'alamat_pelanggan', label: 'Alamat', fallback: '-', sample: 'Jl. Merdeka No. 12, Jakarta' },
    ],
  },
  {
    id: 'produk',
    label: 'Produk',
    items: [
      { token: '{{nama_produk}}', key: 'nama_produk', label: 'Nama Produk', fallback: 'Produk Pilihan', sample: 'Paket Kemitraan Premium' },
      { token: '{{harga_produk}}', key: 'harga_produk', label: 'Harga Produk', fallback: 'Rp 0', sample: 'Rp 250.000' },
      { token: '{{varian_produk}}', key: 'varian_produk', label: 'Varian Produk', fallback: '-', sample: 'Ukuran L / Hitam' },
      { token: '{{jumlah_produk}}', key: 'jumlah_produk', label: 'Jumlah', fallback: '1', sample: '2' },
    ],
  },
  {
    id: 'keranjang',
    label: 'Keranjang',
    items: [
      { token: '{{daftar_keranjang}}', key: 'daftar_keranjang', label: 'Daftar Item Keranjang', fallback: '-', sample: '1. Paket A (2x) - Rp 100.000\n2. Paket B (1x) - Rp 75.000' },
      { token: '{{total_item}}', key: 'total_item', label: 'Total Item', fallback: '0', sample: '3' },
      { token: '{{total_harga}}', key: 'total_harga', label: 'Total Harga', fallback: 'Rp 0', sample: 'Rp 175.000' },
    ],
  },
  {
    id: 'pesanan',
    label: 'Pesanan',
    items: [
      { token: '{{kode_pesanan}}', key: 'kode_pesanan', label: 'Kode Pesanan', fallback: '-', sample: 'ORD-240901' },
      { token: '{{metode_pengiriman}}', key: 'metode_pengiriman', label: 'Metode Pengiriman', fallback: '-', sample: 'Kurir Toko' },
      { token: '{{catatan_pesanan}}', key: 'catatan_pesanan', label: 'Catatan Pesanan', fallback: '-', sample: 'Mohon dikirim sebelum jam 15.00' },
    ],
  },
  {
    id: 'formulir',
    label: 'Formulir',
    items: [
      { token: '{{judul_formulir}}', key: 'judul_formulir', label: 'Judul Formulir', fallback: 'Formulir', sample: 'Formulir Konsultasi' },
      { token: '{{ringkasan_formulir}}', key: 'ringkasan_formulir', label: 'Ringkasan Isian Formulir', fallback: '-', sample: 'Nama: Budi Santoso\nNo. HP: 081298765432\nKebutuhan: Paket Bisnis' },
    ],
  },
  {
    id: 'pendaftaran',
    label: 'Pendaftaran',
    items: [
      { token: '{{nama_program}}', key: 'nama_program', label: 'Nama Program / Paket', fallback: 'Program Pilihan', sample: 'Pelatihan Sertifikasi Batch 5' },
      { token: '{{jadwal_pendaftaran}}', key: 'jadwal_pendaftaran', label: 'Jadwal / Tanggal', fallback: '-', sample: '15 Oktober 2026' },
      { token: '{{persetujuan_daftar}}', key: 'persetujuan_daftar', label: 'Daftar Persetujuan', fallback: '-', sample: 'Menyetujui syarat & ketentuan' },
    ],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    items: [
      { token: '{{tanggal_hari_ini}}', key: 'tanggal_hari_ini', label: 'Tanggal Hari Ini', fallback: '-', sample: '20 Nov 2026' },
      { token: '{{waktu_sekarang}}', key: 'waktu_sekarang', label: 'Waktu Sekarang', fallback: '-', sample: '10:30 WIB' },
      { token: '{{sumber_trafik}}', key: 'sumber_trafik', label: 'Sumber Trafik', fallback: 'Langsung', sample: 'Meta Ads' },
    ],
  },
];

const VARIABLE_FALLBACK_MAP: Record<string, string> = {};
const VARIABLE_SAMPLE_MAP: Record<string, string> = {};
for (const grp of WHATSAPP_VARIABLE_GROUPS) {
  for (const item of grp.items) {
    VARIABLE_FALLBACK_MAP[item.key] = item.fallback;
    VARIABLE_SAMPLE_MAP[item.key] = item.sample;
  }
}

export const WHATSAPP_EMOJI_SHORTCUTS = [
  '👋', '🙏', '✅', '🛒', '📦', '📋', '💳', '📍', '📅', '⏰', '🔥', '⭐', '💬', '✨',
];

export type WhatsappFormatAction =
  | 'bold'
  | 'italic'
  | 'strike'
  | 'monospace'
  | 'bullet_list'
  | 'numbered_list'
  | 'newline'
  | 'divider';

/**
 * Menerapkan pemformatan sintaks WhatsApp murni (tanpa HTML mentah).
 */
export function applyWhatsappFormat(
  text: string,
  selectionStart: number,
  selectionEnd: number,
  action: WhatsappFormatAction
): { nextText: string; nextCursor: number } {
  const safeText = String(text || '');
  const start = Math.max(0, Math.min(safeText.length, selectionStart));
  const end = Math.max(start, Math.min(safeText.length, selectionEnd));
  const before = safeText.slice(0, start);
  const selected = safeText.slice(start, end);
  const after = safeText.slice(end);

  const wrap = (prefix: string, suffix: string, placeholder: string) => {
    const inner = selected || placeholder;
    const inserted = `${prefix}${inner}${suffix}`;
    return {
      nextText: `${before}${inserted}${after}`,
      nextCursor: before.length + inserted.length,
    };
  };

  if (action === 'bold') return wrap('*', '*', 'teks tebal');
  if (action === 'italic') return wrap('_', '_', 'teks miring');
  if (action === 'strike') return wrap('~', '~', 'teks coret');
  if (action === 'monospace') return wrap('```', '```', 'kode');

  if (action === 'bullet_list') {
    const lines = (selected || 'Poin pertama\nPoin kedua')
      .split('\n')
      .map((l) => (l.trim().startsWith('- ') ? l : `- ${l.trim()}`))
      .join('\n');
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const inserted = `${prefix}${lines}`;
    return {
      nextText: `${before}${inserted}${after}`,
      nextCursor: before.length + inserted.length,
    };
  }

  if (action === 'numbered_list') {
    const lines = (selected || 'Langkah pertama\nLangkah kedua')
      .split('\n')
      .map((l, idx) => `${idx + 1}. ${l.replace(/^\d+\.\s*/, '').trim()}`)
      .join('\n');
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const inserted = `${prefix}${lines}`;
    return {
      nextText: `${before}${inserted}${after}`,
      nextCursor: before.length + inserted.length,
    };
  }

  if (action === 'divider') {
    const prefix = before && !before.endsWith('\n') ? '\n' : '';
    const inserted = `${prefix}----------------\n`;
    return {
      nextText: `${before}${inserted}${after}`,
      nextCursor: before.length + inserted.length,
    };
  }

  // newline
  return {
    nextText: `${before}\n${after}`,
    nextCursor: before.length + 1,
  };
}

/**
 * Membersihkan HTML mentah agar pesan WhatsApp selalu berbentuk teks + sintaks WA murni.
 */
export function sanitizeWhatsappMessageText(raw: string): string {
  return String(raw || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

export function normalizeWaPhone(raw?: string, defaultCountryCode = '62'): string {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }
  return digits;
}

/**
 * Mengganti semua variabel {{token}} dengan nilai aktual atau fallback bersih
 * sehingga tidak pernah ada token mentah {{...}} yang bocor ke pengguna akhir.
 */
export function renderWhatsappTemplate(
  templateBody: string,
  context: Record<string, string | number | undefined | null> = {},
  options?: { useSampleFallback?: boolean }
): string {
  const now = new Date();
  const baseContext: Record<string, string> = {
    tanggal_hari_ini: now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    waktu_sekarang: now.toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };

  for (const [k, v] of Object.entries(context)) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      baseContext[k] = String(v).trim();
    }
  }

  const cleaned = sanitizeWhatsappMessageText(templateBody);
  const lines = cleaned.split('\n');
  const renderedLines: string[] = [];

  for (const rawLine of lines) {
    let hadToken = false;
    let hadNonEmptyToken = false;

    const replaced = rawLine.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, keyRaw: string) => {
      hadToken = true;
      const key = String(keyRaw || '').trim().toLowerCase();
      const explicitProvided = Object.prototype.hasOwnProperty.call(context, key);
      if (baseContext[key] !== undefined && baseContext[key] !== '') {
        hadNonEmptyToken = true;
        return baseContext[key];
      }
      if (options?.useSampleFallback && VARIABLE_SAMPLE_MAP[key]) {
        hadNonEmptyToken = true;
        return VARIABLE_SAMPLE_MAP[key];
      }
      if (explicitProvided) {
        return '';
      }
      const fb = VARIABLE_FALLBACK_MAP[key];
      if (fb !== undefined && fb !== '' && fb !== '-') {
        hadNonEmptyToken = true;
        return fb;
      }
      return '';
    });

    if (hadToken && !hadNonEmptyToken) {
      const stripped = replaced
        .replace(/^[-*•\s]*[^:]+:\s*[*_~]*\s*$/, '')
        .trim();
      if (!stripped) {
        continue;
      }
    }

    renderedLines.push(replaced.replace(/[ \t]+$/g, ''));
  }

  return renderedLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function buildWhatsappSampleContext(
  center?: Partial<WhatsappCenterConfig>
): Record<string, string> {
  return {
    ...VARIABLE_SAMPLE_MAP,
    nama_usaha: center?.businessName?.trim() || VARIABLE_SAMPLE_MAP.nama_usaha,
    nomor_wa_usaha: center?.mainPhone?.trim() || VARIABLE_SAMPLE_MAP.nomor_wa_usaha,
    info_usaha: center?.businessInfo?.trim() || VARIABLE_SAMPLE_MAP.info_usaha,
  };
}

export function buildWaMeUrl(phone: string, message: string): string {
  const normalized = normalizeWaPhone(phone);
  const cleanMsg = sanitizeWhatsappMessageText(message);
  if (!normalized) {
    return `https://wa.me/?text=${encodeURIComponent(cleanMsg)}`;
  }
  return `https://wa.me/${normalized}?text=${encodeURIComponent(cleanMsg)}`;
}

export function createDefaultWhatsappTemplates(now = Date.now()): WhatsappTemplate[] {
  return [
    {
      id: 'wa_tpl_pesanan_baru',
      name: 'Pesanan Baru Standar',
      type: 'pesanan_baru',
      isDefault: true,
      updatedAt: now,
      body: [
        'Halo *{{nama_usaha}}* 👋',
        'Saya ingin memesan produk berikut:',
        '',
        '- Produk: *{{nama_produk}}*',
        '- Harga: {{harga_produk}}',
        '- Jumlah: {{jumlah_produk}}',
        '',
        'Nama: {{nama_pelanggan}}',
        'Catatan: {{catatan_pesanan}}',
      ].join('\n'),
    },
    {
      id: 'wa_tpl_checkout_keranjang',
      name: 'Checkout Keranjang',
      type: 'checkout_keranjang',
      isDefault: true,
      updatedAt: now,
      body: [
        'Halo *{{nama_usaha}}* 🛒',
        'Berikut ringkasan keranjang pesanan saya:',
        '',
        '{{daftar_keranjang}}',
        '----------------',
        'Total Item: {{total_item}}',
        '*Total Harga: {{total_harga}}*',
        '',
        'Nama: {{nama_pelanggan}}',
        'Pengiriman: {{metode_pengiriman}}',
      ].join('\n'),
    },
    {
      id: 'wa_tpl_pendaftaran',
      name: 'Pendaftaran Program',
      type: 'pendaftaran',
      isDefault: true,
      updatedAt: now,
      body: [
        'Halo *{{nama_usaha}}* 📋',
        'Saya ingin mendaftar program:',
        '- Program: *{{nama_program}}*',
        '- Jadwal: {{jadwal_pendaftaran}}',
        '',
        '{{ringkasan_formulir}}',
      ].join('\n'),
    },
    {
      id: 'wa_tpl_booking',
      name: 'Booking Jadwal',
      type: 'booking',
      isDefault: true,
      updatedAt: now,
      body: [
        'Halo *{{nama_usaha}}* 📅',
        'Saya ingin melakukan booking jadwal:',
        '- Layanan: *{{nama_produk}}*',
        '- Tanggal: {{jadwal_pendaftaran}}',
        '- Nama: {{nama_pelanggan}}',
        '- Nomor HP: {{nomor_hp}}',
      ].join('\n'),
    },
    {
      id: 'wa_tpl_konsultasi',
      name: 'Konsultasi Cepat',
      type: 'konsultasi',
      isDefault: true,
      updatedAt: now,
      body: [
        'Halo *{{nama_usaha}}* 💬',
        'Saya ingin berkonsultasi mengenai layanan yang tersedia.',
        '',
        '{{ringkasan_formulir}}',
      ].join('\n'),
    },
  ];
}

export function createDefaultWhatsappCenter(
  businessName = 'Usaha Aktif',
  mainPhone = ''
): WhatsappCenterConfig {
  const now = Date.now();
  const templates = createDefaultWhatsappTemplates(now);
  const links: WhatsappLinkItem[] = [
    {
      id: 'wa_link_utama',
      name: 'Admin Utama WhatsApp',
      functionType: 'konsultasi',
      phone: mainPhone,
      templateId: 'wa_tpl_konsultasi',
      active: true,
      updatedAt: now,
    },
  ];
  return {
    mainPhone,
    businessName,
    businessInfo: '',
    defaultTemplateByType: {
      pesanan_baru: 'wa_tpl_pesanan_baru',
      checkout_keranjang: 'wa_tpl_checkout_keranjang',
      pendaftaran: 'wa_tpl_pendaftaran',
      booking: 'wa_tpl_booking',
      konsultasi: 'wa_tpl_konsultasi',
    },
    templates,
    links,
    updatedAt: now,
  };
}

export function resolveWhatsappCenter(project?: Partial<BuilderProject>): WhatsappCenterConfig {
  const fallbackPhone = project?.adsConfig?.waAddonNumber || '';
  const fallbackName = project?.title || 'Usaha Aktif';
  const existing = project?.whatsappCenter;
  if (!existing) {
    return createDefaultWhatsappCenter(fallbackName, fallbackPhone);
  }
  const defaults = createDefaultWhatsappCenter(fallbackName, fallbackPhone);
  return {
    mainPhone: typeof existing.mainPhone === 'string' ? existing.mainPhone : defaults.mainPhone,
    businessName:
      typeof existing.businessName === 'string' && existing.businessName.trim()
        ? existing.businessName
        : defaults.businessName,
    businessInfo: typeof existing.businessInfo === 'string' ? existing.businessInfo : '',
    defaultTemplateByType: {
      ...defaults.defaultTemplateByType,
      ...(existing.defaultTemplateByType || {}),
    },
    templates:
      Array.isArray(existing.templates) && existing.templates.length > 0
        ? existing.templates
        : defaults.templates,
    links: Array.isArray(existing.links) ? existing.links : defaults.links,
    updatedAt: typeof existing.updatedAt === 'number' ? existing.updatedAt : Date.now(),
  };
}

/**
 * Menyelesaikan nomor tujuan + teks pesan final dari Pusat WhatsApp (Single Source of Truth)
 * berdasarkan whatsappLinkId, whatsappTemplateId, atau fungsi fallback.
 */
export function resolveWhatsappDispatch(params: {
  project?: Partial<BuilderProject>;
  waLinkId?: string;
  waTemplateId?: string;
  functionType?: WhatsappTemplateType;
  fallbackPhone?: string;
  fallbackMessage?: string;
  context?: Record<string, string | number | undefined | null>;
}): {
  phone: string;
  message: string;
  url: string;
  waLinkId?: string;
  waTemplateId?: string;
} {
  const center = resolveWhatsappCenter(params.project);
  const link = params.waLinkId
    ? center.links.find((l) => l.id === params.waLinkId && l.active)
    : undefined;

  const resolvedTemplateId =
    params.waTemplateId ||
    link?.templateId ||
    (params.functionType ? center.defaultTemplateByType[params.functionType] : undefined);

  const tpl = resolvedTemplateId
    ? center.templates.find((t) => t.id === resolvedTemplateId)
    : undefined;

  const phone = normalizeWaPhone(
    link?.phone || params.fallbackPhone || center.mainPhone || params.project?.adsConfig?.waAddonNumber || ''
  );

  const rawBody =
    link?.customMessage?.trim() ||
    tpl?.body ||
    params.fallbackMessage ||
    'Halo {{nama_usaha}}, saya ingin mendapatkan informasi lebih lanjut.';

  const mergedContext: Record<string, string | number | undefined | null> = {
    nama_usaha: center.businessName,
    nomor_wa_usaha: phone || center.mainPhone,
    info_usaha: center.businessInfo,
    ...params.context,
  };

  const message = renderWhatsappTemplate(rawBody, mergedContext);
  return {
    phone,
    message,
    url: buildWaMeUrl(phone, message),
    waLinkId: link?.id,
    waTemplateId: tpl?.id,
  };
}
