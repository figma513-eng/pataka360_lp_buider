# Panduan Instalasi Lokal — Lynk Builder

Panduan ini menjelaskan cara menginstall dan menjalankan hasil export ZIP **Lynk Builder** (`Lynk-Builder-Full-Backup-[VERSION]-[DATE].zip`) secara mandiri di komputer Anda tanpa memerlukan PostgreSQL maupun database cloud.

---

## 1. Kebutuhan Sistem & Versi Node.js

- **Node.js**: **`>= 22.18.0 LTS`** (disarankan Node.js 22 LTS agar konsisten dengan `package.json` `"engines"` dan dukungan native TypeScript / `node --test` stabil).
- **npm**: **`>= 10.0.0`** (bawaan Node.js 22).
- **Database**: Tidak perlu instalasi database tambahan; aplikasi langsung memakai **Local JSON Store** di folder `.data/`.

Cek versi di terminal sebelum memulai:
```bash
node -v
npm -v
```

---

## 2. Langkah Ekstraksi & Konfigurasi Awal

Setelah mengunduh `Lynk-Builder-Full-Backup-[VERSION]-[DATE].zip` dari menu **Setting API -> Database, Export ZIP & Restore**:

1. Ekstrak file ZIP ke folder kerja lokal (misalnya `lynk-builder-local/`).
2. Di dalam folder tersebut, Anda akan menemukan folder `.data/` (berisi `lynk-server-store.json` & `media/` siap pakai dari snapshot export), seluruh source code (`src/`, `server.ts`, `tests/`), konfigurasi, dan dokumentasi.
3. Salin `.env.example` menjadi `.env` (file `.env` asli sengaja tidak disertakan dalam ZIP demi keamanan).

---

## 3. Panduan Per Platform

### A. Windows (PowerShell / Command Prompt)

1. Install **Node.js 22 LTS** melalui [nodejs.org](https://nodejs.org/) atau `winget`:
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```
2. Buka PowerShell dan masuk ke folder hasil ekstrak:
   ```powershell
   cd C:\path\ke\lynk-builder-local
   ```
3. Salin `.env.example` menjadi `.env`:
   ```powershell
   Copy-Item .env.example .env
   ```
4. Buat `SESSION_SECRET` acak menggunakan Node.js (opsional di dev, **wajib** jika `NODE_ENV=production`):
   ```powershell
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Tempel hasilnya ke baris `SESSION_SECRET="..."` di `.env` (atau biarkan kosong pada mode development agar server otomatis membuat secret acak lokal di `.data/.dev-session-secret`).
5. Install dependensi dan jalankan server:
   ```powershell
   npm install
   npm run dev
   ```
6. Buka browser ke **`http://localhost:3000`**.

---

### B. macOS Intel (x86_64)

1. Install Node.js 22 LTS melalui Homebrew:
   ```bash
   brew install node@22
   echo 'export PATH="/usr/local/opt/node@22/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
   *(Atau gunakan `nvm install 22` bila memakai nvm).*
2. Masuk ke folder hasil ekstrak & buat `.env`:
   ```bash
   cd ~/Downloads/lynk-builder-local
   cp .env.example .env
   ```
3. *(Opsional untuk dev / wajib untuk prod)* Generate `SESSION_SECRET`:
   ```bash
   openssl rand -hex 32
   ```
   Isikan ke `.env` pada `SESSION_SECRET="..."`.
4. Install dependensi & jalankan server:
   ```bash
   npm install
   npm run dev
   ```
5. Akses aplikasi di **`http://localhost:3000`**.

---

### C. macOS Apple Silicon (M1 / M2 / M3 / M4 — arm64)

1. Install Node.js 22 LTS versi **arm64 native** melalui Homebrew:
   ```bash
   brew install node@22
   echo 'export PATH="/opt/homebrew/opt/node@22/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```
   Pastikan arsitektur Node adalah `arm64`:
   ```bash
   node -p "process.arch"   # Output harus: arm64
   ```
2. Masuk ke folder hasil ekstrak & salin `.env`:
   ```bash
   cd ~/Downloads/lynk-builder-local
   cp .env.example .env
   ```
3. Install dependensi & jalankan server:
   ```bash
   npm install
   npm run dev
   ```
4. Buka **`http://localhost:3000`** di Safari / Chrome.

---

## 4. Verifikasi Konfigurasi `.env` Lokal

Pastikan baris berikut aktif pada `.env`:

```dotenv
NODE_ENV="development"
HOST="127.0.0.1"
PORT="3000"
APP_URL="http://localhost:3000"
DB_ENGINE="local-json"
LYNK_DATA_DIR=".data"
```

> Catatan: Dengan `DB_ENGINE="local-json"`, aplikasi **tidak** membutuhkan dan **tidak** meminta variabel `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE`, maupun `PGSSL`.
