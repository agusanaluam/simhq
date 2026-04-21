# T-02: Master Data (Harga, Kelas, Karyawan)

**Status:** `TODO`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-01

---

## Deskripsi

Setup data master yang dipakai seluruh sistem: tabel kelas hewan (D/C/B/A/SPR1-3/IST), harga beli/jual per kelas per jenis, data karyawan, konfigurasi per depot, dan **master data yayasan** untuk transaksi THQ (OI-07).

## Acceptance Criteria

- [ ] 8 kelas hewan tersedia: D, C, B, A, SPR 1, SPR 2, SPR 3, IST
- [ ] Harga beli (HDD) dan harga jual per kelas per jenis (sapi/domba) bisa dikonfigurasi per musim
- [ ] Fee sales per kelas tersimpan dan bisa diubah
- [ ] Data karyawan (nama, divisi, tarif upah harian) bisa di-CRUD oleh SUPER_ADMIN/OWNER
- [ ] Perubahan harga tidak berlaku surut ke transaksi yang sudah ada
- [ ] Master data yayasan bisa di-CRUD (nama, alamat, kontak) — dipakai di transaksi THQ (OI-07)

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `KelasHewan`: id, kode (D/C/B/A/SPR1/SPR2/SPR3/IST), urutan
- [ ] Model `HargaKelas`: id, depotId, musim, kelasId, jenis (SAPI/DOMBA), hargaBeli, hargaJual, feeSales
- [ ] Model `Karyawan`: id, userId, depotId, divisi, tarifHarian, berlakuDari, isActive

### Backend (API – Express)
- [ ] `GET /master/kelas` – list kelas hewan
- [ ] `GET /master/harga?depot=&musim=` – list harga per depot per musim
- [ ] `POST /master/harga` – set harga (SUPER_ADMIN/OWNER)
- [ ] `PUT /master/harga/:id` – update harga
- [ ] `GET /karyawan` – list karyawan per depot
- [ ] `POST /karyawan` – tambah karyawan
- [ ] `PUT /karyawan/:id` – update data/tarif karyawan
- [ ] `GET /master/yayasan` – list yayasan (untuk dropdown THQ)
- [ ] `POST /master/yayasan` – tambah yayasan (SUPER_ADMIN/OWNER)
- [ ] `PUT /master/yayasan/:id` – update yayasan

### Frontend (Next.js)
- [ ] Halaman `/admin/master-data` – tab: Harga Kelas / Karyawan / Yayasan
- [ ] Form input harga per kelas per jenis
- [ ] Tabel karyawan dengan inline edit tarif harian
- [ ] Validasi: harga jual harus > harga beli
- [ ] CRUD yayasan: nama, alamat, kontak PIC

## Notes

- Musim dikodekan sebagai tahun (misal: 2026)
- Kelas berlaku global, harga per depot (karena setiap depot mandiri)
- Model `Yayasan`: id, nama, alamat, kontakPIC, telepon, isActive — dipakai di T-05 (transaksi THQ) sebagai foreign key
