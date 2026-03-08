<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('backlinks', function (Blueprint $table) {
            $table->integer('quality_score')->nullable()->after('cost');
            $table->integer('traffic_estimated')->nullable()->after('quality_score');
        });
    }

    public function down(): void
    {
        Schema::table('backlinks', function (Blueprint $table) {
            $table->dropColumn(['quality_score', 'traffic_estimated']);
        });
    }
};
