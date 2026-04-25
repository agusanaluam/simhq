<?php
namespace App\Http\Controllers\Master;

use App\Http\Controllers\Controller;
use App\Http\Requests\Master\StoreYayasanRequest;
use App\Models\Yayasan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class YayasanController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Yayasan::where('is_active', true)->orderBy('nama')->get()]);
    }

    public function store(StoreYayasanRequest $request): JsonResponse
    {
        $yayasan = Yayasan::create($request->validated());

        return response()->json(['yayasan' => $yayasan], 201);
    }

    public function update(Request $request, Yayasan $yayasan): JsonResponse
    {
        $data = $request->validate([
            'nama'       => ['sometimes', 'string', 'max:255'],
            'alamat'     => ['sometimes', 'nullable', 'string'],
            'kontak_pic' => ['sometimes', 'nullable', 'string', 'max:255'],
            'telepon'    => ['sometimes', 'nullable', 'string', 'max:30'],
            'is_active'  => ['sometimes', 'boolean'],
        ]);

        $yayasan->update($data);

        return response()->json(['yayasan' => $yayasan->fresh()]);
    }

    public function destroy(Yayasan $yayasan): JsonResponse
    {
        if ($yayasan->transaksi()->exists()) {
            return response()->json(['message' => 'Yayasan sudah memiliki transaksi, tidak dapat dihapus.'], 422);
        }
        $yayasan->delete();
        return response()->json(null, 204);
    }
}
