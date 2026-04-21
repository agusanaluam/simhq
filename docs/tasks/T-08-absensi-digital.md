# T-08: Absensi Digital (Check-in / Check-out)

**Status:** `TODO`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-01, T-02

---

## Deskripsi

Karyawan absen via mobile web, timestamp otomatis, deteksi keterlambatan. Menggantikan Google Form terpisah + sheet Form Responses 4, ABSEN, Absen Manual.

## User Stories

- US-001: Sebagai Tim Kandang (Anggota), akses form check-in absensi langsung dari HP tanpa Google Form terpisah → waktu absensi lebih cepat dan terintegrasi.

## Acceptance Criteria

- [ ] Karyawan bisa check-in dan check-out via halaman mobile web (tanpa install app)
- [ ] Timestamp otomatis saat submit
- [ ] Sistem deteksi keterlambatan berdasarkan jam masuk standar per divisi
- [ ] Ketua tim / kepala depot bisa input absensi manual (override) dengan log siapa yang override
- [ ] Rekap harian/bulanan per karyawan: hadir, terlambat, tidak hadir, durasi kerja
- [ ] Export rekap ke Excel

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Absensi`: id, userId, tgl, jamMasuk, jamKeluar, durasi (menit), status (HADIR/TERLAMBAT/TIDAK_HADIR), overrideBy (userId nullable), catatan
- [ ] Model `JamKerjaDefault`: id, divisi, jamMasuk (HH:MM), jamKeluar (HH:MM), depotId

### Backend (API – Express)
- [ ] `POST /absensi/checkin` – check-in (timestamp server-side, deteksi terlambat)
- [ ] `POST /absensi/checkout` – check-out (hitung durasi)
- [ ] `GET /absensi/hari-ini` – status absensi user yang login hari ini
- [ ] `POST /absensi/manual` – input manual oleh ketua/kepala (catat overrideBy)
- [ ] `GET /absensi/rekap?userId=&bulan=&depot=` – rekap absensi
- [ ] `GET /absensi/rekap/export?bulan=&depot=` – export Excel (pakai `exceljs`)

### Frontend (Next.js)
- [ ] Halaman `/absensi` – mobile-optimized, tombol besar MASUK / PULANG
- [ ] Tampilkan status hari ini: belum absen / sudah masuk (jam X) / sudah pulang
- [ ] Halaman `/admin/absensi` – rekap tabel per karyawan per hari
- [ ] Form override manual: pilih karyawan, tanggal, status, catatan
- [ ] Tombol export Excel

## Notes

- Jam kerja default dikonfigurasi per divisi (T-02)
- Durasi dihitung: jamKeluar - jamMasuk dalam menit
- Status TERLAMBAT: jamMasuk > jamMasukDefault + toleransi (misal 15 menit)
