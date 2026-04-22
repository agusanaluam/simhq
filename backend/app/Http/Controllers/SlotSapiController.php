<?php
// backend/app/Http/Controllers/SlotSapiController.php
namespace App\Http\Controllers;

use App\Enums\StatusHewan;
use App\Http\Requests\StoreSlotRequest;
use App\Models\Hewan;
use App\Models\SlotSapi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SlotSapiController extends Controller
{
    public function dashboard(Request $request): JsonResponse
    {
        $sapi = Hewan::with('kelasJual:id,kode')
            ->where('jenis', 'SAPI')
            ->when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->whereNotIn('status', ['MATI', 'DELIVERED'])
            ->orderBy('no_hewan')
            ->withCount('slotSapi')
            ->get()
            ->map(fn(Hewan $h) => array_merge($h->toArray(), [
                'slot_terisi' => $h->slot_sapi_count,
                'slot_total'  => 7,
            ]));

        return response()->json(['data' => $sapi]);
    }

    public function index(Hewan $hewan): JsonResponse
    {
        $filled = SlotSapi::with('customer:id,nama,hp')
            ->where('hewan_id', $hewan->id)
            ->get()
            ->keyBy('no_slot');

        $slots = collect(range(1, 7))->map(fn($n) => $filled->has($n)
            ? $filled->get($n)
            : ['no_slot' => $n, 'status' => 'KOSONG']
        );

        return response()->json([
            'hewan' => $hewan->only(['id', 'no_hewan', 'jenis', 'status', 'bobot_masuk']),
            'slots' => $slots,
        ]);
    }

    public function store(StoreSlotRequest $request, Hewan $hewan): JsonResponse
    {
        abort_if($hewan->jenis !== 'SAPI', 422, 'Slot hanya untuk SAPI.');

        $exists = SlotSapi::where('hewan_id', $hewan->id)
            ->where('no_slot', $request->no_slot)
            ->exists();

        abort_if($exists, 422, "Slot {$request->no_slot} sudah terisi.");

        $slot = SlotSapi::create(array_merge(
            $request->validated(),
            ['hewan_id' => $hewan->id]
        ));

        $this->syncHewanStatus($hewan);

        return response()->json(['slot' => $slot->load('customer:id,nama,hp')], 201);
    }

    public function update(Request $request, Hewan $hewan, int $noSlot): JsonResponse
    {
        $slot = SlotSapi::where('hewan_id', $hewan->id)
            ->where('no_slot', $noSlot)
            ->firstOrFail();

        $data = $request->validate([
            'customer_id' => ['sometimes', 'exists:customers,id'],
            'nama_qurban' => ['sometimes', 'string', 'max:150'],
            'tipe_qurban' => ['sometimes', 'in:SHQ,THQ,PHQ'],
            'harga_slot'  => ['sometimes', 'integer', 'min:0'],
            'status_bayar'=> ['sometimes', 'in:DP,LUNAS'],
        ]);

        $slot->update($data);

        return response()->json(['slot' => $slot->fresh()->load('customer:id,nama,hp')]);
    }

    public function destroy(Hewan $hewan, int $noSlot): JsonResponse
    {
        $slot = SlotSapi::where('hewan_id', $hewan->id)
            ->where('no_slot', $noSlot)
            ->firstOrFail();

        $slot->delete();

        $this->syncHewanStatus($hewan);

        return response()->json(['message' => "Slot {$noSlot} berhasil dikosongkan."]);
    }

    private function syncHewanStatus(Hewan $hewan): void
    {
        $count = SlotSapi::where('hewan_id', $hewan->id)->count();

        $status = match(true) {
            $count >= 7 => StatusHewan::SOLD->value,
            $count > 0  => StatusHewan::BOOKED->value,
            default     => StatusHewan::AVAILABLE->value,
        };

        $hewan->update(['status' => $status]);
    }
}
