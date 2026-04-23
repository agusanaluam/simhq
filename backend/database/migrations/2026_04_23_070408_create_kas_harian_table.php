<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kas_harian', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->enum('tipe', ['MASUK', 'KELUAR']);
            $table->string('sumber', 20)->nullable();
            $table->string('divisi', 30)->nullable();
            $table->string('keterangan', 300);
            $table->unsignedInteger('jumlah');
            $table->enum('metode', ['CASH', 'TRANSFER_BCA', 'TRANSFER_LAIN'])->default('CASH');
            $table->date('tgl_transaksi');
            $table->foreignId('input_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('transaksi_id')->nullable()->constrained('transaksi')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kas_harian');
    }
};
