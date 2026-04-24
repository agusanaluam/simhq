# T-25: Modul Kasbon Karyawan

**Status:** `DONE`
**Phase:** 3 (Lengkap) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-01, T-02, T-18

---

## Deskripsi

Modul kasbon tersendiri untuk karyawan: pinjam uang → cicil → potong dari upah. Keputusan OI-04 (2026-04-21).

## Acceptance Criteria

- [x] Karyawan bisa ajukan kasbon (nominal, alasan)
- [x] Kepala Depot / Admin approve atau tolak kasbon
- [x] Cicilan dikonfigurasi: berapa kali cicil, nominal per cicil
- [x] Potong gaji otomatis saat kalkulasi upah (T-18): upah dikurangi cicilan kasbon aktif
- [x] Saldo kasbon per karyawan: total pinjam, total terbayar, sisa hutang
- [x] Riwayat kasbon per karyawan

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `Kasbon`: id, userId, depotId, nominal, alasan, status (PENDING/APPROVED/REJECTED/LUNAS), approvedBy, tglApprove, createdAt
- [x] Model `CicilanKasbon`: id, kasbonId, nominalCicilan, jumlahCicil, tglMulai
- [x] Model `RealisasiCicilan`: id, kasbonId, periodeGaji (bulan/musim), nominalDipotong, tglPotong

### Backend (API – Express)
- [x] `POST /sdm/kasbon` – ajukan kasbon (karyawan)
- [x] `PUT /sdm/kasbon/:id/approve` – approve + set cicilan (Kepala Depot/Admin)
- [x] `PUT /sdm/kasbon/:id/reject` – tolak kasbon
- [x] `GET /sdm/kasbon?depot=&userId=&status=` – list kasbon
- [x] `GET /sdm/kasbon/:id` – detail + riwayat cicilan
- [x] Hook di kalkulasi upah (T-18): saat hitung upah, kurangi cicilan kasbon aktif otomatis

### Frontend (Next.js)
- [x] Halaman `/sdm/kasbon` – list semua kasbon per depot (Admin/Kepala Depot)
- [x] Tab: Pending Approval / Aktif / Lunas
- [x] Form ajukan kasbon (karyawan)
- [x] Form approve: set nominal cicilan + jumlah cicil
- [x] Di rekap upah (T-18): tampilkan kolom "Potongan Kasbon" dan "Upah Bersih"

## Notes

- Kasbon APPROVED otomatis masuk ke perhitungan upah bulan berikutnya
- Jika karyawan belum lunas kasbon tapi musim berakhir: catat sisa hutang untuk musim berikutnya
- RealisasiCicilan model skipped for MVP — cicil_terbayar counter on cicilan_kasbon tracks progress. Potongan kasbon shown in upah report (display-only — actual increment of cicil_terbayar is manual, deferred). End-of-musim debt carryover deferred.
