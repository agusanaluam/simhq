# T-10: Laporan Keuangan – BIOP & Cash Flow

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Must Have | **Sprint:** 2 Sprint
**Dependencies:** T-07

---

## Deskripsi

Buku kas harian (BIOP): input kas masuk/keluar per divisi, saldo otomatis, cash flow dashboard. Menggantikan sheet BIOP, CASHBCA, NOMINAL SETORAN.

## User Stories

- US-011: Sebagai Kepala Depot, lihat laporan cash flow harian tanpa hitung manual di Excel → kontrol keuangan lebih cepat dan akurat.

## Acceptance Criteria

- [ ] Input kas masuk: sumber (penjualan/deposit/lain), jumlah, tanggal, keterangan
- [ ] Input kas keluar: divisi, keterangan, jumlah, tanggal
- [ ] Saldo kas otomatis terhitung (kas masuk - kas keluar)
- [ ] Filter per tanggal dan per divisi
- [ ] Dashboard cash flow: grafik tren harian kas masuk vs keluar
- [ ] Total saldo per metode (cash vs transfer BCA)
- [ ] Export ke Excel

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `KasHarian`: id, depotId, tipe (MASUK/KELUAR), sumber, divisi, keterangan, jumlah, metode (CASH/BCA), tglTransaksi, inputBy, createdAt
- [ ] Divisi enum: KONSTRUKSI, LOGISTIK, ADMIN, CS, KANDANG, DISTRIBUSI, PAKAN, LISTRIK, LAIN

### Backend (API – Express)
- [ ] `POST /keuangan/kas` – input kas masuk/keluar
- [ ] `GET /keuangan/kas?depot=&tgl_dari=&tgl_sampai=&divisi=` – list kas dengan filter
- [ ] `GET /keuangan/saldo?depot=&tgl=` – saldo per tanggal
- [ ] `GET /keuangan/cashflow?depot=&bulan=` – agregasi cash flow harian untuk chart
- [ ] `GET /keuangan/kas/export?depot=&bulan=` – export Excel

### Frontend (Next.js)
- [ ] Halaman `/depot/keuangan/biop` – tabel buku kas
- [ ] Form input kas masuk/keluar (modal)
- [ ] Filter: pilih tanggal range + divisi
- [ ] Card saldo: total masuk / total keluar / saldo akhir
- [ ] Grafik area chart: cash flow 30 hari terakhir
- [ ] Tombol export Excel

## Notes

- Input kas dari penjualan (POS) bisa otomatis masuk ke BIOP saat transaksi LUNAS
- Kas dari setoran GUM dicatat terpisah di T-11
