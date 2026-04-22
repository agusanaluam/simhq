<?php
namespace App\Services;

use App\Models\Transaksi;
use Illuminate\Support\Facades\DB;

class TransaksiService
{
    /**
     * Generate no_faktur: {depot_id}-{musim}-{seq:04d}
     * Example: 1-2026-0001
     * Pessimistic lock prevents race condition on concurrent creation.
     */
    public function generateNoFaktur(int $depotId, int $musim): string
    {
        return DB::transaction(function () use ($depotId, $musim) {
            $lastFaktur = Transaksi::where('depot_id', $depotId)
                ->where('musim', $musim)
                ->lockForUpdate()
                ->orderByDesc('id')
                ->value('no_faktur');

            $lastSeq = $lastFaktur
                ? (int) substr($lastFaktur, strrpos($lastFaktur, '-') + 1)
                : 0;

            $seq = $lastSeq + 1;

            return "{$depotId}-{$musim}-" . str_pad($seq, 4, '0', STR_PAD_LEFT);
        });
    }
}
