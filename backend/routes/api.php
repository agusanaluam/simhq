<?php

use App\Http\Controllers\AbsensiController;
use App\Http\Controllers\Auth\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DepotController;
use App\Http\Controllers\HewanController;
use App\Http\Controllers\JamKerjaDefaultController;
use App\Http\Controllers\PembayaranController;
use App\Http\Controllers\PetakController;
use App\Http\Controllers\SlotSapiController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\TransaksiController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

// Public
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
});

// Public Catalog (no auth)
Route::get('katalog',        [\App\Http\Controllers\KatalogController::class, 'catalog']);
Route::post('katalog/order', [\App\Http\Controllers\KatalogController::class, 'order'])
     ->middleware('throttle:10,1');

// Authenticated
Route::middleware('auth:sanctum')->group(function () {
    Route::prefix('auth')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
    });

    // Dashboard
    Route::get('dashboard/depot', [\App\Http\Controllers\DashboardController::class, 'depot']);

    // Keuangan BIOP
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
        Route::get('keuangan/kas/export',        [\App\Http\Controllers\KasController::class,       'export']);
        Route::get('keuangan/kas',               [\App\Http\Controllers\KasController::class,       'index']);
        Route::post('keuangan/kas',              [\App\Http\Controllers\KasController::class,       'store']);
        Route::get('keuangan/saldo',             [\App\Http\Controllers\KasController::class,       'saldo']);
        Route::get('keuangan/cashflow',          [\App\Http\Controllers\KasController::class,       'cashflow']);
        // Setoran GUM — posisi MUST be before the GET collection route
        Route::get('keuangan/setoran-gum/posisi', [\App\Http\Controllers\SetoranGumController::class, 'posisi']);
        Route::get('keuangan/setoran-gum',        [\App\Http\Controllers\SetoranGumController::class, 'index']);
        Route::post('keuangan/setoran-gum',       [\App\Http\Controllers\SetoranGumController::class, 'store']);
        // RAB — summary static route MUST come before {rab} wildcard
        Route::get('keuangan/rab/summary',         [\App\Http\Controllers\RabController::class, 'summary']);
        Route::post('keuangan/rab',                 [\App\Http\Controllers\RabController::class, 'store']);
        Route::get('keuangan/rab/{rab}/realisasi',  [\App\Http\Controllers\RabController::class, 'indexRealisasi']);
        Route::post('keuangan/rab/{rab}/realisasi', [\App\Http\Controllers\RabController::class, 'storeRealisasi']);
    });

    // SDM — Upah Harian
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
        Route::post('sdm/tarif',       [\App\Http\Controllers\SdmController::class, 'setTarif']);
        Route::get('sdm/tarif',        [\App\Http\Controllers\SdmController::class, 'listTarif']);
        Route::get('sdm/upah/export',  [\App\Http\Controllers\SdmController::class, 'export']);
        Route::get('sdm/upah',         [\App\Http\Controllers\SdmController::class, 'upah']);
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

    // Hewan — static routes MUST come before {hewan} wildcard
    Route::get('hewan/statistik',  [HewanController::class, 'statistik']);
    Route::get('hewan/cetak-label',[HewanController::class, 'cetakLabel']);
    Route::get('hewan',            [HewanController::class, 'index']);

    // Slot Sapi — static dashboard route before {hewan} wildcard
    Route::get('hewan/sapi/ploting', [SlotSapiController::class, 'dashboard']);

    // Slot CRUD
    Route::get('hewan/{hewan}/slot', [SlotSapiController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_ANGGOTA')->group(function () {
        Route::post('hewan/{hewan}/slot',            [SlotSapiController::class, 'store']);
        Route::put('hewan/{hewan}/slot/{noSlot}',    [SlotSapiController::class, 'update']);
        Route::delete('hewan/{hewan}/slot/{noSlot}', [SlotSapiController::class, 'destroy']);
    });

    // Foto Hewan
    Route::get('hewan/{hewan}/foto', [\App\Http\Controllers\FotoHewanController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA,KANDANG_SAPI_ANGGOTA,KANDANG_DOMBA_ANGGOTA')->group(function () {
        Route::post('hewan/{hewan}/foto',          [\App\Http\Controllers\FotoHewanController::class, 'store']);
        Route::delete('hewan/{hewan}/foto/{foto}', [\App\Http\Controllers\FotoHewanController::class, 'destroy']);
    });

    Route::get('hewan/{hewan}',    [HewanController::class, 'show']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA')->group(function () {
        Route::post('hewan',                    [HewanController::class, 'store']);
        Route::put('hewan/{hewan}',             [HewanController::class, 'update']);
        Route::post('hewan/{hewan}/transfer',   [HewanController::class, 'transfer']);
    });

    // Supplier
    Route::get('supplier', [SupplierController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
        Route::post('supplier', [SupplierController::class, 'store']);
    });

    // Petak Kandang — static routes before wildcard
    Route::get('petak', [PetakController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA')->group(function () {
        Route::post('petak/layout',  [PetakController::class, 'saveLayout']);
        Route::post('petak',         [PetakController::class, 'store']);
        Route::put('petak/{petak}',  [PetakController::class, 'update']);
    });

    // Pembayaran routes
    Route::get('transaksi/{transaksi}/pembayaran', [PembayaranController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_ANGGOTA')->group(function () {
        Route::post('transaksi/{transaksi}/bayar',          [PembayaranController::class, 'store']);
        Route::post('transaksi/{transaksi}/biaya-tambahan', [PembayaranController::class, 'storeBiaya']);
    });

    // Laporan
    Route::get('laporan/rekap-setoran', [PembayaranController::class, 'rekapSetoran']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
        Route::get('laporan/income-statement/export', [\App\Http\Controllers\IncomeStatementController::class, 'export']);
        Route::get('laporan/income-statement',         [\App\Http\Controllers\IncomeStatementController::class, 'generate']);
    });

    // Absensi — static routes ordered: export before rekap, checkin/checkout before wildcards
    Route::prefix('absensi')->group(function () {
        Route::get('hari-ini',     [AbsensiController::class, 'hariIni']);
        Route::get('rekap/export', [AbsensiController::class, 'exportCsv']);
        Route::get('rekap',        [AbsensiController::class, 'rekap']);

        // Jam kerja default
        Route::get('jam-kerja', [JamKerjaDefaultController::class, 'index']);
        Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT')->group(function () {
            Route::post('jam-kerja',           [JamKerjaDefaultController::class, 'store']);
            Route::put('jam-kerja/{jamKerja}', [JamKerjaDefaultController::class, 'update']);
        });

        Route::post('checkin',     [AbsensiController::class, 'checkIn']);
        Route::post('checkout',    [AbsensiController::class, 'checkOut']);
        Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,KANDANG_SAPI_KETUA,KANDANG_DOMBA_KETUA')
            ->group(function () {
                Route::post('manual', [AbsensiController::class, 'manual']);
            });
    });

    // Customer
    Route::get('customer',  [CustomerController::class, 'index']);
    Route::post('customer', [CustomerController::class, 'store']);

    // Transaksi — static action routes BEFORE {transaksi} wildcard
    Route::get('transaksi',             [TransaksiController::class, 'index']);
    Route::get('transaksi/{transaksi}', [TransaksiController::class, 'show']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_ANGGOTA')->group(function () {
        Route::post('transaksi',                            [TransaksiController::class, 'store']);
        Route::put('transaksi/{transaksi}/assign-hewan',    [TransaksiController::class, 'assignHewan']);
        Route::put('transaksi/{transaksi}/konfirmasi',      [TransaksiController::class, 'konfirmasi']);
        Route::put('transaksi/{transaksi}/batal',           [TransaksiController::class, 'batal']);
    });

    // CS Order Management
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,CS_KETUA,CS_ANGGOTA,ADMIN_KETUA')->group(function () {
        Route::get('cs/order',                     [\App\Http\Controllers\CsOrderController::class, 'index']);
        Route::put('cs/order/{order}/status',       [\App\Http\Controllers\CsOrderController::class, 'updateStatus']);
    });

    // CRM
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,CS_KETUA,CS_ANGGOTA,ADMIN_KETUA')->group(function () {
        Route::get('crm/customer/retargeting',     [\App\Http\Controllers\CrmController::class, 'retargeting']);
        Route::get('crm/customer',                 [\App\Http\Controllers\CrmController::class, 'index']);
        Route::get('crm/customer/{customer}',      [\App\Http\Controllers\CrmController::class, 'show']);
        Route::put('crm/customer/{customer}',      [\App\Http\Controllers\CrmController::class, 'update']);
        Route::post('crm/customer/{customer}/log', [\App\Http\Controllers\CrmController::class, 'storeLog']);
    });

    // Pengiriman
    Route::get('pengiriman/rekap',  [\App\Http\Controllers\PengirimanController::class, 'rekap']);
    Route::get('pengiriman',        [\App\Http\Controllers\PengirimanController::class, 'index']);
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,LOGISTIK_KETUA,LOGISTIK_ANGGOTA')->group(function () {
        Route::post('pengiriman',                    [\App\Http\Controllers\PengirimanController::class, 'store']);
        Route::put('pengiriman/{pengiriman}/status',  [\App\Http\Controllers\PengirimanController::class, 'updateStatus']);
    });

    // WA Log
    Route::middleware('role:SUPER_ADMIN,KEPALA_DEPOT,ADMIN_KETUA')->group(function () {
        Route::get('admin/wa-log', [\App\Http\Controllers\WaLogController::class, 'index']);
    });
});
