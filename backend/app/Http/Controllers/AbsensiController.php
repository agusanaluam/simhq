<?php
// backend/app/Http/Controllers/AbsensiController.php
namespace App\Http\Controllers;

use App\Models\Absensi;
use App\Models\Karyawan;
use App\Services\AbsensiService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class AbsensiController extends Controller
{
    public function __construct(private AbsensiService $svc) {}

    public function hariIni(Request $request): JsonResponse
    {
        $karyawan = Karyawan::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->first();

        if (! $karyawan) {
            return response()->json(['absensi' => null, 'karyawan' => null]);
        }

        $absensi = Absensi::where('karyawan_id', $karyawan->id)
            ->whereDate('tgl', today())
            ->first();

        return response()->json([
            'absensi'  => $absensi,
            'karyawan' => $karyawan->only(['id', 'nama', 'divisi']),
        ]);
    }

    public function checkIn(Request $request): JsonResponse
    {
        $karyawan = Karyawan::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->firstOrFail();

        abort_if(
            Absensi::where('karyawan_id', $karyawan->id)->whereDate('tgl', today())->exists(),
            422, 'Sudah check-in hari ini.'
        );

        $jamMasuk = now()->format('H:i:s');
        $status   = $this->svc->hitungStatus($karyawan, $jamMasuk);

        $absensi = Absensi::create([
            'karyawan_id' => $karyawan->id,
            'tgl'         => today(),
            'jam_masuk'   => $jamMasuk,
            'status'      => $status,
            'catatan'     => $request->catatan,
        ]);

        return response()->json(['absensi' => $absensi], 201);
    }

    public function checkOut(Request $request): JsonResponse
    {
        $karyawan = Karyawan::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->firstOrFail();

        $absensi = Absensi::where('karyawan_id', $karyawan->id)
            ->whereDate('tgl', today())
            ->firstOrFail();

        abort_if($absensi->jam_keluar !== null, 422, 'Sudah check-out hari ini.');

        $jamKeluar = now()->format('H:i:s');
        $durasi    = $this->svc->hitungDurasi($absensi->jam_masuk, $jamKeluar);

        $absensi->update(['jam_keluar' => $jamKeluar, 'durasi' => $durasi]);

        return response()->json(['absensi' => $absensi->fresh()]);
    }

    public function manual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'karyawan_id' => ['required', 'exists:karyawan,id'],
            'tgl'         => ['required', 'date'],
            'jam_masuk'   => ['nullable', 'date_format:H:i:s'],
            'jam_keluar'  => ['nullable', 'date_format:H:i:s'],
            'status'      => ['required', 'in:HADIR,TERLAMBAT,TIDAK_HADIR'],
            'catatan'     => ['nullable', 'string', 'max:500'],
        ]);

        $durasi = null;
        if (isset($data['jam_masuk'], $data['jam_keluar'])) {
            $durasi = $this->svc->hitungDurasi($data['jam_masuk'], $data['jam_keluar']);
        }

        $absensi = Absensi::updateOrCreate(
            ['karyawan_id' => $data['karyawan_id'], 'tgl' => $data['tgl']],
            array_merge($data, ['override_by' => $request->user()->id, 'durasi' => $durasi])
        );

        return response()->json(['absensi' => $absensi->load('karyawan:id,nama')], 201);
    }

    public function riwayat(Request $request): JsonResponse
    {
        $karyawan = Karyawan::where('user_id', $request->user()->id)
            ->where('is_active', true)
            ->first();

        if (! $karyawan) {
            return response()->json(['data' => []]);
        }

        $bulan = $request->bulan ?? now()->format('Y-m');
        [$year, $month] = explode('-', $bulan);

        $data = Absensi::where('karyawan_id', $karyawan->id)
            ->whereYear('tgl', $year)
            ->whereMonth('tgl', $month)
            ->orderBy('tgl', 'desc')
            ->get(['id', 'tgl', 'jam_masuk', 'jam_keluar', 'status', 'durasi', 'catatan']);

        return response()->json(['data' => $data, 'bulan' => $bulan]);
    }

    public function rekap(Request $request): JsonResponse
    {
        $bulan = $request->bulan ?? now()->format('Y-m');
        [$year, $month] = explode('-', $bulan);

        $karyawanList = Karyawan::where('is_active', true)
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->get();

        $records = Absensi::whereIn('karyawan_id', $karyawanList->pluck('id'))
            ->whereYear('tgl', $year)
            ->whereMonth('tgl', $month)
            ->get()
            ->groupBy('karyawan_id');

        $data = $karyawanList->map(function (Karyawan $k) use ($records) {
            $recs = $records->get($k->id, collect());

            return [
                'karyawan_id'  => $k->id,
                'nama'         => $k->nama,
                'divisi'       => $k->divisi,
                'hadir'        => $recs->where('status', 'HADIR')->count(),
                'terlambat'    => $recs->where('status', 'TERLAMBAT')->count(),
                'tidak_hadir'  => $recs->where('status', 'TIDAK_HADIR')->count(),
                'total_durasi' => $recs->sum('durasi'),
            ];
        });

        return response()->json(['data' => $data, 'bulan' => $bulan]);
    }

    public function exportCsv(Request $request): Response
    {
        $bulan = $request->bulan ?? now()->format('Y-m');
        [$year, $month] = explode('-', $bulan);

        $rows = Absensi::with('karyawan:id,nama,divisi,depot_id')
            ->whereHas('karyawan', function ($q) use ($request) {
                $q->where('is_active', true);
                if ($request->depot) {
                    $q->where('depot_id', $request->depot);
                }
            })
            ->whereYear('tgl', $year)
            ->whereMonth('tgl', $month)
            ->orderBy('tgl')
            ->get();

        $filename = "absensi-{$bulan}.csv";
        $headers  = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ];

        $callback = function () use ($rows) {
            $f = fopen('php://output', 'w');
            fputcsv($f, ['Tanggal', 'Nama', 'Divisi', 'Jam Masuk', 'Jam Keluar', 'Durasi (menit)', 'Status', 'Catatan']);
            foreach ($rows as $r) {
                fputcsv($f, [
                    $r->tgl->format('Y-m-d'),
                    $r->karyawan?->nama,
                    $r->karyawan?->divisi,
                    $r->jam_masuk ?? '',
                    $r->jam_keluar ?? '',
                    $r->durasi ?? '',
                    $r->status instanceof \BackedEnum ? $r->status->value : $r->status,
                    $r->catatan ?? '',
                ]);
            }
            fclose($f);
        };

        return response()->stream($callback, 200, $headers);
    }
}
