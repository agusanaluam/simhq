<?php

namespace App\Http\Controllers;

use App\Models\OrderKatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CsOrderController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = OrderKatalog::where('depot_id', $depotId)
            ->with('cs:id,name')
            ->orderBy('created_at', 'desc');

        if ($request->status) {
            $query->where('status', $request->status);
        }

        return response()->json(['data' => $query->paginate(50)]);
    }

    public function updateStatus(Request $request, OrderKatalog $order): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $order->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'status' => ['required', 'in:BARU,DIKONFIRMASI,DP_DIBAYAR,LUNAS,DIJADWALKAN,DIBATALKAN'],
        ]);

        $order->update($data);

        return response()->json(['order' => $order]);
    }
}
