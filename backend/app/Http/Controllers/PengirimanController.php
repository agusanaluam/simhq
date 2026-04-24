<?php

namespace App\Http\Controllers;

use App\Models\Pengiriman;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PengirimanController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = Pengiriman::where('depot_id', $depotId)
            ->with('petugas:id,name')
            ->orderBy('tgl_kirim')
            ->orderBy('sesi')
            ->orderBy('id');

        if ($request->tgl)    { $query->whereDate('tgl_kirim', $request->tgl); }
        if ($request->sesi)   { $query->where('sesi', $request->sesi); }
        if ($request->status) { $query->where('status', $request->status); }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'nama_penerima' => ['required', 'string', 'max:150'],
            'alamat'        => ['required', 'string'],
            'kelurahan'     => ['nullable', 'string', 'max:100'],
            'kecamatan'     => ['nullable', 'string', 'max:100'],
            'kota'          => ['nullable', 'string', 'max:100'],
            'patokan'       => ['nullable', 'string'],
            'no_hp1'        => ['required', 'string', 'max:20'],
            'no_hp2'        => ['nullable', 'string', 'max:20'],
            'tgl_kirim'     => ['required', 'date'],
            'sesi'          => ['required', 'in:PAGI,SIANG,SORE,MALAM'],
            'transaksi_id'  => ['nullable', 'exists:transaksi,id'],
            'petugas_id'    => ['nullable', 'exists:users,id'],
            'catatan'       => ['nullable', 'string'],
        ]);

        $pengiriman = Pengiriman::create(array_merge($data, [
            'depot_id' => $depotId,
            'status'   => 'DIJADWALKAN',
        ]));

        WahaService::send(
            $depotId,
            $pengiriman->no_hp1,
            "Hewan qurban Anda akan dikirim pada {$pengiriman->tgl_kirim->format('d/m/Y')} sesi {$pengiriman->sesi} ke {$pengiriman->alamat}.",
            'pengiriman_dijadwalkan'
        );

        return response()->json(['pengiriman' => $pengiriman->load('petugas:id,name')], 201);
    }

    public function updateStatus(Request $request, Pengiriman $pengiriman): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $pengiriman->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'status' => ['required', 'in:DIJADWALKAN,DIAMBIL,DALAM_PERJALANAN,TERKIRIM'],
        ]);

        $updates = ['status' => $data['status']];

        if ($data['status'] === 'DALAM_PERJALANAN' && !$pengiriman->tgl_berangkat) {
            $updates['tgl_berangkat'] = now();

            WahaService::send(
                $pengiriman->depot_id,
                $pengiriman->no_hp1,
                "Hewan qurban Anda sedang dalam perjalanan ke {$pengiriman->alamat}.",
                'pengiriman_berangkat'
            );
        }

        if ($data['status'] === 'TERKIRIM' && !$pengiriman->tgl_sampai) {
            $updates['tgl_sampai'] = now();
        }

        $pengiriman->update($updates);

        return response()->json(['pengiriman' => $pengiriman->fresh()]);
    }

    public function rekap(Request $request): JsonResponse
    {
        $request->validate(['tgl' => ['required', 'date']]);

        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $rows = Pengiriman::where('depot_id', $depotId)
            ->whereDate('tgl_kirim', $request->tgl)
            ->select('sesi', DB::raw('COUNT(*) as total'),
                DB::raw("SUM(CASE WHEN status = 'TERKIRIM' THEN 1 ELSE 0 END) as terkirim"))
            ->groupBy('sesi')
            ->orderBy('sesi')
            ->get()
            ->map(fn($r) => [
                'sesi'     => $r->sesi,
                'total'    => (int) $r->total,
                'terkirim' => (int) $r->terkirim,
                'belum'    => (int) $r->total - (int) $r->terkirim,
            ]);

        return response()->json(['data' => $rows, 'tgl' => $request->tgl]);
    }
}
