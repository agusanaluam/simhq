# T-20: Kendali Kesehatan & Riwayat Hewan

**Status:** `DONE`
**Phase:** 3 (Lengkap) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-03, T-04

---

## Deskripsi

Monitoring kondisi hewan sehari-hari, riwayat kesehatan, penimbangan berkala, pencatatan kematian, riwayat medis & vaksinasi. Kebutuhan baru yang belum ada di Excel.

## User Stories

- US-003: Sebagai Tim Kandang Anggota, input kondisi hewan harian (sehat/sakit, bobot) per nomor hewan → riwayat kesehatan terekam dan bisa diaudit.
- US-004: Sebagai Kepala Depot, dapat alert WA jika ada hewan mati atau kondisi kritis → bisa segera ambil tindakan.

## Acceptance Criteria

- [x] Log kondisi per hewan per hari: status (SEHAT/SAKIT/KRITIS/MATI), bobot terkini, catatan petugas
- [x] Input kematian: tanggal, penyebab, status (TERPOTONG/TIDAK_TERPOTONG) → otomatis kurangi stok
- [x] Riwayat medis: tindakan, obat, vaksinasi per hewan
- [x] Alert ke Kepala Depot via WA (T-17) jika hewan KRITIS atau MATI
- [x] Laporan mortalitas: rekap per periode, per jenis, rasio mortalitas

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `RiwayatHewan`: id, hewanId, tgl, kondisi (SEHAT/SAKIT/KRITIS/MATI), bobot, catatan, tindakanMedis, obat, petugasId
- [x] Model `KematianHewan`: id, hewanId, tgl, penyebab, status (TERPOTONG/TIDAK_TERPOTONG), petugasId

### Backend (API – Express)
- [x] `POST /hewan/:id/riwayat` – input riwayat harian
- [x] `GET /hewan/:id/riwayat` – list riwayat hewan
- [x] `POST /hewan/:id/kematian` – catat kematian (update status hewan → MATI, trigger WA)
- [x] `GET /hewan/mortalitas?depot=&musim=` – laporan mortalitas
- [x] Background check: saat kondisi = KRITIS atau MATI → trigger WA via T-17

### Frontend (Next.js)
- [x] Di halaman detail hewan: tab "Riwayat Kesehatan"
- [x] Form input riwayat harian: kondisi + bobot + catatan (mobile-friendly untuk petugas kandang)
- [x] Timeline riwayat hewan
- [x] Tombol "Catat Kematian" dengan form konfirmasi
- [x] Halaman `/depot/laporan/mortalitas` – tabel + grafik mortalitas

## Notes

- Saat hewan MATI → status Hewan di T-03 otomatis diupdate ke MATI
- Petugas kandang input via HP → UI harus sangat mobile-friendly
- Tindakan medis + obat fields available in API but omitted from frontend form for MVP simplicity. WA alert uses WahaService (silent skip if WAHA_API_URL not set).
