<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\LogInteraksi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Customer::query();

        if ($q = $request->input('q')) {
            $query->where(fn($b) =>
                $b->where('nama', 'like', "%{$q}%")
                  ->orWhere('hp', 'like', "%{$q}%")
            );
        }

        if ($wilayah = $request->input('wilayah')) {
            $query->where('kota', 'like', "%{$wilayah}%");
        }

        return response()->json(['data' => $query->orderBy('nama')->limit(100)->get()]);
    }

    public function show(Customer $customer): JsonResponse
    {
        $transaksi = $customer->transaksi()
            ->with('kelas:id,kode,nama')
            ->orderBy('musim', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $isRepeat = $transaksi->pluck('musim')->unique()->count() > 1;

        $logs = $customer->logs()
            ->with('cs:id,name')
            ->orderBy('tanggal', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'customer'  => $customer,
            'transaksi' => $transaksi,
            'logs'      => $logs,
            'is_repeat' => $isRepeat,
        ]);
    }

    public function update(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'nama'      => ['sometimes', 'string', 'max:150'],
            'hp'        => ['sometimes', 'string', 'max:20'],
            'alamat'    => ['nullable', 'string'],
            'kelurahan' => ['nullable', 'string', 'max:100'],
            'kecamatan' => ['nullable', 'string', 'max:100'],
            'kota'      => ['nullable', 'string', 'max:100'],
        ]);

        $customer->update($data);

        return response()->json(['customer' => $customer]);
    }

    public function storeLog(Request $request, Customer $customer): JsonResponse
    {
        $data = $request->validate([
            'tanggal' => ['required', 'date'],
            'channel' => ['required', 'in:WA,TELEPON,EMAIL'],
            'isi'     => ['required', 'string'],
        ]);

        $log = LogInteraksi::create(array_merge($data, [
            'customer_id' => $customer->id,
            'cs_id'       => $request->user()?->id,
        ]));

        return response()->json(['log' => $log->load('cs:id,name')], 201);
    }

    public function retargeting(Request $request): JsonResponse
    {
        $musim     = (int) $request->input('musim', date('Y'));
        $prevMusim = $musim - 1;

        $customers = Customer::whereHas('transaksi', fn($q) => $q->where('musim', $prevMusim))
            ->whereDoesntHave('transaksi', fn($q) => $q->where('musim', $musim))
            ->with(['transaksi' => fn($q) => $q->where('musim', $prevMusim)
                ->select('id', 'customer_id', 'jenis', 'harga', 'musim', 'status_transaksi')
                ->orderBy('id')])
            ->orderBy('nama')
            ->limit(200)
            ->get();

        return response()->json([
            'data'       => $customers,
            'musim'      => $musim,
            'prev_musim' => $prevMusim,
        ]);
    }
}
