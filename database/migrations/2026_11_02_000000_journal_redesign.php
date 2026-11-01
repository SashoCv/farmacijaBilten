<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every column the redesign needs, in one place, so no workstream writes its
 * own migration. All columns are nullable (or defaulted): the importer and the
 * data commands (journal:sync-crossref, journal:generate-covers, ...) fill them.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('articles', function (Blueprint $table) {
            // Title with the source's i/em/sup/sub markup kept ("[<sup>18</sup>F]...").
            $table->text('title_html')->nullable()->after('title');
            // "en" | "mk", by the share of Cyrillic letters.
            $table->string('title_lang', 5)->nullable()->after('title_html');
            $table->string('abstract_lang', 5)->nullable()->after('abstract');
            $table->string('keywords_lang', 5)->nullable()->after('keywords');
            // From Crossref: null = not checked yet, false = not registered.
            $table->boolean('doi_registered')->nullable()->after('doi');
            // The form that resolves at doi.org (some were deposited with a double prefix).
            $table->string('doi_resolvable')->nullable()->after('doi_registered');
            $table->date('received_at')->nullable()->after('history');
            $table->date('accepted_at')->nullable()->after('received_at');
            $table->unsignedSmallInteger('pdf_pages')->nullable()->after('pdf');
            $table->unsignedInteger('pdf_bytes')->nullable()->after('pdf_pages');
            // Public path of the first-page thumbnail, e.g. "media/covers/articles/71-2-001.webp".
            $table->string('pdf_thumb')->nullable()->after('pdf_bytes');
            // Lower-cased, diacritic-folded and transliterated text for search.
            $table->text('search_text')->nullable();
            // WordPress post ID on the old site, for /?p=ID redirects.
            $table->unsignedBigInteger('wp_id')->nullable();

            $table->index('search_text');
            $table->index('wp_id');
        });

        Schema::table('issues', function (Blueprint $table) {
            // Public path of the printed cover, e.g. "media/covers/71-2.webp".
            $table->string('cover_image')->nullable()->after('toc_pdf');
            // Path on the "journal" disk of a separate cover-page PDF.
            $table->string('cover_pdf')->nullable()->after('cover_image');
            $table->string('doi')->nullable()->after('cover_pdf');
            $table->date('online_at')->nullable()->after('year');
            // Full congress or special-issue title, e.g. for "8CPM".
            $table->string('full_title', 500)->nullable()->after('note');
            // "Ohrid, 1–4 October 2026"
            $table->string('location_dates')->nullable()->after('full_title');
            $table->unsignedSmallInteger('pdf_pages')->nullable()->after('full_pdf');
            $table->unsignedInteger('pdf_bytes')->nullable()->after('pdf_pages');
            $table->unsignedBigInteger('wp_id')->nullable();

            $table->index('wp_id');
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->string('title_mk')->nullable()->after('title');
            $table->longText('body_mk')->nullable()->after('body');
            // One-line summary for hub cards and meta descriptions.
            $table->string('summary', 500)->nullable()->after('body_mk');
            $table->unsignedBigInteger('wp_id')->nullable();

            $table->index('wp_id');
        });

        Schema::table('submissions', function (Blueprint $table) {
            // Signed forms: list of {path, name, size} on the private "local" disk.
            $table->json('forms')->nullable()->after('file_size');
            $table->text('suggested_reviewers')->nullable()->after('message');
            $table->timestamp('privacy_accepted_at')->nullable()->after('status');
            // "MPB-2026-0042", stored so it survives renumbering.
            $table->string('reference', 20)->nullable()->unique()->after('id');
        });

        Schema::create('board_members', function (Blueprint $table) {
            $table->id();
            // "editor-in-chief" | "secretary" | "international" | ...
            $table->string('group', 40);
            // Role shown on the card, e.g. "Editor-in-Chief" (TO CONFIRM by the editors).
            $table->string('role')->nullable();
            $table->unsignedSmallInteger('position')->default(0);
            // Academic title: "Prof. Dr."
            $table->string('title', 60)->nullable();
            $table->string('given_name');
            $table->string('family_name');
            $table->string('affiliation', 500)->nullable();
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->string('orcid', 19)->nullable();
            $table->string('email')->nullable();
            // Public path of a portrait, if the member agreed to show one.
            $table->string('photo')->nullable();
            $table->timestamps();

            $table->index(['group', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('board_members');

        Schema::table('submissions', function (Blueprint $table) {
            $table->dropUnique(['reference']);
            $table->dropColumn(['forms', 'suggested_reviewers', 'privacy_accepted_at', 'reference']);
        });

        Schema::table('pages', function (Blueprint $table) {
            $table->dropIndex(['wp_id']);
            $table->dropColumn(['title_mk', 'body_mk', 'summary', 'wp_id']);
        });

        Schema::table('issues', function (Blueprint $table) {
            $table->dropIndex(['wp_id']);
            $table->dropColumn([
                'cover_image', 'cover_pdf', 'doi', 'online_at', 'full_title',
                'location_dates', 'pdf_pages', 'pdf_bytes', 'wp_id',
            ]);
        });

        Schema::table('articles', function (Blueprint $table) {
            $table->dropIndex(['search_text']);
            $table->dropIndex(['wp_id']);
            $table->dropColumn([
                'title_html', 'title_lang', 'abstract_lang', 'keywords_lang',
                'doi_registered', 'doi_resolvable', 'received_at', 'accepted_at',
                'pdf_pages', 'pdf_bytes', 'pdf_thumb', 'search_text', 'wp_id',
            ]);
        });
    }
};
