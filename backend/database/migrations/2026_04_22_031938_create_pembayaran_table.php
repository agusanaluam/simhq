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
        Schema::create('pembayaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaksi_id')->constrained('transaksi')->cascadeOnDelete();
            $table->unsignedInteger('jumlah');
            $table->enum('tipe', ['DP', 'PELUNASAN']);
            $table->enum('metode', ['CASH', 'TRANSFER_BCA', 'TRANSFER_LAIN'])->default('CASH');
            $table->foreignId('teller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('tgl_bayar');
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('pembayaran');
    }
};
