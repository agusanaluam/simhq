<?php

namespace App\Http\Controllers;

use App\Models\Rab;
use App\Models\RabKategori;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RabKategoriController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => RabKategori::where('is_active', true)->orderBy('nama')->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama' => ['required', 'string', 'max:100', 'unique:rab_kategori,nama'],
        ]);
        $kategori = RabKategori::create(array_merge($data, ['is_active' => true]));
        return response()->json(['kategori' => $kategori], 201);
    }

    public function update(Request $request, RabKategori $rabKategori): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['sometimes', 'filled', 'string', 'max:100', 'unique:rab_kategori,nama,' . $rabKategori->id],
            'is_active' => ['sometimes', 'boolean'],
        ]);
        $rabKategori->update($data);
        return response()->json(['kategori' => $rabKategori->fresh()]);
    }

    public function destroy(RabKategori $rabKategori): JsonResponse
    {
        if (Rab::where('kategori_id', $rabKategori->id)->exists()) {
            return response()->json(['message' => 'Kategori sudah digunakan di RAB, tidak dapat dihapus.'], 422);
        }
        $rabKategori->delete();
        return response()->json(null, 204);
    }
}
