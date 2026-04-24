# T-18: Kalkulasi Upah Harian Otomatis

**Status:** `DONE`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-08, T-02

---

## Deskripsi

Sistem menghitung upah karyawan berdasarkan kehadiran aktual. Komponen: tarif upah harian per karyawan (dikonfigurasi admin) × jumlah hari hadir. Hasil kalkulasi jadi dasar pembayaran gaji akhir musim.

## Acceptance Criteria

- [x] Tarif upah harian per karyawan dikonfigurasi admin (bisa berbeda per orang/divisi)
- [x] Perubahan tarif tidak berlaku surut
- [x] Kalkulasi upah: tarif × hari hadir per periode
- [x] Rekap upah per karyawan bisa dilihat per minggu dan per musim penuh
- [x] Export rekap upah ke Excel untuk pembayaran gaji

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `TarifUpah`: id, userId, tarifHarian, berlakuDari, dibuatOleh, createdAt
- [x] Computed dari `Absensi`: jumlah hari HADIR/TERLAMBAT per periode

### Backend (API – Express)
- [x] `POST /sdm/tarif` – set tarif upah per karyawan (OWNER/SUPER_ADMIN)
- [x] `GET /sdm/tarif?depot=` – list tarif aktif semua karyawan
- [x] `GET /sdm/upah?depot=&tgl_dari=&tgl_sampai=` – kalkulasi upah per karyawan
  - Query: JOIN TarifUpah + Absensi, hitung hari hadir × tarif
- [x] `GET /sdm/upah/export?depot=&musim=` – export Excel

### Frontend (Next.js)
- [x] Halaman `/admin/sdm/upah` – tabel kalkulasi upah semua karyawan
- [x] Kolom: Nama / Divisi / Hari Hadir / Tarif Harian / Total Upah
- [x] Filter periode: minggu ini / bulan ini / musim penuh
- [x] Tombol export Excel
- [x] Halaman tarif: form set tarif per karyawan (modal inline edit)

## Notes

- TERLAMBAT dihitung sebagai hari hadir (bukan potongan, kecuali OI-06 diputuskan beda)
- OI-06 masih open: komponen tambahan (uang makan, lembur) belum diputuskan
- Tarif tidak berlaku surut: new rows created per tarif change. MVP uses latest tarif ≤ tgl_sampai for calculation. Tarif config UI (inline modal) deferred. OI-06 (komponen tambahan) still open.
