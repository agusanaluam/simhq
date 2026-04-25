<?php
namespace App\Http\Controllers;

use App\Enums\StatusHewan;
use App\Enums\StatusTransaksi;
use App\Http\Requests\StoreTransaksiRequest;
use App\Models\Hewan;
use App\Models\HargaKelas;
use App\Models\Transaksi;
use App\Models\TransaksiItem;
use App\Services\TransaksiService;
use Illuminate\Support\Arr;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TransaksiController extends Controller
{
    public function __construct(private TransaksiService $svc) {}

    public function index(Request $request): JsonResponse
    {
        $data = Transaksi::with([
                'customer:id,nama,hp',
                'hewan:id,no_hewan,jenis',
                'kelas:id,kode',
                'cs:id,name',
                'teller:id,name',
                'sales:id,name',
            ])
            ->when($request->depot,  fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->status, fn($q) => $q->where('status_transaksi', $request->status))
            ->when($request->musim,  fn($q) => $q->where('musim', $request->musim))
            ->when($request->tgl,    fn($q) => $q->whereDate('created_at', $request->tgl))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($data);
    }

    public function show(Transaksi $transaksi): JsonResponse
    {
        $transaksi->load([
            'customer', 'hewan.kelasJual', 'kelas',
            'cs:id,name', 'teller:id,name', 'sales:id,name', 'yayasan:id,nama',
        ]);

        return response()->json(['transaksi' => $transaksi]);
    }

    public function store(StoreTransaksiRequest $request): JsonResponse
    {
        $data       = $request->validated();
        $items      = $data['items'] ?? [];
        $totalHarga = collect($items)->sum('harga');

        $hasPreorder = collect($items)->contains('is_preorder', true);
        $status      = $hasPreorder
            ? StatusTransaksi::MENUNGGU_HEWAN->value
            : StatusTransaksi::HEWAN_TERALOKASI->value;

        $transaksi = DB::transaction(function () use ($data, $items, $totalHarga, $status) {
            $noFaktur = $this->svc->generateNoFaktur($data['depot_id'], $data['musim']);

            $transaksi = Transaksi::create(array_merge(
                Arr::except($data, ['items']),
                [
                    'no_faktur'        => $noFaktur,
                    'harga'            => $totalHarga,
                    'total'            => $totalHarga,
                    'status_transaksi' => $status,
                ]
            ));

            foreach ($items as $item) {
                TransaksiItem::create(array_merge($item, ['transaksi_id' => $transaksi->id]));
                if (!$item['is_preorder'] && !empty($item['hewan_id'])) {
                    Hewan::where('id', $item['hewan_id'])->update(['status' => StatusHewan::BOOKED->value]);
                }
            }

            return $transaksi;
        });

        return response()->json([
            'transaksi' => $transaksi->load(['items.kelas', 'customer']),
        ], 201);
    }

    public function assignHewan(Request $request, Transaksi $transaksi): JsonResponse
    {
        $request->validate([
            'hewan_id' => ['required', 'exists:hewan,id'],
        ]);

        abort_if(
            $transaksi->status_transaksi !== StatusTransaksi::MENUNGGU_HEWAN,
            422, 'Hanya transaksi MENUNGGU_HEWAN yang bisa di-assign hewan.'
        );

        $transaksi->update([
            'hewan_id'         => $request->hewan_id,
            'status_transaksi' => StatusTransaksi::HEWAN_TERALOKASI->value,
        ]);

        return response()->json(['transaksi' => $transaksi->fresh()->load(['hewan', 'customer'])]);
    }

    public function konfirmasi(Transaksi $transaksi): JsonResponse
    {
        abort_if(
            $transaksi->status_transaksi === StatusTransaksi::MENUNGGU_HEWAN,
            422, 'Assign nomor hewan dulu sebelum konfirmasi.'
        );

        abort_if(
            $transaksi->status_transaksi !== StatusTransaksi::HEWAN_TERALOKASI,
            422, 'Status transaksi tidak valid untuk dikonfirmasi.'
        );

        $transaksi->hewan?->update(['status' => StatusHewan::BOOKED->value]);
        $transaksi->update(['status_transaksi' => StatusTransaksi::DIKONFIRMASI->value]);

        return response()->json(['transaksi' => $transaksi->fresh()->load(['hewan', 'customer'])]);
    }

    public function batal(Transaksi $transaksi): JsonResponse
    {
        abort_if(
            in_array($transaksi->status_transaksi, [StatusTransaksi::DIBATALKAN, StatusTransaksi::SELESAI]),
            422, 'Transaksi tidak bisa dibatalkan.'
        );

        if ($transaksi->hewan_id) {
            $transaksi->hewan?->update(['status' => StatusHewan::AVAILABLE->value]);
        }

        $transaksi->update(['status_transaksi' => StatusTransaksi::DIBATALKAN->value]);

        return response()->json(['transaksi' => $transaksi->fresh()->load(['hewan', 'customer'])]);
    }
}
