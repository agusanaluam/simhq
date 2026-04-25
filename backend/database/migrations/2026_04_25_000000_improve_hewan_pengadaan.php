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

        // kelas_jual_id was made nullable in the original create_hewan_table migration.
        // For existing production databases (pgsql/mysql) we still need to ALTER the column.
        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE hewan ALTER COLUMN kelas_jual_id DROP NOT NULL');
        } elseif ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE hewan MODIFY kelas_jual_id BIGINT UNSIGNED NULL');
        }
        // SQLite (tests): column is already nullable via the updated create migration.
    }

    public function down(): void
    {
        Schema::table('hewan', function (Blueprint $table) {
            $table->dropColumn('no_pengadaan');
        });

        $driver = DB::getDriverName();
        if ($driver === 'pgsql') {
            DB::statement('ALTER TABLE hewan ALTER COLUMN kelas_jual_id SET NOT NULL');
        } elseif ($driver === 'mysql' || $driver === 'mariadb') {
            DB::statement('ALTER TABLE hewan MODIFY kelas_jual_id BIGINT UNSIGNED NOT NULL');
        }
    }
};
