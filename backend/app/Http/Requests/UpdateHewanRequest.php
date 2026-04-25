<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'kelas_jual_id' => ['sometimes', 'nullable', 'exists:kelas_hewan,id'],
            'bobot_terkini' => ['sometimes', 'numeric', 'min:0'],
            'status'        => ['sometimes', 'in:AVAILABLE,BOOKED,SOLD,DELIVERED,MATI'],
            'petak_id'      => ['sometimes', 'nullable', 'integer'],
        ];
    }
}
