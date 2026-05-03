<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->unsignedInteger('ongkos_kirim')->default(0)->after('total');
            $table->unsignedInteger('biaya_potong')->default(0)->after('ongkos_kirim');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropColumn(['ongkos_kirim', 'biaya_potong']);
        });
    }
};
