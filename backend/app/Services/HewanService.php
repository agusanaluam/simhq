<?php
namespace App\Services;

use App\Models\Hewan;
use Illuminate\Support\Facades\DB;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class HewanService
{
    public function generateNoHewan(int $depotId, int $musim, string $jenis = 'SAPI'): string
    {
        // SAPI: 600–999, DOMBA: 001–599
        $start = $jenis === 'SAPI' ? 600 : 1;
        $max   = $jenis === 'SAPI' ? 999 : 599;

        return DB::transaction(function () use ($depotId, $musim, $jenis, $start, $max) {
            $last = Hewan::where('depot_id', $depotId)
                ->where('musim', $musim)
                ->where('jenis', $jenis)
                ->orderByDesc('no_hewan')
                ->lockForUpdate()
                ->value('no_hewan');

            $next = $last ? ((int) $last) + 1 : $start;

            if ($next > $max) {
                throw new \RuntimeException("Nomor hewan {$jenis} depot ini sudah mencapai maksimum {$max}.");
            }

            return str_pad($next, 3, '0', STR_PAD_LEFT);
        });
    }

    public function generateQrSvg(string $qrString): string
    {
        return QrCode::format('svg')->size(150)->errorCorrection('M')->generate($qrString);
    }

    public function generateQrPngBase64(string $qrString): string
    {
        $png = QrCode::format('png')->size(200)->errorCorrection('M')->generate($qrString);
        return base64_encode($png);
    }
}
