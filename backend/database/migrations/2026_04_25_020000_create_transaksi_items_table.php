<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('transaksi_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaksi_id')->constrained('transaksi')->cascadeOnDelete();
            $table->foreignId('hewan_id')->nullable()->constrained('hewan')->nullOnDelete();
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->foreignId('kelas_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->enum('tipe_qurban', ['SHQ', 'THQ', 'PHQ']);
            $table->unsignedInteger('harga')->default(0);
            $table->boolean('is_preorder')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void { Schema::dropIfExists('transaksi_items'); }
};
