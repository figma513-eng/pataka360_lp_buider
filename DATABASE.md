# Arsitektur Database — Local JSON Store & Opsi PostgreSQL

**Lynk Builder** menetapkan **Local JSON Store** sebagai mesin database utama untuk pengembangan di Google AI Studio maupun pengujian mandiri di komputer lokal.

---

## 1. Lokasi & Struktur Penyimpanan Local JSON Store

Secara default (`LYNK_DATA_DIR=".data"`), seluruh data server disimpan di:

- `.data/lynk-server-store.json` — Database utama JSON terstruktur (`schemaVersion: 1`).
- `.data/media/` — Aset biner gambar hasil upload (PNG/JPG/WebP/GIF) terpisah agar file store tetap ringan.
- `.data/backups/` — Snapshot otomatis pre-restore (`pre-restore-<timestamp>.json`).
- `.data/.dev-session-secret` — Secret sesi lokal (khusus development; tidak pernah diekspor).

### Entitas yang Tersimpan di `lynk-server-store.json`

1. `users`: Akun pengguna (`id`, `name`, `email`, `passwordHash` format `scrypt`, `role`, `isActive`, `unitScope`, `permissions`, `createdAt`, `updatedAt`, `lastLoginAt`).
2. `sessions`: Sesi aktif server-side (di-hash SHA-256 sebelum disimpan; selalu dikosongkan saat export ZIP).
3. `projects`: Seluruh proyek landing page lengkap dengan revisi OCC (`revision`), `renderedHtml`, konfigurasi `publishing`, dan `ads`.
4. `events`: Log analitik kunjungan, klik WA, dan event konversi (`analytics_events`).
5. `accessSettings`: Kebijakan kontrol akses (`defaultRole`, `members`, `activeMemberId`).
6. `apiSettings`: Konfigurasi Public API, rate limit, CORS, webhook URL & events.
7. `webhookLogs`: Riwayat pengiriman outgoing webhook beserta status HTTP & payload summary.
8. `mediaAssets`: Metadata aset media (SHA-256, MIME type, ukuran byte, URL `/api/media/...`).

---

## 2. Jaminan Integritas & Atomic Write

- **Atomic Write**: Setiap penulisan ke `lynk-server-store.json` ditulis terlebih dahulu ke berkas temporer (`lynk-server-store.json.<pid>.<random>.tmp`), di-flush ke disk (`fsync`), lalu dipindahkan secara atomik dengan `fs.rename()`. Proses ini mencegah file rusak setengah tulis jika server mati mendadak.
- **Serialization Lock**: Penulisan paralel diantrekan lewat `withJsonStoreLock()` sehingga tidak terjadi race condition penimpaan.
- **Validasi Struktur & Penanganan File Korup (Fail-Closed)**:
  - Saat membaca store, server memvalidasi sintaks JSON dan struktur wajib (`users`, `sessions`, `events`, `webhookLogs` berupa array; `projects` berupa objek non-null).
  - Jika file korup atau terpotong, server **TIDAK** menimpanya dengan database kosong. File korup dibekukan menjadi salinan karantina `lynk-server-store.json.corrupt.<timestamp>.bak`, cache menandai status `STORAGE_CORRUPT`, dan `/api/health/ready` mengembalikan HTTP `503` agar operator dapat melakukan pemulihan aman.

---

## 3. Tidak Ada Silent Fallback Database

- Mode database ditentukan secara eksplisit lewat `DB_ENGINE`:
  - Default (tidak diisi atau `"local-json"`): Aplikasi menjalankan **Local JSON Store** sebagai mesin utama dan **tidak** meminta maupun mencoba menghubungkan `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, atau `PGSSL`.
  - `"postgresql"` (opsional lanjutan): Aplikasi wajib terhubung ke PostgreSQL yang dikonfigurasi dan menjalankan migrasi skema `src/db/schema.sql`. Jika PostgreSQL gagal terhubung, server tidak diam-diam berpindah ke JSON Store kecuali `ALLOW_LOCAL_JSON_FALLBACK="true"` diatur secara eksplisit.

---

## 4. Menggunakan PostgreSQL sebagai Opsi Masa Depan & Migrasi Data Aman

Jika kelak Anda ingin berpindah dari **Local JSON Store** ke **PostgreSQL**:
1. Buat backup penuh terlebih dahulu (tombol **Unduh Full Project + DB (.zip)** atau `npm run export:zip`).
2. Isi `.env` dengan kredensial PostgreSQL terverifikasi TLS (`DATABASE_URL` atau `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSL="true"`), **tanpa** menyalakan `DB_ENGINE="postgresql"` sebelum migrasi terverifikasi.
3. Periksa skema & terapkan migrasi maju (`src/db/migrations.ts`, sinkron dengan `src/db/schema.ts` dan `src/db/schema.sql`):
   ```bash
   npm run db:migrate:status
   npm run db:migrate
   ```
   Runner memverifikasi checksum SHA-256 setiap migrasi yang sudah diterapkan (`schema_migrations`), menolak perubahan diam-diam pada migrasi lama, dan mengeksekusi setiap migrasi dalam transaksi `BEGIN ... COMMIT` dengan advisory lock.
4. Jalankan dry-run migrator Local JSON ke PostgreSQL (aman, read-only):
   ```bash
   npm run db:migrate:json -- --dry-run
   ```
5. Jalankan migrasi transaksional + verifikasi integritas seluruh tabel & berkas media (sesi aktif tidak ikut dipindahkan secara default demi keamanan):
   ```bash
   npm run db:migrate:json -- --apply
   npm run db:migrate:json -- --verify-only
   ```
6. Setelah `integrityOk: true`, barulah set `DB_ENGINE="postgresql"` di `.env` dan restart server. File sumber `.data/lynk-server-store.json` serta `.data/media/` tetap dipertahankan utuh sebagai cadangan.

### Prosedur Rollback ke Local JSON Store
Jika ditemukan anomali setelah aktivasi PostgreSQL:
1. Hentikan proses server yang memakai PostgreSQL.
2. Kembalikan `DB_ENGINE="local-json"` di `.env` (dan hapus/kosongkan variabel koneksi PG aktif jika tidak dipakai sementara), **jangan** hapus database PostgreSQL terlebih dahulu sebelum investigasi.
3. Jalankan ulang server (`npm run dev` / `npm start`) — server akan membaca ulang `.data/lynk-server-store.json` dan `.data/media/` yang tidak pernah dimodifikasi selama migrasi.
4. Bila ada perubahan baru yang terlanjur tercatat di PostgreSQL dan ingin ditarik kembali ke lokal, jalankan **Unduh Backup Lengkap (.json)** atau **Unduh Full DB (.sql)** sebelum memutus koneksi PostgreSQL.
