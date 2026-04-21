<?php

namespace App\Http\Requests;

use App\Enums\UserRole;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'depot_id'  => ['sometimes', 'nullable', 'exists:depots,id'],
            'name'      => ['sometimes', 'string', 'max:255'],
            'email'     => ['sometimes', 'email', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'password'  => ['sometimes', 'string', 'min:8'],
            'role'      => ['sometimes', Rule::enum(UserRole::class)],
            'divisi'    => ['sometimes', 'nullable', 'string', 'max:100'],
            'phone'     => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
