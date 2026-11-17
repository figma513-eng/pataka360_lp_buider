# Panduan Setup PostgreSQL Lokal — Lynk Builder

Dokumen ini memandu instalasi **PostgreSQL** di komputer lokal Anda untuk menguji **Lynk Builder** dengan database relasional (skema **v004**, 9 tabel via **Drizzle ORM** & SQL migrations), sementara **Google AI Studio** tetap berjalan stabil menggunakan **Local JSON Store**.

---

## 1. Prasyarat Lokal

- **Node.js**: `>= 22.18.0 LTS` & **npm** `>= 10.0.0`
- **PostgreSQL**: versi **14, 15, 16, atau 17**

---

## 2. Instalasi PostgreSQL per Platform

### A. Windows (PowerShell / Installer Resmi)
1. Unduh installer resmi dari [postgresql.org/download/windows](https://www.postgresql.org/download/windows/) atau gunakan `winget`:
   ```powershell
   winget install PostgreSQL.PostgreSQL.16
   ```
2. Saat instalasi, catat password untuk user `postgres` dan pastikan port default **`5432`** aktif.
3. Buka **SQL Shell (psql)** atau PowerShell (pastikan `bin` PostgreSQL ada di `PATH`), lalu buat database `lynk_builder`:
   ```sql
   CREATE DATABASE lynk_builder;
   ```

### B. macOS (Intel & Apple Silicon)
1. Install melalui Homebrew:
   ```bash
   brew install postgresql@16
   brew services start postgresql@16
   ```
2. Tambahkan ke PATH (Apple Silicon `/opt/homebrew/opt/postgresql@16/bin`, Intel `/usr/local/opt/postgresql@16/bin`):
   ```bash
   export PATH="$(brew --prefix postgresql@16)/bin:$PATH"
   ```
3. Buat database dan pastikan user `postgres` (atau user macOS Anda) siap:
   ```bash
   createdb lynk_builder
   psql -d lynk_builder -c "ALTER USER postgres WITH PASSWORD 'CHANGE_ME_LOCAL_PASSWORD';" 2>/dev/null || createuser -s postgres
   ```

### C. Linux (Ubuntu / Debian)
1. Install PostgreSQL:
   ```bash
   sudo apt update && sudo apt install -y postgresql postgresql-contrib
   sudo systemctl enable --now postgresql
   ```
2. Atur password lokal dan buat database `lynk_builder`:
   ```bash
   sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'CHANGE_ME_LOCAL_PASSWORD';"
   sudo -u postgres createdb lynk_builder
   ```

### D. Opsi Cepat via Docker (Semua OS)
```bash
docker run --name lynk-builder-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=CHANGE_ME_LOCAL_PASSWORD \
  -e POSTGRES_DB=lynk_builder \
  -p 5432:5432 \
  -d postgres:16-alpine
```

---

## 3. Konfigurasi `.env` Lokal (Tanpa Credential Asli di Repositori)

Salin `.env.example` menjadi `.env`, buat `SESSION_SECRET` acak, dan aktifkan `DATABASE_URL` hanya saat Anda siap berpindah ke PostgreSQL lokal:

```bash
cp .env.example .env
# Generate SESSION_SECRET acak (>= 32 karakter):
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Contoh isi `.env` untuk pengujian PostgreSQL lokal di `localhost`:

```dotenv
NODE_ENV="development"
HOST="127.0.0.1"
PORT="3000"
APP_URL="http://localhost:3000"

# Simpan nilai acak 64 hex dari perintah crypto di atas (WAJIB untuk production)
SESSION_SECRET="GANTI_DENGAN_HASIL_RANDOM_HEX_64_KARAKTER"

# Tahap 1 (Migrasi): biarkan local-json dulu sampai --apply & --verify-only sukses,
# atau isi DATABASE_URL untuk menjalankan skrip migrasi CLI sebelum mengaktifkan DB_ENGINE="postgresql"
DB_ENGINE="local-json"
LYNK_DATA_DIR=".data"

# Koneksi PostgreSQL lokal
DATABASE_URL="postgresql://postgres:CHANGE_ME_LOCAL_PASSWORD@localhost:5432/lynk_builder"
PGSSL="false"
```

> **Catatan Keamanan TLS**: Untuk PostgreSQL lokal di `localhost`/`127.0.0.1`, gunakan `PGSSL="false"`. Untuk PostgreSQL remote/cloud, wajib aktifkan `PGSSL="true"` (`rejectUnauthorized: true` aktif secara default; gunakan `PGSSL_CA_FILE` jika memakai CA privat).

---

## 4. Urutan Perintah Menjalankan & Migrasi di Komputer Lokal

Jalankan perintah berikut secara berurutan dari folder hasil ekstrak ZIP:

```bash
# 1. Install seluruh dependensi Node.js dari package-lock.json
npm install

# 2. Pastikan koneksi PostgreSQL terdeteksi & cek status migrasi (saat DATABASE_URL sudah diisi di .env)
npm run db:migrate:status

# 3. Terapkan seluruh migrasi skema (001 s.d. 004, 9 tabel + validasi checksum SHA-256)
npm run db:migrate

# 4. Simulasi dry-run migrasi Local JSON Store (.data/) -> PostgreSQL (read-only)
npm run db:migrate:json -- --dry-run

# 5. Eksekusi migrasi data transaksional + verifikasi integritas & SHA-256 media
npm run db:migrate:json -- --apply

# 6. Verifikasi ulang kecocokan record 8 tabel & berkas fisik media
npm run db:migrate:json -- --verify-only

# 7. Ubah DB_ENGINE="postgresql" di .env, lalu jalankan aplikasi lokal
npm run dev
```

Setelah `npm run dev` berjalan, periksa `http://localhost:3000/api/health/ready` dan pastikan mengembalikan HTTP `200` dengan `"dbEngine": "postgresql"`, `"dbConnected": true`, `"ready": true`.

---

## 5. Pengujian PostgreSQL Nyata yang Harus Dilakukan di Lokal

Karena container pengembangan Google AI Studio tidak menyertakan server PostgreSQL aktif, pengujian terhadap instance PostgreSQL nyata berstatus **`NOT TESTED`** sebelum dijalankan di komputer Anda. Setelah langkah bagian 4 selesai, uji skenario berikut secara nyata pada `http://localhost:3000`:

1. **Verifikasi Skema v004 di PostgreSQL**: Pastikan 9 tabel (`schema_migrations`, `users`, `sessions`, `projects`, `analytics_events`, `access_policies`, `api_settings`, `webhook_logs`, `media_assets`) dan indeks `idx_users_email_lower` terbentuk serta `schemaVersion` di `/api/diagnostics` bernilai `4`.
2. **Autentikasi & Sesi**: Login dengan akun Super Admin hasil migrasi dari `.data/lynk-server-store.json` (sesi aktif lama sengaja tidak dimigrasikan sehingga wajib login ulang), reload halaman untuk memverifikasi sesi `sessions` tersimpan di PostgreSQL, lalu uji logout.
3. **RBAC & Pendaftaran Publik**: Uji pendaftaran publik (`/register`) menghasilkan role `viewer`, dan `viewer` ditolak saat mencoba menyimpan/mempublish proyek atau mengakses export ZIP.
4. **CRUD Proyek & Revisi OCC**: Buat, edit, simpan ulang proyek baru + uji revisi OCC (`409` jika `baseRevision` usang), lalu restart `npm run dev` untuk memastikan data persisten dari PostgreSQL.
5. **Analytics `BIGINT` & Media**: Kirim event konversi termasuk `orderValue` besar (> 2,14 miliar) dan unggah/akses aset media `/api/media/<filename>` untuk memastikan metadata PostgreSQL + file `.data/media/` sinkron.
6. **Fail-Closed Check**: Hentikan service PostgreSQL sejenak dan panggil `/api/health/ready` → harus mengembalikan HTTP `503` tanpa fallback diam-diam ke Local JSON Store.
