# T-09: Dashboard Depot

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-03, T-05, T-07

---

## Deskripsi

Dashboard real-time untuk kepala depot dan admin: ringkasan penjualan, sisa stok per kelas, pengadaan, pendapatan hari ini. Menggantikan sheet DASHBOARD DEPOT.

## User Stories

- US-010: Sebagai Admin Ketua, lihat dashboard real-time: ekor terjual hari ini, sisa stok per kelas, total pendapatan → keputusan operasional berdasarkan data aktual.

## Acceptance Criteria

- [ ] Card: total hewan masuk, terjual, tersisa, mati (per musim)
- [ ] Breakdown stok per kelas per jenis (sapi/domba)
- [ ] Total pendapatan hari ini dan akumulasi musim
- [ ] Jumlah transaksi hari ini (per tipe: SHQ/THQ/PHQ)
- [ ] Grafik penjualan harian (7 hari terakhir)
- [ ] Alert: stok kelas tertentu < threshold (misal < 5 ekor)
- [ ] Data refresh otomatis setiap 5 menit atau manual refresh

## Technical Tasks

### Backend (API – Express)
- [ ] `GET /dashboard/depot?depot=&musim=` – semua data dashboard dalam 1 endpoint
  - Response: `{ stok: {...}, penjualan: {...}, pendapatan: {...}, transaksiHariIni: [...] }`
- [ ] Query agregasi: GROUP BY kelas, jenis, status untuk stok
- [ ] Query penjualan 7 hari terakhir dengan SUM

### Frontend (Next.js)
- [ ] Halaman `/depot/dashboard` – landing page setelah login
- [ ] Komponen `StokCard`: grid kelas × jenis dengan jumlah hewan
- [ ] Komponen `PenjualanChart`: line chart 7 hari (pakai `recharts` atau `chart.js`)
- [ ] Komponen `SummaryCards`: 4 card (masuk/terjual/tersisa/mati)
- [ ] Komponen `PendapatanSummary`: pendapatan hari ini + musim
- [ ] Auto-refresh dengan `useInterval` setiap 5 menit

## Notes

- Dashboard dibedakan per role: OWNER/ADMIN lihat depot sendiri; SUPER_ADMIN lihat semua depot → T-24
- Angka stok real-time penting saat peak H-3 s/d H
