<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('issues', function (Blueprint $table) {
            $table->id();
            // URL key: "71-2", "66-s1", "47" (single-issue volume), "53" (abstract book).
            $table->string('slug')->unique();
            $table->unsignedSmallInteger('volume');
            // issue | supplement | volume (whole volume in one) | abstracts
            $table->string('kind', 20);
            $table->unsignedTinyInteger('number')->nullable();
            // Congress or special-issue name: "8CPM", "14th CESPT".
            $table->string('note')->nullable();
            $table->unsignedSmallInteger('year')->nullable();
            // False while articles are still being released online first.
            $table->boolean('is_published')->default(true);
            // Paths on the "journal" disk, e.g. "volumes/Volume 71_2/71_2_000.pdf".
            $table->string('full_pdf')->nullable();
            $table->string('toc_pdf')->nullable();
            $table->string('source_url')->nullable();
            $table->timestamps();

            $table->index(['volume', 'kind', 'number']);
        });

        Schema::create('articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('issue_id')->constrained()->cascadeOnDelete();
            // Number from the PDF file name ("001"); unique within an issue.
            $table->string('number', 10);
            $table->unsignedSmallInteger('position');
            $table->text('title');
            $table->json('authors');
            $table->string('pdf')->nullable();
            $table->date('online_at')->nullable();

            // Not on the old site; filled in by the editorial workflow later.
            $table->string('type')->nullable();
            $table->string('pages', 20)->nullable();
            $table->string('doi')->nullable();
            $table->string('licence')->nullable();
            $table->text('abstract')->nullable();
            $table->json('keywords')->nullable();
            $table->longText('references')->nullable();

            $table->timestamps();

            $table->unique(['issue_id', 'number']);
        });

        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            // Full path without slashes at the ends: "guidelines/aims-and-scope".
            $table->string('path')->unique();
            $table->string('title');
            $table->string('parent_path')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            $table->longText('body');
            $table->string('source_url')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
        Schema::dropIfExists('articles');
        Schema::dropIfExists('issues');
    }
};
