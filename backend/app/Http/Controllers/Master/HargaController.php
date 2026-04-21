<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreHargaRequest;
use App\Models\HargaKelas;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HargaController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = HargaKelas::with('kelas:id,kode,nama,urutan')
            ->join('kelas_hewan', 'harga_kelas.kelas_id', '=', 'kelas_hewan.id')
            ->when($request->depot, fn($q) => $q->where('harga_kelas.depot_id', $request->depot))
            ->when($request->musim, fn($q) => $q->where('harga_kelas.musim', $request->musim))
            ->orderBy('harga_kelas.jenis')
            ->orderBy('kelas_hewan.urutan')
            ->select('harga_kelas.*')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function store(StoreHargaRequest $request): JsonResponse
    {
        $harga = HargaKelas::updateOrCreate(
            [
                'depot_id' => $request->depot_id,
                'kelas_id' => $request->kelas_id,
                'jenis'    => $request->jenis,
                'musim'    => $request->musim,
            ],
            [
                'harga_beli' => $request->harga_beli,
                'harga_jual' => $request->harga_jual,
                'fee_sales'  => $request->fee_sales ?? 0,
            ]
        );

        return response()->json(['harga' => $harga->load('kelas')], 201);
    }

    public function update(StoreHargaRequest $request, HargaKelas $harga): JsonResponse
    {
        $harga->update($request->only(['harga_beli', 'harga_jual', 'fee_sales']));

        return response()->json(['harga' => $harga->fresh()->load('kelas')]);
    }
}
