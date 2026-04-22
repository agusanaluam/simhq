<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreTransaksiRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'    => ['required', 'exists:depots,id'],
            'hewan_id'    => ['nullable', 'exists:hewan,id'],
            'customer_id' => ['required', 'exists:customers,id'],
            'cs_id'       => ['nullable', 'exists:users,id'],
            'teller_id'   => ['nullable', 'exists:users,id'],
            'sales_id'    => ['nullable', 'exists:users,id'],
            'yayasan_id'  => ['nullable', 'exists:yayasan,id'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'jenis'       => ['required', 'in:SAPI,DOMBA'],
            'kelas_id'    => ['required', 'exists:kelas_hewan,id'],
            'musim'       => ['required', 'integer', 'min:2020', 'max:2100'],
            'catatan'     => ['nullable', 'string', 'max:500'],
        ];
    }
}
