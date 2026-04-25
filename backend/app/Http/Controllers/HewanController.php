<?php
namespace App\Http\Controllers;

use App\Http\Requests\BulkStoreHewanRequest;
use App\Http\Requests\StoreHewanRequest;
use App\Http\Requests\TransferHewanRequest;
use App\Http\Requests\UpdateHewanRequest;
use App\Models\Hewan;
use App\Models\RiwayatPerpindahan;
use App\Services\HewanService;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;

class HewanController extends Controller
{
    public function __construct(private HewanService $hewanService) {}

    public function index(Request $request): JsonResponse
    {
        $hewan = Hewan::with(['kelasAsal:id,kode', 'kelasJual:id,kode', 'supplier:id,nama'])
            ->when($request->depot,  fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->status, fn($q) => $q->where('status', $request->status))
            ->when($request->jenis,  fn($q) => $q->where('jenis', $request->jenis))
            ->when($request->kelas,  fn($q) => $request->kelas === 'UNCLASSED'
                ? $q->whereNull('kelas_jual_id')
                : $q->where('kelas_jual_id', $request->kelas))
            ->when($request->musim,  fn($q) => $q->where('musim', $request->musim))
            ->orderBy('no_hewan')
            ->paginate(50);

        return response()->json($hewan);
    }

    public function store(StoreHewanRequest $request): JsonResponse
    {
        $data = $request->validated();

        $hewan = DB::transaction(function () use ($data) {
            $data['no_hewan']     = $this->hewanService->allocateNoHewan($data['depot_id'], $data['musim'], $data['jenis']);
            $data['no_pengadaan'] = $this->hewanService->allocateNoPengadaan($data['depot_id'], $data['musim']);
            return Hewan::create($data);
        });

        return response()->json(['hewan' => $hewan->load(['kelasAsal', 'kelasJual', 'supplier'])], 201);
    }

    public function storeBulk(BulkStoreHewanRequest $request): JsonResponse
    {
        $data   = $request->validated();
        $shared = Arr::except($data, ['rows']);

        $created = DB::transaction(function () use ($shared, $data) {
            $noPengadaan = $this->hewanService->allocateNoPengadaan($shared['depot_id'], $shared['musim']);
            return collect($data['rows'])->map(function ($row) use ($shared, $noPengadaan) {
                $row                 = array_merge($shared, $row);
                $row['no_hewan']     = $this->hewanService->allocateNoHewan($shared['depot_id'], $shared['musim'], $shared['jenis']);
                $row['no_pengadaan'] = $noPengadaan;
                return Hewan::create($row);
            });
        });

        return response()->json(['hewan' => $created, 'count' => $created->count()], 201);
    }

    public function show(Hewan $hewan): JsonResponse
    {
        $hewan->load(['kelasAsal', 'kelasJual', 'supplier', 'riwayatPerpindahan.user:id,name']);

        try {
            $qrSvg = $this->hewanService->generateQrSvg($hewan->qrString());
        } catch (\Exception $e) {
            $qrSvg = '';
        }

        return response()->json([
            'hewan' => array_merge($hewan->toArray(), [
                'qr_svg' => $qrSvg,
            ]),
        ]);
    }

    public function update(UpdateHewanRequest $request, Hewan $hewan): JsonResponse
    {
        $hewan->update($request->validated());

        return response()->json(['hewan' => $hewan->fresh()->load(['kelasAsal', 'kelasJual'])]);
    }

    public function transfer(TransferHewanRequest $request, Hewan $hewan): JsonResponse
    {
        $dariPetakId = $hewan->petak_id;
        $hewan->update(['petak_id' => $request->ke_petak_id]);

        $riwayat = RiwayatPerpindahan::create([
            'hewan_id'      => $hewan->id,
            'dari_petak_id' => $dariPetakId,
            'ke_petak_id'   => $request->ke_petak_id,
            'user_id'       => $request->user()->id,
            'tgl'           => today(),
            'catatan'       => $request->catatan,
        ]);

        return response()->json(['hewan' => $hewan->fresh(), 'riwayat' => $riwayat]);
    }

    public function statistik(Request $request): JsonResponse
    {
        $query = Hewan::query()
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->musim, fn($q) => $q->where('musim', $request->musim));

        return response()->json([
            'total'      => (clone $query)->count(),
            'per_jenis'  => (clone $query)->selectRaw('jenis, count(*) as total')->groupBy('jenis')->get(),
            'per_status' => (clone $query)->selectRaw('status, count(*) as total')->groupBy('status')->get(),
            'per_kelas'  => (clone $query)
                ->join('kelas_hewan', 'hewan.kelas_jual_id', '=', 'kelas_hewan.id')
                ->selectRaw('kelas_hewan.kode, kelas_hewan.urutan, count(*) as total')
                ->groupBy('kelas_hewan.id', 'kelas_hewan.kode', 'kelas_hewan.urutan')
                ->orderBy('kelas_hewan.urutan')
                ->get(),
        ]);
    }

    public function cetakLabel(Request $request): Response
    {
        $ids   = explode(',', $request->ids ?? '');
        $hewan = Hewan::with(['kelasJual:id,kode', 'depot:id,nama'])
            ->whereIn('id', $ids)
            ->get()
            ->map(fn($h) => array_merge($h->toArray(), [
                'qr_b64' => $this->hewanService->generateQrPngBase64($h->qrString()),
            ]));

        $pdf = Pdf::loadView('labels.hewan', ['hewan' => $hewan])
            ->setPaper([0, 0, 141.73, 85.04], 'landscape');

        return $pdf->download('label-hewan.pdf');
    }
}
