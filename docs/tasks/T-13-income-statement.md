# T-13: Income Statement Otomatis

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-07, T-10, T-12

---

## Deskripsi

Laporan laba rugi per kelas per jenis: pendapatan kotor, HPP (harga beli), margin bruto, biaya operasional per divisi, laba bersih. Generate otomatis dari data yang sudah ada. Menggantikan sheet INCOME STATEMENT.

## User Stories

- US-013: Sebagai Kepala Depot, generate laporan income statement di akhir musim dengan satu klik → laporan siap dalam menit, bukan hari.

## Acceptance Criteria

- [ ] Laporan generate otomatis dari data transaksi + BIOP yang sudah ada
- [ ] Breakdown per kelas per jenis: pendapatan, HPP, margin bruto
- [ ] Total biaya operasional per divisi (dari RAB realisasi)
- [ ] Laba bersih = total margin bruto - total biaya operasional
- [ ] Bisa generate untuk periode musim berjalan atau musim sebelumnya
- [ ] Export ke Excel dan PDF

## Technical Tasks

### Backend (API – Express)
- [ ] `GET /laporan/income-statement?depot=&musim=` – generate income statement
  - Aggregasi dari: Transaksi (pendapatan), HargaKelas (HPP), RealisasiPengeluaran (biaya)
  - Response: `{ perihal, pendapatanPerKelas: [...], totalPendapatan, totalHPP, marginBruto, biayaPerDivisi: [...], labaBersih }`
- [ ] `GET /laporan/income-statement/export?format=excel|pdf` – export

### Frontend (Next.js)
- [ ] Halaman `/depot/laporan/income-statement`
- [ ] Filter: pilih musim
- [ ] Tabel: Kelas / Jenis / Qty Terjual / Pendapatan / HPP / Margin
- [ ] Tabel biaya per divisi
- [ ] Card: Total Pendapatan / Total Biaya / Laba Bersih
- [ ] Tombol export Excel + PDF

## Notes

- Data sumber dari T-05, T-07 (pendapatan), T-02 (HPP), T-12 (biaya divisi)
- PDF export bisa pakai browser print (`window.print()`) untuk MVP, Puppeteer untuk produksi
