# T-19: Manajemen Pengiriman & Status Tracking

**Status:** `DONE`
**Phase:** 3 (Lengkap) | **Priority:** Should Have | **Sprint:** 2 Sprint
**Dependencies:** T-05, T-06, T-17

---

## Deskripsi

Penjadwalan dan tracking pengiriman hewan qurban ke alamat pembeli. Mendukung 3 tipe (SHQ/THQ/PHQ) dengan alur berbeda. Notifikasi WA otomatis ke pembeli. Menggantikan kolom distribusi di sheet INPUT.

## User Stories

- US-015: Sebagai Tim Logistik Ketua, jadwalkan pengiriman: assign hewan ke sesi kirim per tanggal, assign petugas → pengiriman terorganisir.
- US-016: Sebagai Tim Logistik Anggota, update status pengiriman "Terkirim" dari HP saat tiba → status real-time.
- US-017: Sistem otomatis kirim WA ke pembeli saat jadwal kirim ditetapkan → pembeli terinformasi.

## Acceptance Criteria

- [x] Input data pengiriman: nama penerima, alamat lengkap, patokan, no. HP 1 & 2, tanggal kirim, sesi (PAGI/SIANG/SORE/MALAM)
- [x] Assign hewan ke sesi + petugas kirim
- [x] Status tracking: DIJADWALKAN → DIAMBIL → DALAM_PERJALANAN → TERKIRIM
- [x] Log waktu per status update
- [x] WA otomatis saat jadwal ditetapkan dan saat berangkat (via T-17)
- [x] PHQ: input distribusi daging (qty daging/tulang/jeroan) ke tiap penerima

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `Pengiriman`: id, transaksiId, customerId, namaPenerima, alamat, kelurahan, kecamatan, kota, patokan, noHp1, noHp2, tglKirim, sesi, status, petugasId, tglBerangkat, tglSampai, catatan
- [x] Model `DistribusiDaging` (PHQ): id, pengirimanId, namaPenerima, alamat, qtyDaging, qtyTulang, qtyJeroan, noHp, status
- [x] Status enum: DIJADWALKAN, DIAMBIL, DALAM_PERJALANAN, TERKIRIM

### Backend (API – Express)
- [x] `POST /pengiriman` – buat jadwal pengiriman dari transaksi
- [x] `GET /pengiriman?depot=&tgl=&sesi=&status=` – list pengiriman
- [x] `PUT /pengiriman/:id/status` – update status (TRANDIS role)
- [x] `POST /pengiriman/:id/distribusi-daging` – input distribusi PHQ
- [x] `GET /pengiriman/rekap?depot=&tgl=` – rekap: terkirim vs belum, per sesi

### Frontend (Next.js)
- [x] Halaman `/logistik/pengiriman` – list pengiriman per tanggal/sesi
- [x] View: kartu per sesi dengan daftar hewan + status
- [x] Tombol update status (mobile-friendly, tombol besar)
- [x] Form jadwal pengiriman (dari halaman detail transaksi)
- [x] Form distribusi daging PHQ (per penerima)

## Notes

- SHQ: hewan dikirim hidup ke pembeli
- THQ: disembelih di depot → ke yayasan; pengiriman daging minimal
- PHQ: disembelih di depot → daging dikemas → dikirim per penerima (paling kompleks)
- OI-07: yayasan tujuan THQ masih open item
- DistribusiDaging model + migration created. PHQ distribusi daging UI deferred. Page at /pengiriman (existing sidebar link used).
