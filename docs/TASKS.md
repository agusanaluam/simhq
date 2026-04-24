# Task Board – SIM Penjualan Hewan Qurban

**Versi PRD:** v1.2 | **Update Terakhir:** 2026-04-21

## Legend Status

| Simbol | Status |
|--------|--------|
| `⬜ TODO` | Belum dimulai |
| `🔄 IN PROGRESS` | Sedang dikerjakan |
| `✅ DONE` | Selesai |
| `⏸ BLOCKED` | Terhambat dependensi |

---

## Phase 1 – Fondasi (H-90 s/d H-60, ~6 minggu)

> Target: infrastruktur, autentikasi, master data, pengadaan, POS dasar, absensi

| ID | Task | Status | Sprint | Dependencies |
|----|------|--------|--------|--------------|
| [T-01](tasks/T-01-auth-role-management.md) | Autentikasi & Manajemen Role/User | `✅ DONE` | 1 | – |
| [T-02](tasks/T-02-master-data.md) | Master Data (Harga, Kelas, Karyawan) | `✅ DONE` | 1 | T-01 |
| [T-03](tasks/T-03-pengadaan-hewan.md) | Modul Pengadaan Hewan | `✅ DONE` | 2 | T-01, T-02 |
| [T-04](tasks/T-04-ploting-kandang.md) | Ploting Kandang Visual | `✅ DONE` | 2 | T-03 |
| [T-05](tasks/T-05-pos-penjualan.md) | POS Penjualan + Pre-order | `✅ DONE` | 2 | T-01, T-02, T-03 |
| [T-06](tasks/T-06-ploting-slot-sapi.md) | Ploting Slot Pembeli per Sapi (1 sapi = 1–7 pembeli) | `✅ DONE` | 2 | T-05 |
| [T-07](tasks/T-07-manajemen-pembayaran.md) | Manajemen Pembayaran (DP, Lunas) | `✅ DONE` | 1 | T-05, T-06 |
| [T-08](tasks/T-08-absensi-digital.md) | Absensi Digital (Check-in/Check-out) | `✅ DONE` | 1 | T-01, T-02 |

**Progress Phase 1:** 8 / 8 selesai ✅

---

## Phase 2 – Operasional (H-60 s/d H-30, ~4 minggu)

> Target: dashboard, keuangan, katalog web, CRM, WAHA, upah

| ID | Task | Status | Sprint | Dependencies |
|----|------|--------|--------|--------------|
| [T-09](tasks/T-09-dashboard-depot.md) | Dashboard Depot (Stok, Penjualan) | `✅ DONE` | 1 | T-03, T-05, T-07 |
| [T-10](tasks/T-10-keuangan-biop.md) | Laporan Keuangan – BIOP & Cash Flow | `✅ DONE` | 2 | T-07 |
| [T-11](tasks/T-11-setoran-gum.md) | Manajemen Setoran GUM (Konsinyasi Supplier) | `✅ DONE` | 1 | T-03, T-07 |
| [T-12](tasks/T-12-rab-realisasi.md) | RAB per Divisi & Realisasi | `✅ DONE` | 1 | T-10 |
| [T-13](tasks/T-13-income-statement.md) | Income Statement Otomatis | `✅ DONE` | 1 | T-07, T-10, T-12 |
| [T-14](tasks/T-14-katalog-web.md) | Katalog Web Publik & Form Order Online | `✅ DONE` | 2 | T-03, T-05 |
| [T-15](tasks/T-15-upload-foto-hewan.md) | Upload Foto Hewan untuk Katalog | `✅ DONE` | 1 | T-03, T-14 |
| [T-16](tasks/T-16-crm-customer.md) | CRM – Database Customer & Order | `✅ DONE` | 2 | T-05, T-14 |
| [T-17](tasks/T-17-waha-notifikasi.md) | Integrasi WAHA API (Notifikasi WhatsApp) | `✅ DONE` | 1 | T-05, T-07, T-12, T-14 |
| [T-18](tasks/T-18-upah-harian.md) | Kalkulasi Upah Harian Otomatis | `✅ DONE` | 1 | T-08, T-02 |

**Progress Phase 2:** 10 / 10 selesai ✅

---

## Phase 3 – Lengkap (H-30 s/d H, operasi live)

> Target: pengiriman, kesehatan hewan, faktur, forecast, broadcast WA

| ID | Task | Status | Sprint | Dependencies |
|----|------|--------|--------|--------------|
| [T-19](tasks/T-19-manajemen-pengiriman.md) | Manajemen Pengiriman & Status Tracking | `⬜ TODO` | 2 | T-05, T-06, T-17 |
| [T-20](tasks/T-20-kesehatan-hewan.md) | Kendali Kesehatan & Riwayat Hewan | `⬜ TODO` | 1 | T-03, T-04 |
| [T-21](tasks/T-21-faktur-pdf.md) | Cetak / Unduh Faktur PDF | `⬜ TODO` | 1 | T-05, T-06, T-07 |
| [T-22](tasks/T-22-forecast-penjualan.md) | Forecast Penjualan (Grafik Proyeksi) | `⬜ TODO` | 1 | T-05, T-09 |
| [T-23](tasks/T-23-broadcast-wa.md) | Broadcast WA ke Segmen Customer | `⬜ TODO` | 1 | T-16, T-17 |
| [T-24](tasks/T-24-laporan-multidepot.md) | Laporan Multi-Depot (Admin Pusat) | `⬜ TODO` | 1 | T-09, T-13 |
| [T-25](tasks/T-25-kasbon-karyawan.md) | Modul Kasbon Karyawan | `⬜ TODO` | 1 | T-01, T-02, T-18 |

**Progress Phase 3:** 0 / 7 selesai ⬜

---

## Ringkasan

| Phase | Total | Selesai | Sisa |
|-------|-------|---------|------|
| Phase 1 – Fondasi | 8 | 8 | 0 |
| Phase 2 – Operasional | 10 | 10 | 0 |
| Phase 3 – Lengkap | 7 | 0 | 7 |
| **TOTAL** | **25** | **18** | **7** |

---

## Keputusan Open Items PRD (✅ Semua Ditetapkan – 2026-04-21)

| ID | Topik | Keputusan |
|----|-------|-----------|
| OI-01 | Retensi data antar musim | **Arsip per musim** — musim lama read-only, tetap bisa diakses |
| OI-02 | Kepala depot lihat depot lain? | **Isolasi penuh** — Kepala Depot hanya akses depot sendiri |
| OI-03 | Format nomor hewan | **3 digit numerik** (001, 002, ...) + **barcode/QR code** per hewan, cetak label untuk dikalungkan → tambah fitur ke T-03 |
| OI-04 | Kasbon karyawan | **Modul kasbon tersendiri** (pinjam → cicil → potong gaji) → task baru T-25 |
| OI-05 | Transfer stok antar depot | **Tidak ada** — perpindahan dicatat sebagai penjualan di depot asal + pengadaan baru di depot tujuan |
| OI-06 | Komponen upah | **Upah dasar saja** — tarif harian × hari hadir |
| OI-07 | Yayasan tujuan THQ | **Referensi terstruktur** — master data yayasan, pilih dari dropdown per transaksi THQ → tambah master data ke T-02 |

---

## Cara Update Status

Edit file task yang sesuai, ubah baris `**Status:**`:
- `**Status:** \`TODO\`` → `**Status:** \`IN PROGRESS\``
- `**Status:** \`IN PROGRESS\`` → `**Status:** \`DONE\``

Lalu update tabel di file ini dengan simbol yang sesuai.
