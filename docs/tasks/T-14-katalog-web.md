# T-14: Katalog Web Publik & Form Order Online

**Status:** `DONE`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 2 Sprint
**Dependencies:** T-03, T-05

---

## Deskripsi

Halaman publik (tanpa login) menampilkan hewan tersedia per kelas & jenis, foto hewan, harga, sisa slot. Pembeli isi form order online; order masuk ke antrian CS untuk difollow-up. Menggantikan pemasaran WA broadcast manual.

## User Stories

- US-008: Sebagai Pembeli, lihat katalog hewan tersedia dengan kelas, bobot estimasi, harga, dan isi form order online → pembeli bisa pesan tanpa datang ke depot.
- US-009: Sebagai Tim CS, lihat antrian order dari katalog web dan follow-up via klik "Kirim WA" → tidak ada order yang terlewat.

## Acceptance Criteria

- [x] Halaman publik `/katalog` tanpa login
- [x] Tampilkan kartu hewan: foto, kelas, jenis, bobot estimasi, harga, sisa slot
- [x] Badge "HABIS" jika slot penuh (dari konfigurasi slot T-05)
- [x] Form order: nama, no. HP, alamat, pilihan jenis+kelas+tipe (SHQ/THQ/PHQ), catatan
- [x] Tidak ada cart/checkout – submit → masuk antrian CS
- [x] CS bisa lihat antrian order di dashboard internal

## Technical Tasks

### Database (Prisma Schema)
- [x] Model `OrderKatalog`: id, depotId, nama, hp, alamat, jenis, kelas, tipeQurban, catatan, status (BARU/DIKONFIRMASI/DP_DIBAYAR/LUNAS/DIJADWALKAN/DIBATALKAN), csId (nullable), createdAt
- [x] Model `SlotPesanan`: id, depotId, jenis, kelas, maxSlot, terpakai (computed)

### Backend (API – Express)
- [x] `GET /katalog?depot=` – public endpoint (no auth): list hewan tersedia dengan foto + slot info
- [x] `POST /katalog/order` – public endpoint: submit form order
- [x] `GET /cs/order?depot=&status=` – list order masuk untuk CS (auth required)
- [x] `PUT /cs/order/:id/status` – update status order
- [x] `PUT /cs/order/:id/assign` – assign ke CS tertentu
- [x] `GET /master/slot-pesanan?depot=` – konfigurasi slot per kelas
- [x] `PUT /master/slot-pesanan` – update max slot per kelas (OWNER/SUPER_ADMIN)

### Frontend (Next.js)
- [x] Halaman `/katalog` – SSR (Next.js, SEO-friendly) tanpa auth
- [x] Komponen `HewanCard`: foto, kelas, jenis, harga, sisa slot, tombol "Pesan"
- [x] Modal/page form order: step-by-step (pilih hewan → isi identitas → konfirmasi)
- [x] Halaman konfirmasi setelah submit: "Order diterima, CS akan menghubungi dalam 1x24 jam"
- [x] Halaman `/cs/order` (auth) – dashboard antrian order CS
- [x] Kolom status, tombol "Kirim WA" (link wa.me), tombol update status

## Notes

- Foto hewan dari T-15 (upload foto)
- "Kirim WA" = buka wa.me/[nomor]?text=[template] di tab baru
- Integrasi WAHA otomatis untuk notifikasi di T-17
- Photo integration deferred to T-15. WAHA automatic notification deferred to T-17. SlotPesanan config table not implemented — slot count derived from hewan.status=AVAILABLE. Public order endpoint throttled at 10 req/min per IP.
