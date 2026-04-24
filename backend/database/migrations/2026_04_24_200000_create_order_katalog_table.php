<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('order_katalog', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('nama', 150);
            $table->string('hp', 20);
            $table->text('alamat')->nullable();
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->string('kelas', 50);
            $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
            $table->text('catatan')->nullable();
            $table->enum('status', ['BARU', 'DIKONFIRMASI', 'DP_DIBAYAR', 'LUNAS', 'DIJADWALKAN', 'DIBATALKAN'])->default('BARU');
            $table->foreignId('cs_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void {
        Schema::dropIfExists('order_katalog');
    }
};
