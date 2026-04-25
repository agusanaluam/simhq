<?php
namespace App\Http\Controllers;

use App\Enums\SumberKas;
use App\Models\KasHarian;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class KasController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $base = KasHarian::where('depot_id', $depotId);

        if ($request->tgl_dari)   { $base->where('tgl_transaksi', '>=', $request->tgl_dari); }
        if ($request->tgl_sampai) { $base->where('tgl_transaksi', '<=', $request->tgl_sampai); }
        if ($request->divisi)     { $base->where('divisi', $request->divisi); }

        $entries = (clone $base)
            ->with(['inputBy:id,name', 'rab' => fn($q) => $q->with('kategori:id,nama')->select('id', 'kategori_id', 'musim')])
            ->orderBy('tgl_transaksi', 'desc')
            ->orderBy('id', 'desc')
            ->paginate(50);

        return response()->json([
            'entries' => $entries,
            'summary' => $this->buildSummary(clone $base),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin()
            ? ($request->depot_id ?? $user->depot_id)
            : $user->depot_id;

        $data = $request->validate([
            'tipe'          => ['required', 'in:MASUK,KELUAR'],
            'sumber'        => [Rule::requiredIf($request->tipe === 'MASUK'), 'nullable', Rule::in(array_column(SumberKas::cases(), 'value'))],
            'keterangan'    => ['required', 'string', 'max:300'],
            'jumlah'        => ['required', 'integer', 'min:1'],
            'metode'        => ['required', 'in:CASH,TRANSFER_BCA,TRANSFER_LAIN'],
            'tgl_transaksi' => ['required', 'date'],
            'rab_id'        => [Rule::requiredIf($request->tipe === 'KELUAR'), 'nullable', 'exists:rab,id'],
        ]);

        if (($data['tipe'] ?? '') === 'KELUAR' && ! empty($data['rab_id'])) {
            $rab = \App\Models\Rab::with('kategori:id,nama')
                ->where('id', $data['rab_id'])
                ->where('depot_id', $depotId)
                ->firstOrFail();
            $data['divisi'] = $rab->kategori?->nama ?? '';
        }

        $kas = KasHarian::create(array_merge($data, [
            'depot_id' => $depotId,
            'input_by' => $user->id,
        ]));

        return response()->json(['kas' => $kas->load('inputBy:id,name')], 201);
    }

    public function saldo(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $tgl     = $request->input('tgl', today()->toDateString());

        $base = KasHarian::where('depot_id', $depotId)
            ->where('tgl_transaksi', '<=', $tgl);

        return response()->json(array_merge($this->buildSummary($base), ['tgl' => $tgl]));
    }

    public function cashflow(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $bulan   = $request->input('bulan', now()->format('Y-m'));

        [$year, $month] = explode('-', $bulan);
        $start = "{$bulan}-01";
        $end   = date('Y-m-t', mktime(0, 0, 0, (int) $month, 1, (int) $year));

        $rows = KasHarian::where('depot_id', $depotId)
            ->whereBetween('tgl_transaksi', [$start, $end])
            ->select(
                'tgl_transaksi',
                DB::raw("SUM(CASE WHEN tipe = 'MASUK' THEN jumlah ELSE 0 END) as masuk"),
                DB::raw("SUM(CASE WHEN tipe = 'KELUAR' THEN jumlah ELSE 0 END) as keluar")
            )
            ->groupBy('tgl_transaksi')
            ->orderBy('tgl_transaksi')
            ->get()
            ->map(fn($r) => [
                'tanggal' => $r->tgl_transaksi->toDateString(),
                'masuk'   => (int) $r->masuk,
                'keluar'  => (int) $r->keluar,
            ])
            ->toArray();

        return response()->json(['data' => $rows]);
    }

    public function export(Request $request): StreamedResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;
        $bulan   = $request->input('bulan', now()->format('Y-m'));

        [$year, $month] = explode('-', $bulan);
        $start = "{$bulan}-01";
        $end   = date('Y-m-t', mktime(0, 0, 0, (int) $month, 1, (int) $year));

        $rows = KasHarian::where('depot_id', $depotId)
            ->whereBetween('tgl_transaksi', [$start, $end])
            ->with('inputBy:id,name')
            ->orderBy('tgl_transaksi')
            ->orderBy('id')
            ->get();

        $filename = "kas-{$bulan}.csv";

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['Tanggal', 'Tipe', 'Sumber', 'Divisi', 'Keterangan', 'Jumlah', 'Metode', 'Input By']);
            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row->tgl_transaksi->toDateString(),
                    $row->tipe->value,
                    $row->sumber ?? '',
                    $row->divisi ?? '',
                    $row->keterangan,
                    $row->jumlah,
                    $row->metode,
                    $row->inputBy?->name ?? '',
                ]);
            }
            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv; charset=UTF-8']);
    }

    private function buildSummary($query): array
    {
        $counts = (clone $query)
            ->select('tipe', DB::raw('SUM(jumlah) as total'))
            ->groupBy('tipe')
            ->pluck('total', 'tipe')
            ->map(fn($v) => (int) $v)
            ->toArray();

        $perMetode = (clone $query)
            ->select(
                'metode',
                DB::raw("SUM(CASE WHEN tipe = 'MASUK' THEN jumlah ELSE 0 END) as masuk"),
                DB::raw("SUM(CASE WHEN tipe = 'KELUAR' THEN jumlah ELSE 0 END) as keluar")
            )
            ->groupBy('metode')
            ->get()
            ->map(fn($r) => [
                'metode' => $r->metode,
                'masuk'  => (int) $r->masuk,
                'keluar' => (int) $r->keluar,
            ])
            ->values()
            ->toArray();

        $totalMasuk  = $counts['MASUK']  ?? 0;
        $totalKeluar = $counts['KELUAR'] ?? 0;

        return [
            'total_masuk'  => $totalMasuk,
            'total_keluar' => $totalKeluar,
            'saldo'        => $totalMasuk - $totalKeluar,
            'per_metode'   => $perMetode,
        ];
    }
}
