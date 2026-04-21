<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password) || ! $user->is_active) {
            throw ValidationException::withMessages([
                'email' => ['Kredensial tidak valid atau akun nonaktif.'],
            ]);
        }

        $token = $user->createToken('auth_token', ['*'], now()->addHours(8))->plainTextToken;

        return response()->json([
            'token' => $token,
            'user'  => [
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'role'     => $user->role->value,
                'depot_id' => $user->depot_id,
                'divisi'   => $user->divisi,
            ],
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load('depot:id,nama');

        return response()->json([
            'user' => [
                'id'       => $user->id,
                'name'     => $user->name,
                'email'    => $user->email,
                'role'     => $user->role->value,
                'depot_id' => $user->depot_id,
                'depot'    => $user->depot,
                'divisi'   => $user->divisi,
                'phone'    => $user->phone,
            ],
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }
}
