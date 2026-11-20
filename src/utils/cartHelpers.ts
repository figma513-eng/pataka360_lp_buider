import type {
  BlockContent,
  CatalogCartButtonSize,
  CatalogCustomerField,
  CatalogItem,
  CatalogProductType,
  CatalogShippingOptionConfig,
  ShippingMethodId,
  TrainingProgramItem,
} from '../types/builder.ts';

export type { CatalogCustomerField, CatalogShippingOptionConfig, ShippingMethodId };

export interface CartButtonMetrics {
  gridPadding: string;
  gridFontSize: number;
  gridRadius: number;
  gridGap: number;
  gridIconSize: number;
  iconBoxSize: number;
  iconBoxRadius: number;
  iconOnlySize: number;
  compactPadding: string;
  compactRadius: number;
  compactIconSize: number;
}

export function resolveCartButtonMetrics(
  size: CatalogCartButtonSize = 'md'
): CartButtonMetrics {
  if (size === 'sm') {
    return {
      gridPadding: '4px 8px',
      gridFontSize: 10,
      gridRadius: 6,
      gridGap: 4,
      gridIconSize: 11,
      iconBoxSize: 26,
      iconBoxRadius: 6,
      iconOnlySize: 12,
      compactPadding: '6px 8px',
      compactRadius: 6,
      compactIconSize: 12,
    };
  }
  if (size === 'lg') {
    return {
      gridPadding: '10px 12px',
      gridFontSize: 13,
      gridRadius: 10,
      gridGap: 6,
      gridIconSize: 15,
      iconBoxSize: 40,
      iconBoxRadius: 10,
      iconOnlySize: 17,
      compactPadding: '10px 13px',
      compactRadius: 10,
      compactIconSize: 16,
    };
  }
  return {
    gridPadding: '7px 10px',
    gridFontSize: 11,
    gridRadius: 8,
    gridGap: 5,
    gridIconSize: 13,
    iconBoxSize: 32,
    iconBoxRadius: 8,
    iconOnlySize: 14,
    compactPadding: '8px 10px',
    compactRadius: 8,
    compactIconSize: 14,
  };
}

export interface ShippingOption {
  id: ShippingMethodId;
  title: string;
  subtitle?: string;
}

export const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: 'makan_ditempat',
    title: 'Makan di tempat',
  },
  {
    id: 'ambil_sendiri',
    title: 'Ambil sendiri ke lokasi',
  },
  {
    id: 'kurir_sendiri',
    title: 'Pesan kurir sendiri',
  },
  {
    id: 'gosend_penjual',
    title: 'Dikirim Via Gosend Oleh Penjual',
  },
];

export const DEFAULT_SHIPPING_NOTE =
  'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).';

export const GOSEND_DEFAULT_CHECKLISTS: string[] = [
  'Bersedia mengirim lokasi akurat untuk pemesanan kurir',
  'Membayar Kurir Sendiri saat sampai, dan biaya akan dikirimkan via WA',
  'Penjual akan pesan kurir setelah pembayaran dan makanan telah siap',
  'Penjual mengirim tracking perjalanan kurir via WA',
];

const LEGACY_GOSEND_CHECKLIST_TEXT =
  'Penjual akan pesan kurir setelah pembayaran dan makanan telah siap dan mengirimkan tracking pengiriman via WA';

export const DEFAULT_CATALOG_SHIPPING_OPTIONS: CatalogShippingOptionConfig[] = [
  {
    id: 'makan_ditempat',
    enabled: true,
    label: 'Makan di tempat',
    askArrivalTime: true,
    arrivalTimeLabel: 'Waktu Kedatangan',
    arrivalTimePlaceholder: 'Contoh: 18:30 WIB',
    askGuestCount: true,
    guestCountLabel: 'Jumlah Orang',
    guestCountPlaceholder: 'Contoh: 4 orang',
    checklistEnabled: false,
    checklistText: '',
    checklistItems: [],
    noteTitle: 'Catatan:',
    noteText: 'Durasi masak ± 30 menit',
  },
  {
    id: 'ambil_sendiri',
    enabled: true,
    label: 'Ambil sendiri ke lokasi',
    askArrivalTime: true,
    arrivalTimeLabel: 'Diambil Jam Berapa',
    arrivalTimePlaceholder: 'Contoh: 17:00 WIB',
    askGuestCount: false,
    guestCountLabel: 'Jumlah Orang',
    guestCountPlaceholder: 'Contoh: 2 orang',
    checklistEnabled: false,
    checklistText: '',
    checklistItems: [],
    noteTitle: 'Catatan:',
    noteText: 'Durasi masak ± 30 menit',
  },
  {
    id: 'kurir_sendiri',
    enabled: true,
    label: 'Pesan kurir sendiri',
    askArrivalTime: false,
    arrivalTimeLabel: 'Waktu Pengiriman',
    arrivalTimePlaceholder: 'Contoh: 18:00 WIB',
    askGuestCount: false,
    guestCountLabel: 'Jumlah Orang',
    guestCountPlaceholder: 'Contoh: 1 orang',
    checklistEnabled: true,
    checklistText: 'Pesan kurir setelah pembayaran dan makanan telah siap',
    checklistItems: ['Pesan kurir setelah pembayaran dan makanan telah siap'],
    noteTitle: 'Catatan Penting:',
    noteText: 'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).',
  },
  {
    id: 'gosend_penjual',
    enabled: true,
    label: 'Dikirim Via Gosend Oleh Penjual',
    askArrivalTime: false,
    arrivalTimeLabel: 'Waktu Pengiriman',
    arrivalTimePlaceholder: 'Contoh: 18:00 WIB',
    askGuestCount: false,
    guestCountLabel: 'Jumlah Orang',
    guestCountPlaceholder: 'Contoh: 1 orang',
    checklistEnabled: true,
    checklistText: GOSEND_DEFAULT_CHECKLISTS.join('\n'),
    checklistItems: [...GOSEND_DEFAULT_CHECKLISTS],
    noteTitle: 'Catatan Penting:',
    noteText: 'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).',
  },
];

export function cloneDefaultCatalogShippingOptions(): CatalogShippingOptionConfig[] {
  return DEFAULT_CATALOG_SHIPPING_OPTIONS.map((opt) => ({
    ...opt,
    checklistItems: opt.checklistItems ? [...opt.checklistItems] : [],
  }));
}

export function resolveShippingOptionChecklistItems(
  opt: Pick<CatalogShippingOptionConfig, 'checklistItems' | 'checklistText'>
): string[] {
  if (Array.isArray(opt.checklistItems)) {
    return opt.checklistItems.map((s) => s.trim()).filter(Boolean);
  }
  const txt = (opt.checklistText ?? '').trim();
  if (!txt) return [];
  return txt
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveCatalogShippingOptions(
  content?: Pick<
    BlockContent,
    'catalogShippingOptions' | 'catalogPickupNote' | 'catalogShippingNote'
  >
): CatalogShippingOptionConfig[] {
  const saved = content?.catalogShippingOptions;
  if (Array.isArray(saved) && saved.length > 0) {
    return DEFAULT_CATALOG_SHIPPING_OPTIONS.map((def) => {
      const found = saved.find((s) => s && s.id === def.id);
      if (!found) {
        return {
          ...def,
          checklistItems: def.checklistItems ? [...def.checklistItems] : [],
        };
      }
      let resolvedChecklists: string[];
      if (Array.isArray(found.checklistItems)) {
        resolvedChecklists = [...found.checklistItems];
      } else {
        const legacyTxt = (found.checklistText ?? '').trim();
        if (
          found.id === 'gosend_penjual' &&
          (!legacyTxt || legacyTxt === LEGACY_GOSEND_CHECKLIST_TEXT)
        ) {
          resolvedChecklists = [...GOSEND_DEFAULT_CHECKLISTS];
        } else if (legacyTxt) {
          resolvedChecklists = legacyTxt
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
        } else {
          resolvedChecklists = def.checklistItems ? [...def.checklistItems] : [];
        }
      }
      return {
        ...def,
        ...found,
        enabled: found.enabled !== false,
        label:
          typeof found.label === 'string' && found.label.trim()
            ? found.label
            : def.label,
        askArrivalTime: found.askArrivalTime ?? def.askArrivalTime,
        arrivalTimeRequired: found.arrivalTimeRequired ?? def.arrivalTimeRequired ?? false,
        arrivalTimeLabel: found.arrivalTimeLabel ?? def.arrivalTimeLabel,
        arrivalTimePlaceholder:
          found.arrivalTimePlaceholder ?? def.arrivalTimePlaceholder,
        askGuestCount: found.askGuestCount ?? def.askGuestCount,
        guestCountRequired: found.guestCountRequired ?? def.guestCountRequired ?? false,
        guestCountLabel: found.guestCountLabel ?? def.guestCountLabel,
        guestCountPlaceholder:
          found.guestCountPlaceholder ?? def.guestCountPlaceholder,
        checklistEnabled: found.checklistEnabled ?? def.checklistEnabled,
        checklistRequired: found.checklistRequired ?? def.checklistRequired ?? false,
        checklistText: resolvedChecklists.join('\n'),
        checklistItems: resolvedChecklists,
        noteTitle: found.noteTitle ?? def.noteTitle,
        noteText: found.noteText ?? def.noteText,
      };
    });
  }

  const legacyPickup = content?.catalogPickupNote?.trim();
  const legacyShipNote = content?.catalogShippingNote?.trim();
  const isLegacyCustomShipNote =
    Boolean(legacyShipNote) &&
    legacyShipNote !== 'Biaya pesanan tidak termasuk biaya kirim maupun biaya kurir.' &&
    legacyShipNote !== DEFAULT_SHIPPING_NOTE;

  return DEFAULT_CATALOG_SHIPPING_OPTIONS.map((def) => {
    const base = {
      ...def,
      checklistItems: def.checklistItems ? [...def.checklistItems] : [],
    };
    if (def.id === 'ambil_sendiri' && legacyPickup) {
      return { ...base, noteText: legacyPickup };
    }
    if (
      (def.id === 'kurir_sendiri' || def.id === 'gosend_penjual') &&
      isLegacyCustomShipNote &&
      legacyShipNote
    ) {
      return { ...base, noteText: legacyShipNote };
    }
    return base;
  });
}

export function isDigitalProductType(pt?: string): boolean {
  return pt === 'digital' || pt === 'service';
}

export function isPhysicalProductType(pt?: string): boolean {
  return !isDigitalProductType(pt);
}

export function getDefaultCustomerFields(
  productType: CatalogProductType = 'physical'
): CatalogCustomerField[] {
  if (isDigitalProductType(productType)) {
    return [
      {
        id: 'cf_name',
        label: 'Nama Lengkap',
        placeholder: 'Masukkan nama lengkap',
        type: 'text',
        required: true,
      },
      {
        id: 'cf_email',
        label: 'Email Pengiriman File',
        placeholder: 'email@contoh.com',
        type: 'email',
        required: true,
      },
      {
        id: 'cf_phone',
        label: 'No. WhatsApp',
        placeholder: '08xxxxxxxxxx',
        type: 'tel',
        required: true,
      },
    ];
  }
  return [
    {
      id: 'cf_name',
      label: 'Nama Lengkap',
      placeholder: 'Masukkan nama lengkap',
      type: 'text',
      required: true,
    },
    {
      id: 'cf_phone',
      label: 'No. HP / WhatsApp',
      placeholder: '08xxxxxxxxxx',
      type: 'tel',
      required: true,
    },
    {
      id: 'cf_address',
      label: 'Alamat Lengkap',
      placeholder: 'Alamat lengkap pengiriman / patokan lokasi',
      type: 'textarea',
      required: false,
    },
    {
      id: 'cf_notes',
      label: 'Catatan Pesanan',
      placeholder: 'Catatan tambahan (opsional)',
      type: 'text',
      required: false,
    },
  ];
}

export function resolveCatalogCustomerFields(
  content?: Pick<BlockContent, 'catalogCustomerFields' | 'catalogProductType'>
): CatalogCustomerField[] {
  if (Array.isArray(content?.catalogCustomerFields)) {
    return content.catalogCustomerFields.map((f) => ({ ...f }));
  }
  return getDefaultCustomerFields(content?.catalogProductType ?? 'physical');
}

export function getDefaultTrainingFormFields(): CatalogCustomerField[] {
  return [
    {
      id: 'tf_name',
      label: 'Nama',
      placeholder: 'Masukkan nama lengkap',
      type: 'text',
      required: true,
    },
    {
      id: 'tf_address',
      label: 'Alamat',
      placeholder: 'Masukkan alamat lengkap / domisili',
      type: 'textarea',
      required: true,
    },
  ];
}

export function resolveTrainingFormFields(
  content?: Pick<BlockContent, 'trainingFormFields'>
): CatalogCustomerField[] {
  if (Array.isArray(content?.trainingFormFields)) {
    return content.trainingFormFields.map((f) => ({ ...f }));
  }
  return getDefaultTrainingFormFields();
}

export interface CartEntry {
  key: string;
  blockId: string;
  itemId: string;
  title: string;
  priceText: string;
  unitPrice: number;
  image: string;
  variant: string;
  qty: number;
  productType: CatalogProductType;
  pickupNote?: string;
}

export interface CustomerOrderInfo {
  name: string;
  phone: string;
  address: string;
  notes: string;
  customFields?: Array<{ label: string; value: string }>;
  shippingMethod?: ShippingMethodId;
  shippingOptionNumber?: number;
  shippingOptionLabel?: string;
  arrivalTimeLabel?: string;
  arrivalTime?: string;
  guestCountLabel?: string;
  guestCount?: string;
  checklistConfirmed?: boolean;
  checklistText?: string;
  checklistCheckedItems?: string[];
  pickupNote?: string;
  shippingNoteTitle?: string;
  shippingNote?: string;
}

export function resolveItemProductType(
  item: Pick<CatalogItem, 'productType'>,
  blockProductType: CatalogProductType = 'physical'
): CatalogProductType {
  if (
    item.productType === 'physical' ||
    item.productType === 'digital' ||
    item.productType === 'service'
  ) {
    return item.productType;
  }
  return blockProductType;
}

export function collectCartPickupNotes(
  entries: CartEntry[],
  blockPickupNote?: string
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  const pushUnique = (raw?: string) => {
    const cleaned = (raw ?? '').trim();
    if (!cleaned || seen.has(cleaned)) return;
    seen.add(cleaned);
    result.push(cleaned);
  };
  pushUnique(blockPickupNote);
  entries.forEach((entry) => pushUnique(entry.pickupNote));
  return result;
}

export function parseVariants(variants?: string): string[] {
  if (!variants) return [];
  return variants
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

export function parsePriceToNumber(priceStr: string): number {
  if (!priceStr) return 0;
  // Strip Indonesian decimal suffix like ",00" or ".00" if followed by exactly 2 digits at end after separator
  const cleaned = priceStr.trim().replace(/,\d{1,2}$/, '');
  const digits = cleaned.replace(/[^\d]/g, '');
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatRupiah(amount: number): string {
  return `Rp ${Math.max(0, Math.round(amount)).toLocaleString('id-ID')}`;
}

export function normalizeWhatsappNumber(raw?: string): string {
  const digits = (raw ?? '').replace(/[^\d]/g, '');
  if (!digits) return '6281234567890';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('8')) return `62${digits}`;
  return digits;
}

export function makeCartKey(blockId: string, itemId: string, variant = ''): string {
  return `${blockId}::${itemId}::${variant}`;
}

export function createCartEntry(
  blockId: string,
  item: CatalogItem,
  variant = '',
  qty = 1,
  blockProductType: CatalogProductType = 'physical'
): CartEntry {
  return {
    key: makeCartKey(blockId, item.id, variant),
    blockId,
    itemId: item.id,
    title: item.title,
    priceText: item.price,
    unitPrice: parsePriceToNumber(item.price),
    image: item.image,
    variant,
    qty: Math.max(1, qty),
    productType: resolveItemProductType(item, blockProductType),
    pickupNote: item.pickupNote?.trim() || undefined,
  };
}

export function buildWhatsappOrderUrl(params: {
  phone?: string;
  storeName?: string;
  intro?: string;
  items: CartEntry[];
  customer?: Partial<CustomerOrderInfo>;
}): string {
  const targetPhone = normalizeWhatsappNumber(params.phone);
  const storeName = (params.storeName ?? '').trim();
  const intro =
    (params.intro ?? '').trim() || 'Halo, saya ingin memesan produk berikut:';

  const lines: string[] = [];
  if (storeName) {
    lines.push(`*${storeName}*`);
  }
  lines.push(intro);
  lines.push('');

  let grandTotal = 0;
  let totalQty = 0;
  let hasNumericPrice = false;

  lines.push('*Daftar Produk & Jumlah Pesanan:*');
  params.items.forEach((entry, idx) => {
    const variantLabel = entry.variant ? ` (${entry.variant})` : '';
    const lineTotal = entry.unitPrice * entry.qty;
    totalQty += entry.qty;
    if (entry.unitPrice > 0) {
      hasNumericPrice = true;
      grandTotal += lineTotal;
      lines.push(
        `${idx + 1}. ${entry.title}${variantLabel} — Jumlah: ${entry.qty} (${formatRupiah(lineTotal)})`
      );
    } else {
      lines.push(
        `${idx + 1}. ${entry.title}${variantLabel} — Jumlah: ${entry.qty}${entry.priceText ? ` (${entry.priceText})` : ''}`
      );
    }
  });

  lines.push('');
  lines.push(`*Total Jumlah Pesanan: ${totalQty} pcs*`);
  if (hasNumericPrice) {
    lines.push(`*Total Estimasi: ${formatRupiah(grandTotal)}*`);
  }

  const c = params.customer;
  const customerLines: string[] = [];
  if (Array.isArray(c?.customFields) && c.customFields.length > 0) {
    c.customFields.forEach((cf) => {
      if (cf.value.trim()) {
        customerLines.push(`${cf.label.trim()}: ${cf.value.trim()}`);
      }
    });
  } else {
    if (c?.name?.trim()) customerLines.push(`Nama: ${c.name.trim()}`);
    if (c?.phone?.trim()) customerLines.push(`No. WA: ${c.phone.trim()}`);
    if (c?.address?.trim()) customerLines.push(`Alamat: ${c.address.trim()}`);
    if (c?.notes?.trim()) customerLines.push(`Catatan: ${c.notes.trim()}`);
  }

  const hasPhysical = params.items.some((entry) => isPhysicalProductType(entry.productType));
  let selectedOptionLabel = '';
  if (hasPhysical && c?.shippingMethod) {
    const optIndex = SHIPPING_OPTIONS.findIndex((o) => o.id === c.shippingMethod);
    const opt = optIndex >= 0 ? SHIPPING_OPTIONS[optIndex] : undefined;
    const displayNum = c.shippingOptionNumber ?? (optIndex >= 0 ? optIndex + 1 : 1);
    const displayTitle = c.shippingOptionLabel?.trim() || opt?.title || '';
    if (displayTitle) {
      selectedOptionLabel = `${displayNum}. ${displayTitle}`;
      customerLines.push(`Pilihan: ${selectedOptionLabel}`);
      if (c.arrivalTime?.trim()) {
        customerLines.push(
          `${(c.arrivalTimeLabel ?? 'Waktu').trim()}: ${c.arrivalTime.trim()}`
        );
      }
      if (c.guestCount?.trim()) {
        customerLines.push(
          `${(c.guestCountLabel ?? 'Jumlah Orang').trim()}: ${c.guestCount.trim()}`
        );
      }
      if (Array.isArray(c.checklistCheckedItems) && c.checklistCheckedItems.length > 0) {
        customerLines.push('Konfirmasi Checklist:');
        c.checklistCheckedItems.forEach((txt) => {
          if (txt.trim()) customerLines.push(`- [✓] ${txt.trim()}`);
        });
      } else if (c.checklistConfirmed && c.checklistText?.trim()) {
        customerLines.push(`Konfirmasi: [✓] ${c.checklistText.trim()}`);
      }
      if (c.pickupNote?.trim()) {
        customerLines.push(`Info Produk: ${c.pickupNote.trim()}`);
      }
      if (c.shippingNote?.trim()) {
        const noteHeading = (c.shippingNoteTitle?.trim() || 'Catatan:').replace(/:+$/, '');
        customerLines.push(`${noteHeading}: ${c.shippingNote.trim()}`);
      }
    }
  }

  if (customerLines.length > 0) {
    lines.push('');
    lines.push(selectedOptionLabel ? '*Data Pemesan & Pilihan:*' : '*Data Pemesan:*');
    lines.push(...customerLines);
  }

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
}

export function buildTrainingWhatsappUrl(params: {
  phone?: string;
  heading?: string;
  batch?: string;
  schedule?: string;
  intro?: string;
  program?: TrainingProgramItem | null;
  checkedChecklist?: string[];
  checklistStatus?: Array<{ label: string; checked: boolean }>;
  formEntries?: Array<{ label: string; value: string }>;
}): string {
  const targetPhone = normalizeWhatsappNumber(params.phone);
  const intro =
    (params.intro ?? '').trim() ||
    'Halo, saya ingin konsultasi mengenai program pelatihan berikut:';
  const lines: string[] = [];
  lines.push(intro);
  lines.push('');

  if (params.heading?.trim()) {
    lines.push(`*Nama Pelatihan:* ${params.heading.trim()}`);
  }
  if (params.batch?.trim()) {
    lines.push(`*Angkatan:* ${params.batch.trim()}`);
  }
  if (params.schedule?.trim()) {
    lines.push(`*Tanggal:* ${params.schedule.trim()}`);
  }

  if (params.program) {
    lines.push('');
    lines.push('*Biaya & Program:*');
    lines.push(`Program: ${params.program.title}`);
    if (params.program.subtitle?.trim()) {
      lines.push(`Info: ${params.program.subtitle.trim()}`);
    }
    if (params.program.originalPrice?.trim()) {
      lines.push(`Biaya Normal: ${params.program.originalPrice.trim()}`);
    }
    if (params.program.price?.trim()) {
      lines.push(`Biaya: ${params.program.price.trim()}`);
    }
    if (params.program.discountLabel?.trim()) {
      lines.push(`Potongan: ${params.program.discountLabel.trim()}`);
    }
    if (params.program.cashbackLabel?.trim()) {
      lines.push(`Cashback: ${params.program.cashbackLabel.trim()}`);
    }
  }

  const checklistRows =
    params.checklistStatus && params.checklistStatus.length > 0
      ? params.checklistStatus.filter((it) => it.label.trim())
      : (params.checkedChecklist ?? [])
          .filter((it) => it.trim())
          .map((it) => ({ label: it.trim(), checked: true }));

  if (checklistRows.length > 0) {
    lines.push('');
    lines.push('*Checklist Syarat Berkas:*');
    checklistRows.forEach((item) => {
      lines.push(`- [${item.checked ? '✓' : ' '}] ${item.label.trim()}`);
    });
  }

  const formRows = (params.formEntries ?? []).filter((f) => f.label.trim());
  if (formRows.length > 0) {
    lines.push('');
    lines.push('*Formulir:*');
    formRows.forEach((f) => {
      lines.push(`- ${f.label.trim()}: ${f.value.trim() || '-'}`);
    });
  }

  return `https://wa.me/${targetPhone}?text=${encodeURIComponent(lines.join('\n'))}`;
}
