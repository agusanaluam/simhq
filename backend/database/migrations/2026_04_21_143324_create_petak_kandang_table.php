<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('petak_kandang', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('no_petak', 20);
            $table->enum('jenis_kandang', ['SAPI', 'DOMBA']);
            $table->unsignedTinyInteger('kapasitas')->default(1);
            $table->foreignId('kelas_id')->nullable()->constrained('kelas_hewan')->nullOnDelete();
            $table->unsignedTinyInteger('posisi_x')->default(0);
            $table->unsignedTinyInteger('posisi_y')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['depot_id', 'no_petak'], 'petak_no_unique');
        });
    }
    public function down(): void { Schema::dropIfExists('petak_kandang'); }
};
