<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\KasHarian;
use App\Models\Rab;
use App\Models\RealisasiPengeluaran;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RabController extends Controller
{
    public function summary(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $rabs = Rab::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->with('kategori:id,nama')
            ->withSum('realisasi', 'jumlah')
            ->get();

        // Kas KELUAR with rab_id (from BIOP) — counted separately to avoid double-count
        $rabIds = $rabs->pluck('id');
        $kasHarianSums = KasHarian::whereIn('rab_id', $rabIds)
            ->where('tipe', 'KELUAR')
            ->groupBy('rab_id')
            ->selectRaw('rab_id, SUM(jumlah) as total')
            ->pluck('total', 'rab_id');

        $result = $rabs->map(function (Rab $rab) use ($kasHarianSums): array {
            $anggaran       = $rab->jumlah_anggaran;
            $fromRealisasi  = (int) ($rab->realisasi_sum_jumlah ?? 0);
            $fromKasHarian  = (int) ($kasHarianSums->get($rab->id, 0));
            $totalRealisasi = $fromRealisasi + $fromKasHarian;
            $selisih        = $anggaran - $totalRealisasi;
            $persen         = $anggaran > 0 ? round($totalRealisasi / $anggaran * 100, 1) : 0.0;

            return [
                'rab_id'          => $rab->id,
                'kategori_id'     => $rab->kategori_id,
                'kategori'        => $rab->kategori?->nama ?? '—',
                'jumlah_anggaran' => $anggaran,
                'total_realisasi' => $totalRealisasi,
                'selisih'         => $selisih,
                'persen_terpakai' => $persen,
            ];
        })->values();

        return response()->json(['musim' => $musim, 'data' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'kategori_id'     => ['required', 'exists:rab_kategori,id'],
            'musim'           => ['required', 'integer', 'min:2020', 'max:2099'],
            'jumlah_anggaran' => ['required', 'integer', 'min:0'],
        ]);

        $rab = Rab::updateOrCreate(
            ['depot_id' => $depotId, 'kategori_id' => $data['kategori_id'], 'musim' => $data['musim']],
            ['jumlah_anggaran' => $data['jumlah_anggaran']]
        );

        if ($rab->wasRecentlyCreated) {
            $rab->update(['created_by' => $user->id]);
        }

        $status = $rab->wasRecentlyCreated ? 201 : 200;

        return response()->json(['rab' => $rab->load('kategori:id,nama')], $status);
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

        return response()->json(['data' => $items, 'rab' => $rab->load('kategori:id,nama')]);
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

        $user         = $request->user();
        $kategoriNama = $rab->kategori?->nama ?? 'RAB';

        $realisasi = DB::transaction(function () use ($rab, $data, $user, $kategoriNama): RealisasiPengeluaran {
            $realisasi = RealisasiPengeluaran::create(array_merge($data, [
                'rab_id'   => $rab->id,
                'input_by' => $user->id,
            ]));

            // KasHarian WITHOUT rab_id — counted via realisasi_pengeluaran in summary, not double-counted
            KasHarian::create([
                'depot_id'      => $rab->depot_id,
                'tipe'          => 'KELUAR',
                'sumber'        => null,
                'divisi'        => $kategoriNama,
                'keterangan'    => "RAB {$kategoriNama}: {$data['keterangan']}",
                'jumlah'        => $data['jumlah'],
                'metode'        => 'CASH',
                'tgl_transaksi' => $data['tgl_pengeluaran'],
                'input_by'      => $user->id,
                'transaksi_id'  => null,
                'rab_id'        => null,
            ]);

            return $realisasi;
        });

        // Alert Kepala Depot if RAB >= 80%
        $fromRealisasi  = $rab->realisasi()->sum('jumlah');
        $fromKasHarian  = KasHarian::where('rab_id', $rab->id)->where('tipe', 'KELUAR')->sum('jumlah');
        $totalRealisasi = $fromRealisasi + $fromKasHarian;

        if ($rab->jumlah_anggaran > 0) {
            $persen = $totalRealisasi / $rab->jumlah_anggaran * 100;
            if ($persen >= 80) {
                $sisa      = number_format($rab->jumlah_anggaran - $totalRealisasi, 0, ',', '.');
                $persenFmt = round($persen, 1);
                User::where('depot_id', $rab->depot_id)
                    ->where('role', UserRole::KEPALA_DEPOT)
                    ->whereNotNull('phone')
                    ->each(function ($kd) use ($rab, $kategoriNama, $sisa, $persenFmt): void {
                        WahaService::send(
                            $rab->depot_id,
                            $kd->phone,
                            "WARNING: RAB {$kategoriNama} tersisa Rp{$sisa} (realisasi {$persenFmt}% dari anggaran).",
                            'rab_hampir_habis'
                        );
                    });
            }
        }

        return response()->json(['realisasi' => $realisasi->load('inputBy:id,name')], 201);
    }
}
