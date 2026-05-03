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
            'customer_id' => ['required', 'exists:customers,id'],
            'cs_id'       => ['nullable', 'exists:users,id'],
            'teller_id'   => ['nullable', 'exists:users,id'],
            'sales_id'    => ['nullable', 'exists:users,id'],
            'yayasan_id'  => ['nullable', 'exists:yayasan,id'],
            'musim'       => ['required', 'integer', 'min:2020', 'max:2100'],
            'catatan'     => ['nullable', 'string', 'max:500'],
            'sales_nama'        => ['nullable', 'string', 'max:100'],
            'rencana_pelunasan' => ['nullable', 'date'],
            'ongkos_kirim' => ['nullable', 'integer', 'min:0'],
            'biaya_potong' => ['nullable', 'integer', 'min:0'],

            // Legacy single-item fields (nullable for backward compat)
            'hewan_id'    => ['nullable', 'exists:hewan,id'],
            'jenis'       => ['nullable', 'in:SAPI,DOMBA'],
            'kelas_id'    => ['nullable', 'exists:kelas_hewan,id'],
            'tipe_qurban' => ['nullable', 'in:SHQ,THQ,PHQ'],

            // Cart items
            'items'               => ['required', 'array', 'min:1'],
            'items.*.hewan_id'    => ['nullable', 'exists:hewan,id'],
            'items.*.jenis'       => ['required', 'in:SAPI,DOMBA'],
            'items.*.kelas_id'    => ['required', 'exists:kelas_hewan,id'],
            'items.*.tipe_qurban' => ['required', 'in:SHQ,THQ,PHQ'],
            'items.*.harga'       => ['required', 'integer', 'min:0'],
            'items.*.is_preorder' => ['required', 'boolean'],
        ];
    }
}
