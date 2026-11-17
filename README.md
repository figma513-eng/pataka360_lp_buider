# Lynk Builder — Panduan Menjalankan di Mac / VPS & Dokumentasi Teknis

Aplikasi **Lynk Builder** adalah visual landing page & link-in-bio builder untuk UMKM Indonesia dengan fitur katalog WhatsApp, pelacakan konversi iklan (Meta Pixel / CAPI, TikTok, Google Tag), multi-unit usaha, RBAC (Super Admin, Admin, Editor, Viewer), serta backend **Express + PostgreSQL (Drizzle ORM / SQL Migrations)**.

---

## 1. Prasyarat Lingkungan (Mac / Linux / VPS)

- **Node.js**: `>= 22.18.0 LTS` (menggunakan `npm` bawaan Node 22; sudah dilengkapi `package-lock.json`).
- **PostgreSQL**: versi `14+` (opsional untuk mode dev lokal karena ada fallback JSON, **wajib** untuk mode `NODE_ENV=production` kecuali `ALLOW_LOCAL_JSON_STORAGE=true`).
- **Git / Terminal**: macOS Terminal atau iTerm2.

Cek versi di terminal Mac:
```bash
node -v   # Pastikan v22.18.0 ke atas
npm -v    # Pastikan npm >= 10
```

---

## 2. Instalasi Bersih & Konfigurasi `.env`

1. Masuk ke folder proyek dan install dependensi secara deterministik:
   ```bash
   npm ci
   ```
2. Salin contoh variabel lingkungan menjadi `.env`:
   ```bash
   cp .env.example .env
   ```
3. Buat `SESSION_SECRET` kriptografis yang kuat (>= 32 karakter hex) di Mac:
   ```bash
   openssl rand -hex 32
   ```
4. Edit `.env` sesuai konfigurasi lokal Mac Anda:
   ```dotenv
   NODE_ENV="development"
   HOST="127.0.0.1"
   PORT="3000"
   APP_URL="http://localhost:3000"

   SESSION_SECRET="<paste_hasil_openssl_rand_hex_32>"

   PGHOST="localhost"
   PGPORT="5432"
   PGUSER="postgres"
   PGPASSWORD="password_postgres_anda"
   PGDATABASE="lynk_builder"
   PGSSL="false"
   ```

> **Catatan TLS PostgreSQL**:
> - Untuk PostgreSQL lokal di Mac (`localhost`), set `PGSSL="false"`.
> - Untuk PostgreSQL cloud/production (RDS, Neon, Supabase, Cloud SQL), set `PGSSL="true"`. Sertifikat diverifikasi secara ketat (`rejectUnauthorized: true` default). Bila penyedia memakai CA khusus, isi `PGSSL_CA_FILE="/path/ca.pem"` atau `PGSSL_CA`.

---

## 3. Setup Database PostgreSQL Lokal di macOS

Jika memakai Homebrew PostgreSQL di Mac:
```bash
brew install postgresql@16
brew services start postgresql@16
createdb lynk_builder
```

Jalankan migrasi skema & tabel versi (`schema_migrations`) secara aman dan non-destruktif:
```bash
npm run db:migrate
```
> Anda juga dapat melihat atau mengunduh skema lengkap dari file `src/db/schema.sql` maupun dari menu **Setting API -> Database PostgreSQL & Server** di antarmuka aplikasi.

---

## 4. Menjalankan Aplikasi

### Mode Development (HMR / TSX)
```bash
npm run dev
```
Buka browser di **`http://127.0.0.1:3000`** atau **`http://localhost:3000`**.

### Mode Production (Build + Node 22 Native)
```bash
npm run build
NODE_ENV=production npm start
```
> **Perhatian Mode Production**:
> - Server akan **gagal start (fail-closed)** jika `SESSION_SECRET` tidak diisi, panjangnya < 32 karakter, entropi rendah, atau masih berupa nilai placeholder contoh.
> - Server mengembalikan **HTTP 503** pada `/api/health/ready` dan rute penyimpanan jika PostgreSQL tidak terhubung, **kecuali** Anda mengizinkan penyimpanan JSON lokal secara eksplisit via `ALLOW_LOCAL_JSON_STORAGE="true"`.

---

## 5. Pengujian Otomatis, Lint & Build

Jalankan seluruh verifikasi dari terminal:
```bash
npm run lint    # TypeScript check (tsc --noEmit)
npm test        # Test suite resmi Node.js (keamanan, backup, persistensi, & performa)
npm run build   # Bundle produksi Vite
```

---

## 6. Fitur Keamanan & Integritas Data Terpasang

- **Autentikasi Cookie `HttpOnly; SameSite=Lax`**: Token sesi tidak disimpan di `localStorage`.
- **Proteksi CSRF Double-Submit + Origin Check**: Mutasi state wajib melalui origin yang sah + token/header CSRF.
- **Kontrol Akses P0-A**: Registrasi pertama menjadi satu-satunya `super_admin` secara atomik (aman dari race condition); pendaftar berikutnya mendapat hak minimal (`viewer`); penulisan `POST /api/projects/:id/save` dan `/publish` memvalidasi kesamaan ID dan izin scope di server.
- **Proteksi SSRF Outgoing**: Resolusi `/api/resolve-video` dan outgoing webhook memblokir IP loopback (`127.0.0.1`, `::1`), IP privat RFC1918, CGNAT, link-local / cloud metadata (`169.254.169.254`), non-80/443 port, serta mengikuti redirect secara manual dengan validasi ulang di tiap hop.
- **Sanitasi HTML/CSS Isomorfis**: Sanitasi tag/atribut berbahaya dijalankan sebelum simpan & ekspor HTML di klien maupun server (tanpa ketergantungan DOMParser).
- **Optimistic Concurrency Control (OCC)**: Setiap proyek membawa nomor `revision`; bila ada perubahan paralel dari tab lain, server mengembalikan `409 REVISION_CONFLICT` dan editor menampilkan dialog penyelesaian konflik alih-alih menimpa diam-diam.
- **Upload Media Disk + Magic Bytes**: Upload gambar di Inspector memvalidasi signature byte (PNG/JPG/WebP/GIF) dan menyimpannya ke `.data/media/` lewat `/api/media/:filename` agar JSON proyek tetap ringan.
- **Complete Backup & Staged Restore**:
  - Dari **Setting API -> Database PostgreSQL & Server -> Backup Lengkap (.json)**, Super Admin dapat mengunduh bundel lengkap (proyek, analitik, aset media base64, setting aman — tanpa password/token sesi) dengan checksum **SHA-256**.
  - Saat **Restore**, aplikasi menampilkan **Pratinjau & Validasi Checksum** terlebih dahulu, meminta centang konfirmasi eksplisit, dan otomatis membuat snapshot pengaman **pre-restore** di `.data/backups/` sebelum memperbarui data secara atomik.

---

## 7. Checklist Uji Browser Manual di Mac (Pengganti Automated Headless Browser)

Karena runtime sandbox cloud tidak menyertakan biner Chromium/Playwright, lakukan verifikasi interaktif berikut saat pertama kali menjalankan di Mac Anda:

1. **Login & Cookie**: Buka DevTools -> *Application -> Cookies* -> pastikan cookie `lynk_sid` bertipe `HttpOnly`, dan `localStorage` **tidak** berisi token sesi.
2. **Edit Kanvas & Autosave**: Ubah teks/judul blok di kanvas -> dalam ~2 detik badge tombol kanan-atas berubah dari `Simpan` -> `Menyinkronkan...` -> `Tersimpan · v2`.
3. **Upload Gambar**: Unggah gambar ke blok Gambar/Katalog -> cek tab *Network* -> `POST /api/media/upload` mengembalikan URL `/api/media/med_...` dan gambar muncul di pratinjau serta `/p/:slug`.
4. **Konflik Versi (OCC)**: Buka unit usaha yang sama di 2 tab browser. Simpan perubahan di Tab A, lalu ubah & simpan di Tab B -> dialog **"Konflik Versi Proyek Terdeteksi"** muncul dengan opsi Muat Versi Server atau Timpa.
5. **Backup & Restore**: Buka *Setting API -> Database PostgreSQL & Server* -> Unduh Backup Lengkap `.json` -> Pilih file yang sama di *Pilih File Restore* -> verifikasi badge **Checksum SHA-256 Valid**, centang konfirmasi, dan jalankan restore.
6. **Multi-User & Logout**: Keluar dari akun A lalu masuk dengan akun B -> pastikan IndexedDB tidak membocorkan proyek draf akun A.
