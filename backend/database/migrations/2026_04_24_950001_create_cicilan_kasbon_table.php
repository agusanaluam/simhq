<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('cicilan_kasbon', function (Blueprint $table) {
            $table->id();
            $table->foreignId('kasbon_id')->constrained('kasbon')->cascadeOnDelete();
            $table->unsignedInteger('nominal_cicilan');
            $table->unsignedSmallInteger('jumlah_cicil');
            $table->unsignedSmallInteger('cicil_terbayar')->default(0);
            $table->date('tgl_mulai');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cicilan_kasbon');
    }
};
