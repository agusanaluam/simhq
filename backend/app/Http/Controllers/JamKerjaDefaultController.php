<?php
namespace App\Http\Controllers;

use App\Models\JamKerjaDefault;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class JamKerjaDefaultController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $data = JamKerjaDefault::when($request->depot, fn($q) => $q->where('depot_id', $request->depot))
            ->orderBy('divisi')
            ->get();

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'depot_id'        => ['required', 'exists:depots,id'],
            'divisi'          => ['required', 'string', 'max:100'],
            'jam_masuk'       => ['required', 'date_format:H:i'],
            'jam_keluar'      => ['required', 'date_format:H:i'],
            'toleransi_menit' => ['sometimes', 'integer', 'min:0', 'max:120'],
        ]);

        // Convert HH:MM → HH:MM:SS for storage
        $data['jam_masuk']  .= ':00';
        $data['jam_keluar'] .= ':00';

        $jamKerja = JamKerjaDefault::updateOrCreate(
            ['depot_id' => $data['depot_id'], 'divisi' => $data['divisi']],
            $data
        );

        return response()->json(['jam_kerja' => $jamKerja], 201);
    }

    public function update(Request $request, JamKerjaDefault $jamKerja): JsonResponse
    {
        $data = $request->validate([
            'jam_masuk'       => ['sometimes', 'date_format:H:i'],
            'jam_keluar'      => ['sometimes', 'date_format:H:i'],
            'toleransi_menit' => ['sometimes', 'integer', 'min:0', 'max:120'],
        ]);

        if (isset($data['jam_masuk']))  $data['jam_masuk']  .= ':00';
        if (isset($data['jam_keluar'])) $data['jam_keluar'] .= ':00';

        $jamKerja->update($data);

        return response()->json(['jam_kerja' => $jamKerja->fresh()]);
    }
}
