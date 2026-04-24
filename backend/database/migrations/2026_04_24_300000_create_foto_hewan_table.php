<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('foto_hewan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('hewan_id')->constrained('hewan')->cascadeOnDelete();
            $table->string('url', 500);
            $table->unsignedTinyInteger('urutan')->default(1);
            $table->foreignId('upload_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('foto_hewan');
    }
};
