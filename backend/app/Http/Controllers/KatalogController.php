<?php

namespace App\Http\Controllers;

use App\Models\OrderKatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KatalogController extends Controller
{
    public function catalog(Request $request): JsonResponse
    {
        $request->validate(['depot' => ['required', 'integer', 'exists:depots,id']]);

        $depotId = (int) $request->input('depot');
        $musim   = (int) date('Y');

        $items = DB::table('hewan as h')
            ->join('kelas_hewan as kj', 'kj.id', '=', 'h.kelas_jual_id')
            ->leftJoin('harga_kelas as hk', function ($join) {
                $join->on('hk.kelas_id', '=', 'h.kelas_jual_id')
                     ->on('hk.jenis', '=', 'h.jenis')
                     ->on('hk.musim', '=', 'h.musim')
                     ->on('hk.depot_id', '=', 'h.depot_id');
            })
            ->where('h.depot_id', $depotId)
            ->where('h.musim', $musim)
            ->where('h.status', 'AVAILABLE')
            ->groupBy('kj.id', 'kj.nama', 'h.jenis', 'hk.harga_jual')
            ->orderBy('kj.nama')
            ->orderBy('h.jenis')
            ->select(
                'kj.nama as kelas',
                'h.jenis',
                DB::raw('COALESCE(hk.harga_jual, 0) as harga_jual'),
                DB::raw('COUNT(h.id) as jumlah_tersedia'),
            )
            ->get()
            ->map(fn($r) => [
                'kelas'           => $r->kelas,
                'jenis'           => $r->jenis,
                'harga_jual'      => (int) $r->harga_jual,
                'jumlah_tersedia' => (int) $r->jumlah_tersedia,
            ]);

        // Fetch one foto per kelas/jenis group
        $fotoRows = DB::table('foto_hewan as fh')
            ->join('hewan as h', 'h.id', '=', 'fh.hewan_id')
            ->join('kelas_hewan as kj', 'kj.id', '=', 'h.kelas_jual_id')
            ->where('h.depot_id', $depotId)
            ->where('h.musim', $musim)
            ->where('h.status', 'AVAILABLE')
            ->orderBy('fh.id')
            ->select('kj.nama as kelas', 'h.jenis', 'fh.url')
            ->get()
            ->unique(fn($r) => "{$r->kelas}_{$r->jenis}")
            ->keyBy(fn($r) => "{$r->kelas}_{$r->jenis}");

        $appUrl        = config('app.url');
        $itemsWithFoto = $items->map(fn($item) => array_merge($item, [
            'foto_url' => isset($fotoRows["{$item['kelas']}_{$item['jenis']}"])
                ? "{$appUrl}/storage/" . $fotoRows["{$item['kelas']}_{$item['jenis']}"]->url
                : null,
        ]));

        return response()->json(['musim' => $musim, 'data' => $itemsWithFoto->values()->all()]);
    }

    public function order(Request $request): JsonResponse
    {
        $data = $request->validate([
            'depot_id'    => ['required', 'integer', 'exists:depots,id'],
            'nama'        => ['required', 'string', 'max:150'],
            'hp'          => ['required', 'string', 'max:20'],
            'alamat'      => ['nullable', 'string'],
            'jenis'       => ['required', 'in:SAPI,DOMBA'],
            'kelas'       => ['required', 'string', 'max:50'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'catatan'     => ['nullable', 'string'],
        ]);

        $order = OrderKatalog::create(array_merge($data, ['status' => 'BARU']));

        return response()->json(['order' => $order], 201);
    }
}
