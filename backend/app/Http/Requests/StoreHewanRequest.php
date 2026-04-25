<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'depot_id'      => ['required', 'exists:depots,id'],
            'supplier_id'   => ['nullable', 'exists:supplier,id'],
            'kelas_asal_id' => ['required', 'exists:kelas_hewan,id'],
            'kelas_jual_id' => ['nullable', 'exists:kelas_hewan,id'],
            'jenis'         => ['required', 'in:SAPI,DOMBA'],
            'bobot_masuk'   => ['required', 'numeric', 'min:0'],
            'tgl_masuk'     => ['required', 'date'],
            'musim'         => ['required', 'integer', 'min:2020', 'max:2100'],
            'petak_id'      => ['nullable', 'integer'],
        ];
    }
}
