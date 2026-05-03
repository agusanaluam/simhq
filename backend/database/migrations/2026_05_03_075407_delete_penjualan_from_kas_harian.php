<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('kas_harian')->where('sumber', 'PENJUALAN')->delete();
    }

    public function down(): void
    {
        // Irreversible data deletion — cannot restore
    }
};
