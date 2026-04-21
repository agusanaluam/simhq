<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('kelas_hewan', function (Blueprint $table) {
            $table->id();
            $table->string('kode', 10)->unique();
            $table->string('nama', 50);
            $table->unsignedTinyInteger('urutan');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('kelas_hewan'); }
};
