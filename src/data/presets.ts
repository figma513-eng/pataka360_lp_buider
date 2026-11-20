import type {
  AdvanceOptions,
  BlockStyle,
  BlockType,
  BottomNavbarConfig,
  BottomNavbarItem,
  BuilderBlock,
  BuilderProject,
  CarouselItem,
  CatalogItem,
  CategoryJumpItem,
  FnbMenuItem,
  PageTheme,
  PrebuiltSectionCategory,
  ShadowPreset,
  ShowcaseCardVariant,
  SocialFollowerAccount,
  SocialLinkItem,
  SocialPostItem,
  TrainingCustomBox,
  TrainingMediaItem,
  TrainingProgramItem,
} from '../types/builder.ts';
import {
  cloneDefaultCatalogShippingOptions,
  getDefaultCustomerFields,
  getDefaultTrainingFormFields,
} from '../utils/cartHelpers.ts';

let idCounter = 100;
export function createId(prefix = 'blk'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export const STARTER_ILLUSTRATION_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" fill="none">
    <rect width="320" height="220" rx="20" fill="#F8FAFC"/>
    <circle cx="160" cy="96" r="52" fill="#E0E7FF"/>
    <rect x="118" y="64" width="84" height="64" rx="14" fill="#2563EB"/>
    <rect x="130" y="76" width="60" height="10" rx="5" fill="#93C5FD"/>
    <rect x="130" y="94" width="42" height="8" rx="4" fill="#DBEAFE"/>
    <rect x="130" y="108" width="28" height="8" rx="4" fill="#EFF6FF"/>
    <circle cx="212" cy="64" r="14" fill="#F59E0B"/>
    <path d="M207 64L211 68L218 60" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="160" y="182" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#0F172A">Katalog Digital</text>
  </svg>`);

export const PRODUCT_CARD_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="none">
    <rect width="320" height="180" rx="14" fill="#EFF6FF"/>
    <rect x="44" y="34" width="232" height="112" rx="12" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="2"/>
    <rect x="64" y="54" width="76" height="72" rx="8" fill="#2563EB"/>
    <rect x="156" y="58" width="96" height="12" rx="6" fill="#1E293B"/>
    <rect x="156" y="80" width="74" height="8" rx="4" fill="#94A3B8"/>
    <rect x="156" y="102" width="60" height="22" rx="6" fill="#2563EB"/>
  </svg>`);

export const CAROUSEL_SAMPLE_1_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1D4ED8"/>
        <stop offset="1" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g1)"/>
    <circle cx="315" cy="95" r="78" fill="#3B82F6" fill-opacity="0.35"/>
    <rect x="64" y="116" width="272" height="168" rx="22" fill="#FFFFFF" fill-opacity="0.14" stroke="#93C5FD" stroke-opacity="0.45" stroke-width="2"/>
    <circle cx="144" cy="186" r="24" fill="#FDE047"/>
    <path d="M92 260L164 196L220 242L264 206L308 260H92Z" fill="#DBEAFE" fill-opacity="0.9"/>
  </svg>`);

export const CAROUSEL_SAMPLE_2_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
    <defs>
      <linearGradient id="g2" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
        <stop stop-color="#059669"/>
        <stop offset="1" stop-color="#064E3B"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g2)"/>
    <circle cx="96" cy="310" r="88" fill="#34D399" fill-opacity="0.28"/>
    <rect x="76" y="100" width="248" height="200" rx="24" fill="#FFFFFF" fill-opacity="0.16" stroke="#A7F3D0" stroke-opacity="0.5" stroke-width="2"/>
    <rect x="112" y="138" width="176" height="22" rx="11" fill="#ECFDF5"/>
    <rect x="112" y="176" width="132" height="14" rx="7" fill="#A7F3D0" fill-opacity="0.85"/>
    <rect x="112" y="216" width="110" height="40" rx="12" fill="#10B981"/>
  </svg>`);

export const CAROUSEL_SAMPLE_3_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
    <defs>
      <linearGradient id="g3" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
        <stop stop-color="#D97706"/>
        <stop offset="1" stop-color="#7C2D12"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g3)"/>
    <circle cx="290" cy="110" r="90" fill="#FBBF24" fill-opacity="0.3"/>
    <rect x="82" y="112" width="236" height="176" rx="22" fill="#FFFFFF" fill-opacity="0.15" stroke="#FDE68A" stroke-opacity="0.5" stroke-width="2"/>
    <circle cx="200" cy="186" r="38" fill="#FEF3C7"/>
    <path d="M188 172L218 186L188 200V172Z" fill="#B45309"/>
    <rect x="130" y="242" width="140" height="12" rx="6" fill="#FEF3C7" fill-opacity="0.85"/>
  </svg>`);

export const MAPS_LOCATION_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" fill="none">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
        <stop stop-color="#CBD5E1"/>
        <stop offset="1" stop-color="#E2E8F0"/>
      </linearGradient>
    </defs>
    <rect width="480" height="270" fill="url(#sky)"/>
    <path d="M0 175 L480 175 L480 270 L0 270 Z" fill="#94A3B8"/>
    <path d="M35 270 L175 165 L305 165 L445 270 Z" fill="#CBD5E1"/>
    <rect x="172" y="34" width="136" height="128" rx="6" fill="#16A34A" stroke="#15803D" stroke-width="3"/>
    <rect x="70" y="92" width="102" height="70" rx="4" fill="#22C55E" stroke="#15803D" stroke-width="2"/>
    <rect x="86" y="108" width="70" height="44" rx="2" fill="#1E293B"/>
    <rect x="190" y="52" width="26" height="22" rx="2" fill="#E2E8F0"/>
    <rect x="227" y="52" width="26" height="22" rx="2" fill="#E2E8F0"/>
    <rect x="264" y="52" width="26" height="22" rx="2" fill="#E2E8F0"/>
    <rect x="190" y="88" width="100" height="20" rx="3" fill="#FFFFFF"/>
    <rect x="198" y="94" width="84" height="8" rx="2" fill="#2563EB"/>
    <rect x="202" y="122" width="76" height="40" rx="2" fill="#0F172A" fill-opacity="0.7"/>
    <rect x="278" y="142" width="24" height="16" rx="4" fill="#FFFFFF" stroke="#64748B" stroke-width="1.5"/>
    <circle cx="388" cy="116" r="32" fill="#15803D"/>
    <circle cx="388" cy="88" r="24" fill="#16A34A"/>
    <rect x="384" y="142" width="8" height="26" fill="#78350F"/>
    <path d="M225 220 L235 215 L230 225 Z" fill="#FFFFFF"/>
    <path d="M255 220 L245 215 L250 225 Z" fill="#FFFFFF"/>
  </svg>`);

export const HERO_COVER_WARM_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320" fill="none">
    <defs>
      <linearGradient id="hc1" x1="0" y1="0" x2="600" y2="320" gradientUnits="userSpaceOnUse">
        <stop stop-color="#3F1D0B"/>
        <stop offset="0.55" stop-color="#5C2B10"/>
        <stop offset="1" stop-color="#1C0C05"/>
      </linearGradient>
    </defs>
    <rect width="600" height="320" fill="url(#hc1)"/>
    <circle cx="90" cy="40" r="22" fill="#FBBF24" fill-opacity="0.28"/>
    <circle cx="210" cy="36" r="18" fill="#FDE68A" fill-opacity="0.24"/>
    <circle cx="330" cy="44" r="24" fill="#F59E0B" fill-opacity="0.26"/>
    <circle cx="470" cy="38" r="20" fill="#FBBF24" fill-opacity="0.24"/>
    <ellipse cx="300" cy="285" rx="230" ry="62" fill="#92400E" fill-opacity="0.35"/>
    <circle cx="155" cy="245" r="46" fill="#EA580C" fill-opacity="0.5"/>
    <circle cx="300" cy="235" r="54" fill="#D97706" fill-opacity="0.48"/>
    <circle cx="445" cy="248" r="44" fill="#B45309" fill-opacity="0.48"/>
  </svg>`);

export const HERO_LOGO_FOOD_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
    <circle cx="80" cy="80" r="80" fill="#FFFFFF"/>
    <path d="M48 82C48 100 62 114 80 114C98 114 112 100 112 82H48Z" fill="#EA580C"/>
    <rect x="64" y="117" width="32" height="5" rx="2.5" fill="#EA580C"/>
    <rect x="68" y="42" width="6" height="34" rx="3" fill="#0F172A"/>
    <rect x="90" y="42" width="5" height="34" rx="2.5" fill="#EA580C"/>
    <path d="M84 42V58C84 62 87 65 92.5 65C98 65 101 62 101 58V42" stroke="#EA580C" stroke-width="4" stroke-linecap="round"/>
  </svg>`);

export const DEFAULT_FNB_ITEMS: FnbMenuItem[] = [
  {
    id: 'fnb_1',
    title: 'Nasi Goreng Spesial',
    description: 'Nasi goreng ayam, telur, acar, dan kerupuk.',
    category: 'Favorit',
    badge: 'Best seller',
    price: 'Rp 25.000',
    image: '',
    monogram: 'NA',
    monogramBg: '#FEE2E2',
    monogramColor: '#B91C1C',
  },
  {
    id: 'fnb_2',
    title: 'Ayam Bakar Madu',
    description: 'Ayam bakar bumbu manis gurih dengan sambal dan lalapan.',
    category: 'Favorit',
    badge: 'Paket lengkap',
    price: 'Rp 35.000',
    image: '',
    monogram: 'AY',
    monogramBg: '#FFEDD5',
    monogramColor: '#C2410C',
  },
  {
    id: 'fnb_3',
    title: 'Mie Tek-Tek Goreng',
    description: 'Mie goreng sayur dengan telur dan suwiran ayam.',
    category: 'Makanan',
    badge: 'Cepat dibuat',
    price: 'Rp 20.000',
    image: '',
    monogram: 'MI',
    monogramBg: '#FEF9C3',
    monogramColor: '#A16207',
  },
  {
    id: 'fnb_4',
    title: 'Es Kopi Susu Aren',
    description: 'Espresso blend segar dengan susu creamy dan gula aren murni.',
    category: 'Minuman',
    badge: 'Segar',
    price: 'Rp 18.000',
    image: '',
    monogram: 'KO',
    monogramBg: '#E0F2FE',
    monogramColor: '#0369A1',
  },
];

export const DEFAULT_CATEGORY_BUTTONS: CategoryJumpItem[] = [
  { id: 'cat_fav', label: 'Favorit', targetTitle: 'Favorit' },
  { id: 'cat_food', label: 'Makanan', targetTitle: 'Makanan' },
  { id: 'cat_drink', label: 'Minuman', targetTitle: 'Minuman' },
  { id: 'cat_pack', label: 'Paket Hemat', targetTitle: 'Paket Hemat' },
  { id: 'cat_snack', label: 'Cemilan', targetTitle: 'Cemilan' },
];

export const THEMES: PageTheme[] = [
  // Inspirasi Brand Populer
  {
    id: 'lynk-emerald',
    name: 'Lynk.id Emerald',
    category: 'brand',
    brandSource: 'lynk.id',
    canvasBg: '#F4FBF8',
    cardBg: '#FFFFFF',
    textColor: '#0F172A',
    accentColor: '#10B981',
    borderColor: '#D1FAE5',
  },
  {
    id: 'lynk-dark',
    name: 'Lynk.id Dark Mint',
    category: 'brand',
    brandSource: 'lynk.id',
    canvasBg: '#091511',
    cardBg: '#11241E',
    textColor: '#ECFDF5',
    accentColor: '#10B981',
    borderColor: '#1E3F35',
  },
  {
    id: 'shopee-orange',
    name: 'Shopee Oranye',
    category: 'brand',
    brandSource: 'shopee.co.id',
    canvasBg: '#FFF7F5',
    cardBg: '#FFFFFF',
    textColor: '#222222',
    accentColor: '#EE4D2D',
    borderColor: '#FCDAD2',
  },
  {
    id: 'shopee-flash',
    name: 'Shopee Coral Bold',
    category: 'brand',
    brandSource: 'shopee.co.id',
    canvasBg: '#FFECE8',
    cardBg: '#FFFFFF',
    textColor: '#2B1410',
    accentColor: '#D73211',
    borderColor: '#F8C4B8',
  },
  {
    id: 'tiket-blue',
    name: 'tiket.com Biru',
    category: 'brand',
    brandSource: 'tiket.com',
    canvasBg: '#F2F6FF',
    cardBg: '#FFFFFF',
    textColor: '#111827',
    accentColor: '#0064D2',
    borderColor: '#D6E4FF',
  },
  {
    id: 'tiket-night',
    name: 'tiket.com Navy',
    category: 'brand',
    brandSource: 'tiket.com',
    canvasBg: '#081833',
    cardBg: '#10274D',
    textColor: '#F8FAFC',
    accentColor: '#2E86FF',
    borderColor: '#1E3B6E',
  },
  {
    id: 'traveloka-sky',
    name: 'Traveloka Biru Langit',
    category: 'brand',
    brandSource: 'traveloka.com',
    canvasBg: '#EDF7FE',
    cardBg: '#FFFFFF',
    textColor: '#03121A',
    accentColor: '#0194F3',
    borderColor: '#C5E4FA',
  },
  {
    id: 'traveloka-deep',
    name: 'Traveloka Samudra',
    category: 'brand',
    brandSource: 'traveloka.com',
    canvasBg: '#052642',
    cardBg: '#0B365C',
    textColor: '#F0F9FF',
    accentColor: '#1BA0E2',
    borderColor: '#184F7D',
  },
  // Tema Dasar & Minimalis
  {
    id: 'minimal-light',
    name: 'Putih Minimalis',
    category: 'basic',
    canvasBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    textColor: '#0F172A',
    accentColor: '#2563EB',
    borderColor: '#E2E8F0',
  },
  {
    id: 'soft-lavender',
    name: 'Lavender Lembut',
    category: 'basic',
    canvasBg: '#F5F3FF',
    cardBg: '#FFFFFF',
    textColor: '#1E1B4B',
    accentColor: '#4F46E5',
    borderColor: '#E0E7FF',
  },
  {
    id: 'warm-sand',
    name: 'Krem Hangat',
    category: 'basic',
    canvasBg: '#FAF7F2',
    cardBg: '#FFFFFF',
    textColor: '#292524',
    accentColor: '#D97706',
    borderColor: '#E7E5E4',
  },
  {
    id: 'mint-fresh',
    name: 'Hijau Segar',
    category: 'basic',
    canvasBg: '#F0FDF4',
    cardBg: '#FFFFFF',
    textColor: '#064E3B',
    accentColor: '#059669',
    borderColor: '#D1FAE5',
  },
  {
    id: 'midnight-slate',
    name: 'Gelap Elegan',
    category: 'basic',
    canvasBg: '#0F172A',
    cardBg: '#1E293B',
    textColor: '#F8FAFC',
    accentColor: '#3B82F6',
    borderColor: '#334155',
  },
  // Tema Tambahan & Estetik
  {
    id: 'tokopedia-green',
    name: 'Hijau Marketplace',
    category: 'aesthetic',
    canvasBg: '#F2FAF4',
    cardBg: '#FFFFFF',
    textColor: '#14261C',
    accentColor: '#00AA5B',
    borderColor: '#C8EBD2',
  },
  {
    id: 'rose-blush',
    name: 'Rose Pastel',
    category: 'aesthetic',
    canvasBg: '#FFF5F7',
    cardBg: '#FFFFFF',
    textColor: '#3B0D1C',
    accentColor: '#E11D48',
    borderColor: '#FECDD3',
  },
  {
    id: 'sunset-coral',
    name: 'Senja Tropis',
    category: 'aesthetic',
    canvasBg: '#FFF8F1',
    cardBg: '#FFFFFF',
    textColor: '#2E1A11',
    accentColor: '#F97316',
    borderColor: '#FED7AA',
  },
  {
    id: 'teal-modern',
    name: 'Toska Modern',
    category: 'aesthetic',
    canvasBg: '#F0FDFA',
    cardBg: '#FFFFFF',
    textColor: '#0F2E2B',
    accentColor: '#0D9488',
    borderColor: '#CCFBF1',
  },
  {
    id: 'espresso-mocha',
    name: 'Kopi & Krem',
    category: 'aesthetic',
    canvasBg: '#F7F0E9',
    cardBg: '#FFFDFB',
    textColor: '#2C1D14',
    accentColor: '#9A4D1E',
    borderColor: '#E6D4C3',
  },
  {
    id: 'royal-gold',
    name: 'Hitam & Emas Mewah',
    category: 'aesthetic',
    canvasBg: '#12110E',
    cardBg: '#1E1B16',
    textColor: '#FAF6ED',
    accentColor: '#D4AF37',
    borderColor: '#3A3222',
  },
];

export const DEFAULT_STYLE: BlockStyle = {
  blur: 0,
  align: 'center',
  widthPercent: 100,
  minHeight: 40,
  borderRadius: 14,
  shadow: 'none',
  borderWidth: 0,
  borderColor: '#E2E8F0',
  backgroundColor: 'transparent',
  textColor: '#0F172A',
  useThemeTextColor: true,
  padding: 12,
  fullBleed: false,
  marginBottom: 12,
};

export const DEFAULT_ADVANCE_OPTIONS: AdvanceOptions = {
  showUnitSold: false,
  blockLayout: 'default',
};

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'cat_1',
    title: 'Paket Template Presentasi Lengkap',
    subtitle: '80+ slide siap pakai untuk pitching & laporan',
    badge: 'Terlaris',
    variants: 'Edisi Canva, Edisi PowerPoint, Paket Lengkap',
    description:
      'Koleksi 80+ template slide profesional yang mudah diubah warna, tipografi, dan grafiknya. Cocok untuk proposal klien, laporan bulanan, hingga presentasi produk.\n\nTermasuk:\n• 80+ layout slide modern\n• Panduan edit cepat\n• Akses update gratis selamanya',
    price: 'Rp 99.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-1',
    image: PRODUCT_CARD_SVG,
    unitSold: 142,
  },
  {
    id: 'cat_2',
    title: 'E-Book Panduan Konten Kreator',
    subtitle: 'Strategi monetisasi produk digital dari nol',
    badge: 'Best Value',
    variants: 'E-Book PDF, E-Book + Worksheet',
    description:
      'Panduan praktis langkah demi langkah membangun audiens organik dan mengubah konten menjadi sumber pemasukan rutin.\n\nCocok untuk pemula maupun kreator yang ingin merapikan alur penjualan.',
    price: 'Rp 65.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-2',
    image: STARTER_ILLUSTRATION_SVG,
    unitSold: 87,
  },
  {
    id: 'cat_3',
    title: 'Kit Desain Feed Sosial Media',
    subtitle: 'Format Figma & Canva siap edit cepat',
    badge: 'Baru',
    variants: 'Canva Only, Figma + Canva',
    description:
      'Lebih dari 50 template feed dan story Instagram yang konsisten untuk branding bisnis dan UMKM.\n\nTinggal ganti foto, teks, dan warna sesuai identitas usaha Anda.',
    price: 'Rp 129.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-3',
    image: PRODUCT_CARD_SVG,
    unitSold: 64,
  },
  {
    id: 'cat_4',
    title: 'Template Notion Finance Tracker',
    subtitle: 'Kelola arus kas & target tabungan bulanan',
    variants: 'Personal, Bisnis UMKM',
    description:
      'Dashboard Notion siap duplikasi untuk mencatat pemasukan, pengeluaran, piutang usaha, dan laporan laba rugi sederhana secara otomatis.',
    price: 'Rp 49.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-4',
    image: STARTER_ILLUSTRATION_SVG,
    unitSold: 215,
  },
];

export const DEFAULT_SOCIAL_ITEMS: SocialLinkItem[] = [
  { id: 'soc_ig', platform: 'instagram', url: 'https://instagram.com/studiokreatif', visible: true },
  { id: 'soc_tt', platform: 'tiktok', url: 'https://tiktok.com/@studiokreatif', visible: true },
  { id: 'soc_fb', platform: 'facebook', url: 'https://facebook.com/studiokreatif', visible: true },
  { id: 'soc_yt', platform: 'youtube', url: 'https://youtube.com/@studiokreatif', visible: true },
  { id: 'soc_wa', platform: 'whatsapp', url: 'https://wa.me/6281234567890', visible: true },
  { id: 'soc_th', platform: 'threads', url: 'https://threads.net/@studiokreatif', visible: true },
  { id: 'soc_tw', platform: 'twitter', url: 'https://x.com/studiokreatif', visible: true },
];

export const DEFAULT_CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 'car_1',
    image: CAROUSEL_SAMPLE_1_SVG,
    title: 'Koleksi Foto Utama',
    caption: 'Geser ke samping untuk melihat detail produk dan dokumentasi terbaru.',
    url: '',
  },
  {
    id: 'car_2',
    image: CAROUSEL_SAMPLE_2_SVG,
    title: 'Detail Material & Warna',
    caption: 'Tampilan jernih dengan rasio fleksibel 1:1, 4:5, 9:16, hingga 16:9.',
    url: '',
  },
  {
    id: 'car_3',
    image: CAROUSEL_SAMPLE_3_SVG,
    title: 'Promo Spesial Minggu Ini',
    caption: 'Tambahkan tautan pada foto agar pengunjung bisa langsung menuju halaman promo.',
    url: '',
  },
];

export const DEFAULT_SOCIAL_FEED_POSTS: SocialPostItem[] = [
  {
    id: 'sf_post_1',
    mediaType: 'image',
    imageUrl: CAROUSEL_SAMPLE_1_SVG,
    videoUrl: '',
    caption: 'Rilis koleksi terbaru minggu ini! Geser ke samping untuk melihat postingan video & foto lainnya.',
    likes: '1,4 rb',
    comments: '68',
    url: '',
  },
  {
    id: 'sf_post_2',
    mediaType: 'video',
    imageUrl: CAROUSEL_SAMPLE_3_SVG,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    caption: 'Cuplikan video behind-the-scenes proses pembuatan konten kreatif.',
    likes: '3,2 rb',
    comments: '142',
    url: '',
  },
  {
    id: 'sf_post_3',
    mediaType: 'image',
    imageUrl: CAROUSEL_SAMPLE_2_SVG,
    videoUrl: '',
    caption: 'Tips & panduan lengkap untuk meningkatkan engagement akun sosial media Anda.',
    likes: '980',
    comments: '41',
    url: '',
  },
];

export const DEFAULT_SOCIAL_FOLLOWER_ACCOUNTS: SocialFollowerAccount[] = [
  {
    id: 'sfa_default_1',
    platform: 'instagram',
    avatar: '',
    accountName: 'Studio Kreatif Nusantara',
    handle: '@studiokreatif',
    accountUrl: 'https://instagram.com/studiokreatif',
    verified: true,
    postsCount: '128',
    postsLabel: 'Postingan',
    followers: '45,8 rb',
    followersLabel: 'Follower',
    following: '312',
    followingLabel: 'Mengikuti',
    bio: '',
    followLabel: 'Ikuti',
  },
];

export const DEFAULT_PHYSICAL_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'cat_phys_1',
    title: 'Paket Menu Spesial Keluarga',
    subtitle: 'Porsi 4 orang lengkap + sambal & lalapan',
    badge: 'Terlaris',
    variants: 'Original, Pedas Sedang, Extra Pedas',
    description:
      'Menu favorit keluarga diolah segar setiap hari. Bisa makan di tempat, ambil ke lokasi, atau dikirim langsung.',
    pickupNote: 'Estimasi masak ± 30 menit setelah pesanan diterima',
    price: 'Rp 125.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/menu-1',
    image: PRODUCT_CARD_SVG,
    unitSold: 148,
  },
  {
    id: 'cat_phys_2',
    title: 'Paket Bento Hemat Harian',
    subtitle: 'Siap santap, praktis untuk acara & kantor',
    badge: 'Promo',
    variants: 'Ayam Bakar, Ayam Goreng, Daging Teriyaki',
    description:
      'Pilihan menu praktis dengan kemasan rapi dan higienis. Tersedia layanan pesan antar atau ambil langsung di lokasi.',
    pickupNote: 'Estimasi masak ± 30 menit',
    price: 'Rp 38.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/menu-2',
    image: STARTER_ILLUSTRATION_SVG,
    unitSold: 230,
  },
];

export const DEFAULT_TRAINING_PROGRAMS: TrainingProgramItem[] = [
  {
    id: 'trn_1',
    badge: 'Pendaftaran Dibuka',
    title: 'Pelatihan & Sertifikasi Profesi',
    subtitle: 'Program intensif bersertifikat resmi + bimbingan praktik langsung',
    description:
      'Program pelatihan terstruktur bersama mentor praktisi berpengalaman.\n\nMateri meliputi:\n• Pembekalan teori & standar operasional lapangan\n• Simulasi praktik intensif & uji kompetensi\n• Konsultasi pasca-pelatihan & pendampingan berkas',
    originalPrice: 'Rp 2.500.000',
    price: 'Rp 1.850.000',
    discountLabel: 'Potongan Rp 650.000',
    cashbackLabel: 'Cashback Rp 150.000',
  },
  {
    id: 'trn_2',
    badge: 'Kelas Lanjutan',
    title: 'Bootcamp Kompetensi & Kesiapan Kerja',
    subtitle: 'Pendampingan intensif 7 hari + evaluasi portofolio',
    description:
      'Cocok bagi peserta yang ingin meningkatkan keterampilan praktis agar langsung siap terjun ke dunia kerja atau usaha mandiri.',
    originalPrice: 'Rp 1.750.000',
    price: 'Rp 1.250.000',
    discountLabel: 'Potongan Rp 500.000',
    cashbackLabel: 'Cashback Rp 100.000',
  },
];

export const DEFAULT_TRAINING_MEDIA: TrainingMediaItem[] = [
  {
    id: 'tm_1',
    type: 'image',
    imageUrl: CAROUSEL_SAMPLE_1_SVG,
    caption: 'Dokumentasi suasana sesi pembekalan materi & praktik kelas terbaru.',
    linkUrl: '',
    linkLabel: '',
  },
  {
    id: 'tm_2',
    type: 'image',
    imageUrl: CAROUSEL_SAMPLE_3_SVG,
    caption: 'Dokumentasi kegiatan praktik lapangan dan pembinaan peserta.',
    linkUrl: '',
    linkLabel: '',
  },
  {
    id: 'tm_3',
    type: 'image',
    imageUrl: CAROUSEL_SAMPLE_2_SVG,
    caption: 'Fasilitas ruang belajar, modul panduan, dan sertifikat resmi program.',
    linkUrl: '',
    linkLabel: '',
  },
];

export const DEFAULT_TRAINING_CHECKLIST: string[] = [
  'Fotokopi KTP / Identitas diri yang masih berlaku',
  'Pas foto terbaru ukuran 3x4 / 4x6',
  'Fotokopi ijazah terakhir',
  'Nomor WhatsApp aktif untuk konfirmasi jadwal',
];

export const DEFAULT_TRAINING_CUSTOM_BOXES: TrainingCustomBox[] = [
  {
    id: 'trb_1',
    title: 'Materi & Fasilitas yang Didapat',
    contentHtml:
      '<div><strong>Kurikulum Inti:</strong> Pembinaan disiplin, teori operasional lapangan, dan simulasi praktik langsung.</div><div><span style="color:#059669"><strong>Termasuk:</strong></span> Modul panduan belajar, seragam latihan, konsumsi, dan <em>sertifikat resmi</em>.</div>',
    defaultFontWeight: 'normal',
    defaultFontStyle: 'normal',
    textColor: '',
    lineHeight: 1.6,
    paragraphGap: 6,
    showBorder: true,
  },
];

export const BLOCK_TYPE_NAMES: Record<BlockType, string> = {
  row: 'Kolom / Row',
  container: 'Wadah',
  toggle_container: 'Wadah Show/Hide',
  text: 'Teks Biasa',
  image: 'Gambar',
  button: 'Tombol Link',
  form: 'Form Isian',
  divider: 'Garis Pembatas',
  youtube: 'Video YouTube',
  facebook_video: 'Video Facebook',
  tiktok_video: 'Video TikTok',
  instagram_video: 'Video Instagram',
  catalog: 'Katalog Produk',
  social: 'Sosial Media',
  social_follower: 'Sosial Media + Follower',
  carousel: 'Foto Carousel',
  social_feed: 'Sosmed & Postingan',
  maps_place: 'Lokasi Maps',
  bottom_sheet: 'Bottom Sheet',
  training_catalog: 'Katalog Produk Pelatihan',
  hero_profile: 'Hero Profil',
  fnb_catalog: 'Katalog F&B',
  category_tabs: 'Tombol Kategori',
  menu_icon: 'Menu Icon',
  cart_button: 'Tombol Keranjang',
  showcase_card: 'Kartu Dinamis',
};

export function createCatalogBlock(
  productType: 'physical' | 'digital',
  theme: PageTheme = THEMES[0]
): BuilderBlock {
  const baseStyle: BlockStyle = {
    ...DEFAULT_STYLE,
    textColor: theme.textColor,
    borderColor: theme.borderColor,
    minHeight: 120,
    padding: 0,
    backgroundColor: 'transparent',
  };
  const isDigital = productType === 'digital';
  const sourceItems = isDigital ? DEFAULT_CATALOG_ITEMS : DEFAULT_PHYSICAL_CATALOG_ITEMS;

  return {
    id: createId('cat'),
    type: 'catalog',
    label: isDigital ? 'Katalog Produk Digital' : 'Katalog Produk Fisik',
    style: baseStyle,
    content: {
      catalogItems: sourceItems.map((item) => ({
        ...item,
        id: createId('item'),
        gallery: item.gallery ? [...item.gallery] : undefined,
      })),
      catalogProductType: productType,
      catalogDetailEnabled: true,
      catalogCartEnabled: true,
      catalogWhatsappNumber: '6281234567890',
      catalogWhatsappIntro: isDigital
        ? 'Halo, saya ingin memesan produk digital berikut:'
        : 'Halo, saya ingin memesan produk berikut:',
      catalogAskCustomerInfo: true,
      catalogCustomerFields: getDefaultCustomerFields(productType),
      catalogShippingEnabled: !isDigital,
      catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
    },
  };
}

export function createBlock(type: BlockType, theme: PageTheme = THEMES[0]): BuilderBlock {
  const baseStyle: BlockStyle = {
    ...DEFAULT_STYLE,
    textColor: theme.textColor,
    borderColor: theme.borderColor,
  };

  switch (type) {
    case 'container':
      return {
        id: createId('cnt'),
        type: 'container',
        label: 'Kotak / Wadah',
        style: {
          ...baseStyle,
          minHeight: 80,
          borderRadius: 16,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          padding: 16,
          shadow: 'sm',
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Teks Biasa',
            style: {
              ...baseStyle,
              minHeight: 24,
              padding: 4,
              marginBottom: 4,
            },
            content: {
              text: 'Isi konten di dalam wadah ini',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      };

    case 'toggle_container':
      return {
        id: createId('tgl'),
        type: 'toggle_container',
        label: 'Wadah Show / Hide',
        style: {
          ...baseStyle,
          minHeight: 56,
          borderRadius: 16,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          padding: 14,
          shadow: 'sm',
        },
        content: {
          toggleShowLabel: 'Tampilkan Konten',
          toggleHideLabel: 'Sembunyikan Konten',
          toggleDefaultOpen: false,
          toggleButtonBg: theme.accentColor,
          toggleButtonText: '#FFFFFF',
          toggleButtonStyle: 'solid',
        },
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Teks Isi Wadah',
            style: {
              ...baseStyle,
              minHeight: 24,
              padding: 4,
              marginBottom: 4,
            },
            content: {
              text: 'Konten tersembunyi — bisa diisi teks, gambar, tombol, video, atau elemen lain.',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      };

    case 'row':
      return {
        id: createId('row'),
        type: 'row',
        label: '2 Kolom',
        style: {
          ...baseStyle,
          minHeight: 60,
          padding: 4,
        },
        content: {},
        children: [
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Kiri',
            style: { ...baseStyle, minHeight: 44, padding: 0, marginBottom: 0 },
            content: {
              label: 'Portofolio',
              url: 'https://example.com',
              buttonBg: theme.accentColor,
              buttonText: '#FFFFFF',
            },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Kanan',
            style: { ...baseStyle, minHeight: 44, padding: 0, marginBottom: 0 },
            content: {
              label: 'Hubungi Kami',
              url: 'https://example.com',
              buttonBg: '#0F172A',
              buttonText: '#FFFFFF',
            },
          },
        ],
      };

    case 'text':
      return {
        id: createId('txt'),
        type: 'text',
        label: 'Teks Biasa',
        style: {
          ...baseStyle,
          minHeight: 28,
          padding: 6,
        },
        content: {
          text: 'Judul atau deskripsi singkat halaman Anda',
          variant: 'h2',
          fontWeight: 'bold',
        },
      };

    case 'image':
      return {
        id: createId('img'),
        type: 'image',
        label: 'Gambar',
        style: {
          ...baseStyle,
          minHeight: 120,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          src: PRODUCT_CARD_SVG,
          alt: 'Ilustrasi produk digital',
          aspectRatio: '16/9',
          objectFit: 'cover',
        },
      };

    case 'button':
      return {
        id: createId('btn'),
        type: 'button',
        label: 'Tombol Link',
        style: {
          ...baseStyle,
          minHeight: 46,
          padding: 0,
          borderRadius: 12,
        },
        content: {
          label: 'Buka Tautan Sekarang',
          url: 'https://example.com',
          buttonBg: theme.accentColor,
          buttonText: '#FFFFFF',
        },
      };

    case 'form':
      return {
        id: createId('frm'),
        type: 'form',
        label: 'Form Isian',
        style: {
          ...baseStyle,
          minHeight: 140,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          formTitle: 'Dapatkan Update Terbaru',
          namePlaceholder: 'Nama Lengkap',
          emailPlaceholder: 'Alamat Email / WhatsApp',
          formNameRequired: true,
          formEmailRequired: true,
          formChecklistEnabled: false,
          formChecklistTitle: 'Persetujuan / Checklist',
          formChecklistItems: ['Saya setuju data digunakan untuk keperluan konsultasi'],
          formChecklistRequired: false,
          submitLabel: 'Kirim Data',
          successMessage: 'Terima kasih! Data Anda telah terkirim.',
          buttonColor: theme.accentColor,
        },
      };

    case 'divider':
      return {
        id: createId('div'),
        type: 'divider',
        label: 'Garis Pembatas',
        style: {
          ...baseStyle,
          minHeight: 16,
          padding: 8,
        },
        content: {
          lineColor: theme.borderColor,
          thickness: 1,
          lineStyle: 'solid',
        },
      };

    case 'youtube':
      return {
        id: createId('ytb'),
        type: 'youtube',
        label: 'Video YouTube',
        style: {
          ...baseStyle,
          minHeight: 160,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          youtubeAspectRatio: '16/9',
          youtubeAutoplay: true,
          youtubeVolume: 75,
        },
      };

    case 'facebook_video':
      return {
        id: createId('fbv'),
        type: 'facebook_video',
        label: 'Video Facebook',
        style: {
          ...baseStyle,
          minHeight: 160,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          videoUrl: 'https://www.facebook.com/facebook/videos/10153231379946729/',
          videoAspectRatio: '16/9',
          videoAutoplay: true,
          videoVolume: 75,
        },
      };

    case 'tiktok_video':
      return {
        id: createId('ttv'),
        type: 'tiktok_video',
        label: 'Video TikTok',
        style: {
          ...baseStyle,
          minHeight: 220,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          videoUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
          videoAspectRatio: '9/16',
          videoAutoplay: true,
          videoVolume: 75,
        },
      };

    case 'instagram_video':
      return {
        id: createId('igv'),
        type: 'instagram_video',
        label: 'Video Instagram',
        style: {
          ...baseStyle,
          minHeight: 220,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          videoUrl: 'https://www.instagram.com/reel/C5vQ8qKvP2x/',
          videoAspectRatio: '9/16',
          videoAutoplay: true,
          videoVolume: 75,
        },
      };

    case 'catalog':
      return createCatalogBlock('physical', theme);

    case 'training_catalog':
      return {
        id: createId('trn'),
        type: 'training_catalog',
        label: 'Katalog Produk Pelatihan',
        style: {
          ...baseStyle,
          minHeight: 240,
          padding: 14,
          borderRadius: 18,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          trainingHeading: 'Dikssar Satpam Gada Pratama',
          trainingBatch: 'Angkatan 200',
          trainingSchedule: 'Senin – Sabtu, 08.00 – 16.00 WIB',
          trainingSubheading:
            'Program pendidikan & sertifikasi resmi dengan pembekalan teori, praktik lapangan, serta pendampingan berkas.',
          trainingExpandLabel: 'Selengkapnya',
          trainingCollapseLabel: 'Tutup Detail',
          trainingDefaultExpanded: false,
          trainingPrograms: DEFAULT_TRAINING_PROGRAMS.map((p) => ({
            ...p,
            id: createId('trp'),
          })),
          trainingCustomBoxes: DEFAULT_TRAINING_CUSTOM_BOXES.map((b) => ({
            ...b,
            id: createId('trb'),
          })),
          trainingMedia: DEFAULT_TRAINING_MEDIA.map((m) => ({
            ...m,
            id: createId('trm'),
          })),
          trainingMediaRatio: '16/9',
          trainingChecklistTitle: 'Checklist Syarat Berkas',
          trainingChecklistItems: [...DEFAULT_TRAINING_CHECKLIST],
          trainingFormTitle: 'Formulir Pendaftaran / Konsultasi',
          trainingFormFields: getDefaultTrainingFormFields(),
          trainingWaNumber: '6281234567890',
          trainingWaButtonLabel: 'Konsultasi via WhatsApp',
          trainingWaIntro: 'Halo, saya ingin konsultasi mengenai program pelatihan berikut:',
        },
      };

    case 'social':
      return {
        id: createId('soc'),
        type: 'social',
        label: 'Ikon Sosial Media',
        style: {
          ...baseStyle,
          minHeight: 48,
          padding: 8,
          marginBottom: 14,
          backgroundColor: 'transparent',
        },
        content: {
          socialItems: DEFAULT_SOCIAL_ITEMS.map((item) => ({ ...item, id: createId('s') })),
          socialStyle: 'filled',
          socialShape: 'circle',
          socialSize: 'md',
          socialIconSize: 40,
          socialGap: 10,
          socialUseBrandColors: true,
          socialColor: theme.accentColor,
        },
      };

    case 'social_follower':
      return {
        id: createId('sfol'),
        type: 'social_follower',
        label: 'Sosial Media + Follower',
        style: {
          ...baseStyle,
          minHeight: 110,
          padding: 0,
          borderRadius: 18,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'left',
        },
        content: {
          socialFollowerGap: 10,
          socialFollowerAccounts: DEFAULT_SOCIAL_FOLLOWER_ACCOUNTS.map((acc) => ({
            ...acc,
            id: createId('sfa'),
          })),
        },
      };

    case 'carousel':
      return {
        id: createId('car'),
        type: 'carousel',
        label: 'Galeri Foto Carousel',
        style: {
          ...baseStyle,
          minHeight: 180,
          padding: 0,
          borderRadius: 16,
          align: 'left',
          backgroundColor: 'transparent',
        },
        content: {
          carouselAspectRatio: '4/5',
          carouselObjectFit: 'cover',
          carouselItems: DEFAULT_CAROUSEL_ITEMS.map((item) => ({
            ...item,
            id: createId('slide'),
          })),
        },
      };

    case 'social_feed':
      return {
        id: createId('sfd'),
        type: 'social_feed',
        label: 'Sosmed & Postingan',
        style: {
          ...baseStyle,
          minHeight: 240,
          padding: 14,
          borderRadius: 18,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          socialFeedPlatform: 'instagram',
          socialFeedAvatar: '',
          socialFeedAccountName: 'Studio Kreatif Nusantara',
          socialFeedHandle: '@studiokreatif',
          socialFeedAccountUrl: 'https://instagram.com/studiokreatif',
          socialFeedVerified: true,
          socialFeedFollowers: '45,8 rb',
          socialFeedFollowersLabel: 'Follower',
          socialFeedBio: '',
          socialFeedFollowLabel: 'Ikuti',
          socialFeedRatio: '4/5',
          socialFeedPosts: DEFAULT_SOCIAL_FEED_POSTS.map((post) => ({
            ...post,
            id: createId('sfp'),
          })),
        },
      };

    case 'maps_place':
      return {
        id: createId('map'),
        type: 'maps_place',
        label: 'Lokasi Maps',
        style: {
          ...baseStyle,
          minHeight: 200,
          padding: 0,
          borderRadius: 16,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          mapsPhotoUrl: MAPS_LOCATION_SVG,
          mapsPhotoBadgeLabel: 'Lihat foto',
          mapsPhotoRatio: '16/9',
          mapsTitle: 'Diksar Satpam',
          mapsRating: 4.9,
          mapsReviewCount: '1.643',
          mapsService: 'Layanan Satpam',
          mapsAccessible: true,
          mapsServicesList: 'Pelatihan Keamanan, Sertifikasi Resmi, Penyaluran Kerja',
          mapsAddress: 'Buka setiap hari · 08.00 – 17.00 WIB',
          mapsUrl: 'https://maps.google.com',
          mapsButtonLabel: 'Buka di Google Maps',
        },
      };

    case 'bottom_sheet': {
      const mapsChild = createBlock('maps_place', theme);
      return {
        id: createId('bsh'),
        type: 'bottom_sheet',
        label: 'Bottom Sheet Maps',
        style: {
          ...baseStyle,
          minHeight: 56,
          padding: 4,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'center',
        },
        content: {
          sheetTitle: 'Lokasi & Ulasan',
          sheetTriggerStyle: 'icon',
          sheetTriggerIcon: 'map-pin',
          sheetTriggerLabel: 'Lokasi Maps',
          sheetTriggerSublabel: 'Lihat lokasi & ulasan',
          sheetTriggerBg: theme.accentColor,
          sheetTriggerText: '#FFFFFF',
          sheetIconSize: 52,
        },
        children: [
          {
            ...mapsChild,
            style: {
              ...mapsChild.style,
              marginBottom: 0,
            },
          },
        ],
      };
    }

    case 'menu_icon': {
      const sampleText = createBlock('text', theme);
      return {
        id: createId('mico'),
        type: 'menu_icon',
        label: 'Menu Icon',
        style: {
          ...baseStyle,
          minHeight: 64,
          padding: 4,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'center',
        },
        content: {
          menuIconImage: '',
          menuIconShape: 'circle',
          menuIconRadius: 14,
          menuIconSize: 64,
          menuIconImageFit: 'cover',
          menuIconLabel: 'Menu Icon',
          menuIconShowLabel: true,
          menuIconAction: 'sheet',
          menuIconSheetPosition: 'bottom',
          menuIconTargetBlockId: '',
          menuIconBg: theme.accentColor,
          menuIconTextColor: theme.textColor,
          sheetTitle: 'Menu Panel',
        },
        children: [
          {
            ...sampleText,
            label: 'Isi Panel Menu',
            style: {
              ...sampleText.style,
              align: 'left',
              marginBottom: 0,
            },
            content: {
              text: 'Tambahkan informasi, tombol, atau katalog di dalam panel Menu Icon ini.',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      };
    }

    case 'hero_profile':
      return {
        id: createId('hero'),
        type: 'hero_profile',
        label: 'Hero Profil Usaha',
        style: {
          ...baseStyle,
          minHeight: 110,
          padding: 0,
          borderRadius: 20,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
          marginBottom: 16,
        },
        content: {
          heroVariant: 'compact',
          heroStatusEnabled: true,
          heroStatusText: 'Buka sekarang',
          heroStatusColor: '#16A34A',
          heroLogoImage: '',
          heroLogoMonogram: 'WB',
          heroLogoBg: '#FFEDD5',
          heroLogoColor: '#C2410C',
          heroLogoSize: 72,
          heroCoverImage: HERO_COVER_WARM_SVG,
          heroCoverTitle: 'Warung Barokah',
          heroCoverFontFamily: 'Pacifico',
          heroCoverHeight: 165,
          heroOverlapPx: 34,
          heroTitle: 'Warung Barokah Demo',
          heroTitleSize: 20,
          heroSubtitle: 'Nasi, mie, ayam bakar, dan minuman.',
          heroSubtitleSize: 13,
          heroRating: '4.9',
          heroHours: '09.00-21.00 WIB',
          heroLocation: 'Cabang Kemang',
          heroInfoSize: 12,
          heroCardRadius: 20,
        },
      };

    case 'fnb_catalog':
      return {
        id: createId('fnb'),
        type: 'fnb_catalog',
        label: 'Katalog Menu F&B',
        style: {
          ...baseStyle,
          minHeight: 140,
          padding: 0,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'left',
          marginBottom: 18,
        },
        content: {
          fnbItems: DEFAULT_FNB_ITEMS.map((it) => ({ ...it, id: createId('fnb') })),
          fnbShowSearch: true,
          fnbSearchPlaceholder: 'Cari makanan dan minuman...',
          fnbShowCategories: false,
          fnbGroupByCategory: true,
          fnbAccentColor: '#EA580C',
          fnbItemImageSize: 80,
          fnbItemTitleSize: 15,
          fnbItemDescSize: 12,
          fnbFloatingCartEnabled: true,
          fnbFloatingCartPosition: 'bottom-floating',
          fnbFloatingCartOffsetY: 16,
          fnbFloatingCartBg: '#EA580C',
          fnbFloatingCartLabel: 'Lanjut',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Warung Barokah',
          catalogWhatsappIntro: 'Halo, saya ingin memesan menu berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'category_tabs':
      return {
        id: createId('ctab'),
        type: 'category_tabs',
        label: 'Tombol Kategori',
        style: {
          ...baseStyle,
          minHeight: 44,
          padding: 4,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'left',
          marginBottom: 14,
        },
        content: {
          categoryButtons: DEFAULT_CATEGORY_BUTTONS.map((b) => ({ ...b, id: createId('catbtn') })),
          categoryScrollMode: 'vertical',
          categoryMaxHeight: 112,
          categoryActiveBg: '#EA580C',
          categoryActiveText: '#FFFFFF',
          categoryInactiveBg: '#F1F5F9',
          categoryInactiveText: '#334155',
          categoryRadius: 9999,
          categoryFontSize: 13,
          categoryButtonPaddingX: 16,
          categoryButtonPaddingY: 8,
          categoryGap: 8,
          categoryFilterFnbOnClick: true,
        },
      };

    case 'cart_button':
      return {
        id: createId('crt'),
        type: 'cart_button',
        label: 'Tombol Keranjang',
        style: {
          ...baseStyle,
          minHeight: 54,
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.borderColor,
          backgroundColor: theme.cardBg,
          textColor: theme.textColor,
          shadow: 'sm',
          align: 'left',
          marginBottom: 10,
        },
        content: {
          cartProductName: 'Produk Pilihan',
          cartProductDesc: 'Keterangan singkat produk atau varian',
          cartProductPrice: 'Rp 80.000',
          cartProductImage: PRODUCT_CARD_SVG,
          cartButtonLabel: 'Tambah',
          cartShowProductInfo: true,
          cartAccentColor: theme.accentColor,
          cartWhatsappNumber: '6281234567890',
          cartStoreName: 'Toko Resmi',
          cartFloatingEnabled: true,
          cartFloatingLabel: 'Lihat Keranjang',
          cartFloatingBg: '#059669',
          cartFloatingPosition: 'bottom-floating',
        },
      };

    case 'showcase_card':
      return {
        id: createId('crd'),
        type: 'showcase_card',
        label: 'Kartu Dinamis',
        style: {
          ...baseStyle,
          minHeight: 120,
          padding: 0,
          borderRadius: 16,
          borderWidth: 0,
          backgroundColor: 'transparent',
          textColor: theme.textColor,
          shadow: 'sm',
          align: 'left',
          marginBottom: 12,
        },
        content: {
          cardVariant: 'news_banner',
          cardHeaderTitle: '',
          cardMoreLabel: 'Selengkapnya',
          cardMoreUrl: '',
          cardTitle: 'Judul Berita atau Informasi Utama',
          cardSubtitle: 'Keterangan singkat kartu dinamis',
          cardQuote: '',
          cardDate: '18/02/2026',
          cardViews: '200',
          cardImage: CAROUSEL_SAMPLE_1_SVG,
          cardImagePosition: 'right',
          cardGalleryImages: [
            CAROUSEL_SAMPLE_1_SVG,
            CAROUSEL_SAMPLE_2_SVG,
            CAROUSEL_SAMPLE_3_SVG,
          ],
          cardGradientFrom: '#F59E0B',
          cardGradientTo: '#D97706',
          cardAccentColor: '#2563EB',
          cardTextColor: '#FFFFFF',
          cardPrice: 'Rp. 80.000,-',
          cardTotalLabel: 'Total :',
          cardTotalValue: 'Rp. 500.000,-',
          cardFeeItems: [
            { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 100.000' },
            { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 400.000' },
          ],
          cardActionUrl: '',
          cardShowPlayIcon: true,
          cardEnableCart: false,
          cardWhatsappNumber: '6281234567890',
        },
      };
  }
}

export function createDefaultBottomNavbar(
  theme: PageTheme = THEMES[0],
  enabled = false
): BottomNavbarConfig {
  const galeriCarousel = createBlock('carousel', theme);
  const belanjaCatalog = createBlock('catalog', theme);
  const kontakText = createBlock('text', theme);
  const kontakWa = createBlock('button', theme);
  const kontakSocial = createBlock('social', theme);
  const alamatMaps = createBlock('maps_place', theme);

  const items: BottomNavbarItem[] = [
    {
      id: 'nav_galeri',
      label: 'Galeri',
      icon: 'image',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Galeri Foto & Karya',
      children: [{ ...galeriCarousel, style: { ...galeriCarousel.style, marginBottom: 0 } }],
    },
    {
      id: 'nav_belanja',
      label: 'Belanja',
      icon: 'shopping-bag',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Belanja & Produk',
      children: [{ ...belanjaCatalog, style: { ...belanjaCatalog.style, marginBottom: 0 } }],
    },
    {
      id: 'nav_home',
      label: 'Home',
      icon: 'home',
      enabled: true,
      action: 'scroll_top',
      sheetTitle: 'Beranda',
      children: [],
    },
    {
      id: 'nav_kontak',
      label: 'Kontak',
      icon: 'phone',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Hubungi Kami',
      children: [
        {
          ...kontakText,
          label: 'Info Kontak',
          style: { ...kontakText.style, align: 'left', marginBottom: 10 },
          content: {
            text: 'Pilih saluran tercepat untuk terhubung langsung dengan tim kami.',
            variant: 'body',
            fontWeight: 'normal',
          },
        },
        {
          ...kontakWa,
          label: 'Tombol WhatsApp',
          style: { ...kontakWa.style, marginBottom: 12 },
          content: {
            label: 'Chat via WhatsApp',
            url: 'https://wa.me/6281234567890',
            buttonBg: '#059669',
            buttonText: '#FFFFFF',
            buttonIcon: 'phone',
          },
        },
        {
          ...kontakSocial,
          style: { ...kontakSocial.style, marginBottom: 0 },
        },
      ],
    },
    {
      id: 'nav_alamat',
      label: 'Alamat',
      icon: 'map-pin',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Alamat & Lokasi Maps',
      children: [{ ...alamatMaps, style: { ...alamatMaps.style, marginBottom: 0 } }],
    },
  ];

  return {
    enabled,
    barBg: theme.cardBg,
    textColor: theme.textColor,
    accentColor: theme.accentColor,
    borderColor: theme.borderColor,
    centerStyle: 'elevated',
    iconSize: 18,
    labelSize: 10,
    barPaddingY: 8,
    barWidthPercent: 100,
    floating: false,
    bottomOffset: 0,
    borderRadius: 0,
    barShadow: 'md',
    items,
  };
}

export function resolveBottomNavbar(project: BuilderProject): BottomNavbarConfig {
  const existing = project.bottomNavbar;
  if (!existing || !Array.isArray(existing.items) || existing.items.length === 0) {
    return createDefaultBottomNavbar(project.theme, Boolean(existing?.enabled));
  }
  const floating = Boolean(existing.floating);
  return {
    enabled: Boolean(existing.enabled),
    barBg: existing.barBg || project.theme.cardBg,
    textColor: existing.textColor || project.theme.textColor,
    accentColor: existing.accentColor || project.theme.accentColor,
    borderColor: existing.borderColor || project.theme.borderColor,
    centerStyle: existing.centerStyle === 'inline' ? 'inline' : 'elevated',
    iconSize: Math.max(12, Math.min(32, existing.iconSize ?? 18)),
    labelSize: Math.max(8, Math.min(16, existing.labelSize ?? 10)),
    barPaddingY: Math.max(2, Math.min(24, existing.barPaddingY ?? 8)),
    barWidthPercent: Math.max(
      70,
      Math.min(100, existing.barWidthPercent ?? (floating ? 94 : 100))
    ),
    floating,
    bottomOffset: Math.max(0, Math.min(48, existing.bottomOffset ?? (floating ? 12 : 0))),
    borderRadius: Math.max(0, Math.min(32, existing.borderRadius ?? (floating ? 20 : 0))),
    barShadow: existing.barShadow ?? 'md',
    items: existing.items.map((it) => ({
      id: it.id || createId('nav'),
      label: typeof it.label === 'string' ? it.label : 'Menu',
      icon: it.icon || 'info',
      iconUrl: typeof it.iconUrl === 'string' ? it.iconUrl : '',
      enabled: it.enabled !== false,
      action:
        it.action === 'scroll_top'
          ? 'scroll_top'
          : it.action === 'link'
          ? 'link'
          : 'sheet',
      linkUrl: typeof it.linkUrl === 'string' ? it.linkUrl : '',
      sheetTitle: typeof it.sheetTitle === 'string' ? it.sheetTitle : it.label || 'Info',
      children: Array.isArray(it.children) ? it.children : [],
    })),
  };
}

export interface ResolvedNavbarMetrics {
  iconSize: number;
  fabIconSize: number;
  fabBoxSize: number;
  fabMarginTop: number;
  labelSize: number;
  barPaddingY: number;
  barWidthPercent: number;
  floating: boolean;
  bottomOffset: number;
  borderRadius: number;
  barShadow: ShadowPreset;
  shadowCss: string;
}

export function resolveNavbarMetrics(nav: BottomNavbarConfig): ResolvedNavbarMetrics {
  const iconSize = Math.max(12, Math.min(32, nav.iconSize ?? 18));
  const fabIconSize = Math.min(34, Math.round(iconSize * 1.2));
  const fabBoxSize = Math.max(36, Math.round(iconSize * 2.15) + 6);
  const fabMarginTop = -Math.round(fabBoxSize * 0.45);
  const labelSize = Math.max(8, Math.min(16, nav.labelSize ?? 10));
  const barPaddingY = Math.max(2, Math.min(24, nav.barPaddingY ?? 8));
  const floating = Boolean(nav.floating);
  const barWidthPercent = Math.max(
    70,
    Math.min(100, nav.barWidthPercent ?? (floating ? 94 : 100))
  );
  const bottomOffset = Math.max(0, Math.min(48, nav.bottomOffset ?? (floating ? 12 : 0)));
  const borderRadius = Math.max(0, Math.min(32, nav.borderRadius ?? (floating ? 20 : 0)));
  const barShadow = nav.barShadow ?? 'md';

  let shadowCss = 'none';
  if (barShadow === 'sm') {
    shadowCss =
      floating || bottomOffset > 0
        ? '0 4px 12px rgba(15, 23, 42, 0.08)'
        : '0 -3px 10px rgba(15, 23, 42, 0.05)';
  } else if (barShadow === 'md') {
    shadowCss =
      floating || bottomOffset > 0
        ? '0 10px 26px rgba(15, 23, 42, 0.14)'
        : '0 -6px 20px rgba(15, 23, 42, 0.08)';
  } else if (barShadow === 'lg') {
    shadowCss =
      floating || bottomOffset > 0
        ? '0 16px 38px rgba(15, 23, 42, 0.24)'
        : '0 -10px 28px rgba(15, 23, 42, 0.15)';
  }

  return {
    iconSize,
    fabIconSize,
    fabBoxSize,
    fabMarginTop,
    labelSize,
    barPaddingY,
    barWidthPercent,
    floating,
    bottomOffset,
    borderRadius,
    barShadow,
    shadowCss,
  };
}

export interface PrebuiltSection {
  id: string;
  category: PrebuiltSectionCategory;
  title: string;
  description: string;
  createBlocks: (theme: PageTheme) => BuilderBlock[];
}

export const PREBUILT_SECTION_CATEGORIES: Array<{
  id: 'semua' | PrebuiltSectionCategory;
  label: string;
}> = [
  { id: 'semua', label: 'Semua' },
  { id: 'kartu_info', label: 'Kartu & Info' },
  { id: 'katalog_store', label: 'Katalog & Store' },
  { id: 'event_kegiatan', label: 'Event & Kegiatan' },
  { id: 'tarif_paket', label: 'Tarif & Paket' },
  { id: 'hero_profil', label: 'Hero & Profil' },
  { id: 'menu_layout', label: 'Menu & Grid' },
  { id: 'kontak_medsos', label: 'Medsos & Kontak' },
];

function makeShowcaseCardBlock(
  label: string,
  variant: ShowcaseCardVariant,
  theme: PageTheme,
  patch: Partial<BuilderBlock['content']>,
  stylePatch?: Partial<BlockStyle>
): BuilderBlock {
  const base = createBlock('showcase_card', theme);
  return {
    ...base,
    label,
    style: {
      ...base.style,
      marginBottom: 0,
      ...stylePatch,
    },
    content: {
      ...base.content,
      cardVariant: variant,
      ...patch,
    },
  };
}

function makeSectionHeaderRow(
  title: string,
  moreLabel: string,
  theme: PageTheme,
  moreUrl = ''
): BuilderBlock {
  return {
    id: createId('hdr'),
    type: 'row',
    label: `Header ${title}`,
    style: {
      ...DEFAULT_STYLE,
      padding: 2,
      marginBottom: 6,
      minHeight: 24,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    content: {
      rowLayoutMode: 'grid',
      rowColumns: 2,
      rowGridRows: 1,
      rowGap: 8,
    },
    children: [
      {
        id: createId('txt'),
        type: 'text',
        label: 'Judul Bagian',
        style: {
          ...DEFAULT_STYLE,
          align: 'left',
          padding: 0,
          marginBottom: 0,
          minHeight: 20,
          fontSize: 15,
          textColor: theme.textColor,
          useThemeTextColor: true,
        },
        content: { text: title, variant: 'h2', fontWeight: 'bold' },
      },
      {
        id: createId('btn'),
        type: 'button',
        label: moreLabel,
        style: {
          ...DEFAULT_STYLE,
          align: 'right',
          padding: 0,
          marginBottom: 0,
          minHeight: 20,
          borderRadius: 6,
          backgroundColor: 'transparent',
          fontSize: 11,
          fontWeightCss: '600',
        },
        content: {
          label: moreLabel,
          url: moreUrl || '#selengkapnya',
          buttonBg: 'transparent',
          buttonText: '#0284C7',
          buttonIcon: 'none',
        },
      },
    ],
  };
}

export const PREBUILT_SECTIONS: PrebuiltSection[] = [
  // === KARTU DINAMIS KATEGORI PORTAL & KOMUNITAS ===
  {
    id: 'kartu-kutipan-tokoh',
    category: 'kartu_info',
    title: 'Banner Kutipan Tokoh (Slide)',
    description: 'Kartu gradasi warna-warni dengan kutipan, nama tokoh, jabatan & foto potret (bisa digeser)',
    createBlocks: (theme) => [
      {
        id: createId('row'),
        type: 'row',
        label: 'Slide Kutipan Tokoh',
        style: {
          ...DEFAULT_STYLE,
          padding: 4,
          marginBottom: 14,
          minHeight: 110,
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        content: {
          rowLayoutMode: 'horizontal',
          rowColumns: 3,
          rowColumnWidth: 264,
          rowColumnMinHeight: 122,
          rowGap: 10,
        },
        children: [
          makeShowcaseCardBlock('Kutipan Tokoh 1', 'quote_banner', theme, {
            cardQuote: '".. Profesi yang dijalankan dengan integritas adalah profesi yang mulia.."',
            cardTitle: 'Ir. H. Tokoh Nasional',
            cardSubtitle: '(Pembina Kehormatan)',
            cardImage: HERO_LOGO_FOOD_SVG,
            cardImagePosition: 'right',
            cardGradientFrom: '#F59E0B',
            cardGradientTo: '#D97706',
            cardTextColor: '#FFFFFF',
          }),
          makeShowcaseCardBlock('Kutipan Tokoh 2', 'quote_banner', theme, {
            cardQuote: '"..Jangan merasa kecil, terus berkembang maju dan profesional ke depan.."',
            cardTitle: 'Prof. Dr. Pembina Utama',
            cardSubtitle: '(Dewan Penasehat)',
            cardImage: CAROUSEL_SAMPLE_1_SVG,
            cardImagePosition: 'right',
            cardGradientFrom: '#1D4ED8',
            cardGradientTo: '#3B82F6',
            cardTextColor: '#FFFFFF',
          }),
          makeShowcaseCardBlock('Kutipan Tokoh 3', 'quote_banner', theme, {
            cardQuote: '"..Sinergi dan kolaborasi menjadi kunci layanan yang aman dan terpercaya.."',
            cardTitle: 'Ketua Umum Asosiasi',
            cardSubtitle: '(Periode 2024–2029)',
            cardImage: CAROUSEL_SAMPLE_2_SVG,
            cardImagePosition: 'left',
            cardGradientFrom: '#22C55E',
            cardGradientTo: '#16A34A',
            cardTextColor: '#FFFFFF',
          }),
        ],
      },
    ],
  },
  {
    id: 'kartu-informasi-nasional',
    category: 'kartu_info',
    title: 'Kartu Informasi & Berita (Slide)',
    description: 'Header + Selengkapnya + kartu foto berita lebar dengan strip judul berwarna di bawah',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Informasi Nasional',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Informasi Nasional', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Daftar Berita',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 130 },
            content: {
              rowLayoutMode: 'horizontal',
              rowColumns: 2,
              rowColumnWidth: 256,
              rowColumnMinHeight: 146,
              rowGap: 10,
            },
            children: [
              makeShowcaseCardBlock('Berita 1', 'news_banner', theme, {
                cardTitle: 'Sinergi Program Strategis Nasional Tahun Ini',
                cardImage: CAROUSEL_SAMPLE_1_SVG,
                cardAccentColor: '#2563EB',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Berita 2', 'news_banner', theme, {
                cardTitle: 'Rapat Kerja Nasional & Peluncuran Layanan Baru',
                cardImage: CAROUSEL_SAMPLE_2_SVG,
                cardAccentColor: '#1D4ED8',
                cardTextColor: '#FFFFFF',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-even-promo',
    category: 'event_kegiatan',
    title: 'Kartu Even & Promo (Poster)',
    description: 'Header + Selengkapnya + kartu poster potret dengan strip judul warna di bawah',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Even dan Promo',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Even dan Promo', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Grid Poster Even',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 160 },
            content: {
              rowLayoutMode: 'grid',
              rowColumns: 2,
              rowGridRows: 1,
              rowGap: 10,
            },
            children: [
              makeShowcaseCardBlock('Poster Even 1', 'event_poster', theme, {
                cardTitle: '" Security Device Knowledge "',
                cardImage: CAROUSEL_SAMPLE_3_SVG,
                cardAccentColor: '#EA580C',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Poster Even 2', 'event_poster', theme, {
                cardTitle: '" Manajemen Tanggap Darurat "',
                cardImage: CAROUSEL_SAMPLE_1_SVG,
                cardAccentColor: '#3B82F6',
                cardTextColor: '#FFFFFF',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-sertifikasi',
    category: 'kartu_info',
    title: 'Kartu Informasi Sertifikasi (Badge)',
    description: 'Header + Selengkapnya + 3 kartu emblem/sertifikasi berwarna solid dengan judul putih',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Informasi Sertifikasi',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Informasi Sertifikasi', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Grid Sertifikasi',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 110 },
            content: {
              rowLayoutMode: 'grid',
              rowColumns: 3,
              rowGridRows: 1,
              rowGap: 8,
            },
            children: [
              makeShowcaseCardBlock('Sertifikasi Pratama', 'badge_tile', theme, {
                cardTitle: 'Sertifikasi Pelaksana',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#3B82F6',
                cardGradientTo: '#2563EB',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Sertifikasi Madya', 'badge_tile', theme, {
                cardTitle: 'Sertifikasi Supervisor',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#F59E0B',
                cardGradientTo: '#FB923C',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Sertifikasi Utama', 'badge_tile', theme, {
                cardTitle: 'Sertifikasi Manajer',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#EF4444',
                cardGradientTo: '#DC2626',
                cardTextColor: '#FFFFFF',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-store-gradasi',
    category: 'katalog_store',
    title: 'Kartu Store Gradasi + Keranjang',
    description: 'Kartu produk gradasi warna-warni (foto, judul, harga, ikon aksi) siap tambah ke keranjang',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Store Produk Pilihan',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Store Resmi', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Slide Produk Store',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 160 },
            content: {
              rowLayoutMode: 'horizontal',
              rowColumns: 4,
              rowColumnWidth: 136,
              rowColumnMinHeight: 176,
              rowGap: 10,
            },
            children: [
              makeShowcaseCardBlock('Produk Store 1', 'store_card', theme, {
                cardTitle: 'Topi Resmi',
                cardPrice: 'Rp. 80.000,-',
                cardImage: PRODUCT_CARD_SVG,
                cardGradientFrom: '#FDBA74',
                cardGradientTo: '#EA580C',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
              makeShowcaseCardBlock('Produk Store 2', 'store_card', theme, {
                cardTitle: 'Buku Panduan',
                cardPrice: 'Rp. 150.000,-',
                cardImage: STARTER_ILLUSTRATION_SVG,
                cardGradientFrom: '#34D399',
                cardGradientTo: '#0D9488',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
              makeShowcaseCardBlock('Produk Store 3', 'store_card', theme, {
                cardTitle: 'Badge Resmi',
                cardPrice: 'Rp. 20.000,-',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#60A5FA',
                cardGradientTo: '#2563EB',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
              makeShowcaseCardBlock('Produk Store 4', 'store_card', theme, {
                cardTitle: 'Pin Eksklusif',
                cardPrice: 'Rp. 100.000,-',
                cardImage: CAROUSEL_SAMPLE_1_SVG,
                cardGradientFrom: '#94A3B8',
                cardGradientTo: '#475569',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-feed-kegiatan',
    category: 'event_kegiatan',
    title: 'Kartu Feed Kegiatan (3 Foto)',
    description: 'Avatar penulis, jabatan, judul & tanggal kegiatan, galeri 3 foto sejajar, link Selengkapnya & views',
    createBlocks: (theme) => [
      makeShowcaseCardBlock(
        'Feed Kegiatan',
        'activity_post',
        theme,
        {
          cardTitle: 'Said Azis',
          cardSubtitle: 'Ketua Umum',
          cardQuote: 'Judul Kegiatan Komunitas',
          cardDate: '18/02/2026',
          cardViews: '200',
          cardMoreLabel: 'Selengkapnya',
          cardImage: HERO_LOGO_FOOD_SVG,
          cardGalleryImages: [
            CAROUSEL_SAMPLE_1_SVG,
            CAROUSEL_SAMPLE_2_SVG,
            CAROUSEL_SAMPLE_3_SVG,
          ],
          cardAccentColor: '#0284C7',
          cardTextColor: theme.textColor,
        },
        {
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          borderColor: theme.borderColor,
          padding: 14,
          marginBottom: 12,
        }
      ),
    ],
  },
  {
    id: 'kartu-tarif-keanggotaan',
    category: 'tarif_paket',
    title: 'Kartu Tiket Tarif & Keanggotaan',
    description: 'Kartu tiket dengan cekungan sisi, rincian biaya dinamis & strip total berwarna + ikon dompet',
    createBlocks: (theme) => [
      {
        id: createId('row'),
        type: 'row',
        label: 'Slide Paket Keanggotaan',
        style: {
          ...DEFAULT_STYLE,
          padding: 4,
          marginBottom: 14,
          minHeight: 150,
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        content: {
          rowLayoutMode: 'horizontal',
          rowColumns: 3,
          rowColumnWidth: 256,
          rowColumnMinHeight: 158,
          rowGap: 12,
        },
        children: [
          makeShowcaseCardBlock('Anggota Pratama', 'membership_ticket', theme, {
            cardTitle: 'Anggota Pratama',
            cardFeeItems: [
              { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 100.000' },
              { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 400.000' },
            ],
            cardTotalLabel: 'Total :',
            cardTotalValue: 'Rp. 500.000,-',
            cardAccentColor: '#EF4444',
            cardTextColor: '#FFFFFF',
          }),
          makeShowcaseCardBlock('Anggota Madya', 'membership_ticket', theme, {
            cardTitle: 'Anggota Madya',
            cardFeeItems: [
              { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 25.000' },
              { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 100.000' },
            ],
            cardTotalLabel: 'Total :',
            cardTotalValue: 'Rp. 125.000,-',
            cardAccentColor: '#FACC15',
            cardTextColor: '#1E3A8A',
          }),
          makeShowcaseCardBlock('Anggota Utama', 'membership_ticket', theme, {
            cardTitle: 'Anggota Utama',
            cardFeeItems: [
              { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 20.000' },
              { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 80.000' },
            ],
            cardTotalLabel: 'Total :',
            cardTotalValue: 'Rp. 100.000',
            cardAccentColor: '#0284C7',
            cardTextColor: '#FFFFFF',
          }),
        ],
      },
    ],
  },
  {
    id: 'menu-grid-spesial',
    category: 'menu_layout',
    title: 'Menu Grid 3x3 (Spesial Untuk Anda)',
    description: 'Kartu grid 3 kolom x 3 baris berisi 9 Menu Icon dinamis (bisa tambah kolom/baris & atur aksi sheet)',
    createBlocks: (theme) => {
      const menuDefs = [
        { label: 'Regulasi', bg: '#EFF6FF' },
        { label: 'Informasi', bg: '#F5F3FF' },
        { label: 'Konsultasi', bg: '#FDF2F8' },
        { label: 'Edukasi', bg: '#EEF2FF' },
        { label: 'Pelatihan', bg: '#FFFBEB' },
        { label: 'Sertifikasi', bg: '#EFF6FF' },
        { label: 'Store', bg: '#ECFEFF' },
        { label: 'Artikel', bg: '#F0FDF4' },
        { label: 'Media', bg: '#FFF7ED' },
      ];
      return [
        {
          id: createId('cnt'),
          type: 'container',
          label: 'Spesial Untuk Anda',
          style: {
            ...DEFAULT_STYLE,
            backgroundColor: theme.cardBg,
            borderColor: theme.borderColor,
            borderWidth: 1,
            borderRadius: 18,
            padding: 14,
            shadow: 'sm',
            align: 'left',
          },
          content: {},
          children: [
            {
              id: createId('txt'),
              type: 'text',
              label: 'Judul Menu Grid',
              style: {
                ...DEFAULT_STYLE,
                align: 'left',
                padding: 2,
                marginBottom: 10,
                minHeight: 22,
                fontSize: 15,
                textColor: theme.textColor,
              },
              content: { text: 'Spesial Untuk Anda', variant: 'h2', fontWeight: 'bold' },
            },
            {
              id: createId('row'),
              type: 'row',
              label: 'Grid 3x3 Menu',
              style: {
                ...DEFAULT_STYLE,
                padding: 2,
                marginBottom: 0,
                minHeight: 160,
                backgroundColor: 'transparent',
                borderWidth: 0,
              },
              content: {
                rowLayoutMode: 'grid',
                rowColumns: 3,
                rowGridRows: 3,
                rowGap: 10,
              },
              children: menuDefs.map((m) => {
                const iconBlk = createBlock('menu_icon', theme);
                return {
                  ...iconBlk,
                  label: m.label,
                  style: {
                    ...iconBlk.style,
                    padding: 4,
                    marginBottom: 0,
                    minHeight: 68,
                    fontSize: 11,
                    fontWeightCss: '600',
                  },
                  content: {
                    ...iconBlk.content,
                    menuIconLabel: m.label,
                    menuIconShape: 'rounded',
                    menuIconRadius: 14,
                    menuIconSize: 52,
                    menuIconBg: m.bg,
                    menuIconTextColor: '#0284C7',
                    sheetTitle: m.label,
                  },
                };
              }),
            },
          ],
        },
      ];
    },
  },
  // === BLOK TEMPLATE BAWAAN (TERKATEGORI) ===
  {
    id: 'hero-profil-kompak',
    category: 'hero_profil',
    title: 'Hero Profil Kompak (Status & Jam)',
    description: 'Kartu profil usaha dengan logo bulat/monogram, badge Buka sekarang, lokasi & jam buka',
    createBlocks: (theme) => [createBlock('hero_profile', theme)],
  },
  {
    id: 'hero-profil-banner',
    category: 'hero_profil',
    title: 'Hero Profil Banner Full Atas',
    description: 'Cover foto full di atas dengan kartu putih/gradasi overlap, logo bulat, rating & alamat',
    createBlocks: (theme) => {
      const hero = createBlock('hero_profile', theme);
      return [
        {
          ...hero,
          label: 'Hero Banner Full Atas',
          style: {
            ...hero.style,
            fullBleed: true,
            widthPercent: 100,
            borderRadius: 0,
            backgroundMode: 'gradient',
            gradientColor1: '#EFF6FF',
            gradientColor2: '#FAF5FF',
            gradientAngle: 135,
          },
          content: {
            ...hero.content,
            heroVariant: 'banner',
            heroStatusEnabled: false,
            heroLogoImage: HERO_LOGO_FOOD_SVG,
            heroLogoSize: 78,
            heroCoverImage: HERO_COVER_WARM_SVG,
            heroCoverTitle: 'Warung Barokah',
            heroCoverFontFamily: 'Pacifico',
            heroCoverHeight: 175,
            heroOverlapPx: 36,
            heroTitle: 'Warung Barokah',
            heroTitleSize: 22,
            heroSubtitle: 'Sekali coba, susah move on!',
            heroSubtitleSize: 13,
            heroRating: '4.9',
            heroHours: '07:00 - 21:00',
            heroLocation: 'Jl. Kenyang No. 88, RT 02 RW 04, Kel. Perut Bahagia',
            heroCardRadius: 24,
          },
        },
      ];
    },
  },
  {
    id: 'tombol-kategori-scroll',
    category: 'menu_layout',
    title: 'Tombol Kategori (Slide Horizontal / Vertikal)',
    description: 'Tombol Favorit, Makanan, Minuman yang bisa ditambah, slide horizontal atau vertikal & lompat ke judul',
    createBlocks: (theme) => [createBlock('category_tabs', theme)],
  },
  {
    id: 'row-slide-horizontal',
    category: 'menu_layout',
    title: 'Row 5 Kolom Slide Horizontal',
    description: 'Deretan 5 kotak kolom geser samping (bisa tambah 1–20 kolom, atur lebar kolom & kotak wadah)',
    createBlocks: (theme) => {
      const colData = [
        { title: 'Paket Hemat', sub: 'Mulai Rp 18rb', bg: '#FFF7ED', border: '#FED7AA', accent: '#EA580C' },
        { title: 'Best Seller', sub: 'Favorit Pelanggan', bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB' },
        { title: 'Menu Baru', sub: 'Coba Minggu Ini', bg: '#ECFDF5', border: '#A7F3D0', accent: '#059669' },
        { title: 'Minuman Segar', sub: 'Es & Kopi Susu', bg: '#FAF5FF', border: '#E9D5FF', accent: '#7C3AED' },
        { title: 'Cemilan Sore', sub: 'Teman Nongkrong', bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626' },
      ];
      return [
        {
          id: createId('row'),
          type: 'row',
          label: 'Row 5 Kolom Slide',
          style: {
            ...DEFAULT_STYLE,
            widthPercent: 100,
            minHeight: 80,
            padding: 8,
            borderRadius: 16,
            backgroundColor: 'transparent',
            borderColor: theme.borderColor,
            textColor: theme.textColor,
          },
          content: {
            rowLayoutMode: 'horizontal',
            rowColumns: 4,
            rowColumnWidth: 146,
            rowColumnMinHeight: 112,
            rowGap: 10,
          },
          children: colData.map((col, idx) => ({
            id: createId('cnt'),
            type: 'container',
            label: `Kotak ${idx + 1}`,
            style: {
              ...DEFAULT_STYLE,
              widthPercent: 100,
              minHeight: 112,
              padding: 12,
              marginBottom: 0,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: col.border,
              backgroundColor: col.bg,
              textColor: '#0F172A',
              useThemeTextColor: false,
              shadow: 'sm',
              hoverLift: true,
              align: 'left',
            },
            content: {},
            children: [
              {
                id: createId('txt'),
                type: 'text',
                label: 'Judul Kolom',
                style: {
                  ...DEFAULT_STYLE,
                  padding: 0,
                  marginBottom: 4,
                  minHeight: 20,
                  fontSize: 13,
                  textColor: col.accent,
                  useThemeTextColor: false,
                  align: 'left',
                },
                content: { text: col.title, variant: 'h2', fontWeight: 'bold' },
              },
              {
                id: createId('txt'),
                type: 'text',
                label: 'Keterangan',
                style: {
                  ...DEFAULT_STYLE,
                  padding: 0,
                  marginBottom: 0,
                  minHeight: 16,
                  fontSize: 11,
                  textColor: '#475569',
                  useThemeTextColor: false,
                  align: 'left',
                },
                content: { text: col.sub, variant: 'body', fontWeight: 'normal' },
              },
            ],
          })),
        },
      ];
    },
  },
  {
    id: 'katalog-fnb',
    category: 'katalog_store',
    title: 'Katalog F&B + Keranjang Mengambang',
    description: 'Menu makanan/minuman, upload/link foto, atur harga, & kotak pilih item mengambang',
    createBlocks: (theme) => [createBlock('fnb_catalog', theme)],
  },
  {
    id: 'kotak-outlet-dinamis',
    category: 'kontak_medsos',
    title: 'Kotak Info Outlet & Google Maps',
    description: 'Kartu alamat dinamis dengan ikon bulat, jam buka beraksen, dan tombol outline Maps',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kotak Info Outlet',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          borderWidth: 1,
          borderRadius: 20,
          padding: 18,
          shadow: 'sm',
          hoverLift: true,
          align: 'left',
          minHeight: 120,
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Judul Outlet',
            style: { ...DEFAULT_STYLE, align: 'left', padding: 0, marginBottom: 6, minHeight: 24, textColor: theme.textColor, fontSize: 18 },
            content: { text: 'Kunjungi Outlet Kami', variant: 'h2', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Alamat Outlet',
            style: { ...DEFAULT_STYLE, align: 'left', padding: 0, marginBottom: 6, minHeight: 20, textColor: '#475569', useThemeTextColor: false, fontSize: 14 },
            content: { text: 'Jl. Raya Serang - Jakarta, Cikande, Banten.', variant: 'body', fontWeight: 'normal' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Jam Operasional',
            style: { ...DEFAULT_STYLE, align: 'left', padding: 0, marginBottom: 14, minHeight: 18, textColor: '#EA580C', useThemeTextColor: false, fontSize: 12 },
            content: { text: 'Buka Setiap Hari: 10.00 - 22.00 WIB', variant: 'body', fontWeight: 'semibold' },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Google Maps',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 12, minHeight: 44, borderWidth: 1, borderColor: '#EA580C' },
            content: { label: 'Buka Google Maps', url: 'https://maps.google.com', buttonBg: '#FFFFFF', buttonText: '#EA580C', buttonIcon: 'map-pin' },
          },
        ],
      },
    ],
  },
  {
    id: 'kotak-promo-gradasi',
    category: 'kartu_info',
    title: 'Kotak Promo CTA Gradasi Dinamis',
    description: 'Kartu promo berlatar gradasi warna yang sudut derajatnya bisa diatur bebas + tombol CTA',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kotak Promo Gradasi',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: '#EA580C',
          backgroundMode: 'gradient',
          gradientColor1: '#EA580C',
          gradientColor2: '#9A3412',
          gradientAngle: 135,
          textColor: '#FFFFFF',
          useThemeTextColor: false,
          borderWidth: 0,
          borderRadius: 24,
          padding: 24,
          shadow: 'md',
          hoverLift: true,
          align: 'center',
          minHeight: 160,
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Judul Promo',
            style: { ...DEFAULT_STYLE, align: 'center', padding: 2, marginBottom: 10, minHeight: 28, textColor: '#FFFFFF', useThemeTextColor: true, fontSize: 22 },
            content: { text: 'Pesan Cepat Langsung via WhatsApp', variant: 'h1', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Subjudul Promo',
            style: { ...DEFAULT_STYLE, align: 'center', padding: 2, marginBottom: 16, minHeight: 24, textColor: '#FFFFFF', useThemeTextColor: true, fontSize: 14 },
            content: { text: 'Tidak perlu ribet daftar akun atau download aplikasi tambahan. Tinggal klik dan pesananmu langsung kami proses!', variant: 'body', fontWeight: 'normal' },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Pesan Sekarang',
            style: { ...DEFAULT_STYLE, widthPercent: 80, padding: 0, marginBottom: 0, borderRadius: 9999, minHeight: 46, shadow: 'sm' },
            content: { label: 'Pesan Sekarang', url: 'https://wa.me/6281234567890', buttonBg: '#FFFFFF', buttonText: '#C2410C', buttonIcon: 'whatsapp' },
          },
        ],
      },
    ],
  },
  {
    id: 'bottom-sheet-maps',
    category: 'kontak_medsos',
    title: 'Icon Maps → Bottom Sheet',
    description: 'Klik ikon Maps untuk buka Bottom Sheet lokasi & ulasan',
    createBlocks: (theme) => [createBlock('bottom_sheet', theme)],
  },
  {
    id: 'lokasi-maps',
    category: 'kontak_medsos',
    title: 'Lokasi Maps & Ulasan',
    description: 'Kartu foto lokasi, rating bintang & Google Maps',
    createBlocks: (theme) => [createBlock('maps_place', theme)],
  },
  {
    id: 'sosmed-postingan',
    category: 'kontak_medsos',
    title: 'Sosmed & Postingan Carousel',
    description: 'Profil akun sosmed & slide postingan foto/video',
    createBlocks: (theme) => [createBlock('social_feed', theme)],
  },
  {
    id: 'sosmed-follower-cards',
    category: 'kontak_medsos',
    title: 'Sosial Media + Follower Cards',
    description: 'Kartu profil akun & jumlah follower seluruh sosial media',
    createBlocks: (theme) => [createBlock('social_follower', theme)],
  },
  {
    id: 'foto-carousel',
    category: 'kartu_info',
    title: 'Galeri Foto Carousel',
    description: 'Slide galeri foto geser dengan keterangan',
    createBlocks: (theme) => [createBlock('carousel', theme)],
  },
  {
    id: 'katalog-produk-pelatihan',
    category: 'tarif_paket',
    title: 'Katalog Produk Pelatihan',
    description: 'Deskripsi, foto & postingan, harga/potongan/cashback, syarat berkas, form & konsultasi WA',
    createBlocks: (theme) => [createBlock('training_catalog', theme)],
  },
  {
    id: 'katalog-produk-fisik',
    category: 'katalog_store',
    title: 'Katalog Produk Fisik',
    description: 'Produk, data pemesan dinamis, pilihan kirim/ambil & kirim via WA',
    createBlocks: (theme) => [createCatalogBlock('physical', theme)],
  },
  {
    id: 'katalog-produk-digital',
    category: 'katalog_store',
    title: 'Katalog Produk Digital',
    description: 'Produk digital, data pemesan dinamis & kirim langsung via WA',
    createBlocks: (theme) => [createCatalogBlock('digital', theme)],
  },
  {
    id: 'hero-profile',
    category: 'hero_profil',
    title: 'Hero Profil Kreator',
    description: 'Kartu pembuka dengan logo, judul & bio',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kartu Profil',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          borderWidth: 1,
          borderRadius: 18,
          padding: 20,
          shadow: 'sm',
          minHeight: 120,
        },
        content: {},
        children: [
          {
            id: createId('img'),
            type: 'image',
            label: 'Foto Profil',
            style: {
              ...DEFAULT_STYLE,
              align: 'center',
              padding: 0,
              borderRadius: 9999,
              borderWidth: 4,
              borderColor: '#FFFFFF',
              shadow: 'md',
              minHeight: 0,
              marginBottom: 14,
            },
            content: {
              src: STARTER_ILLUSTRATION_SVG,
              alt: 'Foto Profil',
              aspectRatio: '1/1',
              objectFit: 'cover',
              imageShape: 'circle',
              circleSize: 112,
              imageZoom: 100,
            },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Nama Brand',
            style: {
              ...DEFAULT_STYLE,
              textColor: theme.textColor,
              useThemeTextColor: true,
              padding: 2,
              minHeight: 24,
              marginBottom: 6,
            },
            content: { text: 'Studio Kreatif Nusantara', variant: 'h1', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Bio Singkat',
            style: {
              ...DEFAULT_STYLE,
              textColor: theme.textColor,
              useThemeTextColor: true,
              padding: 2,
              minHeight: 24,
              marginBottom: 0,
            },
            content: {
              text: 'Template presentasi, aset desain, dan panduan bisnis digital siap pakai.',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'link-stack',
    category: 'menu_layout',
    title: 'Daftar Tautan Utama',
    description: '3 tombol tautan utama bertumpuk',
    createBlocks: (theme) => [
      {
        ...createBlock('button', theme),
        label: 'Link Toko Utama',
        content: {
          label: 'Katalog Produk Digital',
          url: 'https://example.com/katalog',
          buttonBg: theme.accentColor,
          buttonText: '#FFFFFF',
        },
      },
      {
        ...createBlock('button', theme),
        label: 'Link WhatsApp',
        content: {
          label: 'Konsultasi via WhatsApp',
          url: 'https://wa.me/628123456789',
          buttonBg: '#0F172A',
          buttonText: '#FFFFFF',
        },
      },
      {
        ...createBlock('button', theme),
        label: 'Link Kelas Online',
        content: {
          label: 'Daftar Kelas Desain Mingguan',
          url: 'https://example.com/kelas',
          buttonBg: '#334155',
          buttonText: '#FFFFFF',
        },
      },
    ],
  },
  {
    id: 'digital-product',
    category: 'katalog_store',
    title: 'Kartu Produk Unggulan',
    description: 'Kartu promo satu produk & tombol beli',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kartu Produk',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          {
            id: createId('img'),
            type: 'image',
            label: 'Banner Produk',
            style: { ...DEFAULT_STYLE, padding: 0, borderRadius: 12, marginBottom: 12, minHeight: 100 },
            content: { src: PRODUCT_CARD_SVG, alt: 'Paket Template UI', aspectRatio: '16/9', objectFit: 'cover' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Judul Produk',
            style: { ...DEFAULT_STYLE, align: 'left', textColor: theme.textColor, padding: 2, marginBottom: 4, minHeight: 24 },
            content: { text: 'Paket 50+ Template Landing Page', variant: 'h2', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Harga Produk',
            style: { ...DEFAULT_STYLE, align: 'left', textColor: theme.accentColor, padding: 2, marginBottom: 12, minHeight: 20 },
            content: { text: 'Rp 149.000 · Akses Seumur Hidup', variant: 'body', fontWeight: 'semibold' },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Beli',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 10, minHeight: 44 },
            content: { label: 'Beli Sekarang', url: 'https://example.com/checkout', buttonBg: theme.accentColor, buttonText: '#FFFFFF' },
          },
        ],
      },
    ],
  },
  {
    id: 'contact-lead',
    category: 'kontak_medsos',
    title: 'Formulir Kontak & Newsletter',
    description: 'Form pengumpulan nama, email & checklist konfirmasi',
    createBlocks: (theme) => [createBlock('form', theme)],
  },
];

export const INITIAL_PROJECT: BuilderProject = {
  title: 'Halaman Kreator Saya',
  theme: THEMES[0],
  advanceOptions: DEFAULT_ADVANCE_OPTIONS,
  blocks: [
    {
      id: 'init_hero_container',
      type: 'container',
      label: 'Kartu Header',
      style: {
        ...DEFAULT_STYLE,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 20,
        marginBottom: 16,
        shadow: 'sm',
        minHeight: 80,
      },
      content: {},
      children: [
        {
          id: 'init_hero_image',
          type: 'image',
          label: 'Gambar Utama',
          style: {
            ...DEFAULT_STYLE,
            padding: 0,
            borderRadius: 14,
            marginBottom: 14,
            minHeight: 140,
          },
          content: {
            src: STARTER_ILLUSTRATION_SVG,
            alt: 'Katalog Produk Digital',
            aspectRatio: '16/9',
            objectFit: 'contain',
          },
        },
        {
          id: 'init_hero_title',
          type: 'text',
          label: 'Judul Utama',
          style: {
            ...DEFAULT_STYLE,
            padding: 4,
            marginBottom: 6,
            minHeight: 28,
            textColor: '#0F172A',
          },
          content: {
            text: 'Studio Kreatif — Katalog Digital',
            variant: 'h1',
            fontWeight: 'bold',
          },
        },
        {
          id: 'init_hero_desc',
          type: 'text',
          label: 'Deskripsi Singkat',
          style: {
            ...DEFAULT_STYLE,
            padding: 4,
            marginBottom: 0,
            minHeight: 24,
            textColor: '#475569',
          },
          content: {
            text: 'Kumpulan template, e-book, dan tautan penting dalam satu halaman mobile yang rapi.',
            variant: 'body',
            fontWeight: 'normal',
          },
        },
      ],
    },
    {
      id: 'init_social_block',
      type: 'social',
      label: 'Ikon Sosial Media',
      style: {
        ...DEFAULT_STYLE,
        padding: 6,
        marginBottom: 16,
        minHeight: 44,
        backgroundColor: 'transparent',
      },
      content: {
        socialItems: DEFAULT_SOCIAL_ITEMS,
        socialStyle: 'filled',
        socialShape: 'circle',
        socialSize: 'md',
        socialIconSize: 40,
        socialGap: 10,
        socialUseBrandColors: true,
        socialColor: '#2563EB',
      },
    },
    {
      id: 'init_catalog_block',
      type: 'catalog',
      label: 'Katalog Produk Digital',
      style: {
        ...DEFAULT_STYLE,
        padding: 0,
        marginBottom: 16,
        minHeight: 100,
      },
      content: {
        catalogItems: DEFAULT_CATALOG_ITEMS,
        catalogProductType: 'physical',
        catalogDetailEnabled: true,
        catalogCartEnabled: true,
        catalogWhatsappNumber: '6281234567890',
        catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
        catalogAskCustomerInfo: true,
        catalogShippingEnabled: true,
      },
    },
    {
      id: 'init_row_actions',
      type: 'row',
      label: '2 Kolom Tautan',
      style: {
        ...DEFAULT_STYLE,
        padding: 0,
        marginBottom: 16,
        minHeight: 46,
      },
      content: {},
      children: [
        {
          id: 'init_row_btn_1',
          type: 'button',
          label: 'Portofolio',
          style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 12, minHeight: 44 },
          content: {
            label: 'Portofolio',
            url: 'https://example.com/portfolio',
            buttonBg: '#FFFFFF',
            buttonText: '#0F172A',
          },
        },
        {
          id: 'init_row_btn_2',
          type: 'button',
          label: 'Hubungi Kami',
          style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 12, minHeight: 44 },
          content: {
            label: 'WhatsApp',
            url: 'https://wa.me/628123456789',
            buttonBg: '#0F172A',
            buttonText: '#FFFFFF',
          },
        },
      ],
    },
    {
      id: 'init_form_lead',
      type: 'form',
      label: 'Form Newsletter',
      style: {
        ...DEFAULT_STYLE,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        shadow: 'sm',
        align: 'left',
        minHeight: 140,
      },
      content: {
        formTitle: 'Dapatkan E-Book Gratis via Email',
        namePlaceholder: 'Nama Anda',
        emailPlaceholder: 'email@domain.com',
        submitLabel: 'Kirim E-Book',
        successMessage: 'Terima kasih! Tautan unduhan telah dikirim.',
        buttonColor: '#2563EB',
      },
    },
  ],
};
