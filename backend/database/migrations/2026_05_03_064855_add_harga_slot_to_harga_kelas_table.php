<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('harga_kelas', function (Blueprint $table) {
            $table->unsignedBigInteger('harga_slot')->nullable()->after('harga_jual');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('harga_kelas', function (Blueprint $table) {
            $table->dropColumn('harga_slot');
        });
    }
};
