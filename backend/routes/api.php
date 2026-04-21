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

    // Master Data
    Route::prefix('master')->group(function () {
        Route::get('kelas',   [\App\Http\Controllers\Master\KelasController::class,   'index']);
        Route::get('harga',   [\App\Http\Controllers\Master\HargaController::class,   'index']);
        Route::get('yayasan', [\App\Http\Controllers\Master\YayasanController::class, 'index']);

        Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
            Route::post('harga',              [\App\Http\Controllers\Master\HargaController::class,   'store']);
            Route::put('harga/{harga}',       [\App\Http\Controllers\Master\HargaController::class,   'update']);
            Route::post('yayasan',            [\App\Http\Controllers\Master\YayasanController::class, 'store']);
            Route::put('yayasan/{yayasan}',   [\App\Http\Controllers\Master\YayasanController::class, 'update']);
        });
    });

    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
        Route::get('karyawan',              [\App\Http\Controllers\Master\KaryawanController::class, 'index']);
        Route::post('karyawan',             [\App\Http\Controllers\Master\KaryawanController::class, 'store']);
        Route::put('karyawan/{karyawan}',   [\App\Http\Controllers\Master\KaryawanController::class, 'update']);
    });
});
