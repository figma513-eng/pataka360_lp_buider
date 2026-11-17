# Changelog — Lynk Builder

## [1.0.0] — Optimalisasi Arsitektur Google AI Studio & Local Portability

### Perubahan Utama
- **Google AI Studio sebagai Pusat Pengembangan**: Menstabilkan server development Express + Vite middleware di port `3000` (menghindari bentrok port container dan WebSocket HMR pada `server.ts` serta `vite.config.ts`).
- **Local JSON Store sebagai Database Utama (`P1`)**:
  - Menetapkan `DB_ENGINE="local-json"` sebagai default utama di `.env.example`, `src/db/index.ts`, dan `src/db/repository.ts`.
  - Menghilangkan kebutuhan variabel PostgreSQL (`PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, `PGSSL`) saat Local JSON Store aktif serta mencegah silent fallback antar mesin database.
  - Menambahkan validasi struktur `lynk-server-store.json` + karantina otomatis file korup tanpa menimpa data menjadi kosong.
- **Bootstrap Super Admin Satu Kali & Keamanan Auth (`P2`)**:
  - Menambahkan endpoint khusus `POST /api/auth/bootstrap-super-admin` (atomik, hanya dapat dijalankan satu kali selama belum ada `super_admin`, mendukung opsional `BOOTSTRAP_SETUP_KEY`).
  - Memastikan `POST /api/auth/register` selalu menetapkan role `viewer` (tidak pernah otomatis memberi `super_admin`) dan menolak pendaftaran (`403 BOOTSTRAP_REQUIRED`) sebelum bootstrap selesai.
  - Memperbarui UI `LoginPage.tsx` untuk membedakan alur Bootstrap Super Admin vs Daftar Akun Viewer.
- **Full Project + Database Export ZIP (`P3`)**:
  - Menambahkan `src/server/fullExportService.ts`, endpoint `GET /api/backup/export-zip` (khusus Super Admin), skrip CLI `npm run export:zip`, dan tombol **Unduh Full Project + DB (.zip)** di `ApiSettingsModal`.
  - Menghasilkan arsip `Lynk-Builder-Full-Backup-[VERSION]-[DATE].zip` lengkap dengan `manifest.json` SHA-256 untuk seluruh file serta mengecualikan `node_modules`, `.env`, cache, active sessions, dan secret keys.
- **Import & Restore ZIP/JSON + Project Restore (`P4`)**:
  - Menambahkan `src/server/zipRestoreService.ts` dan endpoint `POST /api/backup/restore/zip/preview` serta `/api/backup/restore/zip/apply`.
  - Mendukung validasi ZIP (termasuk proteksi Zip Slip & deteksi file rahasia), verifikasi manifest + checksum SHA-256, pemeriksaan schema & versi, pratinjau sebelum restore, snapshot otomatis pre-restore, serta pilihan **Full Restore** dan **Project Restore (Selektif)**.
- **Dokumentasi & Test Suite (`P5`–`P6`)**:
  - Menyediakan 8 dokumen lengkap (`README.md`, `INSTALL.md`, `LOCAL-TESTING.md`, `DATABASE.md`, `POSTGRESQL-SETUP.md`, `DATABASE-MIGRATION.md`, `BACKUP-RESTORE.md`, `CHANGELOG.md`) untuk Windows, macOS Intel, dan macOS Apple Silicon.
  - Menambahkan `tests/zip_backup_restore.test.ts` dan `tests/postgres_migration.test.ts`, serta memperbarui `tests/security.test.ts`, `tests/persistence_backup.test.ts`, dan `tests/performance.test.ts`.
- **PostgreSQL Readiness v004 & JSON-to-PG Migrator (`P0`)**:
  - Menyinkronkan `src/db/schema.ts`, `src/db/schema.sql`, dan `src/db/migrations.ts` pada versi skema `004` (9 tabel + `BIGINT` `order_value` + indeks `idx_users_email_lower`) dengan runner transaksional & validasi checksum SHA-256.
  - Menambahkan `src/db/jsonToPgMigrator.ts` dan `scripts/migrate-json-to-postgres.ts` (`--dry-run`, `--apply`, `--verify-only`) beserta salinan media & verifikasi SHA-256 tanpa mengubah Local JSON Store aktif di AI Studio.
