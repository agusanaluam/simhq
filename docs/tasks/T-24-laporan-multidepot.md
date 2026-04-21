# T-24: Laporan Multi-Depot (Admin Pusat)

**Status:** `TODO`
**Phase:** 3 (Lengkap) | **Priority:** Could Have | **Sprint:** 1 Sprint
**Dependencies:** T-09, T-13

---

## Deskripsi

Dashboard konsolidasi untuk SUPER_ADMIN: ringkasan keuangan semua depot dalam satu halaman, tanpa akses ke detail transaksi depot lain (K-06). Monitoring multi-depot tanpa campur data.

## User Stories

- US-014: Sebagai Administrator, akses ringkasan keuangan semua depot dalam satu halaman (tanpa akses detail transaksi depot lain) → monitoring multi-depot tanpa campur data.

## Acceptance Criteria

- [ ] Hanya SUPER_ADMIN yang akses
- [ ] Ringkasan per depot: total hewan, terjual, tersisa, pendapatan, laba
- [ ] Perbandingan antar depot (bukan detail transaksi)
- [ ] Grafik perbandingan pendapatan per depot
- [ ] OI-02 masih open: apakah OWNER bisa lihat depot lain? → sementara tidak

## Technical Tasks

### Backend (API – Express)
- [ ] `GET /admin/dashboard-pusat` – agregasi summary semua depot (SUPER_ADMIN only)
  - Response: array per depot dengan: `{ depot, totalHewan, terjual, tersisa, pendapatan, labaBersih }`

### Frontend (Next.js)
- [ ] Halaman `/admin/dashboard-pusat` – hanya accessible SUPER_ADMIN
- [ ] Tabel perbandingan depot: kolom per metrik
- [ ] Bar chart: pendapatan per depot

## Notes

- Tidak ada akses ke detail transaksi depot lain (K-06 isolasi penuh)
- OI-02 open item: kepala depot lihat depot lain? Sementara NO
