<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreKaryawanRequest;
use App\Models\Karyawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KaryawanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $karyawan = Karyawan::with('user:id,name,email')
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->orderBy('nama')
            ->get();

        return response()->json(['data' => $karyawan]);
    }

    public function store(StoreKaryawanRequest $request): JsonResponse
    {
        $karyawan = Karyawan::create($request->validated());

        return response()->json(['karyawan' => $karyawan], 201);
    }

    public function update(Request $request, Karyawan $karyawan): JsonResponse
    {
        $data = $request->validate([
            'nama'         => ['sometimes', 'string', 'max:255'],
            'divisi'       => ['sometimes', 'string', 'max:100'],
            'tarif_harian' => ['sometimes', 'integer', 'min:0'],
            'berlaku_dari' => ['sometimes', 'date'],
            'is_active'    => ['sometimes', 'boolean'],
        ]);

        $karyawan->update($data);

        return response()->json(['karyawan' => $karyawan->fresh()]);
    }
}
