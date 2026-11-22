import type { UiAppearanceHiddenMap, UiAppearanceLabelsMap } from '../types/builder.ts';

export type UiLabelCategory =
  | 'konten_items'
  | 'konten_main'
  | 'konten_nav'
  | 'konten_general'
  | 'konten_actions'
  | 'desain'
  | 'tema'
  | 'home'
  | 'alat'
  | 'blok'
  | 'komponen'
  | 'topbar_canvas';

export type UiLabelKind = 'judul' | 'label' | 'deskripsi';

export interface UiLabelCatalogItem {
  key: string;
  category: UiLabelCategory;
  defaultLabel: string;
  scopeNote: string;
  kind?: UiLabelKind;
  groupTitle?: string;
}

export function getUiLabelKind(item: UiLabelCatalogItem): UiLabelKind {
  if (item.kind) return item.kind;
  if (item.key.includes('.desc.')) return 'deskripsi';
  if (item.key.includes('.sec.')) return 'judul';
  return 'label';
}

export const UI_LABEL_CATEGORIES: Array<{
  id: UiLabelCategory;
  label: string;
  description: string;
  isCoreContentSection?: boolean;
}> = [
  {
    id: 'konten_items',
    label: '1. Data & Daftar Item',
    description:
      'Judul, label, dan deskripsi untuk daftar produk, menu F&B, pelatihan, foto carousel, sosmed, tombol kategori, kolom/row, dan isi wadah.',
    isCoreContentSection: true,
  },
  {
    id: 'konten_main',
    label: '2. Konten Utama',
    description:
      'Judul, label, dan deskripsi konten inti untuk teks, gambar, hero profil, kartu dinamis, formulir, maps, video, ikon menu, dan tombol.',
    isCoreContentSection: true,
  },
  {
    id: 'konten_nav',
    label: '3. Tautan & Navigasi',
    description:
      'Judul, label, dan deskripsi tautan URL, aksi klik lapisan/kartu, sheet 4 arah, pindah halaman, gulir kartu, dan tombol kembali.',
    isCoreContentSection: true,
  },
  {
    id: 'konten_general',
    label: '4. Pengaturan Umum',
    description:
      'Judul, label, dan deskripsi nama lapisan, visibilitas komponen, mode wadah induk–anak (slider), dan koneksi Pusat WhatsApp.',
    isCoreContentSection: true,
  },
  {
    id: 'konten_actions',
    label: '5. Aksi & Interaksi',
    description:
      'Judul, label, dan deskripsi keranjang universal, checkout WhatsApp, detail produk, wadah show/hide, bottom sheet, dan tombol kirim.',
    isCoreContentSection: true,
  },
  {
    id: 'desain',
    label: 'Desain & Khusus Komponen',
    description:
      'Tab Desain beserta Pengaturan Khusus Komponen (paling atas), Gaya Visual, Tata Letak, Posisi, Tipografi, dan Efek.',
  },
  {
    id: 'tema',
    label: 'Tema & Token Lokal',
    description: 'Tab Tema komponen beserta status pewarisan token, warna & kontrol lokal.',
  },
  {
    id: 'home',
    label: 'Tema, Halaman, Layer & Navbar',
    description:
      'Tab Tema & Tab Layer di panel kiri: Tema Global, Multi Halaman (Beranda & Site), Top, Body (Lapisan), serta Bottom & Lapisan Modal Navbar Bawah.',
  },
  {
    id: 'alat',
    label: 'Alat (Panel Kiri)',
    description: 'Tab Alat, header panel komponen kiri, deskripsi, dan seluruh nama item alat mandiri.',
  },
  {
    id: 'blok',
    label: 'Blok Siap Pakai',
    description: 'Tab Blok, filter kategori blok, header, dan seluruh nama preset blok siap pakai.',
  },
  {
    id: 'komponen',
    label: 'Komponen & Inspektor Kanan',
    description: 'Header Panel Properti kanan, tab Konten, sub-layer breadcrumb, aksi cepat, dan nama seluruh tipe komponen.',
  },
  {
    id: 'topbar_canvas',
    label: 'Navigasi Atas & Toolbar Kanvas',
    description:
      'Menu navigasi TopBar (Editor, Analitik, Iklan, Pengaturan, Simpan, Pratinjau, Keluar) serta toolbar kanvas (Beranda, Perangkat, Mode Klik/Drag, Undo/Redo, Aksi Melayang).',
  },
];

export const UI_LABEL_CATALOG: UiLabelCatalogItem[] = [
  // ============================================================
  // 1. DATA & DAFTAR ITEM (Judul, Label, Deskripsi)
  // ============================================================
  {
    key: 'konten.sec.items',
    category: 'konten_items',
    defaultLabel: 'Data & Daftar Item',
    scopeNote: 'Judul Bagian · Katalog, F&B, Pelatihan, Carousel, Sosmed, Kategori, Row, Wadah, Sheet, Ikon Menu',
    kind: 'judul',
    groupTitle: '1. Data & Daftar Item',
  },
  {
    key: 'konten.items.title.isiWadah',
    category: 'konten_items',
    defaultLabel: 'Isi Komponen Wadah',
    scopeNote: 'Judul · Wadah, Wadah Show/Hide, Panel Geser Bawah, Ikon Menu',
    kind: 'judul',
    groupTitle: 'Wadah & Panel Sheet',
  },
  {
    key: 'konten.field.tambahElemenWadah',
    category: 'konten_items',
    defaultLabel: '+ Tambah Elemen ke Wadah',
    scopeNote: 'Label · Wadah, Wadah Show/Hide, Panel Geser Bawah, Ikon Menu',
    kind: 'label',
    groupTitle: 'Wadah & Panel Sheet',
  },
  {
    key: 'konten.desc.wadahKosong',
    category: 'konten_items',
    defaultLabel: 'Wadah ini masih kosong. Tambahkan komponen di bawah.',
    scopeNote: 'Deskripsi · Wadah, Wadah Show/Hide, Panel Geser Bawah, Ikon Menu',
    kind: 'deskripsi',
    groupTitle: 'Wadah & Panel Sheet',
  },
  {
    key: 'konten.items.label.namaProduk',
    category: 'konten_items',
    defaultLabel: 'Nama Produk',
    scopeNote: 'Label · Katalog Produk Fisik & Digital',
    kind: 'label',
    groupTitle: 'Katalog Produk',
  },
  {
    key: 'konten.items.label.ringkasanItem',
    category: 'konten_items',
    defaultLabel: 'Ringkasan',
    scopeNote: 'Label · Katalog Produk Fisik & Digital',
    kind: 'label',
    groupTitle: 'Katalog Produk',
  },
  {
    key: 'konten.items.label.hargaItem',
    category: 'konten_items',
    defaultLabel: 'Harga',
    scopeNote: 'Label · Katalog Produk & Katalog F&B',
    kind: 'label',
    groupTitle: 'Katalog Produk & F&B',
  },
  {
    key: 'konten.items.label.namaMenu',
    category: 'konten_items',
    defaultLabel: 'Nama Menu',
    scopeNote: 'Label · Katalog F&B',
    kind: 'label',
    groupTitle: 'Katalog F&B',
  },
  {
    key: 'konten.items.label.judulFoto',
    category: 'konten_items',
    defaultLabel: 'Judul Foto',
    scopeNote: 'Label · Galeri Foto Carousel',
    kind: 'label',
    groupTitle: 'Foto Carousel',
  },
  {
    key: 'konten.items.label.platformSosmed',
    category: 'konten_items',
    defaultLabel: 'Platform',
    scopeNote: 'Label · Sosial Media & Sosial Media + Pengikut',
    kind: 'label',
    groupTitle: 'Sosial Media',
  },
  {
    key: 'konten.items.label.labelTombolKategori',
    category: 'konten_items',
    defaultLabel: 'Label Tombol',
    scopeNote: 'Label · Tombol Kategori',
    kind: 'label',
    groupTitle: 'Tombol Kategori',
  },
  {
    key: 'konten.items.label.tujuanGulirKategori',
    category: 'konten_items',
    defaultLabel: 'Judul Tujuan Gulir',
    scopeNote: 'Label · Tombol Kategori',
    kind: 'label',
    groupTitle: 'Tombol Kategori',
  },
  {
    key: 'konten.desc.produkKosong',
    category: 'konten_items',
    defaultLabel: 'Item produk tidak ditemukan.',
    scopeNote: 'Deskripsi · Katalog Produk saat item tidak ditemukan',
    kind: 'deskripsi',
    groupTitle: 'Katalog Produk',
  },

  // ============================================================
  // 2. KONTEN UTAMA (Judul, Label, Deskripsi)
  // ============================================================
  {
    key: 'konten.sec.main',
    category: 'konten_main',
    defaultLabel: 'Konten Utama',
    scopeNote: 'Judul Bagian · Teks, Gambar, Hero Profil, F&B, Pelatihan, Sosmed, Maps, Tombol, Form, Video, Ikon Menu, Keranjang, Kartu Dinamis, Tombol Kembali',
    kind: 'judul',
    groupTitle: '2. Konten Utama',
  },
  {
    key: 'konten.field.isiTeks',
    category: 'konten_main',
    defaultLabel: 'Isi Teks',
    scopeNote: 'Judul · Alat Teks Biasa',
    kind: 'judul',
    groupTitle: 'Teks Biasa',
  },
  {
    key: 'konten.desc.teksKosong',
    category: 'konten_main',
    defaultLabel: 'Teks kosong otomatis disembunyikan di pratinjau & halaman publik.',
    scopeNote: 'Deskripsi · Alat Teks Biasa',
    kind: 'deskripsi',
    groupTitle: 'Teks Biasa',
  },
  {
    key: 'konten.field.gambarUtama',
    category: 'konten_main',
    defaultLabel: 'Gambar Utama (Upload atau URL)',
    scopeNote: 'Label · Alat Gambar',
    kind: 'label',
    groupTitle: 'Gambar',
  },
  {
    key: 'konten.main.label.namaUsaha',
    category: 'konten_main',
    defaultLabel: 'Nama Usaha / Judul',
    scopeNote: 'Label · Hero Profil Usaha & Blok Hero',
    kind: 'label',
    groupTitle: 'Hero Profil Usaha',
  },
  {
    key: 'konten.main.label.taglineUsaha',
    category: 'konten_main',
    defaultLabel: 'Tagline / Deskripsi',
    scopeNote: 'Label · Hero Profil Usaha & Blok Hero',
    kind: 'label',
    groupTitle: 'Hero Profil Usaha',
  },
  {
    key: 'konten.main.label.jamBuka',
    category: 'konten_main',
    defaultLabel: 'Jam Buka',
    scopeNote: 'Label · Hero Profil Usaha',
    kind: 'label',
    groupTitle: 'Hero Profil Usaha',
  },
  {
    key: 'konten.main.label.lokasiAlamat',
    category: 'konten_main',
    defaultLabel: 'Lokasi / Alamat',
    scopeNote: 'Label · Hero Profil Usaha & Lokasi Maps',
    kind: 'label',
    groupTitle: 'Hero Profil & Maps',
  },
  {
    key: 'konten.desc.heroBannerOverlap',
    category: 'konten_main',
    defaultLabel: 'Pilih model Banner Overlap di tab Desain untuk menampilkan cover di bagian atas profil.',
    scopeNote: 'Deskripsi · Hero Profil Usaha',
    kind: 'deskripsi',
    groupTitle: 'Hero Profil Usaha',
  },
  {
    key: 'konten.main.label.namaTokoFnb',
    category: 'konten_main',
    defaultLabel: 'Nama Toko / Warung F&B',
    scopeNote: 'Label · Katalog F&B',
    kind: 'label',
    groupTitle: 'Katalog F&B',
  },
  {
    key: 'konten.main.label.namaPelatihan',
    category: 'konten_main',
    defaultLabel: 'Nama Pelatihan',
    scopeNote: 'Label · Katalog Produk Pelatihan',
    kind: 'label',
    groupTitle: 'Katalog Pelatihan',
  },
  {
    key: 'konten.main.label.namaTempatMaps',
    category: 'konten_main',
    defaultLabel: 'Nama Tempat / Lokasi',
    scopeNote: 'Label · Lokasi Maps & Ulasan',
    kind: 'label',
    groupTitle: 'Lokasi Maps',
  },
  {
    key: 'konten.field.teksTombol',
    category: 'konten_main',
    defaultLabel: 'Teks Tombol',
    scopeNote: 'Label · Tombol Tautan',
    kind: 'label',
    groupTitle: 'Tombol Tautan',
  },
  {
    key: 'konten.main.label.labelMenuIcon',
    category: 'konten_main',
    defaultLabel: 'Label Menu Icon',
    scopeNote: 'Label · Ikon Menu',
    kind: 'label',
    groupTitle: 'Ikon Menu',
  },
  {
    key: 'konten.main.label.labelTombolKembali',
    category: 'konten_main',
    defaultLabel: 'Label Tombol Kembali',
    scopeNote: 'Label · Tombol Kembali (Back)',
    kind: 'label',
    groupTitle: 'Tombol Kembali',
  },
  {
    key: 'konten.main.label.urlSampulVideo',
    category: 'konten_main',
    defaultLabel: 'URL Gambar Sampul (Opsional)',
    scopeNote: 'Label · Video YouTube, Facebook, TikTok, Instagram',
    kind: 'label',
    groupTitle: 'Video',
  },
  {
    key: 'konten.field.judulForm',
    category: 'konten_main',
    defaultLabel: 'Judul Form',
    scopeNote: 'Label · Formulir Isian',
    kind: 'label',
    groupTitle: 'Formulir Dinamis',
  },
  {
    key: 'konten.desc.formChecklistWajib',
    category: 'konten_main',
    defaultLabel: 'Nomor Pilihan Wajib Dicentang (pisahkan koma, mulai dari 1)',
    scopeNote: 'Deskripsi · Formulir Dinamis (aturan centang spesifik)',
    kind: 'deskripsi',
    groupTitle: 'Formulir Dinamis',
  },
  {
    key: 'konten.desc.formWaKhusus',
    category: 'konten_main',
    defaultLabel: 'Nomor WhatsApp Khusus (opsional, kosong = pakai Pusat WhatsApp)',
    scopeNote: 'Deskripsi · Formulir Dinamis (integrasi WhatsApp)',
    kind: 'deskripsi',
    groupTitle: 'Formulir Dinamis',
  },
  {
    key: 'konten.field.jenisTampilanKartu',
    category: 'konten_main',
    defaultLabel: 'Jenis Tampilan Kartu',
    scopeNote: 'Label · Kartu Dinamis (Showcase Card)',
    kind: 'label',
    groupTitle: 'Kartu Dinamis',
  },
  {
    key: 'konten.field.modeDinamisKartu',
    category: 'konten_main',
    defaultLabel: 'Mode Dinamis & Drag-Drop Isi Kartu',
    scopeNote: 'Judul · Kartu Dinamis (Showcase Card)',
    kind: 'judul',
    groupTitle: 'Mode Dinamis & Drag-Drop Isi Kartu',
  },
  {
    key: 'konten.desc.modeDinamisKartu',
    category: 'konten_main',
    defaultLabel: 'Tarik langsung alat/blok ke kartu di kanvas, atau tambah komponen di Zona Atas & Strip Bawah di bawah ini.',
    scopeNote: 'Deskripsi · Kartu Dinamis (Showcase Card)',
    kind: 'deskripsi',
    groupTitle: 'Mode Dinamis & Drag-Drop Isi Kartu',
  },
  {
    key: 'konten.field.tampilkanKontenBawaan',
    category: 'konten_main',
    defaultLabel: 'Tampilkan Konten Bawaan (Atas)',
    scopeNote: 'Label · Kartu Dinamis (Sakelar Visibilitas Konten Atas)',
    kind: 'label',
    groupTitle: 'Mode Dinamis & Drag-Drop Isi Kartu',
  },
  {
    key: 'konten.field.tampilkanStripBawaan',
    category: 'konten_main',
    defaultLabel: 'Tampilkan Total / Strip Bawaan (Bawah)',
    scopeNote: 'Label · Kartu Dinamis (Sakelar Visibilitas Strip Bawah)',
    kind: 'label',
    groupTitle: 'Mode Dinamis & Drag-Drop Isi Kartu',
  },
  {
    key: 'konten.field.zonaAtasKartu',
    category: 'konten_main',
    defaultLabel: 'Zona Atas / Isi Kartu',
    scopeNote: 'Judul · Kartu Dinamis (Komponen Anak Zona Atas)',
    kind: 'judul',
    groupTitle: 'Zona Atas / Isi Kartu',
  },
  {
    key: 'konten.field.stripBawahKartu',
    category: 'konten_main',
    defaultLabel: 'Strip Bawah / Area Warna',
    scopeNote: 'Judul · Kartu Dinamis (Komponen Anak Strip Bawah)',
    kind: 'judul',
    groupTitle: 'Strip Bawah / Area Warna',
  },
  {
    key: 'konten.desc.stripBawahKartu',
    category: 'konten_main',
    defaultLabel: 'Klik komponen di strip bawah untuk atur Aksi: Keranjang, Bottom/Left/Right/Top Sheet, Halaman 2, atau Link.',
    scopeNote: 'Deskripsi · Kartu Dinamis (Area Aksi Strip Bawah)',
    kind: 'deskripsi',
    groupTitle: 'Strip Bawah / Area Warna',
  },
  {
    key: 'konten.sec.extra',
    category: 'konten_main',
    defaultLabel: 'Pengaturan Tambahan',
    scopeNote: 'Judul Bagian · Katalog, Hero Profil, Sosmed Postingan, Pelatihan',
    kind: 'judul',
    groupTitle: 'Pengaturan Tambahan',
  },

  // ============================================================
  // 3. TAUTAN & NAVIGASI (Judul, Label, Deskripsi)
  // ============================================================
  {
    key: 'konten.sec.nav',
    category: 'konten_nav',
    defaultLabel: 'Tautan & Navigasi',
    scopeNote: 'Judul Bagian · Semua Alat & Blok (kecuali Garis Pembatas & Tombol Kembali)',
    kind: 'judul',
    groupTitle: '3. Tautan & Navigasi',
  },
  {
    key: 'konten.nav.title.aksiKlikUniversal',
    category: 'konten_nav',
    defaultLabel: 'Aksi Saat Lapisan / Kartu Diklik',
    scopeNote: 'Judul · Universal di seluruh Alat, Kartu Dinamis, Wadah, Gambar, Teks, dll.',
    kind: 'judul',
    groupTitle: 'Aksi Klik Universal',
  },
  {
    key: 'konten.field.urlTujuan',
    category: 'konten_nav',
    defaultLabel: 'URL Tujuan',
    scopeNote: 'Label · Tombol Tautan & Aksi URL Universal',
    kind: 'label',
    groupTitle: 'Tautan URL',
  },
  {
    key: 'konten.field.linkGoogleMaps',
    category: 'konten_nav',
    defaultLabel: 'Link Google Maps (Opsional)',
    scopeNote: 'Label · Lokasi Maps & Ulasan',
    kind: 'label',
    groupTitle: 'Lokasi Maps',
  },
  {
    key: 'konten.field.labelTombolMaps',
    category: 'konten_nav',
    defaultLabel: 'Label Tombol Maps',
    scopeNote: 'Label · Lokasi Maps & Ulasan',
    kind: 'label',
    groupTitle: 'Lokasi Maps',
  },
  {
    key: 'konten.nav.label.teksTombolIkuti',
    category: 'konten_nav',
    defaultLabel: 'Teks Tombol Ikuti',
    scopeNote: 'Label · Sosmed & Postingan Carousel',
    kind: 'label',
    groupTitle: 'Sosmed & Postingan',
  },
  {
    key: 'konten.nav.label.linkProfilAkun',
    category: 'konten_nav',
    defaultLabel: 'Link Profil Akun',
    scopeNote: 'Label · Sosmed & Postingan Carousel',
    kind: 'label',
    groupTitle: 'Sosmed & Postingan',
  },
  {
    key: 'konten.nav.label.fungsiKlikMenu',
    category: 'konten_nav',
    defaultLabel: 'Fungsi Saat Diklik',
    scopeNote: 'Label · Ikon Menu',
    kind: 'label',
    groupTitle: 'Navigasi Ikon Menu',
  },
  {
    key: 'konten.nav.label.arahSheet',
    category: 'konten_nav',
    defaultLabel: 'Arah Muncul Sheet',
    scopeNote: 'Label · Ikon Menu & Panel Sheet Universal (Bawah/Kanan/Kiri/Atas)',
    kind: 'label',
    groupTitle: 'Panel Geser / Sheet',
  },
  {
    key: 'konten.nav.label.judulSheet',
    category: 'konten_nav',
    defaultLabel: 'Judul Panel Sheet',
    scopeNote: 'Label · Ikon Menu & Panel Sheet Universal',
    kind: 'label',
    groupTitle: 'Panel Geser / Sheet',
  },
  {
    key: 'konten.nav.title.isiKomponenSheet',
    category: 'konten_nav',
    defaultLabel: 'Isi Komponen Sheet',
    scopeNote: 'Judul · Panel Sheet Universal',
    kind: 'judul',
    groupTitle: 'Panel Geser / Sheet',
  },
  {
    key: 'konten.desc.sheetKosong',
    category: 'konten_nav',
    defaultLabel: 'Belum ada isi di panel sheet. Tambahkan elemen di bawah ini:',
    scopeNote: 'Deskripsi · Panel Sheet Universal saat masih kosong',
    kind: 'deskripsi',
    groupTitle: 'Panel Geser / Sheet',
  },
  {
    key: 'konten.nav.label.pilihHalamanTujuan',
    category: 'konten_nav',
    defaultLabel: 'Pilih Halaman Tujuan',
    scopeNote: 'Label · Ikon Menu & Aksi Pindah Halaman Universal',
    kind: 'label',
    groupTitle: 'Navigasi Multi-Halaman',
  },
  {
    key: 'konten.nav.label.pilihCardTujuan',
    category: 'konten_nav',
    defaultLabel: 'Pilih Card / Komponen Tujuan',
    scopeNote: 'Label · Ikon Menu & Aksi Gulir ke Kartu/Blok',
    kind: 'label',
    groupTitle: 'Gulir ke Komponen',
  },
  {
    key: 'konten.desc.tombolBack',
    category: 'konten_nav',
    defaultLabel: 'Saat diklik, pengunjung otomatis kembali ke halaman sebelumnya (atau Beranda).',
    scopeNote: 'Deskripsi · Aksi Tombol Kembali (Back)',
    kind: 'deskripsi',
    groupTitle: 'Tombol Kembali',
  },
  {
    key: 'konten.desc.kategoriNav',
    category: 'konten_nav',
    defaultLabel: 'Setiap tombol di daftar Data & Daftar Item otomatis menggulir halaman ke judul target saat diklik pengunjung.',
    scopeNote: 'Deskripsi · Tombol Kategori',
    kind: 'deskripsi',
    groupTitle: 'Tombol Kategori',
  },

  // ============================================================
  // 4. PENGATURAN UMUM (Judul, Label, Deskripsi)
  // ============================================================
  {
    key: 'konten.sec.general',
    category: 'konten_general',
    defaultLabel: 'Pengaturan Umum',
    scopeNote: 'Judul Bagian · Tampil di SELURUH Alat & Blok',
    kind: 'judul',
    groupTitle: '4. Pengaturan Umum',
  },
  {
    key: 'konten.sec.identity',
    category: 'konten_general',
    defaultLabel: 'Identitas Komponen',
    scopeNote: 'Judul · Identitas Lapisan Komponen',
    kind: 'judul',
    groupTitle: 'Identitas Komponen',
  },
  {
    key: 'konten.field.namaLapisan',
    category: 'konten_general',
    defaultLabel: 'Nama Lapisan Komponen',
    scopeNote: 'Label · Seluruh Alat & Blok (sinkron ke Tema → Lapisan)',
    kind: 'label',
    groupTitle: 'Identitas Komponen',
  },
  {
    key: 'konten.field.visibilitasKomponen',
    category: 'konten_general',
    defaultLabel: 'Visibilitas Komponen',
    scopeNote: 'Judul · Seluruh Alat & Blok (Tampil / Sembunyikan)',
    kind: 'judul',
    groupTitle: 'Visibilitas Komponen',
  },
  {
    key: 'konten.desc.visibilitasAktif',
    category: 'konten_general',
    defaultLabel: 'Tampil aktif pada halaman',
    scopeNote: 'Deskripsi · Status saat komponen ditampilkan',
    kind: 'deskripsi',
    groupTitle: 'Visibilitas Komponen',
  },
  {
    key: 'konten.desc.visibilitasSembunyi',
    category: 'konten_general',
    defaultLabel: 'Disembunyikan pada halaman publik',
    scopeNote: 'Deskripsi · Status saat komponen disembunyikan',
    kind: 'deskripsi',
    groupTitle: 'Visibilitas Komponen',
  },
  {
    key: 'konten.field.modeWadahIndukAnak',
    category: 'konten_general',
    defaultLabel: 'Mode Wadah Induk–Anak',
    scopeNote: 'Judul · Kotak / Wadah (Container Slider)',
    kind: 'judul',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.desc.modeWadahIndukAnak',
    category: 'konten_general',
    defaultLabel: 'Ubah wadah menjadi Slider Horizontal atau Vertikal tanpa merusak komponen anak di dalamnya.',
    scopeNote: 'Deskripsi · Kotak / Wadah (Container Slider)',
    kind: 'deskripsi',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.opt.wadahNormal',
    category: 'konten_general',
    defaultLabel: 'Normal',
    scopeNote: 'Label · Opsi Mode Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.opt.wadahSliderHorizontal',
    category: 'konten_general',
    defaultLabel: 'Slider Horizontal',
    scopeNote: 'Label · Opsi Mode Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.opt.wadahSliderVertikal',
    category: 'konten_general',
    defaultLabel: 'Slider Vertikal',
    scopeNote: 'Label · Opsi Mode Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderJumlahItem',
    category: 'konten_general',
    defaultLabel: 'Jumlah Item Terlihat',
    scopeNote: 'Label · Pengaturan Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderJarakItem',
    category: 'konten_general',
    defaultLabel: 'Jarak Antaritem (px)',
    scopeNote: 'Label · Pengaturan Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderKecepatan',
    category: 'konten_general',
    defaultLabel: 'Kecepatan (ms)',
    scopeNote: 'Label · Pengaturan Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderTransisi',
    category: 'konten_general',
    defaultLabel: 'Transisi',
    scopeNote: 'Label · Pengaturan Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderLuapan',
    category: 'konten_general',
    defaultLabel: 'Luapan Konten',
    scopeNote: 'Label · Pengaturan Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderTombolNav',
    category: 'konten_general',
    defaultLabel: 'Tombol Navigasi',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderTitikNav',
    category: 'konten_general',
    defaultLabel: 'Titik Navigasi',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderLoop',
    category: 'konten_general',
    defaultLabel: 'Pengulangan',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderAutoplay',
    category: 'konten_general',
    defaultLabel: 'Putar Otomatis',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderTouchSwipe',
    category: 'konten_general',
    defaultLabel: 'Geser Sentuhan',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderMouseDrag',
    category: 'konten_general',
    defaultLabel: 'Geser Mouse',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderSnap',
    category: 'konten_general',
    defaultLabel: 'Snap (Berhenti pas di setiap item)',
    scopeNote: 'Label · Opsi Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderInterval',
    category: 'konten_general',
    defaultLabel: 'Interval Putar Otomatis (ms)',
    scopeNote: 'Label · Pengaturan Slider Wadah',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.sliderScrollbar',
    category: 'konten_general',
    defaultLabel: 'Tampilkan Scrollbar',
    scopeNote: 'Label · Opsi Slider Wadah (tampil/sembunyi scrollbar)',
    kind: 'label',
    groupTitle: 'Mode Wadah Induk–Anak',
  },
  {
    key: 'konten.field.pusatWaTerhubung',
    category: 'konten_general',
    defaultLabel: 'Pusat WhatsApp (Terhubung)',
    scopeNote: 'Judul · Tombol, Katalog, F&B, Pelatihan, Form, Keranjang',
    kind: 'judul',
    groupTitle: 'Pusat WhatsApp (Terhubung)',
  },
  {
    key: 'konten.field.tautanWaAktif',
    category: 'konten_general',
    defaultLabel: 'Tautan WhatsApp Aktif',
    scopeNote: 'Label · Koneksi Pusat WhatsApp',
    kind: 'label',
    groupTitle: 'Pusat WhatsApp (Terhubung)',
  },
  {
    key: 'konten.field.templatPesanWa',
    category: 'konten_general',
    defaultLabel: 'Templat Pesan WhatsApp',
    scopeNote: 'Label · Koneksi Pusat WhatsApp',
    kind: 'label',
    groupTitle: 'Pusat WhatsApp (Terhubung)',
  },

  // ============================================================
  // 5. AKSI & INTERAKSI (Judul, Label, Deskripsi)
  // ============================================================
  {
    key: 'konten.sec.actions',
    category: 'konten_actions',
    defaultLabel: 'Aksi & Interaksi',
    scopeNote: 'Judul Bagian · Katalog, F&B, Keranjang, Pelatihan, Show/Hide, Bottom Sheet, Form, serta Keranjang Universal',
    kind: 'judul',
    groupTitle: '5. Aksi & Interaksi',
  },
  {
    key: 'konten.field.fungsiKeranjangUniversal',
    category: 'konten_actions',
    defaultLabel: 'Aktifkan Fungsi Keranjang',
    scopeNote: 'Judul · Keranjang Universal (Kartu Dinamis, Wadah, Gambar, Teks, dll.)',
    kind: 'judul',
    groupTitle: 'Aktifkan Fungsi Keranjang',
  },
  {
    key: 'konten.desc.fungsiKeranjangUniversal',
    category: 'konten_actions',
    defaultLabel: 'Harga, terjual, tambah - 1 +, & info keranjang mengambang',
    scopeNote: 'Deskripsi · Keranjang Universal',
    kind: 'deskripsi',
    groupTitle: 'Aktifkan Fungsi Keranjang',
  },
  {
    key: 'konten.actions.title.keranjangMengambang',
    category: 'konten_actions',
    defaultLabel: 'Info Keranjang Mengambang',
    scopeNote: 'Judul · Keranjang Universal & Tombol Keranjang',
    kind: 'judul',
    groupTitle: 'Keranjang Mengambang',
  },
  {
    key: 'konten.actions.label.namaProdukKeranjang',
    category: 'konten_actions',
    defaultLabel: 'Nama Produk di Keranjang',
    scopeNote: 'Label · Keranjang Universal',
    kind: 'label',
    groupTitle: 'Aktifkan Fungsi Keranjang',
  },
  {
    key: 'konten.actions.label.labelTombolTambah',
    category: 'konten_actions',
    defaultLabel: 'Label Tombol Tambah',
    scopeNote: 'Label · Keranjang Universal & Tombol Keranjang',
    kind: 'label',
    groupTitle: 'Aktifkan Fungsi Keranjang',
  },
  {
    key: 'konten.field.halamanDetailProduk',
    category: 'konten_actions',
    defaultLabel: 'Halaman Detail Produk',
    scopeNote: 'Label · Katalog Produk Fisik & Digital',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.field.keranjangWhatsapp',
    category: 'konten_actions',
    defaultLabel: 'Keranjang WhatsApp',
    scopeNote: 'Label · Katalog Produk Fisik & Digital',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.field.noWhatsappCheckout',
    category: 'konten_actions',
    defaultLabel: 'Nomor WhatsApp Checkout',
    scopeNote: 'Label · Katalog, F&B, Tombol Keranjang, Keranjang Universal',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.actions.label.namaTokoWa',
    category: 'konten_actions',
    defaultLabel: 'Nama Toko (di Pesan WA)',
    scopeNote: 'Label · Katalog, Tombol Keranjang, Keranjang Universal',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.actions.label.pesanPembukaWa',
    category: 'konten_actions',
    defaultLabel: 'Pesan Pembuka WhatsApp',
    scopeNote: 'Label · Katalog & Pelatihan',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.actions.label.formDataPemesan',
    category: 'konten_actions',
    defaultLabel: 'Form Data Pemesan',
    scopeNote: 'Label · Katalog & Katalog F&B',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.actions.label.opsiPengiriman',
    category: 'konten_actions',
    defaultLabel: 'Opsi Pengiriman',
    scopeNote: 'Label · Katalog Fisik & Katalog F&B',
    kind: 'label',
    groupTitle: 'Checkout & Katalog',
  },
  {
    key: 'konten.actions.label.tombolShowHideBuka',
    category: 'konten_actions',
    defaultLabel: 'Teks Tombol saat Sembunyi',
    scopeNote: 'Label · Wadah Show / Hide',
    kind: 'label',
    groupTitle: 'Wadah Show / Hide',
  },
  {
    key: 'konten.actions.label.tombolShowHideTutup',
    category: 'konten_actions',
    defaultLabel: 'Teks Tombol saat Tampil',
    scopeNote: 'Label · Wadah Show / Hide',
    kind: 'label',
    groupTitle: 'Wadah Show / Hide',
  },
  {
    key: 'konten.actions.label.labelPemicuSheet',
    category: 'konten_actions',
    defaultLabel: 'Label Pemicu',
    scopeNote: 'Label · Panel Geser Bawah (Bottom Sheet)',
    kind: 'label',
    groupTitle: 'Panel Geser Bawah',
  },
  {
    key: 'konten.actions.label.judulBottomSheet',
    category: 'konten_actions',
    defaultLabel: 'Judul Bottom Sheet',
    scopeNote: 'Label · Panel Geser Bawah (Bottom Sheet)',
    kind: 'label',
    groupTitle: 'Panel Geser Bawah',
  },
  {
    key: 'konten.field.labelTombolKirim',
    category: 'konten_actions',
    defaultLabel: 'Label Tombol Kirim',
    scopeNote: 'Label · Formulir Isian',
    kind: 'label',
    groupTitle: 'Formulir Dinamis',
  },

  // ============================================================
  // 6. DESAIN & PENGATURAN KHUSUS KOMPONEN
  // ============================================================
  { key: 'desain.tab', category: 'desain', defaultLabel: 'Desain', scopeNote: 'Tab Desain Komponen', kind: 'judul', groupTitle: 'Tab Desain' },
  { key: 'desain.sec.specific', category: 'desain', defaultLabel: 'Pengaturan Khusus Komponen', scopeNote: 'Bagian Teratas Tab Desain (Hero, Row, Katalog, Kategori, Maps, Sosmed, Video, dll.)', kind: 'judul', groupTitle: 'Pengaturan Khusus Komponen' },
  { key: 'konten.desc.rowSlideProgress', category: 'desain', defaultLabel: 'Slide horizontal menampilkan indikator progress 3 titik secara otomatis.', scopeNote: 'Deskripsi · Pengaturan Khusus Komponen (Kolom / Row)', kind: 'deskripsi', groupTitle: 'Pengaturan Khusus Komponen' },
  { key: 'desain.sec.visual', category: 'desain', defaultLabel: 'Gaya Visual', scopeNote: 'Bagian Accordion Desain', kind: 'judul', groupTitle: 'Gaya Visual' },
  { key: 'desain.sec.layout', category: 'desain', defaultLabel: 'Tata Letak', scopeNote: 'Bagian Accordion Desain', kind: 'judul', groupTitle: 'Tata Letak & Spasi' },
  { key: 'desain.sec.posisi', category: 'desain', defaultLabel: 'Tata Letak & Posisi', scopeNote: 'Bagian Accordion Desain', kind: 'judul', groupTitle: 'Tata Letak & Posisi' },
  { key: 'desain.sec.typo', category: 'desain', defaultLabel: 'Tipografi', scopeNote: 'Bagian Accordion Desain & Konten', kind: 'judul', groupTitle: 'Tipografi' },
  { key: 'desain.sec.efek', category: 'desain', defaultLabel: 'Efek', scopeNote: 'Bagian Accordion Desain', kind: 'judul', groupTitle: 'Efek' },
  { key: 'desain.sec.size', category: 'desain', defaultLabel: 'Ukuran', scopeNote: 'Bagian Accordion Desain', kind: 'judul' },
  { key: 'desain.sec.spacing', category: 'desain', defaultLabel: 'Jarak', scopeNote: 'Bagian Accordion Desain', kind: 'judul' },
  { key: 'desain.sec.position', category: 'desain', defaultLabel: 'Posisi', scopeNote: 'Bagian Accordion Desain', kind: 'judul' },
  { key: 'desain.sec.bg', category: 'desain', defaultLabel: 'Latar Belakang', scopeNote: 'Bagian Accordion Desain', kind: 'judul' },
  { key: 'desain.sec.border', category: 'desain', defaultLabel: 'Garis Tepi', scopeNote: 'Bagian Accordion Desain', kind: 'judul' },
  { key: 'desain.field.tampilan', category: 'desain', defaultLabel: 'Tampilan', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.arah', category: 'desain', defaultLabel: 'Arah', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.perataan', category: 'desain', defaultLabel: 'Perataan', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.perataanKonten', category: 'desain', defaultLabel: 'Perataan Konten', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.bungkus', category: 'desain', defaultLabel: 'Bungkus', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.jarakAntarElemen', category: 'desain', defaultLabel: 'Jarak Antar Elemen', scopeNote: 'Isi Tata Letak & Jarak' },
  { key: 'desain.field.luapanKonten', category: 'desain', defaultLabel: 'Luapan Konten', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.lebarMin', category: 'desain', defaultLabel: 'Lebar Min', scopeNote: 'Isi Ukuran' },
  { key: 'desain.field.lebarMaks', category: 'desain', defaultLabel: 'Lebar Maks', scopeNote: 'Isi Ukuran' },
  { key: 'desain.field.tinggi', category: 'desain', defaultLabel: 'Tinggi', scopeNote: 'Isi Ukuran' },
  { key: 'desain.field.tinggiMaks', category: 'desain', defaultLabel: 'Tinggi Maks', scopeNote: 'Isi Ukuran' },
  { key: 'desain.field.posisiMode', category: 'desain', defaultLabel: 'Posisi', scopeNote: 'Isi Posisi' },
  { key: 'desain.field.urutanLapisan', category: 'desain', defaultLabel: 'Urutan Lapisan', scopeNote: 'Isi Posisi' },
  { key: 'desain.field.dekorasiTeks', category: 'desain', defaultLabel: 'Dekorasi Teks', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.transformasiTeks', category: 'desain', defaultLabel: 'Transformasi Teks', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.transparansi', category: 'desain', defaultLabel: 'Transparansi', scopeNote: 'Isi Efek' },
  { key: 'desain.field.visibilitas', category: 'desain', defaultLabel: 'Visibilitas', scopeNote: 'Isi Efek' },
  { key: 'desain.field.transformasi', category: 'desain', defaultLabel: 'Transformasi', scopeNote: 'Isi Efek' },
  { key: 'desain.field.transisi', category: 'desain', defaultLabel: 'Transisi', scopeNote: 'Isi Efek' },
  { key: 'desain.field.modelHero', category: 'desain', defaultLabel: 'Model Hero Profil', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.fullAtasSamping', category: 'desain', defaultLabel: 'Penuh Atas & Samping', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.ukuranLingkaranLogo', category: 'desain', defaultLabel: 'Ukuran Lingkaran Logo', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.ukuranJudulUsaha', category: 'desain', defaultLabel: 'Ukuran Judul Usaha', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.ukuranTagline', category: 'desain', defaultLabel: 'Ukuran Slogan', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.ukuranInfoJamAlamat', category: 'desain', defaultLabel: 'Ukuran Info Jam & Alamat', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.lengkungSudutKartuInfo', category: 'desain', defaultLabel: 'Sudut Melengkung Kartu Info', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.layoutKategori', category: 'desain', defaultLabel: 'Tampilan & Mode Geser Kategori', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.layoutRow', category: 'desain', defaultLabel: 'Mode Susunan Kolom', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.jumlahKolomGrid', category: 'desain', defaultLabel: 'Jumlah Kolom per Baris', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.lebarKolom', category: 'desain', defaultLabel: 'Ukuran Lebar Tiap Kolom', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.tinggiKolom', category: 'desain', defaultLabel: 'Tinggi Min Kolom', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.jarakKolom', category: 'desain', defaultLabel: 'Jarak Antar Kolom', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.tampilanKatalog', category: 'desain', defaultLabel: 'Tata Letak Katalog', scopeNote: 'Isi Pengaturan Khusus Komponen' },
  { key: 'desain.field.fullKananKiri', category: 'desain', defaultLabel: 'Penuh Kanan-Kiri', scopeNote: 'Isi Tata Letak' },
  { key: 'desain.field.jarakAtasHalaman', category: 'desain', defaultLabel: 'Jarak Atas Halaman', scopeNote: 'Isi Jarak' },
  { key: 'desain.field.posisiIsi', category: 'desain', defaultLabel: 'Perataan Teks', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.lebarElemen', category: 'desain', defaultLabel: 'Lebar', scopeNote: 'Isi Ukuran' },
  { key: 'desain.field.tinggiMinimal', category: 'desain', defaultLabel: 'Tinggi Min', scopeNote: 'Isi Ukuran' },
  { key: 'desain.field.paddingAtasBawah', category: 'desain', defaultLabel: 'Padding Atas & Bawah', scopeNote: 'Isi Jarak' },
  { key: 'desain.field.paddingKananKiri', category: 'desain', defaultLabel: 'Padding Kanan & Kiri', scopeNote: 'Isi Jarak' },
  { key: 'desain.field.jarakBawah', category: 'desain', defaultLabel: 'Margin Bawah', scopeNote: 'Isi Jarak' },
  { key: 'desain.field.lengkungSudut', category: 'desain', defaultLabel: 'Sudut Melengkung', scopeNote: 'Isi Garis Tepi' },
  { key: 'desain.field.efekKaca', category: 'desain', defaultLabel: 'Efek Kaca Buram', scopeNote: 'Isi Efek' },
  { key: 'desain.field.efekBayangan', category: 'desain', defaultLabel: 'Bayangan', scopeNote: 'Isi Efek' },
  { key: 'desain.field.efekHoverLift', category: 'desain', defaultLabel: 'Efek Melayang Saat Disorot', scopeNote: 'Isi Efek' },
  { key: 'desain.field.jenisFont', category: 'desain', defaultLabel: 'Jenis Huruf', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.ukuranTeks', category: 'desain', defaultLabel: 'Ukuran Huruf', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.ketebalanTeks', category: 'desain', defaultLabel: 'Ketebalan Huruf', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.tinggiBaris', category: 'desain', defaultLabel: 'Tinggi Baris', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.latarGradasi', category: 'desain', defaultLabel: 'Warna & Gradasi', scopeNote: 'Isi Latar Belakang' },
  { key: 'desain.field.warnaTeks', category: 'desain', defaultLabel: 'Warna Teks', scopeNote: 'Isi Tipografi' },
  { key: 'desain.field.ketebalanGarisTepi', category: 'desain', defaultLabel: 'Ketebalan', scopeNote: 'Isi Garis Tepi' },
  { key: 'desain.field.warnaGarisTepi', category: 'desain', defaultLabel: 'Warna', scopeNote: 'Isi Garis Tepi' },
  { key: 'desain.field.gayaGarisTepi', category: 'desain', defaultLabel: 'Gaya', scopeNote: 'Isi Garis Tepi' },

  // ============================================================
  // 7. TEMA & TOKEN LOKAL
  // ============================================================
  { key: 'tema.tab', category: 'tema', defaultLabel: 'Tema', scopeNote: 'Tab Tema Komponen', kind: 'judul', groupTitle: 'Tab Tema' },
  { key: 'tema.status.globalTitle', category: 'tema', defaultLabel: 'Mengikuti Tema Global', scopeNote: 'Banner Status Tema', kind: 'judul' },
  { key: 'tema.status.localTitle', category: 'tema', defaultLabel: 'Tema Komponen Disesuaikan Lokal', scopeNote: 'Banner Status Tema', kind: 'judul' },
  { key: 'tema.mode.global', category: 'tema', defaultLabel: 'Gunakan Tema Global', scopeNote: 'Tombol Mode Tema' },
  { key: 'tema.mode.local', category: 'tema', defaultLabel: 'Sesuaikan Lokal', scopeNote: 'Tombol Mode Tema' },
  { key: 'tema.sec.pewarisanToken', category: 'tema', defaultLabel: 'Status Pewarisan Token', scopeNote: 'Judul Bagian Tema', kind: 'judul' },
  { key: 'tema.token.textColor', category: 'tema', defaultLabel: 'Teks', scopeNote: 'Badge Token' },
  { key: 'tema.token.backgroundColor', category: 'tema', defaultLabel: 'Latar', scopeNote: 'Badge Token' },
  { key: 'tema.token.borderColor', category: 'tema', defaultLabel: 'Border', scopeNote: 'Badge Token' },
  { key: 'tema.token.accentColor', category: 'tema', defaultLabel: 'Aksen', scopeNote: 'Badge Token' },
  { key: 'tema.token.fontFamily', category: 'tema', defaultLabel: 'Font', scopeNote: 'Badge Token' },
  { key: 'tema.sec.pengaturanLokal', category: 'tema', defaultLabel: 'Pengaturan Token Lokal', scopeNote: 'Judul Bagian Kontrol Lokal', kind: 'judul' },
  { key: 'tema.field.warnaTeks', category: 'tema', defaultLabel: 'Warna Teks', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.field.latarKomponen', category: 'tema', defaultLabel: 'Latar Komponen', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.field.warnaGarisTepi', category: 'tema', defaultLabel: 'Warna Garis Tepi (Border)', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.field.jenisFontKomponen', category: 'tema', defaultLabel: 'Jenis Font Komponen', scopeNote: 'Kontrol Token Lokal' },
  { key: 'tema.action.resetGlobal', category: 'tema', defaultLabel: 'Kembalikan ke Tema Global', scopeNote: 'Tombol Reset Tema' },

  // ============================================================
  // 8. TEMA, MULTI HALAMAN, LAYER & NAVBAR (Panel Kiri -> Tab Tema & Tab Layer)
  // ============================================================
  { key: 'layer.tab', category: 'home', defaultLabel: 'Layer', scopeNote: 'Judul Tab Layer di Panel Kiri', kind: 'judul', groupTitle: 'Tab Panel Kiri' },
  { key: 'home.tab', category: 'home', defaultLabel: 'Home', scopeNote: 'Tombol Mode Home', kind: 'judul' },
  { key: 'home.title', category: 'home', defaultLabel: 'Pengaturan Halaman', scopeNote: 'Judul Header Home', kind: 'judul' },
  { key: 'home.subtitle', category: 'home', defaultLabel: 'Tema Global, Multi Halaman, Top, Lapisan & Navbar', scopeNote: 'Subjudul Header Home', kind: 'deskripsi' },
  { key: 'home.sec.temaGlobal', category: 'home', defaultLabel: 'Tema Global', scopeNote: 'Bagian Accordion Tab Tema', kind: 'judul', groupTitle: 'Tema Global' },
  { key: 'home.desc.temaGlobal', category: 'home', defaultLabel: 'Atur palet warna & font standar halaman. Komponen dengan warna kustom lokal tetap dipertahankan kecuali di-reset.', scopeNote: 'Deskripsi Tema Global', kind: 'deskripsi', groupTitle: 'Tema Global' },
  { key: 'home.sec.pages', category: 'home', defaultLabel: 'Multi Halaman', scopeNote: 'Bagian Accordion Tab Tema (Multi Halaman)', kind: 'judul', groupTitle: 'Multi Halaman' },
  { key: 'home.desc.pages', category: 'home', defaultLabel: 'Kelola Beranda, tambah, duplikat, atau hapus site.', scopeNote: 'Deskripsi Pengaturan Multi Halaman', kind: 'deskripsi', groupTitle: 'Multi Halaman' },
  { key: 'home.action.addSite', category: 'home', defaultLabel: '+ Tambah Site', scopeNote: 'Tombol Tambah Site di Multi Halaman', kind: 'label', groupTitle: 'Multi Halaman' },
  { key: 'home.action.duplicateSite', category: 'home', defaultLabel: 'Duplikat Site', scopeNote: 'Tooltip Duplikat Site di Multi Halaman', kind: 'label', groupTitle: 'Multi Halaman' },
  { key: 'home.action.deleteSite', category: 'home', defaultLabel: 'Hapus Site', scopeNote: 'Tooltip Hapus Site di Multi Halaman', kind: 'label', groupTitle: 'Multi Halaman' },
  { key: 'home.field.berandaTitle', category: 'home', defaultLabel: 'Beranda (Halaman Utama)', scopeNote: 'Label Halaman Utama di Multi Halaman', kind: 'label', groupTitle: 'Multi Halaman' },
  { key: 'home.desc.berandaSub', category: 'home', defaultLabel: 'Halaman pembuka publik', scopeNote: 'Deskripsi Beranda di Multi Halaman', kind: 'deskripsi', groupTitle: 'Multi Halaman' },
  { key: 'home.sec.top', category: 'home', defaultLabel: 'Top', scopeNote: 'Bagian Accordion Tab Tema', kind: 'judul', groupTitle: 'Top (Jarak Atas Halaman)' },
  { key: 'home.desc.top', category: 'home', defaultLabel: 'Jarak ruang di bagian paling atas kanvas halaman sebelum blok pertama.', scopeNote: 'Deskripsi Jarak Atas Halaman', kind: 'deskripsi', groupTitle: 'Top (Jarak Atas Halaman)' },
  { key: 'home.sec.body', category: 'home', defaultLabel: 'Body (Lapisan)', scopeNote: 'Bagian Accordion Tab Layer', kind: 'judul', groupTitle: 'Body (Lapisan)' },
  { key: 'home.desc.bodyHint', category: 'home', defaultLabel: 'Susunan seluruh lapisan halaman aktif. Klik lapisan untuk aksi cepat, ubah nama, sembunyikan, atau lompat ke induk.', scopeNote: 'Deskripsi Petunjuk Tab Layer', kind: 'deskripsi', groupTitle: 'Body (Lapisan)' },
  { key: 'home.desc.bodyKosong', category: 'home', defaultLabel: 'Kanvas masih kosong. Tambahkan blok dari panel kiri.', scopeNote: 'Deskripsi Saat Kanvas Kosong', kind: 'deskripsi', groupTitle: 'Body (Lapisan)' },
  { key: 'home.sec.bottom', category: 'home', defaultLabel: 'Bottom (Navbar Bawah)', scopeNote: 'Bagian Accordion Tab Tema', kind: 'judul', groupTitle: 'Navbar Bawah' },
  { key: 'home.sec.navSheetLayers', category: 'home', defaultLabel: 'Lapisan Modal Navbar Bawah', scopeNote: 'Judul Daftar Lapisan Modal di dalam Bottom', kind: 'judul', groupTitle: 'Navbar Bawah' },
  { key: 'home.desc.navSheetEmpty', category: 'home', defaultLabel: 'Belum ada lapisan modal pada menu navbar bawah.', scopeNote: 'Deskripsi Saat Modal Navbar Bawah Kosong', kind: 'deskripsi', groupTitle: 'Navbar Bawah' },
  { key: 'home.field.fontUtama', category: 'home', defaultLabel: 'Font Utama Halaman', scopeNote: 'Isi Tema Global' },
  { key: 'home.field.presetTema', category: 'home', defaultLabel: 'Preset Tema', scopeNote: 'Isi Tema Global' },
  { key: 'home.field.warnaTemaManual', category: 'home', defaultLabel: 'Warna Tema Manual', scopeNote: 'Isi Tema Global' },
  { key: 'home.field.jarakAtas', category: 'home', defaultLabel: 'Jarak Atas Halaman', scopeNote: 'Isi Top' },
  { key: 'home.field.navbarBawah', category: 'home', defaultLabel: 'Navbar Bawah', scopeNote: 'Isi Bottom', kind: 'judul', groupTitle: 'Navbar Bawah' },
  { key: 'home.desc.navbarBawah', category: 'home', defaultLabel: 'Menu mengambang & Modal Bottom Sheet', scopeNote: 'Deskripsi Navbar Bawah', kind: 'deskripsi', groupTitle: 'Navbar Bawah' },
  { key: 'home.field.posisiNavbar', category: 'home', defaultLabel: 'Posisi Navbar', scopeNote: 'Isi Bottom' },
  { key: 'home.field.gayaTombolTengah', category: 'home', defaultLabel: 'Gaya Tombol Tengah (Home)', scopeNote: 'Isi Bottom' },
  { key: 'home.field.ukuranPosisiShadow', category: 'home', defaultLabel: 'Ukuran, Posisi Naik/Turun & Shadow', scopeNote: 'Isi Bottom' },
  { key: 'home.field.warnaNavbar', category: 'home', defaultLabel: 'Warna Navbar', scopeNote: 'Isi Bottom' },
  { key: 'home.field.menuNavbar', category: 'home', defaultLabel: '5 Menu Navbar', scopeNote: 'Isi Bottom' },

  // ============================================================
  // 9. ALAT (Panel Kiri -> Tab Alat)
  // ============================================================
  { key: 'alat.tab', category: 'alat', defaultLabel: 'Alat', scopeNote: 'Judul Tab Panel Kiri', kind: 'judul' },
  { key: 'alat.header', category: 'alat', defaultLabel: 'Alat Mandiri', scopeNote: 'Judul Bagian Alat', kind: 'judul' },
  { key: 'alat.desc', category: 'alat', defaultLabel: 'Komponen dasar atomik untuk menyusun halaman bebas dari awal.', scopeNote: 'Deskripsi Bagian Alat Mandiri', kind: 'deskripsi' },
  { key: 'alat.hint.dragClick', category: 'alat', defaultLabel: 'Seret / Klik', scopeNote: 'Petunjuk Interaksi Panel Alat' },
  { key: 'alat.search', category: 'alat', defaultLabel: 'Cari alat mandiri...', scopeNote: 'Placeholder Pencarian Alat' },
  { key: 'alat.tool.text', category: 'alat', defaultLabel: 'Teks Biasa', scopeNote: 'Item Alat' },
  { key: 'alat.tool.image', category: 'alat', defaultLabel: 'Gambar', scopeNote: 'Item Alat' },
  { key: 'alat.tool.button', category: 'alat', defaultLabel: 'Tombol Link', scopeNote: 'Item Alat' },
  { key: 'alat.tool.cart_button', category: 'alat', defaultLabel: 'Tombol Keranjang', scopeNote: 'Item Alat' },
  { key: 'alat.tool.back_button', category: 'alat', defaultLabel: 'Tombol Kembali', scopeNote: 'Item Alat' },
  { key: 'alat.tool.menu_icon', category: 'alat', defaultLabel: 'Menu Icon', scopeNote: 'Item Alat' },
  { key: 'alat.tool.row', category: 'alat', defaultLabel: 'Kolom / Grid / Row', scopeNote: 'Item Alat' },
  { key: 'alat.tool.container', category: 'alat', defaultLabel: 'Kotak / Wadah', scopeNote: 'Item Alat' },
  { key: 'alat.tool.toggle_container', category: 'alat', defaultLabel: 'Wadah Show / Hide', scopeNote: 'Item Alat' },
  { key: 'alat.tool.bottom_sheet', category: 'alat', defaultLabel: 'Bottom Sheet', scopeNote: 'Item Alat' },
  { key: 'alat.tool.category_tabs', category: 'alat', defaultLabel: 'Tombol Kategori', scopeNote: 'Item Alat' },
  { key: 'alat.tool.form', category: 'alat', defaultLabel: 'Form Isian', scopeNote: 'Item Alat' },
  { key: 'alat.tool.divider', category: 'alat', defaultLabel: 'Garis Pembatas', scopeNote: 'Item Alat' },
  { key: 'alat.tool.maps_place', category: 'alat', defaultLabel: 'Lokasi Maps', scopeNote: 'Item Alat' },
  { key: 'alat.tool.social', category: 'alat', defaultLabel: 'Ikon Sosmed', scopeNote: 'Item Alat' },
  { key: 'alat.tool.youtube', category: 'alat', defaultLabel: 'Video YouTube', scopeNote: 'Item Alat' },
  { key: 'alat.tool.facebook_video', category: 'alat', defaultLabel: 'Video Facebook', scopeNote: 'Item Alat' },
  { key: 'alat.tool.tiktok_video', category: 'alat', defaultLabel: 'Video TikTok', scopeNote: 'Item Alat' },
  { key: 'alat.tool.instagram_video', category: 'alat', defaultLabel: 'Video Instagram', scopeNote: 'Item Alat' },
  { key: 'alat.tool.hero_profile', category: 'alat', defaultLabel: 'Hero Profil Usaha', scopeNote: 'Item Alat (Kompatibilitas)' },
  { key: 'alat.tool.fnb_catalog', category: 'alat', defaultLabel: 'Katalog F&B', scopeNote: 'Item Alat (Kompatibilitas)' },
  { key: 'alat.tool.showcase_card', category: 'alat', defaultLabel: 'Kartu Dinamis', scopeNote: 'Item Alat (Kompatibilitas)' },
  { key: 'alat.tool.catalog_physical', category: 'alat', defaultLabel: 'Katalog Produk Fisik', scopeNote: 'Item Alat (Kompatibilitas)' },
  { key: 'alat.tool.catalog_digital', category: 'alat', defaultLabel: 'Katalog Produk Digital', scopeNote: 'Item Alat (Kompatibilitas)' },
  { key: 'alat.tool.training_catalog', category: 'alat', defaultLabel: 'Katalog Produk Pelatihan', scopeNote: 'Item Alat (Kompatibilitas)' },
  { key: 'alat.tool.social_follower', category: 'alat', defaultLabel: 'Sosial Media + Pengikut', scopeNote: 'Item Alat (Kompatibilitas)' },

  // ============================================================
  // 10. BLOK SIAP PAKAI (Panel Kiri -> Tab Blok)
  // ============================================================
  { key: 'blok.tab', category: 'blok', defaultLabel: 'Blok', scopeNote: 'Judul Tab Panel Kiri', kind: 'judul' },
  { key: 'blok.header', category: 'blok', defaultLabel: 'Template Blok & Card', scopeNote: 'Judul Bagian Blok', kind: 'judul' },
  { key: 'blok.desc', category: 'blok', defaultLabel: 'Template bagian jadi berisi kombinasi elemen & data contoh siap edit.', scopeNote: 'Deskripsi Bagian Template Blok', kind: 'deskripsi' },
  { key: 'blok.badge.ready', category: 'blok', defaultLabel: 'Siap Pakai', scopeNote: 'Label Status Panel Blok' },
  { key: 'blok.search', category: 'blok', defaultLabel: 'Cari template blok / card...', scopeNote: 'Placeholder Pencarian Blok' },
  { key: 'blok.cat.semua', category: 'blok', defaultLabel: 'Semua', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.kartu_info', category: 'blok', defaultLabel: 'Kartu & Info', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.katalog_store', category: 'blok', defaultLabel: 'Katalog & Store', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.event_kegiatan', category: 'blok', defaultLabel: 'Event & Kegiatan', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.tarif_paket', category: 'blok', defaultLabel: 'Tarif & Paket', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.hero_profil', category: 'blok', defaultLabel: 'Hero & Profil', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.menu_layout', category: 'blok', defaultLabel: 'Menu & Grid', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.cat.kontak_medsos', category: 'blok', defaultLabel: 'Medsos & Kontak', scopeNote: 'Filter Kategori Blok', groupTitle: 'Filter Kategori Blok' },
  { key: 'blok.sec.kartu-kutipan-tokoh', category: 'blok', defaultLabel: 'Banner Kutipan Tokoh (Slide)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kartu-informasi-nasional', category: 'blok', defaultLabel: 'Kartu Informasi & Berita (Slide)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kartu-even-promo', category: 'blok', defaultLabel: 'Kartu Even & Promo (Poster)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kartu-sertifikasi', category: 'blok', defaultLabel: 'Kartu Informasi Sertifikasi (Badge)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kartu-store-gradasi', category: 'blok', defaultLabel: 'Kartu Store Gradasi + Keranjang', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kartu-feed-kegiatan', category: 'blok', defaultLabel: 'Kartu Feed Kegiatan (3 Foto)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.kartu-tarif-keanggotaan', category: 'blok', defaultLabel: 'Kartu Tiket Tarif & Keanggotaan', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.menu-grid-spesial', category: 'blok', defaultLabel: 'Menu Grid 3x3 (Spesial Untuk Anda)', scopeNote: 'Blok Siap Pakai' },
  { key: 'blok.sec.sosmed-follower-cards', category: 'blok', defaultLabel: 'Sosial Media + Follower Cards', scopeNote: 'Blok Siap Pakai' },
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
  // 11. KOMPONEN & INSPEKTOR KANAN
  // ============================================================
  { key: 'konten.tab', category: 'komponen', defaultLabel: 'Konten', scopeNote: 'Tab Konten Komponen', kind: 'judul', groupTitle: 'Header Panel Kanan' },
  { key: 'komponen.tab', category: 'komponen', defaultLabel: 'Komponen', scopeNote: 'Tombol Mode Inspektor', kind: 'judul', groupTitle: 'Header Panel Kanan' },
  { key: 'komponen.header.properti', category: 'komponen', defaultLabel: 'Properti Komponen', scopeNote: 'Judul Panel Kanan Saat Kosong', kind: 'judul', groupTitle: 'Header Panel Kanan' },
  { key: 'komponen.header.pilihElemen', category: 'komponen', defaultLabel: 'Pilih elemen pada Kanvas', scopeNote: 'Subjudul Panel Kanan Saat Kosong', kind: 'deskripsi', groupTitle: 'Header Panel Kanan' },
  { key: 'komponen.empty.title', category: 'komponen', defaultLabel: 'Belum Ada Komponen Dipilih', scopeNote: 'Judul Status Kosong Panel Kanan', kind: 'judul', groupTitle: 'Panel Kanan Kosong' },
  { key: 'komponen.empty.desc', category: 'komponen', defaultLabel: 'Klik komponen pada Kanvas atau pilih dari Tab Layer di panel kiri untuk mengubah Konten dan Desain.', scopeNote: 'Deskripsi Status Kosong Panel Kanan', kind: 'deskripsi', groupTitle: 'Panel Kanan Kosong' },
  { key: 'komponen.sublayer.showAllBtn', category: 'komponen', defaultLabel: 'Semua', scopeNote: 'Tombol Kembali ke Semua Pengaturan Induk pada Bar Sub-Layer', kind: 'label', groupTitle: 'Sub-Layer Inspektor' },
  { key: 'komponen.navbar.title', category: 'komponen', defaultLabel: 'Bottom Navbar', scopeNote: 'Judul Header Panel Kanan Saat Edit Navbar Bawah', kind: 'judul', groupTitle: 'Editor Cepat Bottom Navbar' },
  { key: 'komponen.navbar.quickTitle', category: 'komponen', defaultLabel: 'Editor Cepat Bottom Navbar', scopeNote: 'Judul Kartu Editor Cepat Navbar Bawah', kind: 'judul', groupTitle: 'Editor Cepat Bottom Navbar' },
  { key: 'komponen.navbar.quickDesc', category: 'komponen', defaultLabel: 'Tersinkron langsung dengan Tema → Bottom', scopeNote: 'Deskripsi Editor Cepat Navbar Bawah', kind: 'deskripsi', groupTitle: 'Editor Cepat Bottom Navbar' },
  { key: 'komponen.action.copy', category: 'komponen', defaultLabel: 'Salin Komponen (Ctrl+C)', scopeNote: 'Tooltip Salin Komponen' },
  { key: 'komponen.action.paste', category: 'komponen', defaultLabel: 'Tempel Komponen (Ctrl+V)', scopeNote: 'Tooltip Tempel Komponen' },
  { key: 'komponen.action.duplicate', category: 'komponen', defaultLabel: 'Duplikat Komponen', scopeNote: 'Tombol / Tooltip Aksi' },
  { key: 'komponen.action.resetTheme', category: 'komponen', defaultLabel: 'Kembalikan Gaya Tema Global', scopeNote: 'Tooltip Reset Tema' },
  { key: 'komponen.action.resetShort', category: 'komponen', defaultLabel: 'Reset', scopeNote: 'Teks Singkat Tombol Reset Tema Lokal' },
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
  { key: 'komponen.type.cart_button', category: 'komponen', defaultLabel: 'Tombol Keranjang', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.showcase_card', category: 'komponen', defaultLabel: 'Kartu Dinamis', scopeNote: 'Nama Tipe Komponen' },
  { key: 'komponen.type.back_button', category: 'komponen', defaultLabel: 'Tombol Kembali', scopeNote: 'Nama Tipe Komponen' },

  // ============================================================
  // 12. NAVIGASI ATAS (TOPBAR) & TOOLBAR KANVAS
  // ============================================================
  { key: 'topbar.nav.editor', category: 'topbar_canvas', defaultLabel: 'Editor', scopeNote: 'Menu Navigasi Atas', kind: 'judul', groupTitle: 'Navigasi Atas (TopBar)' },
  { key: 'topbar.nav.analytics', category: 'topbar_canvas', defaultLabel: 'Analitik', scopeNote: 'Menu Navigasi Atas', kind: 'judul', groupTitle: 'Navigasi Atas (TopBar)' },
  { key: 'topbar.nav.ads', category: 'topbar_canvas', defaultLabel: 'Iklan', scopeNote: 'Menu Navigasi Atas', kind: 'judul', groupTitle: 'Navigasi Atas (TopBar)' },
  { key: 'topbar.nav.settings', category: 'topbar_canvas', defaultLabel: 'Pengaturan', scopeNote: 'Menu Navigasi Atas', kind: 'judul', groupTitle: 'Navigasi Atas (TopBar)' },
  { key: 'topbar.action.save', category: 'topbar_canvas', defaultLabel: 'Simpan', scopeNote: 'Tombol Simpan di Navigasi Atas', kind: 'label', groupTitle: 'Aksi Navigasi Atas' },
  { key: 'topbar.action.preview', category: 'topbar_canvas', defaultLabel: 'Pratinjau', scopeNote: 'Tombol Pratinjau di Navigasi Atas', kind: 'label', groupTitle: 'Aksi Navigasi Atas' },
  { key: 'topbar.action.logout', category: 'topbar_canvas', defaultLabel: 'Keluar', scopeNote: 'Tombol Keluar di Navigasi Atas', kind: 'label', groupTitle: 'Aksi Navigasi Atas' },
  { key: 'topbar.action.login', category: 'topbar_canvas', defaultLabel: 'Masuk', scopeNote: 'Tombol Masuk di Navigasi Atas', kind: 'label', groupTitle: 'Aksi Navigasi Atas' },
  { key: 'canvas.toolbar.home', category: 'topbar_canvas', defaultLabel: 'Beranda', scopeNote: 'Tooltip Ikon Beranda di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.desktop', category: 'topbar_canvas', defaultLabel: 'PC / Desktop (1024 px)', scopeNote: 'Tooltip Ikon PC di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.tablet', category: 'topbar_canvas', defaultLabel: 'Tablet (768 px)', scopeNote: 'Tooltip Ikon Tablet di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.mobile', category: 'topbar_canvas', defaultLabel: 'HP / Mobile (440 px)', scopeNote: 'Tooltip Ikon HP di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.modeClick', category: 'topbar_canvas', defaultLabel: 'Klik', scopeNote: 'Tombol Mode Pointer Klik di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.modeDrag', category: 'topbar_canvas', defaultLabel: 'Drag', scopeNote: 'Tombol Mode Pointer Drag di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.undo', category: 'topbar_canvas', defaultLabel: 'Undo', scopeNote: 'Tombol Undo di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.toolbar.redo', category: 'topbar_canvas', defaultLabel: 'Redo', scopeNote: 'Tooltip Tombol Redo di Toolbar Kanvas', kind: 'label', groupTitle: 'Toolbar Atas Kanvas' },
  { key: 'canvas.floating.up', category: 'topbar_canvas', defaultLabel: 'Naikkan', scopeNote: 'Tooltip Aksi Naik di Bar Melayang Kanvas', kind: 'label', groupTitle: 'Bar Aksi Melayang Kanvas' },
  { key: 'canvas.floating.down', category: 'topbar_canvas', defaultLabel: 'Turunkan', scopeNote: 'Tooltip Aksi Turun di Bar Melayang Kanvas', kind: 'label', groupTitle: 'Bar Aksi Melayang Kanvas' },
  { key: 'canvas.floating.fullBleed', category: 'topbar_canvas', defaultLabel: 'Full kanan-kiri', scopeNote: 'Tooltip Aksi Lebar Penuh di Bar Melayang Kanvas', kind: 'label', groupTitle: 'Bar Aksi Melayang Kanvas' },
  { key: 'canvas.floating.copy', category: 'topbar_canvas', defaultLabel: 'Salin (Copy)', scopeNote: 'Tooltip Aksi Salin di Bar Melayang Kanvas', kind: 'label', groupTitle: 'Bar Aksi Melayang Kanvas' },
  { key: 'canvas.floating.duplicate', category: 'topbar_canvas', defaultLabel: 'Duplikat', scopeNote: 'Tooltip Aksi Duplikat di Bar Melayang Kanvas', kind: 'label', groupTitle: 'Bar Aksi Melayang Kanvas' },
  { key: 'canvas.floating.delete', category: 'topbar_canvas', defaultLabel: 'Hapus', scopeNote: 'Tooltip Aksi Hapus di Bar Melayang Kanvas', kind: 'label', groupTitle: 'Bar Aksi Melayang Kanvas' },
  { key: 'canvas.empty.title', category: 'topbar_canvas', defaultLabel: 'Kanvas Masih Kosong', scopeNote: 'Judul Saat Kanvas Kosong', kind: 'judul', groupTitle: 'Status Kanvas Kosong' },
  { key: 'canvas.empty.desc', category: 'topbar_canvas', defaultLabel: 'Pilih komponen dari panel Alat atau Blok di sebelah kiri untuk mulai menyusun halaman.', scopeNote: 'Deskripsi Saat Kanvas Kosong', kind: 'deskripsi', groupTitle: 'Status Kanvas Kosong' },
];

export const UI_LABEL_DEFAULT_MAP: Record<string, string> = Object.fromEntries(
  UI_LABEL_CATALOG.map((item) => [item.key, item.defaultLabel])
);

export const UI_LABEL_VALID_KEY_SET: Set<string> = new Set(
  UI_LABEL_CATALOG.map((item) => item.key)
);

export const UI_HIDDEN_STORAGE_PREFIX = '__hide__:';

export function sanitizeUiAppearanceLabelsMap(raw: unknown): UiAppearanceLabelsMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean: UiAppearanceLabelsMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || typeof key !== 'string' || key.length > 120) continue;
    if (key.startsWith(UI_HIDDEN_STORAGE_PREFIX)) continue;
    if (typeof val !== 'string') continue;
    // Strip control chars cleanly
    const normalized = val.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 260);
    if (!normalized) continue;
    const def = UI_LABEL_DEFAULT_MAP[key];
    if (def && normalized === def) continue;
    clean[key] = normalized;
  }
  return clean;
}

export function sanitizeUiAppearanceHiddenMap(raw: unknown): UiAppearanceHiddenMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {};
  }
  const clean: UiAppearanceHiddenMap = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!key || typeof key !== 'string' || key.length > 120) continue;
    if (key.startsWith(UI_HIDDEN_STORAGE_PREFIX)) continue;
    if (val === true) {
      clean[key] = true;
    }
  }
  return clean;
}

export function unpackUiAppearanceStoragePayload(raw: unknown): {
  labels: UiAppearanceLabelsMap;
  hiddenKeys: UiAppearanceHiddenMap;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { labels: {}, hiddenKeys: {} };
  }
  const rawLabels: Record<string, unknown> = {};
  const rawHidden: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (k.startsWith(UI_HIDDEN_STORAGE_PREFIX)) {
      const actualKey = k.slice(UI_HIDDEN_STORAGE_PREFIX.length);
      if (actualKey && (v === '1' || v === true)) {
        rawHidden[actualKey] = true;
      }
    } else {
      rawLabels[k] = v;
    }
  }
  return {
    labels: sanitizeUiAppearanceLabelsMap(rawLabels),
    hiddenKeys: sanitizeUiAppearanceHiddenMap(rawHidden),
  };
}

export function packUiAppearanceStoragePayload(
  labels: UiAppearanceLabelsMap,
  hiddenKeys?: UiAppearanceHiddenMap
): Record<string, string> {
  const packed: Record<string, string> = { ...sanitizeUiAppearanceLabelsMap(labels) };
  const cleanHidden = sanitizeUiAppearanceHiddenMap(hiddenKeys);
  for (const key of Object.keys(cleanHidden)) {
    packed[`${UI_HIDDEN_STORAGE_PREFIX}${key}`] = '1';
  }
  return packed;
}

export function isUiLabelVisible(
  hiddenKeys: UiAppearanceHiddenMap | undefined | null,
  key: string
): boolean {
  return !hiddenKeys?.[key];
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
