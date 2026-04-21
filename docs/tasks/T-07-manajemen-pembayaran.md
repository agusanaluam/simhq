# T-07: Manajemen Pembayaran

**Status:** `TODO`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-05, T-06

---

## Deskripsi

Input dan tracking pembayaran per transaksi: uang muka (DP), pelunasan, sisa tagihan, biaya tambahan (ongkir dll). Menggantikan kolom LUNAS/UANG MUKA, SISA PELUNASAN, NOMINAL SETORAN di sheet INPUT.

## Acceptance Criteria

- [ ] Input pembayaran: lunas / uang muka, nominal, tanggal, teller penerima, metode (cash/transfer BCA)
- [ ] Sisa pelunasan dihitung otomatis (total tagihan - total bayar)
- [ ] Transaksi ditandai LUNAS otomatis saat sisa = 0
- [ ] Biaya tambahan (ongkos kirim dll) bisa ditambah ke total tagihan
- [ ] Riwayat pembayaran per transaksi tersimpan (audit trail)
- [ ] Rekap setoran cash dan BCA per hari (menggantikan sheet CASHBCA)

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Pembayaran`: id, transaksiId, jumlah, tipe (DP/PELUNASAN), metode (CASH/TRANSFER_BCA/TRANSFER_LAIN), tellerId, tglBayar, catatan
- [ ] Model `BiayaTambahan`: id, transaksiId, keterangan, jumlah
- [ ] Computed field `sisaPelunasan` = total - sum(pembayaran)

### Backend (API – Express)
- [ ] `POST /transaksi/:id/bayar` – input pembayaran baru
- [ ] `GET /transaksi/:id/pembayaran` – list riwayat pembayaran
- [ ] `POST /transaksi/:id/biaya-tambahan` – tambah biaya lainnya
- [ ] `GET /laporan/rekap-setoran?depot=&tgl=` – rekap setoran per hari per metode
- [ ] Auto-update statusBayar transaksi: BELUM_BAYAR → DP → LUNAS

### Frontend (Next.js)
- [ ] Di halaman detail transaksi: section pembayaran dengan riwayat + form input bayar baru
- [ ] Badge status bayar: BELUM BAYAR / DP / LUNAS
- [ ] Progress bar: menampilkan persentase pelunasan
- [ ] Halaman `/depot/keuangan/rekap-setoran` – tabel setoran harian per metode

## Notes

- Tidak ada payment gateway (K-05) – semua input manual
- Untuk slot sapi: status bayar per slot (DP/LUNAS) disimpan di `SlotSapi.statusBayar`
