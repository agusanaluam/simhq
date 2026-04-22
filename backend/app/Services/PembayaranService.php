<?php
// backend/app/Services/PembayaranService.php
namespace App\Services;

use App\Enums\StatusBayar;
use App\Models\Pembayaran;
use App\Models\Transaksi;

class PembayaranService
{
    public function syncStatusBayar(Transaksi $transaksi): void
    {
        $totalBayar = Pembayaran::where('transaksi_id', $transaksi->id)->sum('jumlah');
        $sisa       = $transaksi->total - $totalBayar;

        $status = match(true) {
            $sisa <= 0      => StatusBayar::LUNAS->value,
            $totalBayar > 0 => StatusBayar::DP->value,
            default         => StatusBayar::BELUM_BAYAR->value,
        };

        $transaksi->update(['status_bayar' => $status]);
    }

    public function sisaPelunasan(Transaksi $transaksi): int
    {
        $totalBayar = Pembayaran::where('transaksi_id', $transaksi->id)->sum('jumlah');
        return max(0, $transaksi->total - $totalBayar);
    }
}
