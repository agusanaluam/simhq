<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('target_penjualan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->year('musim');
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->date('tgl');
            $table->unsignedSmallInteger('target_unit')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['depot_id', 'musim', 'jenis', 'tgl'], 'target_penjualan_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('target_penjualan');
    }
};
