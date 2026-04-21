<?php
namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

class StoreHargaRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'   => ['required', 'exists:depots,id'],
            'kelas_id'   => ['required', 'exists:kelas_hewan,id'],
            'jenis'      => ['required', 'in:SAPI,DOMBA'],
            'musim'      => ['required', 'integer', 'min:2020', 'max:2100'],
            'harga_beli' => ['required', 'integer', 'min:0'],
            'harga_jual' => ['required', 'integer', 'gt:harga_beli'],
            'fee_sales'  => ['sometimes', 'integer', 'min:0'],
        ];
    }

    public function messages(): array
    {
        return ['harga_jual.gt' => 'Harga jual harus lebih besar dari harga beli.'];
    }
}
