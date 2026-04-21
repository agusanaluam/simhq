<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StorePetakRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'depot_id'      => ['required', 'exists:depots,id'],
            'no_petak'      => ['required', 'string', 'max:20'],
            'jenis_kandang' => ['required', 'in:SAPI,DOMBA'],
            'kapasitas'     => ['required', 'integer', 'min:1', 'max:100'],
            'kelas_id'      => ['nullable', 'exists:kelas_hewan,id'],
            'posisi_x'      => ['required', 'integer', 'min:0'],
            'posisi_y'      => ['required', 'integer', 'min:0'],
        ];
    }
}
