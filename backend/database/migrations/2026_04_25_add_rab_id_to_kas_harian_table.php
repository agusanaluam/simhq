<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('kas_harian', function (Blueprint $table) {
            $table->foreignId('rab_id')
                  ->nullable()
                  ->after('transaksi_id')
                  ->constrained('rab')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('kas_harian', function (Blueprint $table) {
            $table->dropForeign(['rab_id']);
            $table->dropColumn('rab_id');
        });
    }
};
