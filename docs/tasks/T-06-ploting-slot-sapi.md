# T-06: Ploting Slot Pembeli per Sapi

**Status:** `TODO`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 2 Sprint
**Dependencies:** T-05

---

## Deskripsi

1 ekor sapi bisa dibeli oleh 1–7 pembeli (slot). Setiap slot merekam identitas pembeli, nominal bayar, dan nama qurban (bin/binti). Sapi dinyatakan "penuh" saat total slot = 7. Menggantikan sheet SETOR GUM 2 (7 kolom SETOR per baris).

## User Stories

- US-006c: Sebagai Admin, kelola slot pembeli dalam 1 ekor sapi: assign 1–7 pembeli berbeda per ekor, masing-masing dengan data dan nominal sendiri.

## Acceptance Criteria

- [ ] 1 ekor sapi memiliki 7 slot; bisa diisi 1 orang (ambil semua 7) atau beberapa orang (misal 3+4)
- [ ] Setiap slot: nama pembeli, no. HP, nominal per slot, nama qurban (bin/binti), tipe (SHQ/THQ/PHQ)
- [ ] Dashboard slot per sapi: slot terisi vs kosong, total terkumpul vs harga penuh
- [ ] Sapi otomatis ditandai "penuh" saat 7 slot terisi
- [ ] Slot bisa diisi kapan saja (tidak harus sekaligus)
- [ ] Untuk domba: tidak ada slot, 1 transaksi = 1 pembeli (lewati fitur ini)

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `SlotSapi`: id, hewanId, noSlot (1–7), transaksiId (nullable), customerId, namaQurban, hargaSlot, statusBayar (DP/LUNAS), createdAt
- [ ] Constraint: unique (hewanId, noSlot)

### Backend (API – Express)
- [ ] `GET /hewan/:id/slot` – list semua slot sapi (1–7) beserta status terisi/kosong
- [ ] `POST /hewan/:id/slot` – isi slot: assign pembeli ke slot tertentu
- [ ] `PUT /hewan/:hewanId/slot/:noSlot` – update data slot (nama qurban, nominal)
- [ ] `DELETE /hewan/:hewanId/slot/:noSlot` – kosongkan slot (batalkan pembeli)
- [ ] Logic: hewan status = BOOKED jika ≥1 slot terisi; SOLD jika semua 7 slot terisi ATAU satu pembeli ambil semua 7 slot
- [ ] `GET /hewan/sapi/ploting?depot=` – dashboard semua sapi dengan ringkasan slot (untuk overview)

### Frontend (Next.js)
- [ ] Halaman `/depot/ploting-sapi` – grid semua sapi dengan indikator slot (progress bar 0/7)
- [ ] Klik sapi → sidebar/modal detail slot: tampilkan 7 kotak slot, warna berbeda (kosong/terisi/lunas)
- [ ] Form assign pembeli ke slot: pilih nomor slot, input nama, HP, nominal, nama qurban
- [ ] Komponen `SlotGrid`: 7 kotak dengan status visual
- [ ] Badge "PENUH" saat 7/7 slot terisi

## Notes

- Domba tidak memiliki slot; transaksi domba langsung ke T-07 (pembayaran)
- Faktur per sapi (K-09) mencantumkan semua slot → diimplementasi di T-21 (cetak faktur)
