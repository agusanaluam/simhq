# User+Karyawan Unified Form & RAB↔BIOP Relation — Design Spec

**Date:** 2026-04-25  
**Skip:** Unit tests

---

## Refactor 1: User + Karyawan Unified Form

### Problem

Adding a user and adding a karyawan are two separate flows. Admin harus buka dua form berbeda untuk membuat akun user sekaligus mendaftarkan sebagai karyawan. Field `user_id` di Karyawan tidak bisa diisi dari form karyawan (dropdown terlalu panjang, error-prone).

### Solution

Tambah checkbox "Daftarkan sebagai karyawan" di form tambah user. Jika dicentang, backend buat User + Karyawan dalam satu transaction.

### Backend Changes

**File:** `backend/app/Http/Controllers/UserController.php`

`store()` diperluas: jika request mengandung `buat_karyawan: true`, buat Karyawan setelah User berhasil dibuat, dalam `DB::transaction()`.

Karyawan dibuat dengan:
- `user_id` = user baru
- `nama` = user.name
- `depot_id` = user.depot_id
- `divisi` = user.divisi
- `tarif_harian` = dari request
- `berlaku_dari` = dari request
- `is_active` = true

**File:** `backend/app/Http/Requests/StoreUserRequest.php`

Tambah field opsional:
```php
'buat_karyawan' => ['sometimes', 'boolean'],
'tarif_harian'  => ['required_if:buat_karyawan,true', 'integer', 'min:0'],
'berlaku_dari'  => ['required_if:buat_karyawan,true', 'date'],
```

### Frontend Changes

**File:** `frontend/app/(dashboard)/admin/users/page.tsx`

Di form tambah user (modal), tambah:
- Checkbox "Daftarkan sebagai karyawan"
- Jika checked: muncul field Tarif Harian (number) + Berlaku Dari (date)
- Kirim ke POST `/api/users` dengan field tambahan

Form edit user: tidak perlu perubahan (link karyawan bisa via tab Master Data).

---

## Refactor 2: RAB Link di KasHarian (BIOP)

### Problem

KasHarian KELUAR hanya punya `divisi` string — tidak terhubung ke RAB. Tidak bisa track realisasi anggaran dari entri kas manual. RAB Realisasi dan KasHarian KELUAR adalah dua jalur terpisah padahal keduanya mencatat pengeluaran depot.

### Solution

Tambah `rab_id` nullable FK ke `kas_harian`. Saat input pengeluaran BIOP, user bisa (opsional) pilih RAB mana yang dibebankan. Tampilkan sisa anggaran di dropdown untuk membantu keputusan.

### Backend Changes

**Migration baru:** `add_rab_id_to_kas_harian_table`
```sql
ALTER TABLE kas_harian ADD COLUMN rab_id BIGINT UNSIGNED NULL;
ALTER TABLE kas_harian ADD CONSTRAINT fk_kas_harian_rab
  FOREIGN KEY (rab_id) REFERENCES rab(id) ON DELETE SET NULL;
```

**File:** `backend/app/Models/KasHarian.php`
- Tambah `rab_id` ke `$fillable`
- Tambah relasi `rab(): BelongsTo`

**File:** `backend/app/Http/Controllers/KasController.php`

`store()` terima `rab_id` opsional:
```php
'rab_id' => ['sometimes', 'nullable', 'exists:rab,id'],
```
Validasi tambahan: jika `rab_id` diisi, pastikan `rab.depot_id === user.depot_id`.

`index()`: load relasi `rab:id,divisi,musim` agar frontend bisa tampilkan label RAB.

### Frontend Changes

**File:** `frontend/app/(dashboard)/keuangan/page.tsx` (TambahKasModal)

- Jika tipe = KELUAR: tampilkan dropdown "Bebankan ke RAB (opsional)"
- Fetch `GET /api/keuangan/rab/summary?musim={tahun_ini}` untuk list RAB depot
- Dropdown item format: `KANDANG — Sisa Rp 50.000.000 (80% terpakai)`
- Jika tidak dipilih: kirim `rab_id: null`

KasTable: tambah kolom "RAB" kecil (tampilkan divisi RAB jika ada, dash jika null).

---

## Files yang Diubah

### Refactor 1 (User+Karyawan)
- `backend/app/Http/Requests/StoreUserRequest.php`
- `backend/app/Http/Controllers/UserController.php`
- `frontend/app/(dashboard)/admin/users/page.tsx`

### Refactor 2 (RAB+BIOP)
- `backend/database/migrations/2026_04_25_add_rab_id_to_kas_harian_table.php` *(baru)*
- `backend/app/Models/KasHarian.php`
- `backend/app/Http/Controllers/KasController.php`
- `frontend/app/(dashboard)/keuangan/page.tsx`

---

## Constraints

- Hard: kedua refactor independen — bisa diimplementasi terpisah
- Hard: tidak ada unit tests
- Hard: `rab_id` di kas_harian nullable — tidak breaking existing data
- Hard: buat_karyawan hanya di form tambah user, bukan edit
- Soft: dropdown RAB tampilkan sisa anggaran (butuh data dari summary endpoint)
