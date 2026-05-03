<?php
namespace App\Http\Controllers;

use App\Enums\StatusHewan;
use App\Enums\StatusTransaksi;
use App\Http\Requests\StoreTransaksiRequest;
use App\Models\Hewan;
use App\Models\HargaKelas;
use App\Models\SlotSapi;
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
                'cs:id,name',
                'teller:id,name',
                'sales:id,name',
                'items.hewan:id,no_hewan',
                'items.kelas:id,kode',
            ])
            ->when($request->depot,       fn($q) => $q->where('depot_id', $request->depot))
            ->when($request->status,      fn($q) => $q->where('status_transaksi', $request->status))
            ->when($request->status_bayar,fn($q) => $q->where('status_bayar', $request->status_bayar))
            ->when($request->musim,       fn($q) => $q->where('musim', $request->musim))
            ->when($request->tgl,         fn($q) => $q->whereDate('created_at', $request->tgl))
            ->when($request->tipe_qurban, fn($q) => $q->whereHas('items', fn($q2) => $q2->where('tipe_qurban', $request->tipe_qurban)))
            ->when($request->no_hewan,    fn($q) => $q->whereHas('items.hewan', fn($q2) => $q2->where('no_hewan', 'like', "%{$request->no_hewan}%")))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($data);
    }

    public function show(Transaksi $transaksi): JsonResponse
    {
        $transaksi->load([
            'customer',
            'cs:id,name', 'teller:id,name', 'sales:id,name', 'yayasan:id,nama',
            'items.hewan:id,no_hewan',
            'items.kelas:id,kode',
        ]);

        return response()->json(['transaksi' => $transaksi]);
    }

    public function store(StoreTransaksiRequest $request): JsonResponse
    {
        $data               = $request->validated();
        $items              = $data['items'] ?? [];
        $totalHarga         = collect($items)->sum('harga');
        $totalBiayaTambahan = ($data['ongkos_kirim'] ?? 0) + ($data['biaya_potong'] ?? 0);

        $hasPreorder = collect($items)->contains('is_preorder', true);
        $status      = $hasPreorder
            ? StatusTransaksi::MENUNGGU_HEWAN->value
            : StatusTransaksi::HEWAN_TERALOKASI->value;

        // Validate slots are available before starting transaction
        foreach ($items as $item) {
            if (($item['satuan'] ?? 'EKOR') === 'SLOT' && !($item['is_preorder'] ?? false) && !empty($item['hewan_id'])) {
                $taken     = SlotSapi::where('hewan_id', $item['hewan_id'])->pluck('no_slot')->toArray();
                $available = array_diff(range(1, 7), $taken);
                abort_if(empty($available), 422, "Slot sapi #{$item['hewan_id']} sudah penuh.");
            }
        }

        $transaksi = DB::transaction(function () use ($data, $items, $totalHarga, $totalBiayaTambahan, $status) {
            $noFaktur = $this->svc->generateNoFaktur($data['depot_id'], $data['musim']);

            $transaksi = Transaksi::create(array_merge(
                Arr::except($data, ['items']),
                [
                    'no_faktur'        => $noFaktur,
                    'harga'            => $totalHarga,
                    'total'            => $totalHarga + $totalBiayaTambahan,
                    'status_transaksi' => $status,
                ]
            ));

            foreach ($items as $item) {
                TransaksiItem::create(array_merge($item, ['transaksi_id' => $transaksi->id]));

                if (!($item['is_preorder'] ?? false) && !empty($item['hewan_id'])) {
                    $satuan = $item['satuan'] ?? 'EKOR';

                    if ($satuan === 'SLOT') {
                        $taken     = SlotSapi::where('hewan_id', $item['hewan_id'])->lockForUpdate()->pluck('no_slot')->toArray();
                        $available = array_diff(range(1, 7), $taken);
                        abort_if(empty($available), 422, "Slot sapi #{$item['hewan_id']} sudah penuh.");
                        $noSlot    = min($available);

                        SlotSapi::create([
                            'hewan_id'    => $item['hewan_id'],
                            'no_slot'     => $noSlot,
                            'transaksi_id'=> $transaksi->id,
                            'customer_id' => $data['customer_id'],
                            'nama_qurban' => $item['nama_qurban'] ?? null,
                            'tipe_qurban' => $item['tipe_qurban'],
                            'harga_slot'  => $item['harga'],
                            'status_bayar'=> 'DP',
                        ]);

                        $hewan = Hewan::find($item['hewan_id']);
                        if ($hewan) {
                            $slotCount = SlotSapi::where('hewan_id', $hewan->id)->count();
                            $hewan->update(['status' => $slotCount >= 7
                                ? StatusHewan::SOLD->value
                                : StatusHewan::BOOKED->value]);
                        }
                    } else {
                        Hewan::where('id', $item['hewan_id'])->update(['status' => StatusHewan::BOOKED->value]);
                    }
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
