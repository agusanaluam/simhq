<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('pengiriman', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('transaksi_id')->nullable()->constrained('transaksi')->nullOnDelete();
            $table->string('nama_penerima', 150);
            $table->text('alamat');
            $table->string('kelurahan', 100)->nullable();
            $table->string('kecamatan', 100)->nullable();
            $table->string('kota', 100)->nullable();
            $table->text('patokan')->nullable();
            $table->string('no_hp1', 20);
            $table->string('no_hp2', 20)->nullable();
            $table->date('tgl_kirim');
            $table->enum('sesi', ['PAGI', 'SIANG', 'SORE', 'MALAM'])->default('PAGI');
            $table->enum('status', ['DIJADWALKAN', 'DIAMBIL', 'DALAM_PERJALANAN', 'TERKIRIM'])
                  ->default('DIJADWALKAN');
            $table->foreignId('petugas_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('tgl_berangkat')->nullable();
            $table->timestamp('tgl_sampai')->nullable();
            $table->text('catatan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pengiriman');
    }
};
