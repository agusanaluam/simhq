<?php

namespace App\Http\Controllers;

use App\Models\TargetPenjualan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ForecastController extends Controller
{

    public function setTarget(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'jenis'       => ['required', 'in:SAPI,DOMBA'],
            'tgl'         => ['required', 'date'],
            'musim'       => ['required', 'integer', 'min:2020', 'max:2099'],
            'target_unit' => ['required', 'integer', 'min:0'],
        ]);

        $target = TargetPenjualan::firstOrNew([
            'depot_id' => $depotId,
            'musim'    => $data['musim'],
            'jenis'    => $data['jenis'],
            'tgl'      => $data['tgl'],
        ]);

        $isNew = ! $target->exists;
        $target->fill(['target_unit' => $data['target_unit'], 'created_by' => $user->id]);
        $target->save();

        return response()->json(['target' => $target], $isNew ? 201 : 200);
    }

    public function forecast(Request $request): JsonResponse
    {
        $request->validate([
            'tgl_dari'   => ['required', 'date'],
            'tgl_sampai' => ['required', 'date'],
        ]);

        $user      = $request->user();
        $depotId   = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim     = (int) $request->input('musim', date('Y'));
        $tglDari   = $request->tgl_dari;
        $tglSampai = $request->tgl_sampai;

        // Targets
        $targets = TargetPenjualan::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->whereBetween('tgl', [$tglDari, $tglSampai])
            ->get()
            ->groupBy('jenis')
            ->map(fn($group) => $group->keyBy(fn($t) => $t->tgl->toDateString()));

        // Realisasi from transaksi
        $realisasi = DB::table('transaksi')
            ->where('depot_id', $depotId)
            ->where('musim', $musim)
            ->whereNotIn('status_transaksi', ['DIBATALKAN'])
            ->whereDate('created_at', '>=', $tglDari)
            ->whereDate('created_at', '<=', $tglSampai)
            ->select('jenis', DB::raw('DATE(created_at) as tgl'), DB::raw('COUNT(*) as jumlah'))
            ->groupBy('jenis', DB::raw('DATE(created_at)'))
            ->get()
            ->groupBy('jenis')
            ->map(fn($group) => $group->keyBy('tgl'));

        // Build date range
        $dates = [];
        $d     = new \DateTime($tglDari);
        $end   = new \DateTime($tglSampai);
        while ($d <= $end) {
            $dates[] = $d->format('Y-m-d');
            $d->modify('+1 day');
        }

        $buildSeries = function (string $jenis) use ($dates, $targets, $realisasi): array {
            $tByDate = $targets->has($jenis) ? $targets->get($jenis) : collect();
            $rByDate = $realisasi->has($jenis) ? $realisasi->get($jenis) : collect();

            return array_map(fn(string $tgl) => [
                'tgl'       => $tgl,
                'target'    => $tByDate->has($tgl) ? (int) $tByDate->get($tgl)->target_unit : 0,
                'realisasi' => $rByDate->has($tgl) ? (int) $rByDate->get($tgl)->jumlah : 0,
            ], $dates);
        };

        return response()->json([
            'musim' => $musim,
            'sapi'  => $buildSeries('SAPI'),
            'domba' => $buildSeries('DOMBA'),
        ]);
    }
}
