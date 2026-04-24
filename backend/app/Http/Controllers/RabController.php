<?php

namespace App\Http\Controllers;

use App\Enums\DivisiKas;
use App\Enums\UserRole;
use App\Models\KasHarian;
use App\Models\Rab;
use App\Models\RealisasiPengeluaran;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RabController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $rabByDivisi = Rab::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->withSum('realisasi', 'jumlah')
            ->get()
            ->keyBy('divisi');

        $divisiList = array_column(DivisiKas::cases(), 'value');

        $result = array_map(function (string $divisi) use ($rabByDivisi): array {
            $rab            = $rabByDivisi->get($divisi);
            $anggaran       = $rab ? $rab->jumlah_anggaran : 0;
            $totalRealisasi = $rab ? (int) ($rab->realisasi_sum_jumlah ?? 0) : 0;
            $selisih        = $anggaran - $totalRealisasi;
            $persen         = $anggaran > 0 ? round($totalRealisasi / $anggaran * 100, 1) : 0.0;

            return [
                'divisi'          => $divisi,
                'rab_id'          => $rab?->id,
                'jumlah_anggaran' => $anggaran,
                'total_realisasi' => $totalRealisasi,
                'selisih'         => $selisih,
                'persen_terpakai' => $persen,
            ];
        }, $divisiList);

        return response()->json(['musim' => $musim, 'divisi' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'divisi'          => ['required', Rule::in(array_column(DivisiKas::cases(), 'value'))],
            'musim'           => ['required', 'integer', 'min:2020', 'max:2099'],
            'jumlah_anggaran' => ['required', 'integer', 'min:0'],
        ]);

        $rab = Rab::updateOrCreate(
            ['depot_id' => $depotId, 'divisi' => $data['divisi'], 'musim' => $data['musim']],
            ['jumlah_anggaran' => $data['jumlah_anggaran']]
        );

        if ($rab->wasRecentlyCreated) {
            $rab->update(['created_by' => $user->id]);
        }

        $status = $rab->wasRecentlyCreated ? 201 : 200;

        return response()->json(['rab' => $rab], $status);
    }

    public function indexRealisasi(Request $request, Rab $rab): JsonResponse
    {
        $depotId = $request->user()->isSuperAdmin()
            ? ($request->depot_id ?? $request->user()->depot_id)
            : $request->user()->depot_id;

        abort_unless($rab->depot_id === (int) $depotId, 403);

        $items = $rab->realisasi()
            ->with('inputBy:id,name')
            ->orderBy('tgl_pengeluaran', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json(['data' => $items, 'rab' => $rab]);
    }

    public function storeRealisasi(Request $request, Rab $rab): JsonResponse
    {
        $depotId = $request->user()->isSuperAdmin()
            ? ($request->depot_id ?? $request->user()->depot_id)
            : $request->user()->depot_id;

        abort_unless($rab->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'keterangan'      => ['required', 'string', 'max:300'],
            'jumlah'          => ['required', 'integer', 'min:1'],
            'tgl_pengeluaran' => ['required', 'date'],
        ]);

        $user = $request->user();

        $realisasi = DB::transaction(function () use ($rab, $data, $user): RealisasiPengeluaran {
            $realisasi = RealisasiPengeluaran::create(array_merge($data, [
                'rab_id'   => $rab->id,
                'input_by' => $user->id,
            ]));

            KasHarian::create([
                'depot_id'      => $rab->depot_id,
                'tipe'          => 'KELUAR',
                'sumber'        => null,
                'divisi'        => $rab->divisi,
                'keterangan'    => "RAB {$rab->divisi}: {$data['keterangan']}",
                'jumlah'        => $data['jumlah'],
                'metode'        => 'CASH',
                'tgl_transaksi' => $data['tgl_pengeluaran'],
                'input_by'      => $user->id,
                'transaksi_id'  => null,
            ]);

            return $realisasi;
        });

        // Alert Kepala Depot if RAB >= 80%
        $totalRealisasi = $rab->realisasi()->sum('jumlah');
        if ($rab->jumlah_anggaran > 0) {
            $persen = $totalRealisasi / $rab->jumlah_anggaran * 100;
            if ($persen >= 80) {
                $sisa      = number_format($rab->jumlah_anggaran - $totalRealisasi, 0, ',', '.');
                $persenFmt = round($persen, 1);
                User::where('depot_id', $rab->depot_id)
                    ->where('role', UserRole::KEPALA_DEPOT)
                    ->whereNotNull('phone')
                    ->each(function ($kd) use ($rab, $sisa, $persenFmt): void {
                        WahaService::send(
                            $rab->depot_id,
                            $kd->phone,
                            "WARNING: RAB divisi {$rab->divisi} tersisa Rp{$sisa} (realisasi {$persenFmt}% dari anggaran).",
                            'rab_hampir_habis'
                        );
                    });
            }
        }

        return response()->json(['realisasi' => $realisasi->load('inputBy:id,name')], 201);
    }
}
