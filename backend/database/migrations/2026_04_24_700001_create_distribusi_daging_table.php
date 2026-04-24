<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('distribusi_daging', function (Blueprint $table) {
            $table->id();
            $table->foreignId('pengiriman_id')->constrained('pengiriman')->cascadeOnDelete();
            $table->string('nama_penerima', 150);
            $table->text('alamat')->nullable();
            $table->string('no_hp', 20)->nullable();
            $table->unsignedSmallInteger('qty_daging')->default(0);
            $table->unsignedSmallInteger('qty_tulang')->default(0);
            $table->unsignedSmallInteger('qty_jeroan')->default(0);
            $table->enum('status', ['MENUNGGU', 'TERKIRIM'])->default('MENUNGGU');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('distribusi_daging');
    }
};
