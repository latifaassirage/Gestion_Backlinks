<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('backlinks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->foreignId('source_site_id')->constrained('source_sites')->onDelete('cascade');
            $table->string('type');
            $table->string('target_url');
            $table->string('anchor_text')->nullable();
            $table->string('placement_url')->nullable();
            $table->date('date_added')->nullable();
            $table->string('status')->nullable();
            $table->decimal('cost', 10, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('backlinks');
    }
};