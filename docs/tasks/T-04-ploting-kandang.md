# T-04: Ploting Kandang Visual

**Status:** `DONE`
**Phase:** 1 (Fondasi) | **Priority:** Must Have | **Sprint:** 2 Sprint
**Dependencies:** T-01, T-02, T-03

---

## Deskripsi

Tampilan grid visual posisi hewan di kandang. Tim kandang bisa melihat petak mana terisi hewan apa, kapasitas, dan drag-drop hewan ke petak baru. Menggantikan sheet PLOTING SAPI (grid 10×3) dan Sheet37 (domba).

## User Stories

- US-002: Sebagai Tim Kandang (Ketua), lihat ploting kandang visual dan drag-drop hewan ke petak baru → posisi hewan akurat real-time.

## Acceptance Criteria

- [ ] Grid visual petak kandang (layout konfigurabel per depot)
- [ ] Setiap petak tampilkan: nomor petak, hewan yang menempati, kelas, status
- [ ] Drag-drop hewan ke petak lain mencatat log perpindahan otomatis
- [ ] Filter tampilan per jenis hewan (sapi/domba)
- [ ] Kapasitas petak: tampilkan berapa terisi vs kapasitas maksimal
- [ ] Color-coding status hewan di petak (available/booked/sold)

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `PetakKandang`: id, depotId, noPetak, jenisKandang (SAPI/DOMBA), kapasitas, kelas, posisiX, posisiY
- [ ] Relasi `Hewan.petakId → PetakKandang.id`

### Backend (API – Express)
- [ ] `GET /petak?depot=&jenis=` – list semua petak dengan hewan yang menempati
- [ ] `POST /petak` – tambah petak baru (konfigurasi layout kandang)
- [ ] `PUT /petak/:id` – update kapasitas/kelas petak
- [ ] `POST /petak/layout` – simpan konfigurasi posisi grid (posisiX, posisiY per petak)
- [ ] `POST /hewan/:id/transfer` – pindah petak (reuse dari T-03)

### Frontend (Next.js)
- [ ] Halaman `/depot/kandang` – grid visual petak
- [ ] Komponen `PetakCard`: tampilkan nomor, hewan, status dengan warna berbeda
- [ ] Drag-and-drop menggunakan `@dnd-kit/core` atau `react-beautiful-dnd`
- [ ] Panel sidebar: detail hewan saat petak diklik
- [ ] Tombol konfigurasi layout (OWNER/SUPER_ADMIN): tambah/hapus/resize petak
- [ ] Filter toggle: tampilkan kandang sapi / kandang domba

## Notes

- Layout grid disimpan sebagai posisiX/posisiY (kolom/baris) agar fleksibel per depot
- Real-time update tidak wajib MVP; polling setiap 30 detik sudah cukup
