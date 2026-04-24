<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('realisasi_pengeluaran', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rab_id')->constrained('rab')->cascadeOnDelete();
            $table->string('keterangan', 300);
            $table->unsignedInteger('jumlah');
            $table->date('tgl_pengeluaran');
            $table->foreignId('input_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('realisasi_pengeluaran');
    }
};
