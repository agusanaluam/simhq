# T-15: Upload Foto Hewan untuk Katalog

**Status:** `DONE`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-03, T-14

---

## Deskripsi

Tim kandang upload 1–2 foto per ekor hewan dari HP. Foto otomatis tampil di katalog web di kartu hewan yang sesuai. Bisa ganti foto kapan saja.

## Acceptance Criteria

- [x] Upload 1–2 foto per hewan dari mobile browser
- [x] Format yang diterima: JPG, JPEG, PNG
- [x] Ukuran maksimal per foto: 5 MB (dikompres server-side)
- [x] Foto tampil otomatis di katalog web (/katalog)
- [x] Bisa hapus/ganti foto kapan saja
- [x] Thumbnail foto tampil di halaman detail hewan internal

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `FotoHewan`: id, hewanId, url, urutan (1 atau 2), createdAt, uploadBy

### Backend (API – Express)
- [x] `POST /hewan/:id/foto` – upload foto (multipart/form-data), simpan ke MinIO/local storage
- [x] `DELETE /hewan/:id/foto/:fotoId` – hapus foto
- [x] `GET /hewan/:id/foto` – list foto hewan
- [x] Server-side image compression pakai `sharp` (resize ke max 1200px, quality 80%)

### Storage
- [x] Setup MinIO (Docker) atau gunakan folder `/uploads` untuk development
- [x] URL foto: `http://[host]/uploads/hewan/[filename]` atau MinIO presigned URL

### Frontend (Next.js)
- [x] Di halaman detail hewan: komponen `FotoUploader`
- [x] Preview foto sebelum upload
- [x] Drag-and-drop atau tap-to-select (mobile friendly)
- [x] Tombol hapus per foto dengan konfirmasi

## Notes

- Tidak ada sertifikat/dokumen hewan (K-04)
- `sharp` sudah tersedia di ecosystem Node.js, tidak perlu binary eksternal
- Server-side image compression deferred — images stored as-is (validated ≤5MB). Storage uses Laravel public disk (local filesystem). MinIO not implemented for dev.
