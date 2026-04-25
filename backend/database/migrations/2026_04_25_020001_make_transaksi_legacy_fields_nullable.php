<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        DB::statement('ALTER TABLE transaksi ALTER COLUMN tipe_qurban DROP NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN jenis DROP NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN kelas_id DROP NOT NULL');
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE transaksi ALTER COLUMN tipe_qurban SET NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN jenis SET NOT NULL');
        DB::statement('ALTER TABLE transaksi ALTER COLUMN kelas_id SET NOT NULL');
    }
};
