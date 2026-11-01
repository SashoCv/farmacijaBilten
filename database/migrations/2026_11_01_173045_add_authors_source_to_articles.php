<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            // Where the author list came from: "web" (old site listing), "pdf"
            // (the article itself, preferred) or "editor" (set by hand).
            $table->string('authors_source', 10)->default('web')->after('authors');
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn('authors_source');
        });
    }
};
