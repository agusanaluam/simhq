<?php
namespace App\Http\Controllers;

use App\Enums\StatusTransaksi;
use App\Models\Hewan;
use App\Models\Pembayaran;
use App\Models\SetoranGum;
use App\Models\Transaksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PendapatanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $depotId = $request->depot;
        $musim   = $request->musim ?? date('Y');

        // Total biaya pengadaan hewan dari supplier GUM
        $pengadaan = (int) Hewan::where('hewan.depot_id', $depotId)
            ->where('hewan.musim', $musim)
            ->join('supplier', 'hewan.supplier_id', '=', 'supplier.id')
            ->where('supplier.is_gum', true)
            ->join('harga_kelas', fn($j) => $j
                ->on('harga_kelas.kelas_id', '=', 'hewan.kelas_asal_id')
                ->on('harga_kelas.jenis',    '=', 'hewan.jenis')
                ->on('harga_kelas.musim',    '=', 'hewan.musim')
                ->on('harga_kelas.depot_id', '=', 'hewan.depot_id'))
            ->sum('harga_kelas.harga_beli');

        // Total tagihan ke customer (semua transaksi non-batal)
        $totalTagihan = (int) Transaksi::where('depot_id', $depotId)
            ->where('musim', $musim)
            ->where('status_transaksi', '!=', StatusTransaksi::DIBATALKAN->value)
            ->sum('total');

        // Pendapatan: total yang sudah dibayar customer
        $pendapatan = (int) Pembayaran::whereHas('transaksi', fn($q) =>
                $q->where('depot_id', $depotId)->where('musim', $musim))
            ->sum('jumlah');

        // Total setoran ke GUM (filtered by musim year)
        $totalSetorGum = (int) SetoranGum::where('depot_id', $depotId)
            ->whereYear('tgl_setor', $musim)
            ->sum('jumlah');

        return response()->json([
            'pengadaan'       => $pengadaan,
            'total_tagihan'   => $totalTagihan,
            'pendapatan'      => $pendapatan,
            'total_setor_gum' => $totalSetorGum,
            'sisa_hutang_gum' => max(0, $pengadaan - $totalSetorGum),
        ]);
    }
}
