<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id' => ['nullable', 'exists:depots,id'],
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role'     => ['required', Rule::enum(UserRole::class)],
            'divisi'   => ['nullable', 'string', 'max:100'],
            'phone'    => ['nullable', 'string', 'max:20'],
        ];
    }
}
