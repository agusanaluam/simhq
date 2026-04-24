<?php

namespace App\Http\Controllers;

use App\Models\CicilanKasbon;
use App\Models\Kasbon;
use App\Models\Karyawan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KasbonController extends Controller
{

    public function index(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $query = Kasbon::where('depot_id', $depotId)
            ->with('karyawan:id,nama,divisi', 'cicilan')
            ->orderBy('created_at', 'desc');

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->karyawan_id) {
            $query->where('karyawan_id', $request->karyawan_id);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        $data = $request->validate([
            'karyawan_id' => ['required', 'integer', 'exists:karyawan,id'],
            'nominal'     => ['required', 'integer', 'min:1'],
            'alasan'      => ['required', 'string'],
        ]);

        abort_unless(
            Karyawan::where('id', $data['karyawan_id'])->where('depot_id', $depotId)->exists(),
            403
        );

        $kasbon = Kasbon::create(array_merge($data, [
            'depot_id' => $depotId,
            'status'   => 'PENDING',
        ]));

        return response()->json(['kasbon' => $kasbon->load('karyawan:id,nama')], 201);
    }

    public function approve(Request $request, Kasbon $kasbon): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $kasbon->depot_id === (int) $depotId, 403);

        $data = $request->validate([
            'nominal_cicilan' => ['required', 'integer', 'min:1'],
            'jumlah_cicil'    => ['required', 'integer', 'min:1'],
            'tgl_mulai'       => ['required', 'date'],
        ]);

        $kasbon->update([
            'status'      => 'APPROVED',
            'approved_by' => $user->id,
            'tgl_approve' => today()->toDateString(),
        ]);

        CicilanKasbon::create(array_merge($data, [
            'kasbon_id'      => $kasbon->id,
            'cicil_terbayar' => 0,
        ]));

        return response()->json(['kasbon' => $kasbon->fresh()->load('karyawan:id,nama', 'cicilan')]);
    }

    public function reject(Request $request, Kasbon $kasbon): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $kasbon->depot_id === (int) $depotId, 403);

        $kasbon->update(['status' => 'REJECTED']);

        return response()->json(['kasbon' => $kasbon->fresh()]);
    }
}
