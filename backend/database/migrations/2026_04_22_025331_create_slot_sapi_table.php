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
        Schema::create('slot_sapi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->unsignedTinyInteger('no_slot');           // 1–7
            $table->foreignId('transaksi_id')->nullable()->constrained('transaksi')->nullOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->string('nama_qurban', 150);
            $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
            $table->unsignedInteger('harga_slot');
            $table->enum('status_bayar', ['DP', 'LUNAS'])->default('DP');
            $table->timestamps();

            $table->unique(['hewan_id', 'no_slot'], 'slot_sapi_hewan_slot_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('slot_sapi');
    }
};
