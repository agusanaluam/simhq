<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Seed rab_kategori from distinct divisi values in existing rab rows
        $divisiValues = DB::table('rab')->distinct()->pluck('divisi')->filter()->values();
        $now = now();
        foreach ($divisiValues as $divisi) {
            DB::table('rab_kategori')->insertOrIgnore([
                'nama'       => $divisi,
                'is_active'  => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // 2. Add nullable kategori_id column with FK
        Schema::table('rab', function (Blueprint $table) {
            $table->unsignedBigInteger('kategori_id')->nullable()->after('depot_id');
            $table->foreign('kategori_id')->references('id')->on('rab_kategori')->cascadeOnDelete();
        });

        // 3. Populate kategori_id from matching rab_kategori.nama = rab.divisi
        $kategoris = DB::table('rab_kategori')->pluck('id', 'nama');
        foreach ($kategoris as $nama => $id) {
            DB::table('rab')->where('divisi', $nama)->update(['kategori_id' => $id]);
        }

        // Guard: ensure all rows were matched before dropping the column
        $unmatched = DB::table('rab')->whereNull('kategori_id')->count();
        if ($unmatched > 0) {
            throw new \RuntimeException("Migration aborted: {$unmatched} rab rows could not be matched to rab_kategori. Run manually to inspect.");
        }

        // 4. Drop old unique index and divisi column, add new unique
        Schema::table('rab', function (Blueprint $table) {
            try {
                $table->dropUnique('rab_unique');
            } catch (\Exception $e) {
                // Index name may vary; ignore if not found
            }
            $table->dropColumn('divisi');
        });

        Schema::table('rab', function (Blueprint $table) {
            $table->unique(['depot_id', 'kategori_id', 'musim']);
        });
    }

    public function down(): void
    {
        Schema::table('rab', function (Blueprint $table) {
            try { $table->dropUnique(['depot_id', 'kategori_id', 'musim']); } catch (\Exception $e) {}
            $table->string('divisi', 30)->nullable()->after('depot_id');
        });

        Schema::table('rab', function (Blueprint $table) {
            $table->dropForeign(['kategori_id']);
            $table->dropColumn('kategori_id');
        });
    }
};
