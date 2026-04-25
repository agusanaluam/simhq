<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->string('tipe_qurban')->nullable()->change();
            $table->string('jenis')->nullable()->change();
            $table->foreignId('kelas_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->string('tipe_qurban')->nullable(false)->change();
            $table->string('jenis')->nullable(false)->change();
            $table->foreignId('kelas_id')->nullable(false)->change();
        });
    }
};
