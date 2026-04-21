<?php

namespace App\Http\Controllers;

use App\Models\Depot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepotController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Depot::all()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'   => ['required', 'string', 'max:255'],
            'alamat' => ['nullable', 'string'],
            'kota'   => ['nullable', 'string', 'max:100'],
        ]);

        $depot = Depot::create($data);

        return response()->json(['depot' => $depot], 201);
    }

    public function show(Depot $depot): JsonResponse
    {
        return response()->json(['depot' => $depot->load('users')]);
    }

    public function update(Request $request, Depot $depot): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['sometimes', 'string', 'max:255'],
            'alamat'    => ['sometimes', 'nullable', 'string'],
            'kota'      => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $depot->update($data);

        return response()->json(['depot' => $depot->fresh()]);
    }

    public function destroy(Depot $depot): JsonResponse
    {
        $depot->update(['is_active' => false]);

        return response()->json(['message' => 'Depot dinonaktifkan.']);
    }
}
