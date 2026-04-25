<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class IncomeStatementController extends Controller
{
    public function generate(Request $request): JsonResponse
    {
        return response()->json($this->buildData($request));
    }

    public function export(Request $request): StreamedResponse
    {
        $data     = $this->buildData($request);
        $filename = "income-statement-{$data['musim']}.csv";

        return response()->streamDownload(function () use ($data) {
            $h = fopen('php://output', 'w');

            fputcsv($h, ['PENDAPATAN PER KELAS']);
            fputcsv($h, ['Kelas', 'Jenis', 'Qty', 'Pendapatan', 'HPP', 'Margin Bruto']);
            foreach ($data['pendapatan_kelas'] as $row) {
                fputcsv($h, [
                    $row['kelas'], $row['jenis'], $row['qty'],
                    $row['pendapatan'], $row['hpp'], $row['margin_bruto'],
                ]);
            }
            fputcsv($h, []);
            fputcsv($h, ['Total Pendapatan', '', '', $data['total_pendapatan']]);
            fputcsv($h, ['Total HPP',        '', '', $data['total_hpp']]);
            fputcsv($h, ['Margin Bruto',     '', '', $data['margin_bruto']]);
            fputcsv($h, []);

            fputcsv($h, ['BIAYA OPERASIONAL PER DIVISI']);
            fputcsv($h, ['Divisi', 'Total Biaya']);
            foreach ($data['biaya_divisi'] as $row) {
                fputcsv($h, [$row['divisi'], $row['total_biaya']]);
            }
            fputcsv($h, []);
            fputcsv($h, ['Total Biaya', $data['total_biaya']]);
            fputcsv($h, []);
            fputcsv($h, ['LABA BERSIH', $data['laba_bersih']]);

            fclose($h);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function buildData(Request $request): array
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $musim   = (int) $request->input('musim', date('Y'));

        $pendapatanKelas = DB::table('transaksi as t')
            ->join('kelas_hewan as kh', 'kh.id', '=', 't.kelas_id')
            ->leftJoin('harga_kelas as hk', function ($join) {
                $join->on('hk.kelas_id', '=', 't.kelas_id')
                     ->on('hk.jenis', '=', 't.jenis')
                     ->on('hk.musim', '=', 't.musim')
                     ->on('hk.depot_id', '=', 't.depot_id');
            })
            ->where('t.depot_id', $depotId)
            ->where('t.musim', $musim)
            ->whereIn('t.status_transaksi', ['DIKONFIRMASI', 'SELESAI'])
            ->groupBy('kh.id', 'kh.nama', 't.jenis', 'hk.harga_beli')
            ->orderBy('kh.nama')
            ->orderBy('t.jenis')
            ->select(
                'kh.nama as kelas',
                't.jenis',
                DB::raw('COUNT(t.id) as qty'),
                DB::raw('SUM(t.harga) as pendapatan'),
                DB::raw('COALESCE(hk.harga_beli, 0) as harga_beli'),
                DB::raw('COUNT(t.id) * COALESCE(hk.harga_beli, 0) as hpp'),
                DB::raw('SUM(t.harga) - COUNT(t.id) * COALESCE(hk.harga_beli, 0) as margin_bruto'),
            )
            ->get()
            ->map(fn($r) => [
                'kelas'        => $r->kelas,
                'jenis'        => $r->jenis,
                'qty'          => (int) $r->qty,
                'pendapatan'   => (int) $r->pendapatan,
                'harga_beli'   => (int) $r->harga_beli,
                'hpp'          => (int) $r->hpp,
                'margin_bruto' => (int) $r->margin_bruto,
            ]);

        $biayaDivisi = DB::table('realisasi_pengeluaran as rp')
            ->join('rab as r', 'r.id', '=', 'rp.rab_id')
            ->join('rab_kategori as rk', 'rk.id', '=', 'r.kategori_id')
            ->where('r.depot_id', $depotId)
            ->where('r.musim', $musim)
            ->groupBy('rk.nama')
            ->orderBy('rk.nama')
            ->select('rk.nama as divisi', DB::raw('SUM(rp.jumlah) as total_biaya'))
            ->get()
            ->map(fn($r) => [
                'divisi'      => $r->divisi,
                'total_biaya' => (int) $r->total_biaya,
            ]);

        $totalPendapatan = (int) $pendapatanKelas->sum('pendapatan');
        $totalHPP        = (int) $pendapatanKelas->sum('hpp');
        $marginBruto     = $totalPendapatan - $totalHPP;
        $totalBiaya      = (int) $biayaDivisi->sum('total_biaya');
        $labaBersih      = $marginBruto - $totalBiaya;

        return [
            'musim'            => $musim,
            'pendapatan_kelas' => $pendapatanKelas->values()->all(),
            'total_pendapatan' => $totalPendapatan,
            'total_hpp'        => $totalHPP,
            'margin_bruto'     => $marginBruto,
            'biaya_divisi'     => $biayaDivisi->values()->all(),
            'total_biaya'      => $totalBiaya,
            'laba_bersih'      => $labaBersih,
        ];
    }
}
