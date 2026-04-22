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
        Schema::create('jam_kerja_default', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('divisi', 100);
            $table->time('jam_masuk');
            $table->time('jam_keluar');
            $table->unsignedTinyInteger('toleransi_menit')->default(15);
            $table->timestamps();
            $table->unique(['depot_id', 'divisi'], 'jam_kerja_depot_divisi_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('jam_kerja_default');
    }
};
