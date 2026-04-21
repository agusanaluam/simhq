<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->foreignId('supplier_id')->nullable()->constrained('supplier')->nullOnDelete();
            $table->foreignId('kelas_asal_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->foreignId('kelas_jual_id')->constrained('kelas_hewan')->restrictOnDelete();
            $table->string('no_hewan', 3);
            $table->enum('jenis', ['SAPI', 'DOMBA']);
            $table->decimal('bobot_masuk', 6, 2);
            $table->decimal('bobot_terkini', 6, 2)->nullable();
            $table->date('tgl_masuk');
            $table->year('musim');
            $table->enum('status', ['AVAILABLE', 'BOOKED', 'SOLD', 'DELIVERED', 'MATI'])->default('AVAILABLE');
            $table->unsignedBigInteger('petak_id')->nullable();
            $table->timestamps();
            $table->unique(['depot_id', 'musim', 'no_hewan'], 'hewan_no_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('hewan'); }
};
