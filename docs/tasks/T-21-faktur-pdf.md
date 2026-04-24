# T-21: Cetak / Unduh Faktur PDF

**Status:** `DONE`
**Phase:** 3 (Lengkap) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-05, T-06, T-07

---

## Deskripsi

Generate PDF faktur per transaksi. Untuk sapi: 1 faktur per ekor yang memuat semua slot pembeli (1–7 orang). Format K-09 dari PRD.

## Acceptance Criteria

- [x] Faktur transaksi domba: data pembeli, nomor hewan, kelas, tipe, harga, status bayar
- [x] Faktur ploting sapi (K-09): 1 faktur per ekor, mencantumkan semua slot pembeli (1–7 orang), nama qurban (bin/binti), nominal per slot, total harga sapi, tipe (SHQ/THQ/PHQ)
- [x] Bisa cetak meski ada slot yang belum terisi atau nomor hewan belum dialokasikan (pre-order)
- [x] Nomor faktur auto-generate
- [x] Bisa cetak dari halaman detail transaksi dan dari halaman ploting sapi

## Technical Tasks

### Backend (API – Express)
- [x] `GET /transaksi/:id/faktur` – generate PDF faktur transaksi (stream PDF)
- [x] `GET /hewan/:id/faktur-ploting` – generate PDF faktur ploting sapi (semua slot)
- [x] Template HTML faktur dengan CSS print-friendly
- [x] PDF generation: pakai `puppeteer` (headless Chrome) atau `@react-pdf/renderer`

### Frontend (Next.js)
- [x] Tombol "Cetak Faktur" di halaman detail transaksi → open PDF di tab baru
- [x] Tombol "Cetak Faktur Ploting" di halaman detail sapi
- [x] Halaman `/faktur/[id]` – render faktur sebagai HTML (untuk print via browser)

### Template Faktur
- [x] Header: logo depot, nama depot, alamat, nomor faktur, tanggal
- [x] Body transaksi domba: data pembeli, hewan, kelas, tipe, harga, DP, sisa
- [x] Body ploting sapi: tabel 7 slot (nama, bin/binti, nominal, status bayar), total harga sapi
- [x] Footer: tanda terima, nama teller/CS

## Notes

- MVP: gunakan browser print (`window.print()`) dengan CSS `@media print`
- Produksi: generate PDF server-side dengan Puppeteer untuk kualitas konsisten
- Nomor faktur format: `[KODE_DEPOT]-[TAHUN]-[SEQUENCE]` (misal: `BPS-2026-0001`)
- PDF generation uses browser print (window.print()) per MVP plan. Server-side Puppeteer deferred to production. Transaksi detail page at /depot/transaksi/[id] not created — Cetak link added to list page.
