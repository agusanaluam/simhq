# T-11: Manajemen Setoran GUM (Konsinyasi Supplier)

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-03, T-07

---

## Deskripsi

GUM adalah supplier pusat dengan sistem konsinyasi: hewan diterima dulu, bayar belakangan. Depot mencatat setoran ke GUM secara fleksibel (bisa partial, bisa akumulasi beberapa batch). Menggantikan sheet SETOR GUM 2 & NOMINAL SETORAN.

## User Stories

- US-006d: Sebagai Kepala Depot, lihat dashboard setoran ke GUM: total hutang pengadaan, total sudah disetor, sisa yang belum dibayar → posisi hutang ke GUM selalu jelas.

## Acceptance Criteria

- [ ] Input setoran ke GUM: tanggal, jumlah, metode (cash/BCA), keterangan
- [ ] Setoran bisa partial (tidak harus sesuai 1:1 dengan pengadaan)
- [ ] Dashboard: total harga pengadaan dari GUM, total disetor, sisa hutang
- [ ] Riwayat setoran per batch
- [ ] Posisi hutang terlihat jelas tanpa hitung manual

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `SetoranGum`: id, depotId, supplierId, tglSetor, jumlah, metode (CASH/BCA), keterangan, inputBy, createdAt
- [ ] Computed: `totalHutang` = SUM(hargaBeli × jumlah hewan dari GUM) - SUM(setoran)

### Backend (API – Express)
- [ ] `POST /keuangan/setoran-gum` – input setoran baru
- [ ] `GET /keuangan/setoran-gum?depot=` – list setoran
- [ ] `GET /keuangan/setoran-gum/posisi?depot=` – posisi hutang: `{ totalPengadaan, totalSetor, sisaHutang }`

### Frontend (Next.js)
- [ ] Halaman `/depot/keuangan/setoran-gum`
- [ ] 3 card besar: Total Pengadaan / Total Disetor / Sisa Hutang
- [ ] Tabel riwayat setoran
- [ ] Form input setoran baru (modal)

## Notes

- Satu depot bisa punya beberapa supplier (bukan hanya GUM), tapi GUM adalah primary
- Jika OI-05 diputuskan ada transfer stok antar depot, ini perlu revisi
