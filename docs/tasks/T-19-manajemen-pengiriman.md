# T-19: Manajemen Pengiriman & Status Tracking

**Status:** `TODO`
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

- [ ] Input data pengiriman: nama penerima, alamat lengkap, patokan, no. HP 1 & 2, tanggal kirim, sesi (PAGI/SIANG/SORE/MALAM)
- [ ] Assign hewan ke sesi + petugas kirim
- [ ] Status tracking: DIJADWALKAN → DIAMBIL → DALAM_PERJALANAN → TERKIRIM
- [ ] Log waktu per status update
- [ ] WA otomatis saat jadwal ditetapkan dan saat berangkat (via T-17)
- [ ] PHQ: input distribusi daging (qty daging/tulang/jeroan) ke tiap penerima

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Pengiriman`: id, transaksiId, customerId, namaPenerima, alamat, kelurahan, kecamatan, kota, patokan, noHp1, noHp2, tglKirim, sesi, status, petugasId, tglBerangkat, tglSampai, catatan
- [ ] Model `DistribusiDaging` (PHQ): id, pengirimanId, namaPenerima, alamat, qtyDaging, qtyTulang, qtyJeroan, noHp, status
- [ ] Status enum: DIJADWALKAN, DIAMBIL, DALAM_PERJALANAN, TERKIRIM

### Backend (API – Express)
- [ ] `POST /pengiriman` – buat jadwal pengiriman dari transaksi
- [ ] `GET /pengiriman?depot=&tgl=&sesi=&status=` – list pengiriman
- [ ] `PUT /pengiriman/:id/status` – update status (TRANDIS role)
- [ ] `POST /pengiriman/:id/distribusi-daging` – input distribusi PHQ
- [ ] `GET /pengiriman/rekap?depot=&tgl=` – rekap: terkirim vs belum, per sesi

### Frontend (Next.js)
- [ ] Halaman `/logistik/pengiriman` – list pengiriman per tanggal/sesi
- [ ] View: kartu per sesi dengan daftar hewan + status
- [ ] Tombol update status (mobile-friendly, tombol besar)
- [ ] Form jadwal pengiriman (dari halaman detail transaksi)
- [ ] Form distribusi daging PHQ (per penerima)

## Notes

- SHQ: hewan dikirim hidup ke pembeli
- THQ: disembelih di depot → ke yayasan; pengiriman daging minimal
- PHQ: disembelih di depot → daging dikemas → dikirim per penerima (paling kompleks)
- OI-07: yayasan tujuan THQ masih open item
