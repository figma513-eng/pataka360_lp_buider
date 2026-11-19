import type { UiAppearanceLabelsMap } from '../types/builder.ts';

export type UiLabelCategory =
  | 'alat'
  | 'blok'
  | 'komponen'
  | 'home'
  | 'desain'
  | 'konten'
  | 'tema';

export interface UiLabelCatalogItem {
  key: string;
  category: UiLabelCategory;
  defaultLabel: string;
  scopeNote: string;
}

export const UI_LABEL_CATEGORIES: Array<{
  id: UiLabelCategory;
  label: string;
  description: string;
}> = [
  {
    id: 'alat',
    label: 'Alat',
    description: 'Tab Alat, header panel komponen kiri, dan seluruh nama item alat.',
  },
  {
    id: 'blok',
    label: 'Blok',
    description: 'Tab Blok, header blok siap pakai, dan seluruh nama preset blok.',
  },
  {
    id: 'komponen',
    label: 'Komponen',
    description: 'Tab Komponen di inspektor kanan beserta nama seluruh tipe komponen.',
  },
  {
    id: 'home',
    label: 'Home',
    description: 'Tab Home, Pengaturan Halaman, Tema Global, Top, Lapisan & Navbar Bawah.',
  },
  {
    id: 'desain',
    label: 'Desain & Isinya',
    description: 'Tab Desain beserta judul bagian (seperti Pengaturan Khusus Komponen) & kontrolnya.',
  },
  {
    id: 'konten',
    label: 'Konten & Isinya',
    description: 'Tab Konten beserta judul bagian & label isian konten komponen.',
  },
  {
    id: 'tema',
    label: 'Tema & Isinya',
    description: 'Tab Tema komponen beserta status pewarisan token, warna & kontrol lokal.',
  },
];

export const UI_LABEL_CATALOG: UiLabelCatalogItem[] = [
  // ============================================================
  // 1. ALAT (Panel Kiri -> Tab Alat)
  // ============================================================
  { key: 'alat.tab', category: 'alat', defaultLabel: 'Alat', scopeNote: 'Judul Tab Panel Kiri' },
  { key: 'alat.header', category: 'alat', defaultLabel: 'Komponen', scopeNote: 'Judul Bagian Alat' },
  { key: 'alat.search', category: 'alat', defaultLabel: 'Cari alat...', scopeNote: 'Placeholder Pencarian Alat' },
  { key: 'alat.tool.hero_profile', category: 'alat', defaultLabel: 'Hero Profil Usaha', scopeNote: 'Item Alat' },
  { key: 'alat.tool.category_tabs', category: 'alat', defaultLabel: 'Tombol Kategori', scopeNote: 'Item Alat' },
  { key: 'alat.tool.fnb_catalog', category: 'alat', defaultLabel: 'Katalog F&B', scopeNote: 'Item Alat' },
  { key: 'alat.tool.row', category: 'alat', defaultLabel: 'Kolom / Row Dinamis', scopeNote: 'Item Alat' },
  { key: 'alat.tool.container', category: 'alat', defaultLabel: 'Kotak / Wadah', scopeNote: 'Item Alat' },
  { key: 'alat.tool.toggle_container', category: 'alat', defaultLabel: 'Wadah Show / Hide', scopeNote: 'Item Alat' },
  { key: 'alat.tool.bottom_sheet', category: 'alat', defaultLabel: 'Bottom Sheet', scopeNote: 'Item Alat' },
  { key: 'alat.tool.menu_icon', category: 'alat', defaultLabel: 'Menu Icon', scopeNote: 'Item Alat' },
  { key: 'alat.tool.catalog_physical', category: 'alat', defaultLabel: 'Katalog Produk Fisik', scopeNote: 'Item Alat' },
  { key: 'alat.tool.catalog_digital', category: 'alat', defaultLabel: 'Katalog Produk Digital', scopeNote: 'Item Alat' },
  { key: 'alat.tool.training_catalog', category: 'alat', defaultLabel: 'Katalog Produk Pelatihan', scopeNote: 'Item Alat' },
  { key: 'alat.tool.text', category: 'alat', defaultLabel: 'Teks Biasa', scopeNote: 'Item Alat' },
  { key: 'alat.tool.image', category: 'alat', defaultLabel: 'Gambar', scopeNote: 'Item Alat' },
  { key: 'alat.tool.button', category: 'alat', defaultLabel: 'Tombol Link', scopeNote: 'Item Alat' },
  { key: 'alat.tool.form', category: 'alat', defaultLabel: 'Form Isian', scopeNote: 'Item Alat' },
  { key: 'alat.tool.divider', category: 'alat', defaultLabel: 'Garis Pembatas', scopeNote: 'Item Alat' },
  { key: 'alat.tool.youtube', category: 'alat', defaultLabel: 'Video YouTube', scopeNote: 'Item Alat' },
  { key: 'alat.tool.facebook_video', category: 'alat', defaultLabel: 'Video Facebook', scopeNote: 'Item Alat' },
  { key: 'alat.tool.tiktok_video', category: 'alat', defaultLabel: 'Video TikTok', scopeNote: 'Item Alat' },
  { key: 'alat.tool.instagram_video', category: 'alat', defaultLabel: 'Video Instagram', scopeNote: 'Item Alat' },
  { key: 'alat.tool.social', category: 'alat', defaultLabel: 'Sosial Media', scopeNote: 'Item Alat' },
  { key: 'alat.tool.social_follower', category: 'alat', defaultLabel: 'Sosial Media + Follower', scopeNote: 'Item Alat' },

  // ============================================================
  // 2. BLOK (Panel Kiri -> Tab Blok)
  // ============================================================
  { key: 'blok.tab', category: 'blok', defaultLabel: 'Blok', scopeNote: 'Judul Tab Panel Kiri' },
  { key: 'blok.header', category: 'blok', defaultLabel: 'Blok Siap Pakai', scopeNote: 'Judul Bagian Blok' },
  { key: 'blok.search', category: 'blok', defaultLabel: 'Cari blok siap pakai...', scopeNote: 'Placeholder Pencarian Blok' },
  { key: 'blok.sec.hero-profil-kompak', category: 'blok', defaultLabel: 'Hero Profil Kompak (Status & Jam)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.hero-profil-banner', category: 'blok', defaultLabel: 'Hero Profil Banner Full Atas', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.tombol-kategori-scroll', category: 'blok', defaultLabel: 'Tombol Kategori (Slide Horizontal / Vertikal)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.row-slide-horizontal', category: 'blok', defaultLabel: 'Row 5 Kolom Slide Horizontal', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.katalog-fnb', category: 'blok', defaultLabel: 'Katalog F&B + Keranjang Mengambang', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kotak-outlet-dinamis', category: 'blok', defaultLabel: 'Kotak Info Outlet & Google Maps', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kotak-promo-gradasi', category: 'blok', defaultLabel: 'Kotak Promo CTA Gradasi Dinamis', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.bottom-sheet-maps', category: 'blok', defaultLabel: 'Icon Maps → Bottom Sheet', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.lokasi-maps', category: 'blok', defaultLabel: 'Lokasi Maps & Ulasan', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.sosmed-postingan', category: 'blok', defaultLabel: 'Sosmed & Postingan Carousel', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.foto-carousel', category: 'blok', defaultLabel: 'Galeri Foto Carousel', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.katalog-produk-pelatihan', category: 'blok', defaultLabel: 'Katalog Produk Pelatihan', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.katalog-produk-fisik', category: 'blok', defaultLabel: 'Katalog Produk Fisik', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.katalog-produk-digital', category: 'blok', defaultLabel: 'Katalog Produk Digital', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.hero-profile', category: 'blok', defaultLabel: 'Hero Profil Kreator', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.link-stack', category: 'blok', defaultLabel: 'Daftar Tautan Utama', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.digital-product', category: 'blok', defaultLabel: 'Kartu Produk Unggulan', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.contact-lead', category: 'blok', defaultLabel: 'Formulir Kontak & Newsletter', scopeNote: 'Blok Siap Pakai' },

  // ============================================================
  // 3. KOMPONEN (Inspektor Kanan -> Switcher & Nama Tipe Komponen)
  // ============================================================
  { key: 'komponen.tab', category: 'komponen', defaultLabel: 'Komponen', scopeNote: 'Tombol Mode Inspektor' },
  { key: 'komponen.action.duplicate', category: 'komponen', defaultLabel: 'Duplikat Komponen', scopeNote: 'Tombol / Tooltip Aksi' },
  { key: 'komponen.action.resetTheme', category: 'komponen', defaultLabel: 'Kembalikan Gaya Tema Global', scopeNote: 'Tooltip Reset Tema' },
  { key: 'komponen.type.row', category: 'komponen', defaultLabel: 'Kolom / Row', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.container', category: 'komponen', defaultLabel: 'Wadah', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.toggle_container', category: 'komponen', defaultLabel: 'Wadah Show/Hide', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.text', category: 'komponen', defaultLabel: 'Teks Biasa', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.image', category: 'komponen', defaultLabel: 'Gambar', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.button', category: 'komponen', defaultLabel: 'Tombol Link', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.form', category: 'komponen', defaultLabel: 'Form Isian', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.divider', category: 'komponen', defaultLabel: 'Garis Pembatas', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.youtube', category: 'komponen', defaultLabel: 'Video YouTube', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.facebook_video', category: 'komponen', defaultLabel: 'Video Facebook', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.tiktok_video', category: 'komponen', defaultLabel: 'Video TikTok', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.instagram_video', category: 'komponen', defaultLabel: 'Video Instagram', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.catalog', category: 'komponen', defaultLabel: 'Katalog Produk', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.social', category: 'komponen', defaultLabel: 'Sosial Media', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.social_follower', category: 'komponen', defaultLabel: 'Sosial Media + Follower', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.carousel', category: 'komponen', defaultLabel: 'Foto Carousel', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.social_feed', category: 'komponen', defaultLabel: 'Sosmed & Postingan', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.maps_place', category: 'komponen', defaultLabel: 'Lokasi Maps', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.bottom_sheet', category: 'komponen', defaultLabel: 'Bottom Sheet', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.training_catalog', category: 'komponen', defaultLabel: 'Katalog Produk Pelatihan', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.hero_profile', category: 'komponen', defaultLabel: 'Hero Profil', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.fnb_catalog', category: 'komponen', defaultLabel: 'Katalog F&B', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.category_tabs', category: 'komponen', defaultLabel: 'Tombol Kategori', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.menu_icon', category: 'komponen', defaultLabel: 'Menu Icon', scopeNote: 'Nama Tipe Komponen' },

  // ============================================================
  // 4. HOME (Inspektor Kanan -> Home & Pengaturan Halaman)
  // ============================================================
  { key: 'home.tab', category: 'home', defaultLabel: 'Home', scopeNote: 'Tombol Mode Home' },
  { key: 'home.title', category: 'home', defaultLabel: 'Pengaturan Halaman', scopeNote: 'Judul Header Home' },
  { key: 'home.subtitle', category: 'home', defaultLabel: 'Tema Global, Top, Lapisan & Navbar', scopeNote: 'Subjudul Header Home' },
  { key: 'home.sec.temaGlobal', category: 'home', defaultLabel: 'Tema Global', scopeNote: 'Bagian Accordion Home' },
  { key: 'home.sec.top', category: 'home', defaultLabel: 'Top', scopeNote: 'Bagian Accordion Home' },
  { key: 'home.sec.body', category: 'home', defaultLabel: 'Body (Lapisan)', scopeNote: 'Bagian Accordion Home' },
  { key: 'home.sec.bottom', category: 'home', defaultLabel: 'Bottom (Navbar Bawah)', scopeNote: 'Bagian Accordion Home' },
  { key: 'home.field.fontUtama', category: 'home', defaultLabel: 'Font Utama Halaman', scopeNote: 'Isi Tema Global' },
  { key: 'home.field.presetTema', category: 'home', defaultLabel: 'Preset Tema', scopeNote: 'Isi Tema Global' },
  { key: 'home.field.warnaTemaManual', category: 'home', defaultLabel: 'Warna Tema Manual', scopeNote: 'Isi Tema Global' },
  { key: 'home.field.jarakAtas', category: 'home', defaultLabel: 'Jarak Atas Halaman', scopeNote: 'Isi Top' },
  { key: 'home.field.navbarBawah', category: 'home', defaultLabel: 'Navbar Bawah', scopeNote: 'Isi Bottom' },
  { key: 'home.field.posisiNavbar', category: 'home', defaultLabel: 'Posisi Navbar', scopeNote: 'Isi Bottom' },
  { key: 'home.field.gayaTombolTengah', category: 'home', defaultLabel: 'Gaya Tombol Tengah (Home)', scopeNote: 'Isi Bottom' },
  { key: 'home.field.ukuranPosisiShadow', category: 'home', defaultLabel: 'Ukuran, Posisi Naik/Turun & Shadow', scopeNote: 'Isi Bottom' },
  { key: 'home.field.warnaNavbar', category: 'home', defaultLabel: 'Warna Navbar', scopeNote: 'Isi Bottom' },
  { key: 'home.field.menuNavbar', category: 'home', defaultLabel: '5 Menu Navbar', scopeNote: 'Isi Bottom' },

  // ============================================================
  // 5. DESAIN DAN ISINYA
  // ============================================================
  { key: 'desain.tab', category: 'desain', defaultLabel: 'Desain', scopeNote: 'Tab Desain Komponen' },
  { key: 'desain.sec.specific', category: 'desain', defaultLabel: 'Pengaturan Khusus Komponen', scopeNote: 'Bagian Accordion Desain' },
  { key: 'desain.sec.layout', category: 'desain', defaultLabel: 'Layout & Spasi', scopeNote: 'Bagian Accordion Desain' },
  { key: 'desain.sec.visual', category: 'desain', defaultLabel: 'Gaya Visual', scopeNote: 'Bagian Accordion Desain' },
  { key: 'desain.sec.typo', category: 'desain', defaultLabel: 'Tipografi', scopeNote: 'Bagian Accordion Desain' },
  { key: 'desain.sec.bg', category: 'desain', defaultLabel: 'Background & Warna', scopeNote: 'Bagian Accordion Desain' },
  { key: 'desain.sec.border', category: 'desain', defaultLabel: 'Border & Garis Tepi', scopeNote: 'Bagian Accordion Desain' },
  { key: 'desain.field.modelHero', category: 'desain', defaultLabel: 'Model Hero Profil', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.fullAtasSamping', category: 'desain', defaultLabel: 'Full Atas & Samping', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.ukuranLingkaranLogo', category: 'desain', defaultLabel: 'Ukuran Lingkaran Logo', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.ukuranJudulUsaha', category: 'desain', defaultLabel: 'Ukuran Judul Usaha', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.ukuranTagline', category: 'desain', defaultLabel: 'Ukuran Tagline', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.ukuranInfoJamAlamat', category: 'desain', defaultLabel: 'Ukuran Info Jam & Alamat', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.lengkungSudutKartuInfo', category: 'desain', defaultLabel: 'Lengkung Sudut Kartu Info', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.layoutKategori', category: 'desain', defaultLabel: 'Tampilan & Mode Slide Kategori', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.layoutRow', category: 'desain', defaultLabel: 'Mode Susunan Kolom', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.jumlahKolomGrid', category: 'desain', defaultLabel: 'Jumlah Kolom per Baris (Grid)', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.lebarKolom', category: 'desain', defaultLabel: 'Ukuran Lebar Tiap Kolom', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.tinggiKolom', category: 'desain', defaultLabel: 'Tinggi Minimal Kolom', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.jarakKolom', category: 'desain', defaultLabel: 'Jarak Antar Kolom', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.tampilanKatalog', category: 'desain', defaultLabel: 'Block Layout Katalog', scopeNote: 'Isi Pengaturan Khusus' },
  { key: 'desain.field.fullKananKiri', category: 'desain', defaultLabel: 'Full Kanan-Kiri', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.jarakAtasHalaman', category: 'desain', defaultLabel: 'Jarak Atas Halaman', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.posisiIsi', category: 'desain', defaultLabel: 'Posisi Isi di Dalamnya', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.lebarElemen', category: 'desain', defaultLabel: 'Lebar Elemen', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.tinggiMinimal', category: 'desain', defaultLabel: 'Tinggi Minimal', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.paddingAtasBawah', category: 'desain', defaultLabel: 'Padding Atas & Bawah', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.paddingKananKiri', category: 'desain', defaultLabel: 'Padding Kanan & Kiri', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.jarakBawah', category: 'desain', defaultLabel: 'Jarak Bawah (Margin)', scopeNote: 'Isi Layout & Spasi' },
  { key: 'desain.field.lengkungSudut', category: 'desain', defaultLabel: 'Lengkung Sudut', scopeNote: 'Isi Gaya Visual' },
  { key: 'desain.field.efekKaca', category: 'desain', defaultLabel: 'Efek Kaca (Blur)', scopeNote: 'Isi Gaya Visual' },
  { key: 'desain.field.efekBayangan', category: 'desain', defaultLabel: 'Efek Bayangan (Shadow)', scopeNote: 'Isi Gaya Visual' },
  { key: 'desain.field.efekHoverLift', category: 'desain', defaultLabel: 'Efek Hover Lift', scopeNote: 'Isi Gaya Visual' },
  { key: 'desain.field.jenisFont', category: 'desain', defaultLabel: 'Jenis Font', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.ukuranTeks', category: 'desain', defaultLabel: 'Ukuran Teks (Font Size)', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.ketebalanTeks', category: 'desain', defaultLabel: 'Ketebalan Teks (Weight)', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.tinggiBaris', category: 'desain', defaultLabel: 'Tinggi Baris (Line Height)', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.latarGradasi', category: 'desain', defaultLabel: 'Latar & Gradasi', scopeNote: 'Isi Background & Warna' },
  { key: 'desain.field.warnaTeks', category: 'desain', defaultLabel: 'Warna Teks', scopeNote: 'Isi Background & Warna' },
  { key: 'desain.field.ketebalanGarisTepi', category: 'desain', defaultLabel: 'Ketebalan Garis Tepi', scopeNote: 'Isi Border & Garis Tepi' },
  { key: 'desain.field.warnaGarisTepi', category: 'desain', defaultLabel: 'Warna Garis Tepi', scopeNote: 'Isi Border & Garis Tepi' },

  // ============================================================
  // 6. KONTEN DAN ISINYA
  // ============================================================
  { key: 'konten.tab', category: 'konten', defaultLabel: 'Konten', scopeNote: 'Tab Konten Komponen' },
  { key: 'konten.sec.identity', category: 'konten', defaultLabel: 'Identitas Komponen', scopeNote: 'Bagian Accordion Konten' },
  { key: 'konten.sec.main', category: 'konten', defaultLabel: 'Konten Utama', scopeNote: 'Bagian Accordion Konten' },
  { key: 'konten.sec.items', category: 'konten', defaultLabel: 'Data & Daftar Item', scopeNote: 'Bagian Accordion Konten' },
  { key: 'konten.sec.nav', category: 'konten', defaultLabel: 'Tautan & Navigasi', scopeNote: 'Bagian Accordion Konten' },
  { key: 'konten.sec.actions', category: 'konten', defaultLabel: 'Aksi & Interaksi', scopeNote: 'Bagian Accordion Konten' },
  { key: 'konten.sec.extra', category: 'konten', defaultLabel: 'Pengaturan Tambahan', scopeNote: 'Bagian Accordion Konten' },
  { key: 'konten.field.namaLapisan', category: 'konten', defaultLabel: 'Nama Lapisan Komponen', scopeNote: 'Isi Identitas Komponen' },
  { key: 'konten.field.isiTeks', category: 'konten', defaultLabel: 'Isi Teks', scopeNote: 'Isi Konten Utama' },
  { key: 'konten.field.gambarUtama', category: 'konten', defaultLabel: 'Gambar Utama (Upload atau URL)', scopeNote: 'Isi Konten Utama' },
  { key: 'konten.field.teksTombol', category: 'konten', defaultLabel: 'Teks Tombol', scopeNote: 'Isi Konten Utama' },
  { key: 'konten.field.judulForm', category: 'konten', defaultLabel: 'Judul Form', scopeNote: 'Isi Konten Utama' },
  { key: 'konten.field.urlTujuan', category: 'konten', defaultLabel: 'URL Tujuan', scopeNote: 'Isi Tautan & Navigasi' },
  { key: 'konten.field.linkGoogleMaps', category: 'konten', defaultLabel: 'Link Google Maps (Opsional)', scopeNote: 'Isi Tautan & Navigasi' },
  { key: 'konten.field.labelTombolMaps', category: 'konten', defaultLabel: 'Label Tombol Maps', scopeNote: 'Isi Tautan & Navigasi' },
  { key: 'konten.field.halamanDetailProduk', category: 'konten', defaultLabel: 'Halaman Detail Produk', scopeNote: 'Isi Aksi & Interaksi' },
  { key: 'konten.field.keranjangWhatsapp', category: 'konten', defaultLabel: 'Keranjang WhatsApp', scopeNote: 'Isi Aksi & Interaksi' },
  { key: 'konten.field.noWhatsappCheckout', category: 'konten', defaultLabel: 'Nomor WhatsApp Checkout', scopeNote: 'Isi Aksi & Interaksi' },
  { key: 'konten.field.labelTombolKirim', category: 'konten', defaultLabel: 'Label Tombol Kirim', scopeNote: 'Isi Aksi & Interaksi' },
  { key: 'konten.field.tambahElemenWadah', category: 'konten', defaultLabel: '+ Tambah Elemen ke Wadah', scopeNote: 'Isi Data & Daftar Item' },

  // ============================================================
  // 7. TEMA DAN ISINYA
  // ============================================================
  { key: 'tema.tab', category: 'tema', defaultLabel: 'Tema', scopeNote: 'Tab Tema Komponen' },
  { key: 'tema.status.globalTitle', category: 'tema', defaultLabel: 'Mengikuti Tema Global', scopeNote: 'Banner Status Tema' },
  { key: 'tema.status.localTitle', category: 'tema', defaultLabel: 'Tema Komponen Disesuaikan Lokal', scopeNote: 'Banner Status Tema' },
  { key: 'tema.mode.global', category: 'tema', defaultLabel: 'Gunakan Tema Global', scopeNote: 'Tombol Mode Tema' },
  { key: 'tema.mode.local', category: 'tema', defaultLabel: 'Sesuaikan Lokal', scopeNote: 'Tombol Mode Tema' },
  { key: 'tema.sec.pewarisanToken', category: 'tema', defaultLabel: 'Status Pewarisan Token', scopeNote: 'Judul Bagian Tema' },
  { key: 'tema.token.textColor', category: 'tema', defaultLabel: 'Teks', scopeNote: 'Badge Token' },
  { key: 'tema.token.backgroundColor', category: 'tema', defaultLabel: 'Latar', scopeNote: 'Badge Token' },
  { key: 'tema.token.borderColor', category: 'tema', defaultLabel: 'Border', scopeNote: 'Badge Token' },
  { key: 'tema.token.accentColor', category: 'tema', defaultLabel: 'Aksen', scopeNote: 'Badge Token' },
  { key: 'tema.token.fontFamily', category: 'tema', defaultLabel: 'Font', scopeNote: 'Badge Token' },
  { key: 'tema.sec.pengaturanLokal', category: 'tema', defaultLabel: 'Pengaturan Token Lokal', scopeNote: 'Judul Bagian Kontrol Lokal' },
  { key: 'tema.field.warnaTeks', category: 'tema', defaultLabel: 'Warna Teks', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.field.latarKomponen', category: 'tema', defaultLabel: 'Latar Komponen', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.field.warnaGarisTepi', category: 'tema', defaultLabel: 'Warna Garis Tepi (Border)', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.field.jenisFontKomponen', category: 'tema', defaultLabel: 'Jenis Font Komponen', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.action.resetGlobal', category: 'tema', defaultLabel: 'Kembalikan ke Tema Global', scopeNote: 'Tombol Reset Tema' },
];

export const UI_LABEL_DEFAULT_MAP: Record<string, string> = Object.fromEntries(
  UI_LABEL_CATALOG.map((item) => [item.key, item.defaultLabel])
);

export const UI_LABEL_VALID_KEY_SET: Set<string> = new Set(
  UI_LABEL_CATALOG.map((item) => item.key)
);

export function sanitizeUiAppearanceLabelsMap(raw: unknown): UiAppearanceLabelsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean: UiAppearanceLabelsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || typeof key !== 'string' || key.length > 120) continue;
    if (typeof val !== 'string') continue;
    // Strip control chars cleanly
    const normalized = val.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 120);
    if (!normalized) continue;
    const def = UI_LABEL_DEFAULT_MAP[key];
    if (def && normalized === def) continue;
    clean[key] = normalized;
  }
  return clean;
}

export function resolveUiLabel(
  labelsMap: UiAppearanceLabelsMap | undefined | null,
  key: string,
  fallback?: string
): string {
  const custom = labelsMap?.[key];
  if (typeof custom === 'string' && custom.trim().length > 0) {
    return custom.trim();
  }
  if (fallback !== undefined && fallback.length > 0) {
    return fallback;
  }
  return UI_LABEL_DEFAULT_MAP[key] ?? key;
}
