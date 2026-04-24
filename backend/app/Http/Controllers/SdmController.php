<?php

namespace App\Http\Controllers;

use App\Models\Karyawan;
use App\Models\TarifUpah;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SdmController extends Controller
{

    public function setTarif(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'karyawan_id'  => ['required', 'integer', 'exists:karyawan,id'],
            'tarif_harian' => ['required', 'integer', 'min:1'],
            'berlaku_dari' => ['required', 'date'],
        ]);

        abort_unless(
            Karyawan::where('id', $data['karyawan_id'])->where('depot_id', $depotId)->exists(),
            403
        );

        $tarif = TarifUpah::create(array_merge($data, ['dibuat_oleh' => $user->id]));

        return response()->json(['tarif' => $tarif->load('karyawan:id,nama,divisi')], 201);
    }

    public function listTarif(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $karyawanIds = Karyawan::where('depot_id', $depotId)->pluck('id');

        // Latest tarif per karyawan (SQLite-safe: group in PHP)
        $tarifs = TarifUpah::whereIn('karyawan_id', $karyawanIds)
            ->with('karyawan:id,nama,divisi')
            ->get()
            ->groupBy('karyawan_id')
            ->map(fn($group) => $group->sortByDesc('berlaku_dari')->first())
            ->values();

        return response()->json(['data' => $tarifs]);
    }

    public function upah(Request $request): JsonResponse
    {
        $request->validate([
            'tgl_dari'   => ['required', 'date'],
            'tgl_sampai' => ['required', 'date'],
        ]);

        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        return response()->json(['data' => $this->buildUpah($depotId, $request->tgl_dari, $request->tgl_sampai)]);
    }

    public function export(Request $request): StreamedResponse
    {
        $request->validate([
            'tgl_dari'   => ['required', 'date'],
            'tgl_sampai' => ['required', 'date'],
        ]);

        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $rows     = $this->buildUpah($depotId, $request->tgl_dari, $request->tgl_sampai);
        $filename = "upah-{$request->tgl_dari}-{$request->tgl_sampai}.csv";

        return response()->streamDownload(function () use ($rows) {
            $h = fopen('php://output', 'w');
            fputcsv($h, ['Nama', 'Divisi', 'Hari Hadir', 'Tarif Harian', 'Total Upah']);
            foreach ($rows as $row) {
                fputcsv($h, [
                    $row['nama'],
                    $row['divisi'],
                    $row['hari_hadir'],
                    $row['tarif_harian'],
                    $row['total_upah'],
                ]);
            }
            fclose($h);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function buildUpah(int $depotId, string $tglDari, string $tglSampai): array
    {
        $karyawanList = Karyawan::where('depot_id', $depotId)->get();

        // Latest tarif per karyawan where berlaku_dari <= tgl_sampai (SQLite-safe)
        $tarifs = collect();
        foreach ($karyawanList as $k) {
            $t = TarifUpah::where('karyawan_id', $k->id)
                ->where('berlaku_dari', '<=', $tglSampai)
                ->orderBy('berlaku_dari', 'desc')
                ->first();
            if ($t) {
                $tarifs->put($k->id, $t->tarif_harian);
            }
        }

        // Count hari hadir (HADIR + TERLAMBAT) per karyawan in date range
        $hariHadir = DB::table('absensi')
            ->whereIn('karyawan_id', $karyawanList->pluck('id'))
            ->whereBetween('tgl', [$tglDari, $tglSampai])
            ->whereIn('status', ['HADIR', 'TERLAMBAT'])
            ->select('karyawan_id', DB::raw('COUNT(*) as hari'))
            ->groupBy('karyawan_id')
            ->pluck('hari', 'karyawan_id');

        return $karyawanList->map(function (Karyawan $k) use ($tarifs, $hariHadir): array {
            $tarif = (int) $tarifs->get($k->id, 0);
            $hari  = (int) $hariHadir->get($k->id, 0);
            return [
                'karyawan_id'  => $k->id,
                'nama'         => $k->nama,
                'divisi'       => $k->divisi,
                'hari_hadir'   => $hari,
                'tarif_harian' => $tarif,
                'total_upah'   => $hari * $tarif,
            ];
        })->values()->all();
    }
}
