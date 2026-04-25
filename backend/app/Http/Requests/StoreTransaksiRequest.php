<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTransaksiRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'    => ['required', 'exists:depots,id'],
            'hewan_id'    => ['nullable', Rule::exists('hewan', 'id')->where('status', 'AVAILABLE')],
            'customer_id' => ['required', 'exists:customers,id'],
            'cs_id'       => ['nullable', 'exists:users,id'],
            'teller_id'   => ['nullable', 'exists:users,id'],
            'sales_id'    => ['nullable', 'exists:users,id'],
            'yayasan_id'  => ['nullable', 'exists:yayasan,id'],
            'tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'jenis'       => ['required', 'in:SAPI,DOMBA'],
            'kelas_id'    => ['required', 'exists:kelas_hewan,id'],
            'musim'       => ['required', 'integer', 'min:2020', 'max:2100'],
            'catatan'           => ['nullable', 'string', 'max:500'],
            'sales_nama'        => ['nullable', 'string', 'max:100'],
            'rencana_pelunasan' => ['nullable', 'date'],
        ];
    }
}
