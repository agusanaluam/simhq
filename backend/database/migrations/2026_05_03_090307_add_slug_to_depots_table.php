<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('depots', function (Blueprint $table) {
            $table->string('slug', 100)->nullable()->unique()->after('nama');
        });

        // Back-fill slugs for existing depots
        foreach (DB::table('depots')->get() as $depot) {
            $base = Str::slug($depot->nama);
            $slug = $base;
            $i    = 2;
            while (DB::table('depots')->where('slug', $slug)->where('id', '!=', $depot->id)->exists()) {
                $slug = "{$base}-{$i}";
                $i++;
            }
            DB::table('depots')->where('id', $depot->id)->update(['slug' => $slug]);
        }
    }

    public function down(): void
    {
        Schema::table('depots', function (Blueprint $table) {
            $table->dropColumn('slug');
        });
    }
};
