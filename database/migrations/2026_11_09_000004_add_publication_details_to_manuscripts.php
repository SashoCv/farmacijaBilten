<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Publication details the editorial office assigns: DOI, volume, issue,
 * pages and year (printed top right on the first page:
 * "Macedonian pharmaceutical bulletin, 71 (2) 3 - 11 (2025)", "DOI: …").
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manuscripts', function (Blueprint $table) {
            $table->string('doi', 120)->nullable()->unique()->after('reference');
            $table->unsignedSmallInteger('volume')->nullable()->after('doi');
            $table->string('issue', 10)->nullable()->after('volume');
            $table->unsignedSmallInteger('first_page')->nullable()->after('issue');
            $table->unsignedSmallInteger('last_page')->nullable()->after('first_page');
            $table->unsignedSmallInteger('publication_year')->nullable()->after('last_page');
        });
    }

    public function down(): void
    {
        Schema::table('manuscripts', function (Blueprint $table) {
            $table->dropUnique(['doi']);
            $table->dropColumn(['doi', 'volume', 'issue', 'first_page', 'last_page', 'publication_year']);
        });
    }
};
