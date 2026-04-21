<?php

use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // SUPER_ADMIN only
    Route::middleware('role:SUPER_ADMIN')->group(function () {
        Route::apiResource('users', UserController::class);
        Route::apiResource('depots', DepotController::class);
    });
});
