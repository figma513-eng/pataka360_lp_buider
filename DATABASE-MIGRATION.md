# Panduan Migrasi & Verifikasi Database — Local JSON Store ke PostgreSQL

Dokumen ini menjelaskan arsitektur teknis migrasi skema **v004** (9 tabel), alat migrasi data dari **Local JSON Store** (`.data/lynk-server-store.json`) ke **PostgreSQL**, verifikasi integritas media & JSONB, serta prosedur rollback aman.

---

## 1. Daftar File PostgreSQL & Migrasi dalam Paket Ini

| Komponen | Lokasi File | Fungsi |
| :--- | :--- | :--- |
| Skema Drizzle ORM | `src/db/schema.ts` | Definisi 9 tabel, tipe JSONB, `BIGINT`, dan indeks (termasuk `idx_users_email_lower`) |
| Skema SQL DDL | `src/db/schema.sql` | Referensi DDL lengkap v4 untuk PostgreSQL 14+ |
| Migration Runner | `src/db/migrations.ts` | Eksekusi migrasi `001`–`004` dalam transaksi + `pg_advisory_xact_lock` + cek checksum SHA-256 |
| JSON → PG Migrator | `src/db/jsonToPgMigrator.ts` | Pre-flight check, copy/verify media SHA-256, upsert idempoten transaksional, & diff comparator |
| CLI Skema Migrasi | `scripts/migrate.ts` | Menjalankan `npm run db:migrate` dan `npm run db:migrate:status` |
| CLI Data Migrator | `scripts/migrate-json-to-postgres.ts` | Menjalankan `--dry-run`, `--apply`, dan `--verify-only` |
| Suite Uji Migrasi | `tests/postgres_migration.test.ts` | Uji sinkronisasi skema, kontrak runner, media copy/verify, migrator, diff, dan fail-closed 503 |

---

## 2. Arsitektur 9 Tabel (Skema Aktif `004`)

1. `schema_migrations` — Catatan versi terpasang (`001`..`004`), nama, checksum SHA-256 (16 hex), dan timestamp.
2. `users` — Akun pengguna, hash password `scrypt`, `role`, `unit_scope_json`, `permissions_json`, serta indeks `idx_users_email` dan `idx_users_email_lower`.
3. `sessions` — Token hash sesi (`ON DELETE CASCADE` ke `users`).
4. `projects` — Data proyek `project_json` (JSONB), `rendered_html`, `slug` (`UNIQUE`), `revision` (OCC), dan `owner_user_id`.
5. `analytics_events` — Event analitik dengan `order_value BIGINT` (aman untuk nominal IDR > 2,14 miliar) dan indeks `DESC`.
6. `access_policies` — Kebijakan kontrol akses global ter-hardening (`P0-A`).
7. `api_settings` — Pengaturan Public API, rate limit, CORS, webhook URL & events.
8. `webhook_logs` — Riwayat pengiriman webhook beserta indeks `DESC`.
9. `media_assets` — Metadata berkas media (`filename` unik, `mime_type`, `size_bytes`, `sha256`).

---

## 3. Cara Kerja Migration Runner (`src/db/migrations.ts`)

- **Transaksional & Terkunci**: Setiap eksekusi berjalan di dalam `BEGIN ... COMMIT` dengan `pg_advisory_xact_lock(94827164)` sehingga aman terhadap eksekusi paralel.
- **Anti Perubahan Diam-Diam**: Sebelum menerapkan migrasi baru, runner memeriksa `checksum` dan `name` seluruh baris di `schema_migrations`. Jika migrasi lama (`001`–`003`) diubah atau ada versi tak dikenal di database, runner langsung gagal dengan `MigrationIntegrityError` (`MIGRATION_CHECKSUM_MISMATCH` atau `UNKNOWN_APPLIED_MIGRATION`).
- **Migrasi Maju Aman**: Perubahan skema baru hanya boleh ditambahkan sebagai versi baru (misalnya `005`), tidak pernah mengedit versi yang sudah diterapkan.

---

## 4. Alur Migrasi Data Local JSON → PostgreSQL

### Langkah A — Cadangkan Data Sumber
Sumber data di dalam paket ZIP tersimpan pada `.data/lynk-server-store.json` (serta salinan arsip di `database/lynk-server-store.json`) dan folder `.data/media/`. File sumber **tidak pernah dimodifikasi atau dihapus** oleh migrator.

### Langkah B — Jalankan Pre-Flight Dry-Run
```bash
npm run db:migrate:json -- --dry-run
```
Tahap ini memeriksa secara *read-only*:
- Duplikasi `email` user atau `slug` proyek yang dapat melanggar constraint `UNIQUE` PostgreSQL (`blockedByErrors: true`).
- `owner_user_id` yatim pada proyek (otomatis dinormalisasi menjadi `NULL` saat apply agar FK aman).
- Kesesuaian ukuran byte, magic bytes gambar, dan SHA-256 setiap file media di `.data/media/`, serta mendeteksi file media orphan yang valid di disk.
- Kebijakan sesi: secara default `sessionsSkippedByPolicy` melewatkan seluruh sesi aktif agar pengguna melakukan login ulang yang bersih di PostgreSQL.

### Langkah C — Eksekusi Apply (Idempoten & Transaksional)
```bash
npm run db:migrate:json -- --apply
```
- Menjalankan `runPostgresMigrationsDetailed()` untuk memastikan skema PostgreSQL berada di versi `004`.
- Menyalin file media secara atomik (jika `--target-media-dir` berbeda) dan memverifikasi ulang byte size + SHA-256 setelah rename.
- Menyisipkan seluruh entitas dalam satu transaksi PostgreSQL menggunakan `INSERT ... ON CONFLICT DO UPDATE` (aman dijalankan ulang berkali-kali / idempoten).
- Otomatis menjalankan perbandingan pasca-tulis (`integrityReport`) untuk memverifikasi jumlah record, ID seluruh entitas, hash password, struktur JSONB proyek, analytics, pengaturan akses/API, webhook logs, serta file media di disk dan URL `/api/media/<filename>`.

> Gunakan flag `--include-sessions` hanya jika kebijakan keamanan Anda secara eksplisit mengizinkan pemindahan token hash sesi aktif.

### Langkah D — Verifikasi Ulang Kapan Saja
```bash
npm run db:migrate:json -- --verify-only
```
Memastikan `ok: true`, seluruh `missingInTarget` / `extraInTarget` / `fieldMismatches` kosong, dan `mediaDiskVerification.ok: true` (laporan diff tidak pernah mencetak nilai `passwordHash` mentah).

---

## 5. Prosedur Rollback ke Local JSON Store

Jika ditemukan kendala setelah mengubah `DB_ENGINE="postgresql"`:
1. Hentikan server lokal (`Ctrl+C`).
2. Ubah kembali baris `DB_ENGINE` pada `.env` menjadi `DB_ENGINE="local-json"` (serta nonaktifkan/komentari variabel PostgreSQL jika ingin kembali murni lokal).
3. **Jangan** menghapus database PostgreSQL terlebih dahulu sebelum investigasi selesai.
4. Jalankan ulang `npm run dev` — server kembali membaca `.data/lynk-server-store.json` dan `.data/media/` yang tetap utuh dari sebelum migrasi.
5. Bila ada transaksi baru yang sudah masuk ke PostgreSQL setelah cutover, lakukan ekspor backup (`.json` / `.sql`) sebelum mematikan PostgreSQL.
