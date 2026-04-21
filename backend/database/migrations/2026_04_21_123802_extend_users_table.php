<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('depot_id')
                ->nullable()
                ->constrained('depots')
                ->nullOnDelete()
                ->after('id');
            $table->string('role', 50)->default('ADMIN_ANGGOTA')->after('email');
            $table->string('divisi', 100)->nullable()->after('role');
            $table->string('phone', 20)->nullable()->after('divisi');
            $table->boolean('is_active')->default(true)->after('phone');
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['depot_id']);
            $table->dropColumn(['depot_id', 'role', 'divisi', 'phone', 'is_active', 'deleted_at']);
        });
    }
};
