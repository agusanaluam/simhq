<?php
// backend/app/Http/Controllers/PembayaranController.php
namespace App\Http\Controllers;

use App\Models\BiayaTambahan;
use App\Models\KasHarian;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Services\PembayaranService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PembayaranController extends Controller
{
    public function __construct(private PembayaranService $svc) {}

    public function index(Transaksi $transaksi): JsonResponse
    {
        $pembayaran = Pembayaran::with('teller:id,name')
            ->where('transaksi_id', $transaksi->id)
            ->orderBy('tgl_bayar')
            ->get();

        return response()->json([
            'pembayaran'     => $pembayaran,
            'total_bayar'    => $pembayaran->sum('jumlah'),
            'sisa_pelunasan' => $this->svc->sisaPelunasan($transaksi),
        ]);
    }

    public function store(Request $request, Transaksi $transaksi): JsonResponse
    {
        $data = $request->validate([
            'jumlah'   => ['required', 'integer', 'min:1'],
            'tipe'     => ['required', 'in:DP,PELUNASAN'],
            'metode'   => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'teller_id'=> ['nullable', 'exists:users,id'],
            'tgl_bayar'=> ['required', 'date'],
            'catatan'  => ['nullable', 'string', 'max:500'],
        ]);

        $pembayaran = Pembayaran::create(array_merge($data, ['transaksi_id' => $transaksi->id]));

        $this->svc->syncStatusBayar($transaksi);

        KasHarian::create([
            'depot_id'      => $transaksi->depot_id,
            'tipe'          => 'MASUK',
            'sumber'        => 'PENJUALAN',
            'divisi'        => null,
            'keterangan'    => "Pembayaran {$transaksi->no_faktur} ({$data['tipe']})",
            'jumlah'        => $pembayaran->jumlah,
            'metode'        => $data['metode'],
            'tgl_transaksi' => $data['tgl_bayar'],
            'input_by'      => $request->user()?->id,
            'transaksi_id'  => $transaksi->id,
        ]);

        return response()->json(['pembayaran' => $pembayaran->load('teller:id,name')], 201);
    }

    public function storeBiaya(Request $request, Transaksi $transaksi): JsonResponse
    {
        $data = $request->validate([
            'keterangan' => ['required', 'string', 'max:200'],
            'jumlah'     => ['required', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($data, $transaksi) {
            BiayaTambahan::create(array_merge($data, ['transaksi_id' => $transaksi->id]));
            $transaksi->increment('total', $data['jumlah']);
        });

        $this->svc->syncStatusBayar($transaksi->fresh());

        return response()->json(['transaksi' => $transaksi->fresh()], 201);
    }

    public function rekapSetoran(Request $request): JsonResponse
    {
        $tgl   = $request->tgl ?? today()->toDateString();
        $depot = $request->depot;

        $rekap = Pembayaran::query()
            ->join('transaksi', 'pembayaran.transaksi_id', '=', 'transaksi.id')
            ->whereDate('pembayaran.tgl_bayar', $tgl)
            ->when($depot, fn($q) => $q->where('transaksi.depot_id', $depot))
            ->groupBy('pembayaran.metode')
            ->select(
                'pembayaran.metode',
                DB::raw('SUM(pembayaran.jumlah) as total'),
                DB::raw('COUNT(DISTINCT pembayaran.transaksi_id) as jumlah_transaksi')
            )
            ->get();

        return response()->json(['rekap' => $rekap, 'tgl' => $tgl]);
    }
}
