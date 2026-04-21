# T-25: Modul Kasbon Karyawan

**Status:** `TODO`
**Phase:** 3 (Lengkap) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-01, T-02, T-18

---

## Deskripsi

Modul kasbon tersendiri untuk karyawan: pinjam uang → cicil → potong dari upah. Keputusan OI-04 (2026-04-21).

## Acceptance Criteria

- [ ] Karyawan bisa ajukan kasbon (nominal, alasan)
- [ ] Kepala Depot / Admin approve atau tolak kasbon
- [ ] Cicilan dikonfigurasi: berapa kali cicil, nominal per cicil
- [ ] Potong gaji otomatis saat kalkulasi upah (T-18): upah dikurangi cicilan kasbon aktif
- [ ] Saldo kasbon per karyawan: total pinjam, total terbayar, sisa hutang
- [ ] Riwayat kasbon per karyawan

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `Kasbon`: id, userId, depotId, nominal, alasan, status (PENDING/APPROVED/REJECTED/LUNAS), approvedBy, tglApprove, createdAt
- [ ] Model `CicilanKasbon`: id, kasbonId, nominalCicilan, jumlahCicil, tglMulai
- [ ] Model `RealisasiCicilan`: id, kasbonId, periodeGaji (bulan/musim), nominalDipotong, tglPotong

### Backend (API – Express)
- [ ] `POST /sdm/kasbon` – ajukan kasbon (karyawan)
- [ ] `PUT /sdm/kasbon/:id/approve` – approve + set cicilan (Kepala Depot/Admin)
- [ ] `PUT /sdm/kasbon/:id/reject` – tolak kasbon
- [ ] `GET /sdm/kasbon?depot=&userId=&status=` – list kasbon
- [ ] `GET /sdm/kasbon/:id` – detail + riwayat cicilan
- [ ] Hook di kalkulasi upah (T-18): saat hitung upah, kurangi cicilan kasbon aktif otomatis

### Frontend (Next.js)
- [ ] Halaman `/sdm/kasbon` – list semua kasbon per depot (Admin/Kepala Depot)
- [ ] Tab: Pending Approval / Aktif / Lunas
- [ ] Form ajukan kasbon (karyawan)
- [ ] Form approve: set nominal cicilan + jumlah cicil
- [ ] Di rekap upah (T-18): tampilkan kolom "Potongan Kasbon" dan "Upah Bersih"

## Notes

- Kasbon APPROVED otomatis masuk ke perhitungan upah bulan berikutnya
- Jika karyawan belum lunas kasbon tapi musim berakhir: catat sisa hutang untuk musim berikutnya
