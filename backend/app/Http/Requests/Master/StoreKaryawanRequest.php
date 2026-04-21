<?php
namespace App\Http\Requests\Master;

use Illuminate\Foundation\Http\FormRequest;

class StoreKaryawanRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'    => ['required', 'exists:depots,id'],
            'user_id'     => ['sometimes', 'nullable', 'exists:users,id'],
            'nama'        => ['required', 'string', 'max:255'],
            'divisi'      => ['required', 'string', 'max:100'],
            'tarif_harian'=> ['required', 'integer', 'min:0'],
            'berlaku_dari'=> ['required', 'date'],
        ];
    }
}
