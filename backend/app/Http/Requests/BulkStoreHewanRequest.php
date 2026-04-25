<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class BulkStoreHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'             => ['required', 'exists:depots,id'],
            'supplier_id'          => ['nullable', 'exists:supplier,id'],
            'jenis'                => ['required', 'in:SAPI,DOMBA'],
            'tgl_masuk'            => ['required', 'date'],
            'musim'                => ['required', 'integer', 'min:2020', 'max:2100'],
            'rows'                 => ['required', 'array', 'min:1', 'max:50'],
            'rows.*.kelas_asal_id' => ['required', 'exists:kelas_hewan,id'],
            'rows.*.kelas_jual_id' => ['required', 'exists:kelas_hewan,id'],
            'rows.*.bobot_masuk'   => ['required', 'numeric', 'min:1'],
        ];
    }
}
