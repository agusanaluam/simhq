<?php

namespace App\Http\Controllers;

use App\Models\Hewan;
use App\Models\SlotSapi;
use App\Models\Transaksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FakturController extends Controller
{

    public function transaksi(Request $request, Transaksi $transaksi): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            abort_unless((int) $transaksi->depot_id === (int) $user->depot_id, 403);
        }

        $transaksi->load([
            'customer',
            'hewan.kelasJual', 'hewan.kelasAsal',
            'kelas',
            'cs:id,name', 'teller:id,name',
            'yayasan:id,nama',
            'pembayaran',
            'depot',
        ]);

        $slots = [];
        if ($transaksi->hewan && $transaksi->jenis === 'SAPI') {
            $filled = SlotSapi::with('customer:id,nama,hp')
                ->where('hewan_id', $transaksi->hewan->id)
                ->get()
                ->keyBy('no_slot');

            $slots = collect(range(1, 7))->map(fn($n) => $filled->has($n)
                ? $filled->get($n)->toArray()
                : ['no_slot' => $n, 'status' => 'KOSONG', 'customer' => null]
            )->values()->all();
        }

        return response()->json([
            'transaksi' => $transaksi,
            'slots'     => $slots,
        ]);
    }

    public function ploting(Request $request, Hewan $hewan): JsonResponse
    {
        $user = $request->user();
        if (!$user->isSuperAdmin()) {
            abort_unless((int) $hewan->depot_id === (int) $user->depot_id, 403);
        }

        $hewan->load(['depot', 'kelasJual', 'kelasAsal']);

        $filled = SlotSapi::with('customer:id,nama,hp')
            ->where('hewan_id', $hewan->id)
            ->get()
            ->keyBy('no_slot');

        $slots = collect(range(1, 7))->map(fn($n) => $filled->has($n)
            ? $filled->get($n)->toArray()
            : ['no_slot' => $n, 'status' => 'KOSONG', 'customer' => null]
        )->values()->all();

        return response()->json(['hewan' => $hewan, 'slots' => $slots]);
    }
}
