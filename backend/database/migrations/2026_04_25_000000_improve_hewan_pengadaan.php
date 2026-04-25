<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('hewan', function (Blueprint $table) {
            $table->unsignedSmallInteger('no_pengadaan')->default(0)->after('musim');
        });

        DB::statement('ALTER TABLE hewan ALTER COLUMN kelas_jual_id DROP NOT NULL');
    }

    public function down(): void
    {
        Schema::table('hewan', function (Blueprint $table) {
            $table->dropColumn('no_pengadaan');
        });

        DB::statement('ALTER TABLE hewan ALTER COLUMN kelas_jual_id SET NOT NULL');
    }
};
