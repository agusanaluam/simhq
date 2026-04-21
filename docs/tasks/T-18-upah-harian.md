# T-18: Kalkulasi Upah Harian Otomatis

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-08, T-02

---

## Deskripsi

Sistem menghitung upah karyawan berdasarkan kehadiran aktual. Komponen: tarif upah harian per karyawan (dikonfigurasi admin) × jumlah hari hadir. Hasil kalkulasi jadi dasar pembayaran gaji akhir musim.

## Acceptance Criteria

- [ ] Tarif upah harian per karyawan dikonfigurasi admin (bisa berbeda per orang/divisi)
- [ ] Perubahan tarif tidak berlaku surut
- [ ] Kalkulasi upah: tarif × hari hadir per periode
- [ ] Rekap upah per karyawan bisa dilihat per minggu dan per musim penuh
- [ ] Export rekap upah ke Excel untuk pembayaran gaji

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `TarifUpah`: id, userId, tarifHarian, berlakuDari, dibuatOleh, createdAt
- [ ] Computed dari `Absensi`: jumlah hari HADIR/TERLAMBAT per periode

### Backend (API – Express)
- [ ] `POST /sdm/tarif` – set tarif upah per karyawan (OWNER/SUPER_ADMIN)
- [ ] `GET /sdm/tarif?depot=` – list tarif aktif semua karyawan
- [ ] `GET /sdm/upah?depot=&tgl_dari=&tgl_sampai=` – kalkulasi upah per karyawan
  - Query: JOIN TarifUpah + Absensi, hitung hari hadir × tarif
- [ ] `GET /sdm/upah/export?depot=&musim=` – export Excel

### Frontend (Next.js)
- [ ] Halaman `/admin/sdm/upah` – tabel kalkulasi upah semua karyawan
- [ ] Kolom: Nama / Divisi / Hari Hadir / Tarif Harian / Total Upah
- [ ] Filter periode: minggu ini / bulan ini / musim penuh
- [ ] Tombol export Excel
- [ ] Halaman tarif: form set tarif per karyawan (modal inline edit)

## Notes

- TERLAMBAT dihitung sebagai hari hadir (bukan potongan, kecuali OI-06 diputuskan beda)
- OI-06 masih open: komponen tambahan (uang makan, lembur) belum diputuskan
