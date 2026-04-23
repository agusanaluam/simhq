<?php
// backend/app/Http/Controllers/DashboardController.php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\Hewan;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function depot(Request $request): JsonResponse
    {
        $musim   = (int) $request->input('musim', now()->year);
        $user    = $request->user();
        $depotId = $this->resolveDepotId($user, $request->input('depot_id'));

        return response()->json([
            'stok'               => $this->queryStok($depotId, $musim),
            'pendapatan'         => $this->queryPendapatan($depotId, $musim),
            'transaksi_hari_ini' => $this->queryTransaksiHariIni($depotId),
            'grafik_7hari'       => $this->queryGrafik7Hari($depotId, $musim),
            'alert_stok'         => $this->queryAlertStok($depotId, $musim),
        ]);
    }

    private function resolveDepotId($user, mixed $requested): ?int
    {
        if ($user->role === UserRole::SUPER_ADMIN) {
            return $requested !== null ? (int) $requested : null;
        }
        return $user->depot_id;
    }

    private function queryStok(?int $depotId, int $musim): array
    {
        $base = Hewan::where('musim', $musim);
        if ($depotId !== null) {
            $base->where('depot_id', $depotId);
        }

        $counts = (clone $base)
            ->select('status', DB::raw('count(*) as jumlah'))
            ->groupBy('status')
            ->pluck('jumlah', 'status')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $perKelas = (clone $base)
            ->join('kelas_hewan as kj', 'hewan.kelas_jual_id', '=', 'kj.id')
            ->select(
                'kj.kode as kelas_kode',
                'kj.nama as kelas_nama',
                'hewan.jenis',
                DB::raw("SUM(CASE WHEN hewan.status IN ('AVAILABLE','BOOKED') THEN 1 ELSE 0 END) as tersedia"),
                DB::raw("SUM(CASE WHEN hewan.status IN ('SOLD','DELIVERED') THEN 1 ELSE 0 END) as terjual")
            )
            ->groupBy('kj.kode', 'kj.nama', 'hewan.jenis')
            ->orderBy('kj.kode')
            ->get()
            ->map(fn($row) => [
                'kelas_kode' => $row->kelas_kode,
                'kelas_nama' => $row->kelas_nama,
                'jenis'      => $row->jenis,
                'tersedia'   => (int) $row->tersedia,
                'terjual'    => (int) $row->terjual,
            ])
            ->values()
            ->toArray();

        return [
            'masuk'     => (int) array_sum($counts),
            'tersedia'  => ($counts['AVAILABLE'] ?? 0) + ($counts['BOOKED'] ?? 0),
            'terjual'   => ($counts['SOLD'] ?? 0) + ($counts['DELIVERED'] ?? 0),
            'delivered' => $counts['DELIVERED'] ?? 0,
            'mati'      => $counts['MATI'] ?? 0,
            'per_kelas' => $perKelas,
        ];
    }

    private function queryPendapatan(?int $depotId, int $musim): array
    {
        $base = Pembayaran::query()
            ->join('transaksi', 'pembayaran.transaksi_id', '=', 'transaksi.id')
            ->where('transaksi.musim', $musim);

        if ($depotId !== null) {
            $base->where('transaksi.depot_id', $depotId);
        }

        $hariIni    = (clone $base)->whereDate('pembayaran.tgl_bayar', today())->sum('pembayaran.jumlah');
        $totalMusim = (clone $base)->sum('pembayaran.jumlah');

        return [
            'hari_ini' => (int) $hariIni,
            'musim'    => (int) $totalMusim,
        ];
    }

    private function queryTransaksiHariIni(?int $depotId): array
    {
        $base = Transaksi::whereDate('created_at', today())
            ->where('status_transaksi', '!=', 'DIBATALKAN');

        if ($depotId !== null) {
            $base->where('depot_id', $depotId);
        }

        $total = (clone $base)->count();

        $perTipe = (clone $base)
            ->select('tipe_qurban', DB::raw('count(*) as count'))
            ->groupBy('tipe_qurban')
            ->get()
            ->map(fn($row) => [
                'tipe_qurban' => $row->tipe_qurban,
                'count'       => (int) $row->count,
            ])
            ->values()
            ->toArray();

        return [
            'total'    => $total,
            'per_tipe' => $perTipe,
        ];
    }

    private function queryGrafik7Hari(?int $depotId, int $musim): array
    {
        $startDate = now()->subDays(6)->toDateString();
        $endDate   = now()->toDateString();

        $pembayaranBase = Pembayaran::query()
            ->join('transaksi', 'pembayaran.transaksi_id', '=', 'transaksi.id')
            ->where('transaksi.musim', $musim)
            ->whereBetween(DB::raw('DATE(pembayaran.tgl_bayar)'), [$startDate, $endDate]);

        if ($depotId !== null) {
            $pembayaranBase->where('transaksi.depot_id', $depotId);
        }

        $pendapatanByDate = $pembayaranBase
            ->select(DB::raw('DATE(pembayaran.tgl_bayar) as tgl'), DB::raw('SUM(pembayaran.jumlah) as total'))
            ->groupBy(DB::raw('DATE(pembayaran.tgl_bayar)'))
            ->pluck('total', 'tgl')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $transaksiBase = Transaksi::query()
            ->where('musim', $musim)
            ->where('status_transaksi', '!=', 'DIBATALKAN')
            ->whereBetween(DB::raw('DATE(created_at)'), [$startDate, $endDate]);

        if ($depotId !== null) {
            $transaksiBase->where('depot_id', $depotId);
        }

        $ekorByDate = $transaksiBase
            ->select(DB::raw('DATE(created_at) as tanggal'), DB::raw('count(*) as ekor'))
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('ekor', 'tanggal')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $result = [];
        for ($i = 6; $i >= 0; $i--) {
            $date     = now()->subDays($i)->toDateString();
            $result[] = [
                'tanggal'    => $date,
                'pendapatan' => $pendapatanByDate[$date] ?? 0,
                'ekor'       => $ekorByDate[$date] ?? 0,
            ];
        }

        return $result;
    }

    private function queryAlertStok(?int $depotId, int $musim, int $threshold = 5): array
    {
        $base = Hewan::query()
            ->join('kelas_hewan as kj', 'hewan.kelas_jual_id', '=', 'kj.id')
            ->where('hewan.musim', $musim)
            ->whereIn('hewan.status', ['AVAILABLE', 'BOOKED']);

        if ($depotId !== null) {
            $base->where('hewan.depot_id', $depotId);
        }

        return $base
            ->select(
                'kj.kode as kelas_kode',
                'kj.nama as kelas_nama',
                'hewan.jenis',
                DB::raw('count(*) as sisa')
            )
            ->groupBy('kj.kode', 'kj.nama', 'hewan.jenis')
            ->havingRaw('count(*) < ?', [$threshold])
            ->orderBy('sisa')
            ->get()
            ->map(fn($row) => [
                'kelas_kode' => $row->kelas_kode,
                'kelas_nama' => $row->kelas_nama,
                'jenis'      => $row->jenis,
                'sisa'       => (int) $row->sisa,
            ])
            ->values()
            ->toArray();
    }
}
