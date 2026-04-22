<?php
// backend/app/Http/Requests/StoreSlotRequest.php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSlotRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'no_slot'     => ['required', 'integer', 'min:1', 'max:7'],
            'customer_id' => ['required', 'exists:customers,id'],
            'transaksi_id'=> ['nullable', 'exists:transaksi,id'],
            'nama_qurban' => ['required', 'string', 'max:150'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'harga_slot'  => ['required', 'integer', 'min:0'],
            'status_bayar'=> ['required', 'in:DP,LUNAS'],
        ];
    }
}
