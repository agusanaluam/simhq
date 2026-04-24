<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rab', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->constrained('depots')->cascadeOnDelete();
            $table->string('divisi', 30);
            $table->year('musim');
            $table->unsignedInteger('jumlah_anggaran')->default(0);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['depot_id', 'divisi', 'musim'], 'rab_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rab');
    }
};
