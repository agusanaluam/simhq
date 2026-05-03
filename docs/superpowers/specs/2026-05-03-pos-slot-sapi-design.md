# POS: Beli 1/7 Slot Sapi Design

**Date:** 2026-05-03
**Scope:** POS bisa jual 1 ekor penuh atau 1/7 slot sapi, otomatis sinkron ke halaman ploting. Harga slot diset di master harga.

---

## Background

POS saat ini hanya support 1 ekor penuh. Transaksi 1/7 slot sapi (saham qurban) harus diinput manual lewat halaman ploting — terpisah dari POS. Ini menyebabkan double entry dan data tidak tersinkronisasi. Feature ini menyatukan kedua alur: kasir pilih satuan saat transaksi, sistem otomatis buat slot record.

---

## Requirements

### R1 — Master Harga: Kolom harga_slot
- `harga_kelas` tambah kolom `harga_slot` (unsignedBigInteger, nullable)
- Null = harga slot belum diset, POS disable pilihan 1/7 untuk kelas tersebut
- Master harga UI tambah input `Harga Slot` di tabel + form edit

### R2 — TransaksiItem: satuan + nama_qurban
- `transaksi_items` tambah kolom `satuan` enum('EKOR','SLOT') default 'EKOR'
- `transaksi_items` tambah kolom `nama_qurban` varchar(150) nullable
- `nama_qurban` wajib diisi jika tipe PHQ + satuan SLOT; opsional untuk SHQ/THQ

### R3 — POS TipeQurbanModal: Toggle Satuan
- Setelah pilih tipe qurban, tampil toggle: **1 Ekor** / **1/7 Slot**
- Jika 1/7 Slot:
  - Harga switch ke `harga_slot` dari master (bukan `harga_jual`)
  - Jika `harga_slot` null → tampil warning "Harga slot belum diset", disable tombol Tambah
  - Tampil badge: "Tersisa X slot" (7 - slot_terisi dari data hewan)
  - Tampil field `Nama Qurban` — wajib jika PHQ, opsional jika SHQ/THQ
  - Sapi yang 7/7 slot penuh: toggle SLOT disabled

### R4 — POS PreorderModal: Toggle Satuan
- Tambah toggle satuan (EKOR / SLOT) di PreorderModal
- Pre-order SLOT: `hewan_id` null, tidak auto-create SlotSapi saat POS
- Slot akan di-assign nanti lewat halaman ploting (flow yang sudah ada)
- `nama_qurban` field tampil kondisional (PHQ only)

### R5 — Backend: Auto-create SlotSapi
- `TransaksiController::store()` — setelah create TransaksiItem:
  - Jika `satuan=SLOT` && `is_preorder=false` && `hewan_id` ada:
    1. Lock hewan + cari `no_slot` kosong berikutnya (1–7)
    2. Abort 422 jika semua 7 slot penuh
    3. Create `SlotSapi`:
       - `hewan_id` = item.hewan_id
       - `no_slot` = next available
       - `transaksi_id` = transaksi.id
       - `customer_id` = transaksi.customer_id
       - `nama_qurban` = item.nama_qurban (kosong string jika null + bukan PHQ)
       - `tipe_qurban` = item.tipe_qurban
       - `harga_slot` = item.harga
       - `status_bayar` = 'DP'
    4. Trigger `syncHewanStatus` untuk update status hewan

### R6 — HewanBrowser: Slot Badge
- Card sapi tampilkan info slot: "3/7 slot terisi" (dari `slot_sapi_count`)
- Sapi yang slot_count = 7: badge "PENUH", toggle slot disabled di modal

### R7 — Cart Display
- Item SLOT tampil: `"#005 · 1/7 Slot · PHQ · Ahmad bin Budi"` (nama_qurban jika ada)
- Item EKOR tetap seperti sekarang

### R8 — API Payload
- Per item kirim: `satuan`, `nama_qurban` (nullable)
- `StoreTransaksiRequest` validasi: `items.*.satuan` (nullable, in:EKOR,SLOT), `items.*.nama_qurban` (nullable, string, max:150)

---

## Architecture

### Database Changes

```
harga_kelas
  + harga_slot  unsignedBigInteger nullable

transaksi_items
  + satuan      enum('EKOR','SLOT') default 'EKOR'
  + nama_qurban varchar(150) nullable
```

### Backend Flow — Item SLOT di POS

```
POST /api/transaksi
  items: [{ satuan: 'SLOT', hewan_id: 5, tipe_qurban: 'PHQ', harga: 900000, nama_qurban: 'Ahmad bin Budi', is_preorder: false }]

TransaksiController::store()
  → create Transaksi + TransaksiItem (satuan=SLOT)
  → for each SLOT item with hewan_id:
      → SELECT no_slot FROM slot_sapi WHERE hewan_id = 5 (lock)
      → next_slot = min({1..7} - existing_slots)
      → if next_slot null → abort 422 "Slot sapi #5 sudah penuh"
      → SlotSapi::create(...)
      → syncHewanStatus(hewan)
```

### Frontend Component Changes

| File | Perubahan |
|------|-----------|
| `frontend/lib/format.ts` | tidak ada |
| `frontend/app/(dashboard)/depot/pos/TipeQurbanModal.tsx` | tambah toggle satuan + nama_qurban field + slot badge |
| `frontend/app/(dashboard)/depot/pos/PreorderModal.tsx` | tambah toggle satuan + nama_qurban field |
| `frontend/app/(dashboard)/depot/pos/HewanBrowser.tsx` | card tampil slot info, fetch slot count |
| `frontend/app/(dashboard)/depot/pos/page.tsx` | update CartItem interface (satuan, namaQurban) |
| `frontend/app/(dashboard)/depot/pos/CartPanel.tsx` | display namaQurban di cart item, pass ke onSubmit |
| `frontend/app/(dashboard)/admin/master-data/TabHarga.tsx` | tambah harga_slot field di form + tabel |
| `backend/app/Http/Controllers/Master/HargaController.php` | return + accept harga_slot |
| `backend/app/Http/Controllers/TransaksiController.php` | auto-create SlotSapi untuk SLOT items |
| `backend/app/Http/Requests/StoreTransaksiRequest.php` | tambah satuan + nama_qurban per item |
| `backend/app/Models/HargaKelas.php` | fillable + cast harga_slot |
| `backend/app/Models/TransaksiItem.php` | fillable satuan + nama_qurban |

### Master Harga API Changes

```
GET /api/master/harga  → response includes harga_slot per entry
POST/PUT /api/master/harga  → accept harga_slot (nullable integer, min:0)
```

---

## Error Handling

- `harga_slot` null → frontend disable slot option + warning UI (tidak sampai ke backend)
- Slot sudah penuh saat submit → backend 422 "Slot sapi #X sudah penuh"
- `nama_qurban` kosong + PHQ + SLOT → frontend validation (disable submit), backend `required_if` rule
- Pre-order SLOT → tidak auto-create SlotSapi, tidak ada error slot penuh saat POS

---

## Data Flow Summary

```
Kasir klik sapi #005 (3/7 terisi)
  → TipeQurbanModal: pilih THQ + 1/7 Slot
  → harga = harga_slot dari master (900.000)
  → badge "Tersisa 4 slot"
  → Tambah ke cart: { hewanId:5, satuan:'SLOT', tipeQurban:'THQ', harga:900000 }

CartPanel submit
  → POST /api/transaksi { items:[{ hewan_id:5, satuan:'SLOT', tipe_qurban:'THQ', harga:900000, is_preorder:false }] }

Backend
  → create Transaksi #1-2026-0042
  → create TransaksiItem (satuan=SLOT)
  → next_slot = 4 (karena slot 1,2,3 sudah terisi)
  → create SlotSapi { hewan_id:5, no_slot:4, transaksi_id:42, customer_id:..., tipe_qurban:'THQ', harga_slot:900000 }
  → syncHewanStatus → BOOKED (4/7)

Halaman ploting → sapi #005 sekarang tampil 4/7 terisi ✓
```

---

## Testing

- Backend: `test_pos_slot_auto_create_slot_sapi` — item SLOT → assert SlotSapi created dengan no_slot benar
- Backend: `test_pos_slot_penuh_422` — submit saat semua 7 slot terisi → assert 422
- Backend: `test_pos_ekor_tidak_buat_slot_sapi` — item EKOR → assert SlotSapi NOT created
- Frontend: manual — verify harga switch, badge slot, nama_qurban conditional
