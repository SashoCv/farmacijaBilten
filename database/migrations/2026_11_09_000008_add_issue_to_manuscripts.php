<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Publishing: an accepted manuscript is placed in an issue (in an order) and,
 * once published online, linked to the article it became on the website.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manuscripts', function (Blueprint $table) {
            $table->foreignId('issue_id')->nullable()->after('publication_year')->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('issue_position')->nullable()->after('issue_id');
            $table->foreignId('article_id')->nullable()->after('issue_position')->constrained()->nullOnDelete();
            $table->timestamp('published_at')->nullable()->after('accepted_at');
        });
    }

    public function down(): void
    {
        Schema::table('manuscripts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('article_id');
            $table->dropConstrainedForeignId('issue_id');
            $table->dropColumn(['issue_position', 'published_at']);
        });
    }
};
