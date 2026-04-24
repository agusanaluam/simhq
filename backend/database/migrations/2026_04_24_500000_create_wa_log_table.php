<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

    public function up(): void
    {
        Schema::create('wa_log', function (Blueprint $table) {
            $table->id();
            $table->foreignId('depot_id')->nullable()->constrained('depots')->nullOnDelete();
            $table->string('penerima', 20);
            $table->text('pesan');
            $table->enum('status', ['QUEUED', 'SENT', 'FAILED'])->default('QUEUED');
            $table->text('error_message')->nullable();
            $table->string('triggered_by', 100);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wa_log');
    }
};
