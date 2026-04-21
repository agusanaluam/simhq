<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::with('depot:id,nama')
            ->orderBy('name')
            ->paginate(50);

        return response()->json($users);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create($request->validated());

        return response()->json(['user' => $user], 201);
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
