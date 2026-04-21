# T-16: CRM – Database Customer & Order Management

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 2 Sprint
**Dependencies:** T-05, T-14

---

## Deskripsi

Manajemen data pelanggan dengan histori pembelian, follow-up order CS, log interaksi. Menggantikan data pembeli flat di sheet INPUT yang tidak punya histori.

## User Stories

- US-018: Sebagai Tim CS Ketua, lihat daftar customer yang membeli tahun lalu namun belum order tahun ini → bisa lakukan retargeting lebih terarah.

## Acceptance Criteria

- [ ] Profil customer: nama, no. HP, alamat, histori pembelian (musim, jenis, kelas, nominal)
- [ ] Deteksi customer lama saat input POS (autocomplete by HP)
- [ ] Antrian order CS dari katalog web dengan assign dan tracking status
- [ ] Log interaksi: tanggal, channel (WA/telepon), ringkasan, CS yang menangani
- [ ] Filter: customer belum order musim ini, customer tahun lalu, customer per wilayah

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Customer` (sudah di T-05): id, nama, hp, alamat, kelurahan, kecamatan, kota
- [ ] Model `LogInteraksi`: id, customerId, tanggal, channel (WA/TELEPON/EMAIL), isi, csId
- [ ] Relasi: Customer → Transaksi (has_many), Customer → OrderKatalog (has_many), Customer → LogInteraksi (has_many)

### Backend (API – Express)
- [ ] `GET /crm/customer?q=&wilayah=&status=` – list customer dengan filter
- [ ] `GET /crm/customer/:id` – detail customer + histori transaksi semua musim
- [ ] `PUT /crm/customer/:id` – update data customer
- [ ] `POST /crm/customer/:id/log` – tambah log interaksi
- [ ] `GET /crm/customer/retargeting?musim=` – customer musim lalu belum order musim ini
- [ ] `GET /crm/laporan` – statistik: tingkat konversi, rata-rata follow-up, repeat customer

### Frontend (Next.js)
- [ ] Halaman `/cs/customer` – list customer dengan search + filter
- [ ] Halaman `/cs/customer/:id` – profil customer + histori + form log interaksi
- [ ] Badge "REPEAT CUSTOMER" jika pernah beli sebelumnya
- [ ] Halaman `/cs/retargeting` – list customer potensial untuk di-follow-up

## Notes

- Customer diidentifikasi by nomor HP (unique)
- Data customer di-share antara POS dan katalog web (same Customer model)
- Histori antar musim tersimpan selama data tidak dihapus (OI-01 masih open)
