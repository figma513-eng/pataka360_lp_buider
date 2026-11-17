# Sistem Backup (Export ZIP Lengkap) & Restore

Dokumen ini menjelaskan mekanisme ekspor proyek lengkap beserta database dan prosedur restore yang aman pada **Lynk Builder**.

---

## 1. Export Lengkap (`Lynk-Builder-Full-Backup-[VERSION]-[DATE].zip`)

Ekspor ZIP lengkap hanya dapat dilakukan oleh **Super Admin** melalui:
- **UI**: `Setting API -> Database, Export ZIP & Restore -> Unduh Full Project + DB (.zip)` (`GET /api/backup/export-zip`).
- **CLI**: `npm run export:zip [optional-output-path.zip]`.

### Isi Paket ZIP

1. **Source Code**: `src/`, `server.ts`, `index.html`, `public/`, `scripts/`, `tests/`.
2. **Database (Local JSON Store)**:
   - `database/lynk-server-store.json` (data `users` beserta `passwordHash`, `projects`, `events`, `accessSettings`, `apiSettings`, `webhookLogs`, `mediaAssets` — dengan `sessions: []`).
   - `database/db-meta.json` (versi aplikasi, versi schema `1`, mode database `local-json`, statistik jumlah record).
   - `database/media/*` (seluruh file media upload).
   - `.data/lynk-server-store.json` & `.data/media/*` (salinan siap pakai langsung saat diekstrak dan dijalankan di komputer lokal).
3. **Konfigurasi**: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `.env.example`, `.gitignore`, `metadata.json`.
4. **Dokumentasi**: `README.md`, `INSTALL.md`, `LOCAL-TESTING.md`, `DATABASE.md`, `BACKUP-RESTORE.md`, `CHANGELOG.md`.
5. **Manifest Integritas (`manifest.json`)**: Berisi versi aplikasi, timestamp export, mode database, versi schema, daftar seluruh file lengkap dengan ukuran byte (`sizeBytes`) dan hash **SHA-256** (`sha256`).

### File yang Dilarang & Dikecualikan

Paket ZIP secara otomatis mengecualikan:
- `node_modules/`, `dist/`, `build/`, cache, dan file sementara (`*.tmp`, `*.log`, `*.zip`).
- Session login aktif (`sessions` selalu dikosongkan `[]`).
- `.env` dan seluruh variasi `.env.*` (kecuali `.env.example`), `.dev-session-secret`, `.runtime-session-secret`, API keys, dan kredensial rahasia lainnya.

> **Peringatan Keamanan**: Karena ZIP backup lengkap memuat `passwordHash` akun untuk kebutuhan pengujian & pemulihan penuh di komputer lokal, simpan arsip ZIP di tempat privat dan **jangan pernah** membagikannya ke repositori publik. Untuk berbagi data non-sensitif tanpa akun/hash, gunakan tombol **Backup Data (.json)**.

---

## 2. Sistem Import & Restore

Menu **Pilih File Restore (.zip / .json)** mendukung berkas `.zip` (hasil Export Full ZIP) maupun `.json` (hasil Backup Data Portabel) dengan pipeline verifikasi bertahap:

1. **Validasi Struktur ZIP**: Memeriksa keutuhan arsip ZIP, menolak path traversal (`Zip Slip` seperti `../`), dan menolak paket bila mengandung berkas terlarang (`.env`, secret file).
2. **Validasi `manifest.json`**: Memeriksa format `lynk-builder-full-backup-zip`, kompatibilitas `schemaVersion`, dan keberadaan seluruh file yang tercatat di manifest.
3. **Validasi Checksum SHA-256**: Memverifikasi hash SHA-256 setiap file di dalam ZIP terhadap `manifest.json` (serta verifikasi integritas isi `database/lynk-server-store.json`). Jika ada 1 byte saja yang berubah/rusak, proses dibatalkan sebelum menyentuh database.
4. **Validasi Schema & Kompatibilitas Versi**: Memastikan struktur `users`, `projects`, `events`, `webhookLogs`, `accessSettings`, dan `apiSettings` valid dan `schemaVersion <= LOCAL_JSON_SCHEMA_VERSION`.
5. **Pratinjau Sebelum Restore**: Menampilkan perbandingan jumlah proyek, analitik, media, dan user antara backup masuk dan database saat ini, termasuk daftar perubahan tiap proyek (`Baru` vs `Timpa`).
6. **Snapshot Otomatis Pre-Restore**: Sebelum perubahan apa pun diterapkan, server otomatis menyimpan snapshot kondisi saat ini ke `.data/backups/pre-restore-<timestamp>.json`. Database lama tidak pernah dihapus tanpa snapshot pengaman.
7. **Dua Mode Restore**:
   - **Full Restore**: Memulihkan seluruh proyek, event analitik, aset media, API settings, webhook logs, dan menggabungkan user non-duplikat (mempertahankan sesi aktif & invarian Super Admin tunggal).
   - **Project Restore (Selektif)**: Memulihkan proyek yang dicentang saja beserta media & event analitik terkait proyek tersebut tanpa menghapus proyek lain yang sudah ada, dengan deduplikasi ID dan disambiguasi slug jika bentrok.
8. **Pelaporan Hasil Restore**: Mengembalikan jumlah proyek, analitik, media, user yang dipulihkan, nama berkas snapshot pre-restore, serta peringatan bila ada penyesuaian slug.
