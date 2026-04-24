<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Hewan;
use App\Models\KematianHewan;
use App\Models\RiwayatHewan;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KesehatanController extends Controller
{

    public function indexRiwayat(Hewan $hewan): JsonResponse
    {
        return response()->json([
            'data' => $hewan->riwayatKesehatan()
                ->with('petugas:id,name')
                ->orderBy('tgl', 'desc')
                ->orderBy('id', 'desc')
                ->get(),
        ]);
    }

    public function storeRiwayat(Request $request, Hewan $hewan): JsonResponse
    {
        $data = $request->validate([
            'tgl'            => ['required', 'date'],
            'kondisi'        => ['required', 'in:SEHAT,SAKIT,KRITIS,MATI'],
            'bobot'          => ['nullable', 'numeric', 'min:1', 'max:9999'],
            'catatan'        => ['nullable', 'string'],
            'tindakan_medis' => ['nullable', 'string'],
            'obat'           => ['nullable', 'string', 'max:200'],
        ]);

        $riwayat = RiwayatHewan::create(array_merge($data, [
            'hewan_id'   => $hewan->id,
            'petugas_id' => $request->user()?->id,
        ]));

        if (in_array($data['kondisi'], ['KRITIS', 'MATI'])) {
            $this->alertKepala($hewan, $data['kondisi']);
        }

        return response()->json(['riwayat' => $riwayat->load('petugas:id,name')], 201);
    }

    public function storeKematian(Request $request, Hewan $hewan): JsonResponse
    {
        $data = $request->validate([
            'tgl'           => ['required', 'date'],
            'penyebab'      => ['required', 'string', 'max:300'],
            'status_daging' => ['nullable', 'in:TERPOTONG,TIDAK_TERPOTONG'],
        ]);

        $kematian = DB::transaction(function () use ($hewan, $data, $request): KematianHewan {
            $kematian = KematianHewan::create(array_merge($data, [
                'hewan_id'   => $hewan->id,
                'petugas_id' => $request->user()?->id,
            ]));

            $hewan->update(['status' => 'MATI']);

            return $kematian;
        });

        $this->alertKepala($hewan, 'MATI');

        return response()->json(['kematian' => $kematian->load('petugas:id,name')], 201);
    }

    public function mortalitas(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $rows = Hewan::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->select('jenis',
                DB::raw('COUNT(*) as total_hewan'),
                DB::raw("SUM(CASE WHEN status = 'MATI' THEN 1 ELSE 0 END) as total_mati")
            )
            ->groupBy('jenis')
            ->orderBy('jenis')
            ->get()
            ->map(fn($r) => [
                'jenis'           => $r->jenis,
                'total_hewan'     => (int) $r->total_hewan,
                'total_mati'      => (int) $r->total_mati,
                'rasio_mortalitas' => (int) $r->total_hewan > 0
                    ? round((int) $r->total_mati / (int) $r->total_hewan * 100, 1)
                    : 0.0,
            ]);

        return response()->json(['data' => $rows, 'musim' => $musim]);
    }

    private function alertKepala(Hewan $hewan, string $kondisi): void
    {
        $label = $kondisi === 'MATI' ? 'dilaporkan MATI' : 'dalam kondisi KRITIS';
        $trigger = 'hewan_' . strtolower($kondisi);

        User::where('depot_id', $hewan->depot_id)
            ->where('role', UserRole::KEPALA_DEPOT)
            ->whereNotNull('phone')
            ->each(function (User $kd) use ($hewan, $label, $trigger): void {
                WahaService::send(
                    $hewan->depot_id,
                    $kd->phone,
                    "ALERT: Hewan {$hewan->no_hewan} {$hewan->jenis} {$label}.",
                    $trigger
                );
            });
    }
}
