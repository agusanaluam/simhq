# T-05: POS Penjualan + Pre-order

**Status:** `DONE`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 2 Sprint
**Dependencies:** T-01, T-02, T-03

---

## Deskripsi

Sistem kasir POS untuk transaksi langsung di depot. Mendukung pre-order tanpa nomor hewan (status "Menunggu Hewan") dan semua tipe qurban (SHQ/THQ/PHQ). Menggantikan sheet INPUT, SAPI.

## User Stories

- US-006: Sebagai Admin, input transaksi POS meski nomor hewan belum tersedia → pembeli tidak perlu tunggu stok.
- US-006b: Sebagai Admin Ketua, assign nomor hewan ke transaksi "Menunggu Hewan" → status update otomatis.
- US-007: Sistem otomatis tandai hewan "terjual" setelah transaksi dikonfirmasi.
- US-010: Sebagai Admin Ketua, dashboard real-time: ekor terjual hari ini, sisa stok, total pendapatan.

## Acceptance Criteria

- [ ] Form POS: pilih jenis (SAPI/DOMBA), tipe (SHQ/THQ/PHQ), kelas, nomor hewan (opsional), identitas pembeli, CS/teller/sales
- [ ] Pre-order tanpa nomor hewan: status "MENUNGGU_HEWAN", faktur tetap bisa dicetak
- [ ] Saat nomor hewan di-assign ke pre-order → status otomatis "HEWAN_TERALOKASI"
- [ ] Konfirmasi transaksi → status hewan otomatis BOOKED
- [ ] Pembatalan transaksi → status hewan kembali AVAILABLE
- [ ] 3 tipe qurban: SHQ (kirim hidup), THQ (sembelih di depot → yayasan), PHQ (sembelih → dikirim)
- [ ] Nomor faktur auto-generate (format: [DEPOT]-[TAHUN]-[SEQUENCE])

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Transaksi`: id, depotId, noFaktur, hewanId (nullable), customerId, csId, tellerId, salesId, tipeQurban (SHQ/THQ/PHQ), jenis, kelas, harga, total, statusBayar, statusTransaksi, musim, createdAt
- [ ] Status transaksi enum: MENUNGGU_HEWAN, HEWAN_TERALOKASI, DIKONFIRMASI, SELESAI, DIBATALKAN
- [ ] Model `Customer`: id, nama, hp, alamat, kelurahan, kecamatan, kota (reuse di T-16)

### Backend (API – Express)
- [ ] `POST /transaksi` – buat transaksi baru (validasi Zod)
- [ ] `GET /transaksi?depot=&status=&tgl=` – list transaksi
- [ ] `GET /transaksi/:id` – detail transaksi
- [ ] `PUT /transaksi/:id/assign-hewan` – assign nomor hewan ke pre-order
- [ ] `PUT /transaksi/:id/konfirmasi` – konfirmasi transaksi (ubah status hewan → BOOKED)
- [ ] `PUT /transaksi/:id/batal` – batalkan transaksi (ubah status hewan → AVAILABLE)
- [ ] Auto-generate noFaktur: query max sequence per depot per musim

### Frontend (Next.js)
- [ ] Halaman `/depot/pos` – form POS utama
- [ ] Step 1: pilih jenis + kelas + tipe qurban
- [ ] Step 2: pilih/cari hewan tersedia ATAU centang "pre-order"
- [ ] Step 3: input data pembeli (nama, HP, alamat) dengan autocomplete customer lama
- [ ] Step 4: assign CS/teller/sales, review total, submit
- [ ] Halaman `/depot/transaksi` – list semua transaksi dengan filter
- [ ] Fitur assign hewan ke transaksi pre-order (modal dengan dropdown hewan AVAILABLE)

## Notes

- Untuk sapi: setelah konfirmasi POS, lanjut ke T-06 (ploting slot pembeli)
- Biaya lainnya (ongkir dll) ditambah di T-07
- Offline POS (IndexedDB) = fase selanjutnya, MVP butuh koneksi
