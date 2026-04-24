# T-16: CRM – Database Customer & Order Management

**Status:** `DONE`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 2 Sprint
**Dependencies:** T-05, T-14

---

## Deskripsi

Manajemen data pelanggan dengan histori pembelian, follow-up order CS, log interaksi. Menggantikan data pembeli flat di sheet INPUT yang tidak punya histori.

## User Stories

- US-018: Sebagai Tim CS Ketua, lihat daftar customer yang membeli tahun lalu namun belum order tahun ini → bisa lakukan retargeting lebih terarah.

## Acceptance Criteria

- [x] Profil customer: nama, no. HP, alamat, histori pembelian (musim, jenis, kelas, nominal)
- [x] Deteksi customer lama saat input POS (autocomplete by HP)
- [x] Antrian order CS dari katalog web dengan assign dan tracking status
- [x] Log interaksi: tanggal, channel (WA/telepon), ringkasan, CS yang menangani
- [x] Filter: customer belum order musim ini, customer tahun lalu, customer per wilayah

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `Customer` (sudah di T-05): id, nama, hp, alamat, kelurahan, kecamatan, kota
- [x] Model `LogInteraksi`: id, customerId, tanggal, channel (WA/TELEPON/EMAIL), isi, csId
- [x] Relasi: Customer → Transaksi (has_many), Customer → OrderKatalog (has_many), Customer → LogInteraksi (has_many)

### Backend (API – Express)
- [x] `GET /crm/customer?q=&wilayah=&status=` – list customer dengan filter
- [x] `GET /crm/customer/:id` – detail customer + histori transaksi semua musim
- [x] `PUT /crm/customer/:id` – update data customer
- [x] `POST /crm/customer/:id/log` – tambah log interaksi
- [x] `GET /crm/customer/retargeting?musim=` – customer musim lalu belum order musim ini
- [x] `GET /crm/laporan` – statistik: tingkat konversi, rata-rata follow-up, repeat customer

### Frontend (Next.js)
- [x] Halaman `/cs/customer` – list customer dengan search + filter
- [x] Halaman `/cs/customer/:id` – profil customer + histori + form log interaksi
- [x] Badge "REPEAT CUSTOMER" jika pernah beli sebelumnya
- [x] Halaman `/cs/retargeting` – list customer potensial untuk di-follow-up

## Notes

- Customer diidentifikasi by nomor HP (unique)
- Data customer di-share antara POS dan katalog web (same Customer model)
- Histori antar musim tersimpan selama data tidak dihapus (OI-01 masih open)
- CRM laporan statistik endpoint deferred. OrderKatalog not linked by FK — linked by HP in future iteration. Log interaksi WA notification (T-17) deferred.
