<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->json('affiliations')->nullable()->after('authors');
            // "Received: February 2025; Accepted: April 2025"
            $table->string('history')->nullable()->after('online_at');
            // When metadata was last read from the PDF (null: never).
            $table->timestamp('extracted_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            $table->dropColumn(['affiliations', 'history', 'extracted_at']);
        });
    }
};
