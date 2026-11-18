# MASTER PROMPT — IMPLEMENTASI UI/UX FINAL LYNK BUILDER

Anda bekerja pada project Lynk Builder yang sedang terbuka di Google AI Studio. Implementasikan redesign UI/UX menyeluruh berdasarkan dokumen **Dokumentasi UI/UX Final Lynk Builder** yang diberikan bersama prompt ini.

## MISI
Lakukan **Full UI/UX Redesign — Functionality Preserved**. Setelah memahami source dan dokumen, implementasikan seluruh redesign dalam satu pekerjaan terencana. Fokus hanya pada presentasi visual, tata letak, navigasi, konsistensi komponen, dan pengalaman penggunaan.

## ATURAN MUTLAK
1. **JANGAN menghapus atau mengurangi fitur.** Semua halaman, menu, kontrol, item Alat/Blok, callbacks, interaksi, data, dan alur yang ada harus tetap tersedia dan bekerja.
2. Jangan mengubah business logic, API contracts, database/schema, autentikasi/otorisasi, integrasi, transaksi, mekanisme save, penyimpanan, backup/restore, import/export, publikasi, atau routing bisnis kecuali perubahan presentasi navigasi benar-benar diperlukan dan tetap mempertahankan URL/behavior lama.
3. Jangan mengubah drag-and-drop, klik pemilihan elemen di Live Preview, rendering halaman publik, live preview update, atau mekanisme penyimpanan.
4. Jangan mengganti stack, arsitektur, library, atau dependency tanpa alasan teknis mutlak. Jangan melakukan migrasi data, reset, seed ulang, atau perubahan environment.
5. Jangan membungkus halaman atau panel pengaturan di modal/popup. Semua halaman tampil langsung pada area konten utama. Dropdown hanya untuk pemilih usaha dan submenu navigasi yang memang diperlukan. Konfirmasi destruktif yang sudah ada tidak boleh dihapus hanya karena larangan popup.
6. Jangan mengarang fitur, kontrol, label bisnis, atau perilaku. Jika detail tidak jelas dari source/dokumen, pertahankan behavior lama dan laporkan.
7. Tidak perlu audit berulang atau audit berlebihan. Lakukan pemeriksaan source yang cukup untuk pemetaan dan keselamatan perubahan, lalu implementasikan.
8. Jangan berhenti setelah membuat rencana atau mockup. Setelah pemetaan selesai, lanjutkan implementasi UI/UX lengkap dalam pekerjaan ini. Jangan meminta persetujuan tambahan untuk setiap detail yang sudah ditetapkan dalam dokumen.

## FASE 1 — PAHAMI SOURCE DAN INVENTARISASI
Periksa project aktif yang sedang terbuka. Identifikasi:
- framework, entry points, routing, layout utama, komponen halaman, stylesheet/theme tokens;
- komponen TopBar/Header, LeftSidebar, Workspace/Device toolbar, MobileCanvas/Preview, RightInspector;
- seluruh halaman Editor, Analitik/Dashboard WA, Ads, Setting Usaha, Setting Sistem, Domain, Akses, API, Import, Backup, Copy HTML, dan halaman lain yang ditemukan;
- seluruh item di Alat dan Blok;
- semua kontrol Inspector yang saat ini ada, termasuk kontrol yang tersimpan di `advanceOptions` atau struktur lain;
- callbacks, state, sumber data, dan mekanisme persistensi untuk tiap kontrol;
- tests, lint, typecheck, dan build scripts.

Buat inventaris internal/matriks pemetaan sebelum mengubah UI. Jangan hanya mengandalkan nama komponen atau screenshot. Baca implementasi aktual dan pastikan semua kontrol lama terpetakan. Jangan mengubah kode saat inventaris belum cukup untuk menjamin preservasi.

## FASE 2 — TERAPKAN DESIGN SYSTEM
Gunakan token warna acuan:
- Navy `#17243D`
- Green `#00C98A`
- Pale blue-gray `#F0F5FA`
- Border `#DCE5EF`
- Slate blue `#8FA4BF`
- White `#FFFFFF`

Nilai warna merupakan perkiraan dari referensi; sesuaikan bila aset screenshot/source menunjukkan nilai yang lebih tepat. Terapkan secara konsisten pada semua halaman:
- background, cards, borders, radius, shadows;
- typography hierarchy;
- buttons, inputs, selects, sliders, toggles, badges, icons;
- hover, focus, active, disabled, loading, error, success states;
- spacing, alignment, sizing, scroll containers.

Gaya: bersih, ringan, profesional, minimalis, mudah dibaca. Gunakan hijau sebagai aksen, bukan warna dominan. Pastikan kontras dan aksesibilitas.

## FASE 3 — EDITOR LAYOUT
Pertahankan tiga area utama dengan proporsi visual acuan:
- Left Panel sekitar 17%: hanya tab Alat dan Blok; isi kartu grid dua kolom seperti screenshot; ikon di kiri, label di kanan; ellipsis untuk teks panjang. Pertahankan seluruh item, pencarian/kategori jika ada, klik, dan drag-drop.
- Workspace sekitar 60%: memakai sisa ruang; responsif.
- Right Inspector sekitar 23%: panel kanan dengan scroll independen.

Angka adalah proporsi referensi, bukan hardcoded width yang merusak responsivitas. Pertahankan resize behavior bila sudah ada. Jangan menyebabkan scroll horizontal yang tidak perlu.

### Workspace Toolbar
Tampilkan satu baris horizontal:
1. tombol langsung `Mobile (390px)`;
2. tombol langsung `Lebar (680px)`;
3. tombol `Simpan`;
4. tombol `Preview`.
Tidak ada dropdown tambahan untuk pilihan lebar. Tombol Simpan wajib memanggil mekanisme save lama. Feedback penyimpanan boleh muncul sesuai pola existing. Jangan tampilkan label “Tersimpan · v14” sebagai pengganti tombol Simpan.

### Live Preview
Gunakan screenshot smartphone yang diberikan sebagai arah visual: frame membulat, latar lembut, kartu putih, shadow halus, tipografi jelas, navbar bawah. Pertahankan scroll di viewport dan pemilihan elemen dengan klik langsung. Inspector harus tetap terhubung ke elemen yang dipilih.

## FASE 4 — INSPECTOR: TIGA TAB WAJIB UNTUK SETIAP KOMPONEN
**KEPUTUSAN TERBARU DAN WAJIB:** setiap komponen yang dipilih dari Alat maupun Blok wajib memiliki tepat tiga tab utama:
1. **Desain**
2. **Konten**
3. **Tema**

Jangan menggunakan `Home` sebagai tab ketiga Inspector komponen. Home/page-level settings tetap harus dipertahankan secara terpisah sesuai Fase 5.

### Desain
Kelompok:
- Pengaturan Khusus Komponen (dinamis, paling atas);
- Layout & Spasi;
- Gaya Visual;
- Tipografi;
- Background & Warna;
- Border & Garis Tepi.

### Konten
Kelompok:
- Identitas Komponen;
- Konten Utama;
- Data & Daftar Item;
- Tautan & Navigasi;
- Aksi & Interaksi;
- Pengaturan Tambahan.

### Tema
Setiap komponen default mengikuti Tema Global. Tampilkan kontrol bermakna untuk:
- status `Gunakan Tema Global` (default);
- `Penyesuaian Tema Komponen` (override lokal);
- penanda visual mana yang diwarisi dan mana yang dioverride;
- aksi `Kembalikan ke Tema Global` yang menghapus override visual lokal saja.

Override satu komponen tidak boleh mengubah komponen lain atau Tema Global. Jangan menghapus konten, aksi, atau data saat reset tema.

### Aturan tiga tab
- Ketiga tab harus tersedia pada SEMUA komponen Alat dan Blok.
- Jangan pernah tampilkan tab kosong atau placeholder tanpa fungsi.
- Isi setiap tab kontekstual sesuai tipe komponen; jangan memaksakan semua kontrol yang sama ke semua komponen.
- Bila kategori tertentu memang tidak relevan, jelaskan ringkas bahwa tidak ada pengaturan tambahan untuk kategori tersebut. Jangan menciptakan kontrol palsu.
- Petakan SEMUA kontrol lama ke Desain/Konten/Tema atau page-level settings. Tidak boleh ada kontrol lama yang hilang.
- Pertahankan callback, state, tipe nilai, default, validasi, dan persistensi masing-masing kontrol.
- Default tab pertama kali Inspector dibuka adalah Desain.
- Ketika berpindah komponen, pertahankan tab aktif.
- Perubahan belum disimpan tidak boleh hilang saat berpindah tab atau komponen.
- Gunakan Multiple Accordion.
- Header Inspector dan tab sticky; hanya isi pengaturan yang scroll.
- Form edit multi-item tetap di panel kanan; tombol kembali ke daftar item.
- Live Preview tetap update sesuai behavior lama.

## FASE 5 — HOME / PAGE-LEVEL SETTINGS TETAP ADA
Jangan menghapus Home/page-level settings hanya karena tab komponen berubah menjadi Tema. Pertahankan akses Home/page settings melalui pola akses yang ada saat ini; jangan membuat popup baru atau mengarang navigasi baru.

Area page-level:
- **Tema Global:** preset tema, warna global, tipografi dasar.
- **Top:** komponen dan pengaturan area atas yang memang sudah ada.
- **Body:** Susunan Lapisan (Layers) existing.
- **Bottom:** Navbar Bawah saja.

Tema Global adalah sumber default untuk tab Tema tiap komponen. Top, Body, Bottom independen; perubahan satu area tidak menghapus atau mereset area lain. Multiple Accordion, tertutup secara default jika sesuai pola yang disepakati. Jangan membuat fitur page builder baru.

## FASE 6 — MULTI-ITEM EDITOR
Untuk katalog, carousel, social media, dan komponen berisi item:
- daftar item ringkas;
- edit form di Inspector kanan, bukan modal tengah;
- tombol kembali ke daftar;
- menu tiga titik untuk Duplicate/Delete jika tersedia;
- Add Item tetap ada jika tersedia;
- pertahankan Save/Cancel semantics dan mekanisme preview;
- jangan mengubah data shape atau persistence.

## FASE 7 — HEADER UTAMA FINAL
Urutan persis:
1. `LB Lynk Builder`
2. separator karakter `|`
3. ikon gear saja `⚙️` untuk **Setting Usaha**
4. dropdown pemilih usaha, contoh `JasClub (/jasclub) ▼`
5. inisial/avatar pengakses, contoh `[AD]`, di belakang dropdown usaha; data dinamis dari user yang sedang login
6. `Editor`
7. `Analitik` (menggantikan label Dashboard WA)
8. `Ads`
9. `Setting` (Setting Sistem)
10. link publik usaha, contoh `/p/jasclub`
11. `Logout`

Setting Usaha dan Setting Sistem adalah dua tujuan berbeda:
- Setting Usaha hanya ikon gear sebelum dropdown usaha; membuka halaman pengaturan usaha aktif secara langsung.
- Setting Sistem berupa menu `Setting` setelah Ads; membuka halaman pengaturan sistem secara langsung.
- Keduanya bukan modal/popup.
- Setting Sistem mempertahankan akses ke Domain, Akses, Setting API, Import, Backup, Copy HTML, serta semua item existing.
- Dropdown hanya untuk memilih usaha; submenu boleh digunakan untuk navigasi bila memang pola existing memerlukannya, tetapi halaman selalu dibuka langsung di area konten utama.
- Jangan mengubah role/permissions atau sumber data avatar/inisial.

## FASE 8 — SELURUH HALAMAN
Terapkan bahasa visual konsisten ke Editor, Analitik, Ads, Setting Usaha, Setting Sistem, Domain, Akses, API, Import, Backup, Copy HTML, dan semua halaman lain yang ditemukan.
- Setiap menu membuka halaman langsung di area utama.
- Jangan mengubah fungsi halaman.
- Rapikan page header, title, description, cards, tables, forms, actions, empty/loading/error/success states.
- Pertahankan semua kontrol dan alur lama.
- Jangan menggunakan modal sebagai wadah halaman/pengaturan.

## FASE 9 — VALIDASI DAN PENGUJIAN
Jalankan perintah yang tersedia dalam project untuk lint, typecheck, build, dan tests. Jangan mengklaim lulus bila tidak dijalankan. Uji setidaknya:
- semua halaman/menu lama masih dapat dibuka;
- semua komponen Alat dan Blok dapat dipilih;
- setiap komponen memiliki tiga tab berisi pengaturan yang relevan;
- seluruh kontrol lama masih bekerja dan nilai tetap tersimpan;
- Tema Global, override lokal, reset override;
- Home page-level Tema/Top/Body/Bottom tetap tersedia dan independen;
- drag-drop, klik pilih elemen, Live Preview;
- tombol Simpan memanggil mekanisme lama;
- Mobile/Lebar langsung memilih viewport;
- multi-item add/edit/duplicate/delete/cancel/save;
- Setting Usaha dan Setting Sistem terpisah;
- avatar/inisial dinamis;
- link publik dan Logout;
- import/export/backup sesuai kemampuan existing;
- tidak ada halaman pengaturan yang berubah menjadi popup.

Bandingkan screenshot hasil dengan screenshot referensi pengguna. Periksa desktop dan ukuran layar yang didukung project. Jangan mengubah fungsi demi mengejar kesamaan visual.

## FASE 10 — LAPORAN AKHIR
Setelah implementasi, berikan laporan ringkas:
1. halaman/komponen UI yang dirapikan;
2. bukti semua komponen Alat/Blok memiliki tiga tab;
3. daftar kontrol lama yang dipetakan ke Desain/Konten/Tema;
4. fitur yang dipertahankan dan alur yang diuji;
5. hasil lint/typecheck/build/tests;
6. kendala yang belum terselesaikan;
7. konfirmasi eksplisit bahwa tidak ada perubahan backend/database/API/business logic yang disengaja.

**Prioritas tertinggi:** preservasi 100% kemampuan aplikasi lama. Jika ada konflik antara desain visual dan perilaku existing, pertahankan perilaku existing dan laporkan konflik; jangan menebak atau mengubah fungsi.


---

## LAMPIRAN VISUAL WAJIB — SCREENSHOT PENGGUNA

Paket dokumentasi menyertakan screenshot asli yang diunggah pengguna. Gunakan screenshot tersebut sebagai referensi visual dan konteks fitur. Jangan mengubah, memotong, mengompres ulang, memberi anotasi, mengganti, atau menghapus file screenshot asli. File sumber asli disertakan utuh di folder `referensi_screenshot_asli/` dalam paket ZIP.

### Aturan penggunaan referensi
1. Screenshot aplikasi asli menjadi sumber untuk memahami struktur, kontrol, fitur, dan perilaku yang sudah ada.
2. Screenshot desain yang disepakati menjadi acuan visual tampilan baru.
3. Jangan menafsirkan gambar ilustrasi hasil AI sebagai bukti bahwa fungsi tertentu sudah ada di aplikasi.
4. Jika tampilan gambar berbeda dengan fungsi pada kode, pertahankan fungsi pada kode dan terapkan perubahan visual sesuai keputusan desain.
5. Jangan menghapus fitur hanya karena tidak tampak pada screenshot.
6. Jika suatu kontrol atau perilaku tidak dapat dipastikan dari screenshot maupun kode, pertahankan perilaku lama dan laporkan ketidakpastiannya.

### HEADER FINAL — WAJIB IKUTI PEMBAGIAN TIGA AREA

**KIRI — Identitas aplikasi & bisnis**
- LB Lynk Builder
- Ikon roda gigi: Setting Usaha
- Dropdown bisnis, contoh `JasClub (/jasclub)`
- Avatar/inisial pengguna, contoh `AD`

**TENGAH — Navigasi halaman**
- Editor
- Analitik
- Ads
- Setting Sistem

**KANAN — Akses publik & akun**
- Link publik, contoh `/p/jasclub`
- Logout

Ketentuan:
- Editor adalah menu pertama pada area Tengah.
- Jangan memindahkan dropdown bisnis atau avatar ke area Tengah.
- Jangan memindahkan link publik atau Logout ke area Tengah.
- Ketiga area tetap sejajar dalam satu baris pada desktop; atur responsivitas untuk layar sempit tanpa tumpang tindih.
- Setting Usaha (ikon roda gigi di area Kiri) berbeda dari Setting Sistem (menu navigasi di area Tengah).
- Screenshot pengguna `image(20261117-175759).png` adalah referensi susunan header final. `image(20261117-175615).png` adalah referensi tambahan area kiri.
- Ilustrasi header hasil desain ulang di dokumen merupakan referensi visual pendamping, bukan pengganti screenshot asli.

### Daftar screenshot asli
File-file bernama `image(....).png` yang terdapat di folder `referensi_screenshot_asli/` merupakan unggahan asli pengguna. Pertahankan nama file dan byte sumbernya. Lihat Lampiran B pada dokumen UI/UX untuk daftar dan tampilan referensi.
