<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\Karyawan;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class UserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $users = User::with('depot:id,nama')
            ->when($request->role, fn($q) => $q->whereIn('role', explode(',', $request->role)))
            ->orderBy('name')
            ->paginate(50);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        return DB::transaction(function () use ($request) {
            $user = User::create($request->only([
                'depot_id', 'name', 'email', 'password', 'role', 'divisi', 'phone',
            ]));

            if ($request->boolean('buat_karyawan')) {
                Karyawan::create([
                    'user_id'      => $user->id,
                    'depot_id'     => $user->depot_id,
                    'nama'         => $user->name,
                    'divisi'       => $user->divisi,
                    'tarif_harian' => (int) $request->tarif_harian,
                    'berlaku_dari' => $request->berlaku_dari,
                    'is_active'    => true,
                ]);
            }

            return response()->json(['user' => $user], 201);
        });
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['user' => $user->load('depot:id,nama')]);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user->update($request->validated());

        return response()->json(['user' => $user->fresh()]);
    }

    public function destroy(User $user): JsonResponse
    {
        $user->delete();

        return response()->json(['message' => 'User dinonaktifkan.']);
    }
}
