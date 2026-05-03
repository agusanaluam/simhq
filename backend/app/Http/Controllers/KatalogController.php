<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Depot;
use App\Models\Hewan;
use App\Models\HargaKelas;
use App\Models\OrderKatalog;
use App\Models\User;
use App\Services\WahaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class KatalogController extends Controller
{
    public function catalogBySlug(string $slug): JsonResponse
    {
        $depot = Depot::where('slug', $slug)->firstOrFail();
        return $this->buildCatalog($depot);
    }

    public function catalog(Request $request): JsonResponse
    {
        $request->validate(['depot' => ['required', 'integer', 'exists:depots,id']]);
        $depot = Depot::findOrFail($request->depot);
        return $this->buildCatalog($depot);
    }

    private function buildCatalog(Depot $depot): JsonResponse
    {
        $musim   = (int) date('Y');
        $depotId = $depot->id;

        $hewanList = Hewan::with(['kelasJual:id,kode', 'fotos'])
            ->withCount('slotSapi')
            ->where('depot_id', $depotId)
            ->where('musim', $musim)
            ->whereNotIn('status', ['MATI', 'DELIVERED'])
            ->orderBy('jenis')
            ->orderBy('no_hewan')
            ->get();

        $hargaMap = HargaKelas::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->get()
            ->keyBy(fn($h) => "{$h->kelas_id}_{$h->jenis}");

        $data = $hewanList->map(function (Hewan $h) use ($hargaMap) {
            $harga      = $hargaMap->get("{$h->kelas_jual_id}_{$h->jenis}");
            $isSapi     = $h->jenis === 'SAPI';
            $slotTerisi = $isSapi ? $h->slot_sapi_count : null;

            return [
                'id'            => $h->id,
                'no_hewan'      => $h->no_hewan,
                'jenis'         => $h->jenis,
                'kelas'         => $h->kelasJual?->kode ?? '-',
                'status'        => $h->status->value,
                'harga_jual'    => (int) ($harga?->harga_jual ?? 0),
                'harga_slot'    => $isSapi ? ((int) ($harga?->harga_slot ?? 0) ?: null) : null,
                'fotos'         => $h->fotos->sortBy('urutan')->map(
                    fn($f) => Storage::disk('public')->url($f->url)
                )->values(),
                'slot_terisi'   => $slotTerisi,
                'slot_total'    => $isSapi ? 7 : null,
                'slot_tersedia' => $isSapi ? (7 - $h->slot_sapi_count) : null,
            ];
        });

        return response()->json([
            'depot' => ['id' => $depot->id, 'nama' => $depot->nama, 'slug' => $depot->slug],
            'musim' => $musim,
            'data'  => $data->values()->all(),
        ]);
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

        User::where('depot_id', $data['depot_id'])
            ->where('role', UserRole::CS_KETUA)
            ->whereNotNull('phone')
            ->each(function ($cs) use ($data): void {
                WahaService::send(
                    $data['depot_id'],
                    $cs->phone,
                    "Ada order baru dari katalog: {$data['nama']} – {$data['kelas']} {$data['jenis']}. Segera follow-up.",
                    'order_katalog_baru'
                );
            });

        return response()->json(['order' => $order], 201);
    }
}
