# T-23: Broadcast WA ke Segmen Customer

**Status:** `TODO`
**Phase:** 3 (Lengkap) | **Priority:** Could Have | **Sprint:** 1 Sprint
**Dependencies:** T-16, T-17

---

## Deskripsi

Kirim pesan WA ke segmen customer tertentu: semua customer tahun lalu, belum lunas, sudah terjadwal kirim, dll. Untuk retargeting dan follow-up massal.

## Acceptance Criteria

- [ ] Pilih segmen penerima: semua customer / customer tahun lalu / belum lunas / sudah dijadwalkan
- [ ] Preview list penerima sebelum kirim
- [ ] Template pesan dengan variabel (nama customer, dll)
- [ ] Kirim via WAHA dengan rate limit (30 msg/menit)
- [ ] Log hasil broadcast (berhasil/gagal per nomor)

## Technical Tasks

### Backend (API – Express)
- [ ] `POST /crm/broadcast` – create broadcast job (simpan ke queue T-17)
- [ ] `GET /crm/broadcast/:id/log` – log hasil broadcast per penerima
- [ ] Segmentasi query: filter customer by kriteria (musim lalu, belum lunas, dll)

### Frontend (Next.js)
- [ ] Halaman `/cs/broadcast` – form broadcast
- [ ] Step 1: pilih segmen → preview jumlah penerima
- [ ] Step 2: tulis/pilih template pesan
- [ ] Step 3: konfirmasi kirim + estimasi waktu
- [ ] Halaman log broadcast

## Notes

- Rate limit 30 msg/menit dari T-17 berlaku di sini
- Could Have – tidak blocking operasi inti
