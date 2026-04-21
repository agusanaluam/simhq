# T-12: RAB per Divisi & Realisasi

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Must Have | **Sprint:** 1 Sprint
**Dependencies:** T-10

---

## Deskripsi

Input anggaran (RAB) dan realisasi pengeluaran per divisi. Otomatis hitung selisih RAB vs realisasi. Menggantikan sheet Copy of RAB.

## User Stories

- US-012: Sebagai Tim Logistik Ketua, input realisasi pengeluaran divisi dan langsung lihat posisi vs RAB → tidak over-budget tanpa disadari.

## Acceptance Criteria

- [ ] Input RAB per divisi di awal musim (OWNER/SUPER_ADMIN)
- [ ] Setiap divisi bisa input realisasi pengeluaran (detail rincian)
- [ ] Otomatis hitung: anggaran - realisasi = selisih
- [ ] Alert jika realisasi mendekati/melebihi RAB (>80%)
- [ ] Notifikasi WA ke Kepala Depot jika anggaran divisi hampir habis (trigger T-17)
- [ ] Laporan: tabel RAB vs realisasi semua divisi

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `RAB`: id, depotId, divisi, musim, jumlahAnggaran, createdBy
- [ ] Model `RealisasiPengeluaran`: id, rabId, keterangan, jumlah, tglPengeluaran, inputBy, createdAt

### Backend (API – Express)
- [ ] `POST /keuangan/rab` – set RAB per divisi (OWNER/SUPER_ADMIN)
- [ ] `GET /keuangan/rab?depot=&musim=` – list RAB semua divisi
- [ ] `POST /keuangan/rab/:id/realisasi` – tambah pengeluaran realisasi
- [ ] `GET /keuangan/rab/:id/realisasi` – list realisasi per RAB
- [ ] `GET /keuangan/rab/summary?depot=&musim=` – summary RAB vs realisasi semua divisi
- [ ] Background check: jika realisasi > 80% RAB → trigger notifikasi WA (T-17)

### Frontend (Next.js)
- [ ] Halaman `/depot/keuangan/rab` – tabel semua divisi
- [ ] Kolom: Divisi / RAB / Realisasi / Selisih / % Terpakai
- [ ] Progress bar warna: hijau <70%, kuning 70-90%, merah >90%
- [ ] Form set RAB awal musim (per divisi)
- [ ] Modal input realisasi pengeluaran

## Notes

- Divisi sama dengan enum di T-10: KONSTRUKSI, LOGISTIK, ADMIN, CS, KANDANG, dst.
- Pengeluaran realisasi juga dicatat di BIOP (T-10) sebagai kas keluar
