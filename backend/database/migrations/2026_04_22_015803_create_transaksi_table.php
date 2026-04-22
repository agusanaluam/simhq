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
        Schema::create('transaksi', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('no_faktur', 30)->unique();
            $table->foreignId('hewan_id')->nullable()->constrained('hewan')->nullOnDelete();
            $table->foreignId('customer_id')->constrained('customers')->restrictOnDelete();
            $table->foreignId('cs_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('teller_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('sales_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('yayasan_id')->nullable()->constrained('yayasan')->nullOnDelete();
            $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->foreignId('kelas_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->unsignedInteger('harga');
            $table->unsignedInteger('total');
            $table->enum('status_transaksi', [
                'MENUNGGU_HEWAN', 'HEWAN_TERALOKASI',
                'DIKONFIRMASI', 'SELESAI', 'DIBATALKAN',
            ])->default('MENUNGGU_HEWAN');
            $table->year('musim');
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void { Schema::dropIfExists('transaksi'); }
};
