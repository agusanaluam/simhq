<?php
namespace App\Http\Controllers;

use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SupplierController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Supplier::where('is_active', true)->orderBy('nama')->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'   => ['required', 'string', 'max:255'],
            'kontak' => ['nullable', 'string', 'max:100'],
            'alamat' => ['nullable', 'string'],
            'is_gum' => ['sometimes', 'boolean'],
        ]);

        return response()->json(['supplier' => Supplier::create($data)], 201);
    }
}
