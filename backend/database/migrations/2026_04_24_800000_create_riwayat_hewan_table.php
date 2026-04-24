<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('riwayat_hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->date('tgl');
            $table->enum('kondisi', ['SEHAT', 'SAKIT', 'KRITIS', 'MATI']);
            $table->decimal('bobot', 6, 2)->nullable();
            $table->text('catatan')->nullable();
            $table->text('tindakan_medis')->nullable();
            $table->string('obat', 200)->nullable();
            $table->foreignId('petugas_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('riwayat_hewan');
    }
};
