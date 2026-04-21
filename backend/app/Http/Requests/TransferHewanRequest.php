<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TransferHewanRequest extends FormRequest
{
    public function authorize(): bool { return true; }
    public function rules(): array {
        return [
            'ke_petak_id' => ['required', 'integer'],
            'catatan'     => ['nullable', 'string', 'max:500'],
        ];
    }
}
