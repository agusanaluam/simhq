<?php
namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

class StoreYayasanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'nama'       => ['required', 'string', 'max:255'],
            'alamat'     => ['sometimes', 'nullable', 'string'],
            'kontak_pic' => ['sometimes', 'nullable', 'string', 'max:255'],
            'telepon'    => ['sometimes', 'nullable', 'string', 'max:30'],
        ];
    }
}
