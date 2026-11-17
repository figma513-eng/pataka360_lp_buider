# Panduan Pengujian Lokal — Lynk Builder

Dokumen ini memandu proses verifikasi lengkap hasil export ZIP pada komputer lokal (`http://localhost:3000`) secara terisolasi dari Google AI Studio.

---

## 1. Pemisahan Lingkungan & Isolasi Data

- **Google AI Studio**: Menyimpan data development/preview di workspace AI Studio (`.data/` di container AI Studio).
- **Komputer Lokal**: Menyimpan data pengujian di folder `.data/` pada komputer lokal Anda (atau path khusus yang diatur lewat `LYNK_DATA_DIR`).
- Semua perubahan proyek, login, analitik, atau restore yang Anda lakukan di komputer lokal **tidak** otomatis mengubah data maupun kode di Google AI Studio. Pertukaran data antar kedua lingkungan hanya terjadi jika Anda melakukan Export / Import ZIP atau JSON secara eksplisit.

---

## 2. Pengujian Otomatis via Terminal

Dari root folder hasil ekstrak ZIP, jalankan seluruh perintah berikut secara berurutan:

```bash
# 1. Install seluruh dependensi
npm install

# 2. Verifikasi TypeScript (tanpa error tipe atau import hilang)
npm run lint

# 3. Verifikasi build produksi Vite
npm run build

# 4. Jalankan seluruh test suite (security, persistence, ZIP backup/restore, performance)
npm test
```

Seluruh test suite berjalan memakai folder sementara terisolasi (`os.tmpdir()`) sehingga **tidak** mengotori database `.data/` lokal Anda.

---

## 3. Menjalankan & Menguji Server Lokal (`http://localhost:3000`)

Jalankan mode development:
```bash
npm run dev
```

Atau jalankan hasil build mode production lokal dengan Local JSON Store:
```bash
NODE_ENV=production DB_ENGINE=local-json ALLOW_LOCAL_JSON_STORAGE=true SESSION_SECRET="$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")" npm start
```

Lalu periksa endpoint kesehatan server melalui terminal / browser:
```bash
curl http://localhost:3000/api/health
```
Output yang diharapkan: `"ok": true`, `"dbEngine": "local-json"`, `"ready": true`, `"degraded": false`.

---

## 4. Checklist Pengujian Fungsional di Browser

1. **Autentikasi & Bootstrap**:
   - Jika memakai database kosong baru: halaman awal menampilkan form **Bootstrap Super Admin (Satu Kali)**. Buat akun Super Admin utama.
   - Jika memakai hasil export ZIP yang sudah berisi akun: masuk menggunakan email & password akun Anda dari backup. (Session lama dari AI Studio sengaja dikosongkan sehingga Anda diminta login ulang dengan aman).
   - Uji pendaftaran publik di tab **Daftar Akun (Viewer)**: pastikan user baru selalu berstatus `viewer` dan **tidak** pernah menjadi `super_admin`.
2. **Keamanan & Akses Proyek**:
   - Uji akses dengan akun `viewer` vs `super_admin`: `viewer` tidak bisa menyimpan/mempublish proyek yang bukan hak aksesnya maupun mengunduh Full ZIP export.
3. **Persistensi Local JSON Store Saat Restart**:
   - Buat/ubah sebuah proyek di editor, klik **Simpan** atau tunggu autosave (`Tersimpan`).
   - Hentikan server (`Ctrl+C`), lalu jalankan kembali `npm run dev` dan refresh browser -> perubahan proyek tetap ada di `.data/lynk-server-store.json`.
4. **Media Upload & Public Page**:
   - Unggah gambar PNG/JPG pada salah satu blok -> gambar tersimpan di `.data/media/` dan tampil di pratinjau serta `/p/<slug>`.
5. **Backup Export ZIP & Restore**:
   - Buka **Setting API -> Database, Export ZIP & Restore**.
   - Klik **Unduh Full Project + DB (.zip)** -> pastikan file `Lynk-Builder-Full-Backup-[VERSION]-[DATE].zip` terunduh.
   - Unggah kembali file `.zip` atau `.json` melalui **Pilih File Restore (.zip / .json)** -> pastikan pratinjau menampilkan **Manifest Valid**, **Checksum SHA-256 Valid**, dan daftar proyek.
   - Uji **Project Restore (Selektif)** pada 1 proyek saja -> proyek lain tetap terjaga, dan snapshot pre-restore tercipta di `.data/backups/`.

---

## 5. Pengujian Opsional dengan PostgreSQL Lokal

Apabila Anda ingin menguji **Lynk Builder** dengan PostgreSQL lokal di komputer Anda (lihat detail lengkap di [`POSTGRESQL-SETUP.md`](./POSTGRESQL-SETUP.md) dan [`DATABASE-MIGRATION.md`](./DATABASE-MIGRATION.md)):

```bash
npm install
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:json -- --dry-run
npm run db:migrate:json -- --apply
npm run db:migrate:json -- --verify-only
npm run dev
```

Setelah `DB_ENGINE="postgresql"` diaktifkan di `.env` dan server dijalankan, verifikasi `/api/health/ready` mengembalikan `"dbEngine": "postgresql"`, `"dbConnected": true`, serta uji login, CRUD proyek, revisi OCC, media upload, dan analytics secara langsung pada PostgreSQL lokal Anda.
