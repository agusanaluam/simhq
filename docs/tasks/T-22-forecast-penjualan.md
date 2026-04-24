# T-22: Forecast Penjualan

**Status:** `DONE`
**Phase:** 3 (Lengkap) | **Priority:** Could Have | **Sprint:** 1 Sprint
**Dependencies:** T-05, T-09

---

## Deskripsi

Grafik proyeksi penjualan H-30 sampai H berdasarkan data historis dan realisasi berjalan. Perbandingan target vs realisasi harian. Menggantikan sheet FORECAST (data H-24 s/d H untuk domba & sapi).

## Acceptance Criteria

- [x] Grafik proyeksi penjualan H-30 s/d H per jenis (sapi/domba)
- [x] Perbandingan target harian vs realisasi aktual
- [x] Data forecast bisa di-input manual per hari (target) oleh kepala depot
- [x] Grafik update otomatis dengan data transaksi hari ini

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `TargetPenjualan`: id, depotId, musim, jenis, hariH (misal -30, -29, ..., 0), targetUnit, createdBy

### Backend (API – Express)
- [x] `POST /laporan/target` – set target penjualan harian
- [x] `GET /laporan/forecast?depot=&musim=` – data forecast vs realisasi (compare target vs aktual transaksi)

### Frontend (Next.js)
- [x] Halaman `/depot/laporan/forecast` – dua chart (sapi / domba)
- [x] Line chart: target (dashed) vs realisasi (solid)
- [x] X-axis: H-30 s/d H | Y-axis: unit terjual
- [x] Form input target per hari

## Notes

- Realisasi diambil dari data transaksi (T-05)
- Could Have – tidak blocking operasi inti
- Uses absolute dates instead of H-relative (hari_h). Target upsert uses firstOrNew pattern for SQLite UNIQUE compatibility. Recharts LineChart: target=dashed gray, realisasi=solid color.
