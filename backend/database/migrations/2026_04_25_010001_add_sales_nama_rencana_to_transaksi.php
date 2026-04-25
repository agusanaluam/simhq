<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->string('sales_nama', 100)->nullable()->after('sales_id');
            $table->date('rencana_pelunasan')->nullable()->after('sales_nama');
        });
    }

    public function down(): void
    {
        Schema::table('transaksi', function (Blueprint $table) {
            $table->dropColumn(['sales_nama', 'rencana_pelunasan']);
        });
    }
};
