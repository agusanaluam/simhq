# RAB Kategori Custom + Kas KELUAR Wajib RAB — Design Spec

**Date:** 2026-04-25  
**Skip:** Unit tests

---

## Problem

1. RAB menggunakan `divisi` enum tetap (KANDANG, ADMIN, dll) — tidak bisa custom
2. Kas KELUAR di BIOP tidak terhubung ke RAB — anggaran vs realisasi tidak terintegrasi
3. Dua jalur pengeluaran terpisah (RAB Realisasi vs KasHarian langsung) menyulitkan tracking

---

## Solution

1. Ganti `divisi` enum di RAB dengan `kategori_id` FK ke tabel baru `rab_kategori` (custom, free-form)
2. Kas KELUAR wajib pilih pos RAB — tidak bisa simpan tanpa rab_id
3. `storeRealisasi` juga set `rab_id` di KasHarian yang dibuat otomatis

---

## Data Model Changes

### Tabel baru: `rab_kategori`

```sql
id          BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT
nama        VARCHAR(100) UNIQUE NOT NULL
is_active   BOOLEAN DEFAULT TRUE
timestamps
```

Global (tidak per depot). User buat kategori bebas: "Pakan Sapi", "Gaji Karyawan", dll.

### Tabel `rab` — migration

- Tambah `kategori_id` FK → `rab_kategori` (nullable sementara untuk migrasi)
- Migrate data: buat record `rab_kategori` dari nilai `divisi` yang ada di `rab`
- Set `kategori_id` di semua row `rab` berdasarkan match `divisi` = `nama`
- Drop kolom `divisi`
- Ubah unique constraint: `(depot_id, divisi, musim)` → `(depot_id, kategori_id, musim)`
- `kategori_id` NOT NULL setelah data termigrasi

### Tabel `kas_harian` — perubahan logika

- `divisi` tetap ada di tabel (nullable, untuk data lama dan MASUK)
- Untuk KELUAR: `divisi` diisi otomatis dari `rab.kategori.nama`
- `rab_id` wajib untuk KELUAR

---

## Backend Changes

### Baru: `RabKategori` model + `RabKategoriController`

Routes (dalam `middleware('role:SUPER_ADMIN,KEPALA_DEPOT')`):
```
GET    /api/master/rab-kategori          → index()  — list aktif
POST   /api/master/rab-kategori          → store()  — buat kategori baru
PUT    /api/master/rab-kategori/{id}     → update() — edit nama
DELETE /api/master/rab-kategori/{id}     → destroy() — hapus jika tidak ada RAB
```

### `Rab` model

- Hapus referensi ke `divisi`
- Tambah `kategori()` BelongsTo → `RabKategori`
- `$fillable`: ganti `divisi` → `kategori_id`

### `RabController`

- `summary()`: ganti iterasi `DivisiKas::cases()` → query Rab yang ada untuk musim itu; include kategori.nama
- `store()`: validasi `kategori_id` (exists:rab_kategori,id); updateOrCreate menggunakan `kategori_id`
- `storeRealisasi()`: KasHarian yang dibuat set `rab_id = $rab->id` + `divisi = $rab->kategori->nama`

### `KasController`

- `store()`: `rab_id` required (not sometimes) untuk tipe KELUAR
- Auto-set `divisi` dari `rab->kategori->nama` jika rab_id ada

---

## Frontend Changes

### RAB page (`keuangan/rab/page.tsx`)

- Header: tambah tombol "Tambah Kategori" → modal buat kategori baru
- Fetch kategori dari `GET /api/master/rab-kategori`
- Summary table: tidak lagi iterate enum — hanya tampilkan RAB yang ada + tombol "Tambah RAB"
- Modal set RAB: dropdown kategori (dari api), bukan dropdown enum tetap

### Kas KELUAR modal (`TambahKasModal`)

- Tipe KELUAR: hapus dropdown divisi, ganti dengan dropdown RAB pos
- Fetch `GET /api/keuangan/rab/summary?musim={year}` untuk list RAB
- Format dropdown: `{kategori.nama} — Sisa Rp{selisih}` 
- `rab_id` wajib — tombol Simpan disabled jika belum dipilih
- Auto-set divisi tidak perlu di frontend (backend yang handle)

---

## Files yang Diubah/Dibuat

### Backend
- `backend/database/migrations/2026_04_25_create_rab_kategori_table.php` *(baru)*
- `backend/database/migrations/2026_04_25_migrate_rab_divisi_to_kategori.php` *(baru)*
- `backend/app/Models/RabKategori.php` *(baru)*
- `backend/app/Http/Controllers/RabKategoriController.php` *(baru)*
- `backend/app/Models/Rab.php` — ganti divisi → kategori_id
- `backend/app/Http/Controllers/RabController.php` — summary + store + storeRealisasi
- `backend/app/Http/Controllers/KasController.php` — rab_id required KELUAR
- `backend/routes/api.php` — routes rab-kategori

### Frontend
- `frontend/app/(dashboard)/keuangan/rab/page.tsx`
- `frontend/app/(dashboard)/keuangan/rab/components/SetRabModal.tsx`
- `frontend/app/(dashboard)/keuangan/rab/components/RabSummaryTable.tsx`
- `frontend/app/(dashboard)/keuangan/components/TambahKasModal.tsx`

---

## Constraints

- Data migration: buat kategori otomatis dari nilai divisi lama agar data tidak hilang
- `kas_harian.divisi` tetap nullable — data lama valid
- Tidak ada unit test
- `rab_kategori` global (tidak per depot)
