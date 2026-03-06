<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('source_sites', function (Blueprint $table) {
            $table->id();
            $table->string('domain');
            $table->integer('quality_score');
            $table->integer('dr')->nullable();
            $table->integer('traffic_estimated')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('source_sites');
    }
};