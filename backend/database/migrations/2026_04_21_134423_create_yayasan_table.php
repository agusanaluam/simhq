<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('yayasan', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 255);
            $table->text('alamat')->nullable();
            $table->string('kontak_pic', 255)->nullable();
            $table->string('telepon', 30)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('yayasan'); }
};
