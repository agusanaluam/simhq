# T-15: Upload Foto Hewan untuk Katalog

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-03, T-14

---

## Deskripsi

Tim kandang upload 1–2 foto per ekor hewan dari HP. Foto otomatis tampil di katalog web di kartu hewan yang sesuai. Bisa ganti foto kapan saja.

## Acceptance Criteria

- [ ] Upload 1–2 foto per hewan dari mobile browser
- [ ] Format yang diterima: JPG, JPEG, PNG
- [ ] Ukuran maksimal per foto: 5 MB (dikompres server-side)
- [ ] Foto tampil otomatis di katalog web (/katalog)
- [ ] Bisa hapus/ganti foto kapan saja
- [ ] Thumbnail foto tampil di halaman detail hewan internal

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `FotoHewan`: id, hewanId, url, urutan (1 atau 2), createdAt, uploadBy

### Backend (API – Express)
- [ ] `POST /hewan/:id/foto` – upload foto (multipart/form-data), simpan ke MinIO/local storage
- [ ] `DELETE /hewan/:id/foto/:fotoId` – hapus foto
- [ ] `GET /hewan/:id/foto` – list foto hewan
- [ ] Server-side image compression pakai `sharp` (resize ke max 1200px, quality 80%)

### Storage
- [ ] Setup MinIO (Docker) atau gunakan folder `/uploads` untuk development
- [ ] URL foto: `http://[host]/uploads/hewan/[filename]` atau MinIO presigned URL

### Frontend (Next.js)
- [ ] Di halaman detail hewan: komponen `FotoUploader`
- [ ] Preview foto sebelum upload
- [ ] Drag-and-drop atau tap-to-select (mobile friendly)
- [ ] Tombol hapus per foto dengan konfirmasi

## Notes

- Tidak ada sertifikat/dokumen hewan (K-04)
- `sharp` sudah tersedia di ecosystem Node.js, tidak perlu binary eksternal
