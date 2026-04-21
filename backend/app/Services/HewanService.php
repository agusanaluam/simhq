<?php
namespace App\Services;

use App\Models\Hewan;
use Illuminate\Support\Facades\DB;
use SimpleSoftwareIO\QrCode\Facades\QrCode;

class HewanService
{
    public function generateNoHewan(int $depotId, int $musim): string
    {
        return DB::transaction(function () use ($depotId, $musim) {
            $last = Hewan::where('depot_id', $depotId)
                ->where('musim', $musim)
                ->lockForUpdate()
                ->max('no_hewan');

            $next = $last ? ((int) $last) + 1 : 1;

            if ($next > 999) {
                throw new \RuntimeException('Nomor hewan depot ini sudah mencapai maksimum 999.');
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
