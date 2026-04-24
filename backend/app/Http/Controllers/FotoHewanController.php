<?php

namespace App\Http\Controllers;

use App\Models\FotoHewan;
use App\Models\Hewan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class FotoHewanController extends Controller
{
    public function index(Hewan $hewan): JsonResponse
    {
        return response()->json([
            'data' => $hewan->fotos()->orderBy('urutan')->get(),
        ]);
    }

    public function store(Request $request, Hewan $hewan): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $hewan->depot_id === (int) $depotId, 403);

        if ($hewan->fotos()->count() >= 2) {
            return response()->json(['message' => 'Maksimal 2 foto per hewan.'], 422);
        }

        $request->validate([
            'foto'   => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'urutan' => ['required', 'integer', 'in:1,2'],
        ]);

        $path = $request->file('foto')->store("hewan/{$hewan->id}", 'public');

        $foto = FotoHewan::create([
            'hewan_id'  => $hewan->id,
            'url'       => $path,
            'urutan'    => $request->urutan,
            'upload_by' => $user->id,
        ]);

        return response()->json([
            'foto' => $foto,
            'url'  => Storage::disk('public')->url($path),
        ], 201);
    }

    public function destroy(Request $request, Hewan $hewan, FotoHewan $foto): JsonResponse
    {
        $user    = $request->user();
        $depotId = $user->isSuperAdmin() ? ($request->depot_id ?? $user->depot_id) : $user->depot_id;

        abort_unless((int) $hewan->depot_id === (int) $depotId, 403);
        abort_unless((int) $foto->hewan_id === (int) $hewan->id, 422);

        Storage::disk('public')->delete($foto->url);
        $foto->delete();

        return response()->json(['message' => 'Foto dihapus.']);
    }
}
