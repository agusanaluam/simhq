<?php

namespace App\Services;

use App\Jobs\SendWhatsAppMessage;
use App\Models\WaLog;

class WahaService
{

    public static function send(
        ?int   $depotId,
        string $penerima,
        string $pesan,
        string $triggeredBy
    ): void {
        if (empty(config('services.waha.url'))) {
            return;
        }

        $penerima = ltrim($penerima, '0+');
        if (!str_starts_with($penerima, '62')) {
            $penerima = '62' . $penerima;
        }

        $log = WaLog::create([
            'depot_id'     => $depotId,
            'penerima'     => $penerima,
            'pesan'        => $pesan,
            'status'       => 'QUEUED',
            'triggered_by' => $triggeredBy,
        ]);

        SendWhatsAppMessage::dispatch($log->id);
    }
}
