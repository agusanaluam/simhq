<?php

namespace App\Http\Controllers;

use App\Models\WaLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WaLogController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = WaLog::where('depot_id', $depotId)
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return response()->json(['data' => $data]);
    }
}
