<?php
namespace App\Http\Controllers;

use App\Http\Requests\StorePetakRequest;
use App\Models\PetakKandang;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PetakController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $petak = PetakKandang::with([
                'kelas:id,kode',
                'hewan' => fn($q) => $q->with(['kelasJual:id,kode'])->whereNotIn('status', ['MATI', 'DELIVERED']),
            ])
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->jenis,  fn($q) => $q->where('jenis_kandang', $request->jenis))
            ->where('is_active', true)
            ->orderBy('posisi_y')
            ->orderBy('posisi_x')
            ->get()
            ->map(fn($p) => array_merge($p->toArray(), [
                'jumlah_terisi' => $p->hewan->count(),
            ]));

        return response()->json(['data' => $petak]);
    }

    public function store(StorePetakRequest $request): JsonResponse
    {
        $petak = PetakKandang::create($request->validated());
        return response()->json(['petak' => $petak->load('kelas:id,kode')], 201);
    }

    public function update(Request $request, PetakKandang $petak): JsonResponse
    {
        $data = $request->validate([
            'no_petak'      => ['sometimes', 'string', 'max:20'],
            'jenis_kandang' => ['sometimes', 'in:SAPI,DOMBA'],
            'kapasitas'     => ['sometimes', 'integer', 'min:1', 'max:100'],
            'kelas_id'      => ['sometimes', 'nullable', 'exists:kelas_hewan,id'],
            'posisi_x'      => ['sometimes', 'integer', 'min:0'],
            'posisi_y'      => ['sometimes', 'integer', 'min:0'],
            'is_active'     => ['sometimes', 'boolean'],
        ]);
        $petak->update($data);
        return response()->json(['petak' => $petak->fresh()]);
    }

    public function saveLayout(Request $request): JsonResponse
    {
        $request->validate([
            'layout'            => ['required', 'array', 'min:1'],
            'layout.*.id'       => ['required', 'exists:petak_kandang,id'],
            'layout.*.posisi_x' => ['required', 'integer', 'min:0'],
            'layout.*.posisi_y' => ['required', 'integer', 'min:0'],
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->layout as $item) {
                PetakKandang::where('id', $item['id'])
                    ->update(['posisi_x' => $item['posisi_x'], 'posisi_y' => $item['posisi_y']]);
            }
        });

        return response()->json(['message' => 'Layout disimpan.']);
    }
}
