<?php
namespace App\Http\Controllers;

use App\Models\SetoranGum;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SetoranGumController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = SetoranGum::where('depot_id', $depotId);

        if ($request->tgl_dari)   { $query->where('tgl_setor', '>=', $request->tgl_dari); }
        if ($request->tgl_sampai) { $query->where('tgl_setor', '<=', $request->tgl_sampai); }

        $data = $query->with('inputBy:id,name', 'supplier:id,nama')
            ->orderBy('tgl_setor', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);

        return response()->json($data);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'tgl_setor'   => ['required', 'date'],
            'jumlah'      => ['required', 'integer', 'min:1'],
            'metode'      => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'keterangan'  => ['nullable', 'string', 'max:300'],
            'supplier_id' => ['nullable', 'exists:supplier,id'],
        ]);

        $setoran = SetoranGum::create(array_merge($data, [
            'depot_id' => $depotId,
            'input_by' => $user->id,
        ]));

        return response()->json(['setoran' => $setoran->load('inputBy:id,name', 'supplier:id,nama')], 201);
    }

    public function posisi(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $totalPengadaan = (int) DB::table('hewan')
            ->join('supplier', 'supplier.id', '=', 'hewan.supplier_id')
            ->join('harga_kelas', function ($join) {
                $join->on('harga_kelas.kelas_id', '=', 'hewan.kelas_asal_id')
                     ->on('harga_kelas.jenis', '=', 'hewan.jenis')
                     ->on('harga_kelas.musim', '=', 'hewan.musim')
                     ->on('harga_kelas.depot_id', '=', 'hewan.depot_id');
            })
            ->where('hewan.depot_id', $depotId)
            ->where('supplier.is_gum', true)
            ->sum('harga_kelas.harga_beli');

        $totalSetor = (int) SetoranGum::where('depot_id', $depotId)->sum('jumlah');

        return response()->json([
            'total_pengadaan' => $totalPengadaan,
            'total_setor'     => $totalSetor,
            'sisa_hutang'     => $totalPengadaan - $totalSetor,
        ]);
    }
}
