# T-03: Modul Pengadaan Hewan

**Status:** `TODO`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 2 Sprint
**Dependencies:** T-01, T-02

---

## Deskripsi

Mengelola proses masuknya hewan ke depot: registrasi hewan baru, penentuan kelas asal vs kelas jual, transfer antar kandang, dan statistik pengadaan. Menggantikan sheet PENGADAAN, KELAS, HARGA.

## User Stories

- US-005: Sebagai Administrator, set harga beli/jual per kelas per jenis di awal musim → semua modul pakai harga terbaru.

## Acceptance Criteria

- [ ] Input hewan baru: nomor hewan (3 digit, auto-increment per depot per musim: 001, 002, ...), tanggal masuk, sumber/supplier, jenis (SAPI/DOMBA), bobot masuk, kelas asal
- [ ] Kelas jual bisa berbeda dari kelas asal (untuk analisis margin)
- [ ] Status hewan: AVAILABLE → BOOKED → SOLD → DELIVERED
- [ ] Transfer hewan antar petak dengan log riwayat perpindahan otomatis
- [ ] Dashboard statistik: total hewan per kelas, rata-rata harga beli, distribusi kelas
- [ ] Hewan yang mati otomatis dikurangi dari stok
- [ ] Generate barcode/QR code per hewan otomatis saat registrasi (encode: noHewan + depotId + musim)
- [ ] Cetak label barcode per hewan (ukuran kartu/label kalungan) — bisa batch cetak

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Hewan`: id, depotId, noHewan, jenis, kelasAsal, kelasJual, bobotMasuk, sumber, tglMasuk, status, petakId, musim
- [ ] Model `Supplier` (GUM): id, nama, kontak, alamat, isActive
- [ ] Model `RiwayatPerpindahan`: id, hewanId, dariPetakId, kePetakId, tgl, catatan, userId
- [ ] Status enum: AVAILABLE, BOOKED, SOLD, DELIVERED, MATI

### Backend (API – Express)
- [ ] `GET /hewan?depot=&status=&jenis=&kelas=` – list hewan dengan filter
- [ ] `POST /hewan` – registrasi hewan baru: auto-generate noHewan 3 digit + generate QR code (KEEPER/OWNER/SUPER_ADMIN)
- [ ] `GET /hewan/:id` – detail hewan + riwayat
- [ ] `PUT /hewan/:id` – update data hewan (kelas jual, bobot terkini)
- [ ] `POST /hewan/:id/transfer` – pindah petak, catat log
- [ ] `GET /hewan/statistik?depot=&musim=` – statistik pengadaan
- [ ] `GET /hewan/:id/barcode` – return QR code image (PNG) untuk cetak label
- [ ] `GET /hewan/cetak-label?ids=` – batch generate PDF label barcode (multi hewan)
- [ ] `GET /supplier` – list supplier
- [ ] `POST /supplier` – tambah supplier

### Frontend (Next.js)
- [ ] Halaman `/depot/pengadaan` – list hewan dengan filter status/jenis/kelas
- [ ] Form tambah hewan baru (multi-step: data dasar → kelas → petak)
- [ ] Detail hewan: data + QR code + riwayat perpindahan + riwayat kesehatan (kosong dulu, diisi T-20)
- [ ] Modal transfer petak
- [ ] Dashboard statistik pengadaan: card total per kelas, grafik distribusi
- [ ] Tombol "Cetak Label" per hewan → buka PDF label barcode
- [ ] Tombol "Cetak Label Batch" → pilih beberapa hewan → cetak semua sekaligus

## Notes

- Supplier utama = GUM (sistem konsinyasi, tracking setoran di T-11)
- Nomor hewan: **3 digit numerik, auto-increment per depot per musim** (OI-03 ditetapkan 2026-04-21)
- QR code encode: `{depotId}-{musim}-{noHewan}` — pakai library `qrcode` (Node.js)
- Label cetak: ukuran 5×3 cm, isi: nomor hewan, QR code, jenis, kelas — pakai HTML + CSS print / Puppeteer
- Setelah transaksi POS confirmed, status hewan otomatis BOOKED/SOLD (logic di T-05)
