<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('harga_kelas', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('kelas_id')->constrained('kelas_hewan')->cascadeOnDelete();
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->year('musim');
            $table->unsignedBigInteger('harga_beli');
            $table->unsignedBigInteger('harga_jual');
            $table->unsignedBigInteger('fee_sales')->default(0);
            $table->timestamps();
            $table->unique(['depot_id', 'kelas_id', 'jenis', 'musim'], 'harga_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('harga_kelas'); }
};
