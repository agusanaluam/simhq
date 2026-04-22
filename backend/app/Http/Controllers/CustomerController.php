<?php
namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CustomerController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $customers = Customer::when(
                $request->q,
                fn($query) => $query->where('nama', 'ilike', "%{$request->q}%")
                    ->orWhere('hp', 'ilike', "%{$request->q}%")
            )
            ->orderBy('nama')
            ->limit(20)
            ->get();

        return response()->json(['data' => $customers]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['required', 'string', 'max:150'],
            'hp'        => ['nullable', 'string', 'max:20'],
            'alamat'    => ['nullable', 'string'],
            'kelurahan' => ['nullable', 'string', 'max:100'],
            'kecamatan' => ['nullable', 'string', 'max:100'],
            'kota'      => ['nullable', 'string', 'max:100'],
        ]);

        $customer = Customer::create($data);

        return response()->json(['customer' => $customer], 201);
    }
}
