# T-17: Integrasi WAHA API (Notifikasi WhatsApp)

**Status:** `TODO`
**Phase:** 2 (Operasional) | **Priority:** Should Have | **Sprint:** 1 Sprint
**Dependencies:** T-05, T-07, T-12, T-14

---

## Deskripsi

Integrasi WAHA (WhatsApp HTTP API self-hosted) untuk semua notifikasi outbound ke customer dan notifikasi internal ke tim. Queue system untuk rate limiting.

## Acceptance Criteria

- [ ] Kirim WA otomatis ke customer saat: order dikonfirmasi, DP diterima, jadwal kirim ditetapkan, hewan berangkat, hewan tiba
- [ ] Notifikasi internal ke CS saat ada order baru dari katalog
- [ ] Alert ke Kepala Depot: hewan mati/kritis, RAB divisi hampir habis
- [ ] Rate limit: maksimal 30 pesan/menit
- [ ] Log semua pesan terkirim beserta status (delivered/read)
- [ ] Fallback graceful jika WAHA tidak bisa dijangkau (tidak error crash)

## Trigger Matrix

| Trigger | Penerima | Template |
|---------|----------|---------|
| Order katalog masuk | CS | "Ada order baru: [nama] – [kelas] [jenis]. Segera follow-up." |
| Order dikonfirmasi | Customer | "Konfirmasi order: [no. faktur], [jenis] kelas [kelas]. Total: Rp[nominal]. DP min Rp[dp]." |
| DP diterima | Customer | "DP Rp[nominal] untuk faktur [no. faktur] diterima. Sisa: Rp[sisa]." |
| Jadwal kirim ditetapkan | Customer & Penerima | "Hewan qurban Anda akan dikirim [tgl] sesi [pagi/sore] ke [alamat]. Kontak kurir: [nama]." |
| Hewan berangkat | Customer | "Hewan qurban Anda sedang dalam perjalanan ke [alamat]. Estimasi tiba: [jam]." |
| Pengiriman selesai | Customer | "Alhamdulillah, hewan qurban telah sampai. Terima kasih." |
| Hewan mati/kritis | Kepala Depot & Admin | "ALERT: Hewan [no. hewan] [jenis] kelas [kelas] dilaporkan [kondisi] oleh [petugas]." |
| RAB hampir habis | Kepala Depot | "WARNING: RAB divisi [nama] tersisa Rp[sisa] (realisasi [%] dari anggaran)." |

## Technical Tasks

### Database (Prisma Schema)
- [ ] Model `WaLog`: id, depotId, penerima (nomor HP), template, pesanTerkirim, status (QUEUED/SENT/FAILED), triggeredBy, createdAt

### Backend (API – Express)
- [ ] Service `waha.service.ts`: wrapper WAHA REST API (`POST /api/sendText`)
- [ ] Queue: gunakan `bull` + Redis untuk queue pesan WA
- [ ] Worker: proses queue dengan rate limit 30 msg/min
- [ ] `GET /admin/wa-log?depot=` – log pesan WA
- [ ] Hook di setiap trigger point:
  - `transaksi.service.ts` → emit event saat status berubah
  - `pembayaran.service.ts` → emit event saat DP/LUNAS
  - `pengiriman.service.ts` → emit event saat status pengiriman berubah
  - `riwayatHewan.service.ts` → emit event saat kondisi kritis
  - `rab.service.ts` → emit event saat realisasi >80%

### Frontend (Next.js)
- [ ] Halaman `/admin/wa-config` – konfigurasi nomor WA per depot + test kirim
- [ ] Halaman `/admin/wa-log` – log semua pesan WA dengan status

### Docker
- [ ] WAHA container di `docker-compose.yml`
- [ ] Environment var: `WAHA_API_URL`, `WAHA_SESSION_NAME`

## Notes

- WAHA di-deploy satu container per deployment (bisa multi-depot jika pakai session berbeda)
- Jika WAHA down: log FAILED, jangan crash aplikasi utama
- Template bisa dikonfigurasi admin (T-16 CRM section)
