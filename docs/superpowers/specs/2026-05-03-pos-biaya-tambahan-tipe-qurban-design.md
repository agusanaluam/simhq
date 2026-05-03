# POS: Biaya Tambahan + Tipe Qurban Label Fix

**Date:** 2026-05-03
**Scope:** POS penjualan — tambah ongkos_kirim + biaya_potong per transaksi, update label tipe qurban, fix date/currency format.

---

## Background

POS sudah punya TipeQurbanModal dengan SHQ/THQ/PHQ, tapi label THQ dan PHQ tidak sesuai terminologi bisnis. Belum ada input untuk biaya tambahan (ongkos kirim, biaya potong) di level transaksi. Format date dari API kadang tampil raw dengan timezone (`0000Z`), dan input nominal belum pakai currency format.

---

## Requirements

### R1 — Tipe Qurban Label
- SHQ: tetap `"SHQ – Kirim Hidup"` (sudah sesuai)
- THQ: ubah dari `"Sembelih di Depot"` → `"THQ – Titip ke Yayasan"`
- PHQ: ubah dari `"Sembelih + Kirim"` → `"PHQ – Potong di Depot, Kirim Daging"`
- Berlaku di `TipeQurbanModal.tsx` dan `PreorderModal.tsx`

### R2 — Biaya Tambahan (Level Transaksi)
- Dua field opsional: `ongkos_kirim` dan `biaya_potong` (nullable integer, default 0)
- Disimpan ke tabel `transaksi` (migration baru)
- `total = sum(item harga) + ongkos_kirim + biaya_potong`
- Input di CartPanel, section tersendiri "Biaya Tambahan"
- Keduanya opsional — kasir isi sesuai kebutuhan

### R3 — Currency Format Input
- Semua input nominal angka (ongkos_kirim, biaya_potong, nominal bayar) pakai format `Rp 50.000`
- Implementasi: `type="text"`, store raw number, display `toLocaleString('id-ID')`
- `parseCurrency(s)`: strip non-digit → parseInt

### R4 — Date Format Fix
- Tanggal dari API (contoh: `tgl_bayar`, `created_at`) tidak boleh tampil raw dengan timezone
- Format display: `d MMM yyyy` (contoh: `3 Mei 2026`)
- Implementasi: parse `YYYY-MM-DD` tanpa timezone ambiguity: `new Date(y, m-1, d)`
- Buat `frontend/lib/format.ts` dengan `formatDate`, `formatIDR`, `parseCurrency`

---

## Architecture

### Backend Changes

**1. Migration** — `add_biaya_tambahan_to_transaksi_table`
```
transaksi:
  + ongkos_kirim  unsignedInteger nullable default 0
  + biaya_potong  unsignedInteger nullable default 0
```

**2. Model** `app/Models/Transaksi.php`
- Add `ongkos_kirim`, `biaya_potong` to `$fillable`
- Cast both as `integer`

**3. Request** `app/Http/Requests/StoreTransaksiRequest.php`
- Add: `'ongkos_kirim' => ['nullable', 'integer', 'min:0']`
- Add: `'biaya_potong' => ['nullable', 'integer', 'min:0']`

**4. Controller** `app/Http/Controllers/TransaksiController.php` — `store()`
```php
$biayaTambahan = ($data['ongkos_kirim'] ?? 0) + ($data['biaya_potong'] ?? 0);
$total = $totalHarga + $biayaTambahan;
// use $total instead of $totalHarga for 'total'
```

### Frontend Changes

**5. `frontend/lib/format.ts`** (new)
```ts
export function formatDate(d: string): string
export function formatIDR(n: number): string
export function parseCurrency(s: string): number
```

**6. `TipeQurbanModal.tsx`** — update TIPE_OPTIONS labels

**7. `PreorderModal.tsx`** — update TIPE_OPTIONS labels (currently bare `['SHQ','THQ','PHQ']`)
- Add descriptive labels matching TipeQurbanModal

**8. `CartPanel.tsx`**
- Add state: `ongkosKirim: number`, `biayaPotong: number`
- Add "Biaya Tambahan" section with two currency inputs
- Recalculate `total` to include biaya tambahan
- `nominal` auto-pre-fill uses new total
- All nominal inputs: currency format
- Pass `ongkos_kirim`, `biaya_potong` via `onSubmit`

**9. `page.tsx` (POS)**
- Update `CartSubmitData`: add `ongkosKirim: number`, `biayaPotong: number`
- Pass to API payload: `ongkos_kirim`, `biaya_potong`

**10. `transaksi/[id]/page.tsx`**
- Use `formatDate` for `tgl_bayar` display
- Use `formatIDR` where applicable

**11. `transaksi/page.tsx`**
- Use `formatDate` for `created_at` if displayed

---

## Data Flow

```
CartPanel user input
  → ongkosKirim + biayaPotong (raw number)
  → total = sum(items) + ongkosKirim + biayaPotong (displayed as IDR)
  → nominal auto-set to total
  → onSubmit({ ..., ongkosKirim, biayaPotong })

POS page.tsx
  → POST /api/transaksi { ..., ongkos_kirim, biaya_potong }

TransaksiController::store
  → total = totalHarga + ongkos_kirim + biaya_potong
  → Transaksi::create({ ..., ongkos_kirim, biaya_potong, total })
```

---

## Error Handling

- Both fields nullable — if not filled, default 0, no validation error
- Currency parse: non-digit chars stripped, empty string → 0
- Date parse: if string malformed, return `'—'`

---

## Testing

- Backend: 1 test `test_biaya_tambahan_masuk_ke_total` — POST transaksi dengan ongkos_kirim + biaya_potong, assert total = harga + keduanya
- Frontend: manual — verify total updates when biaya fields change, verify date format correct

---

## Files Modified

| File | Type |
|------|------|
| `backend/database/migrations/XXXX_add_biaya_tambahan_to_transaksi_table.php` | create |
| `backend/app/Models/Transaksi.php` | modify |
| `backend/app/Http/Requests/StoreTransaksiRequest.php` | modify |
| `backend/app/Http/Controllers/TransaksiController.php` | modify |
| `frontend/lib/format.ts` | create |
| `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx` | modify |
| `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx` | modify |
| `frontend/app/(dashboard)/depot/pos/CartPanel.tsx` | modify |
| `frontend/app/(dashboard)/depot/pos/page.tsx` | modify |
| `frontend/app/(dashboard)/depot/transaksi/[id]/page.tsx` | modify |
| `frontend/app/(dashboard)/depot/transaksi/page.tsx` | modify |
