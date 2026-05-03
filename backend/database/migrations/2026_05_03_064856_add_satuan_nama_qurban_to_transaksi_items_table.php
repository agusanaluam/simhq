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
        Schema::table('transaksi_items', function (Blueprint $table) {
            $table->enum('satuan', ['EKOR', 'SLOT'])->default('EKOR')->after('is_preorder');
            $table->string('nama_qurban', 150)->nullable()->after('satuan');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transaksi_items', function (Blueprint $table) {
            $table->dropColumn(['satuan', 'nama_qurban']);
        });
    }
};
