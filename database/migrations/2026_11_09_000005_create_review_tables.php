<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Peer review (docs/backoffice, release 2b): invitations and reviews
 * (review_assignments), the reviewers' files, and the editorial decisions.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('review_assignments', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('manuscript_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('round');
            // "Reviewer N" as the author sees it; stable across rounds for the same person.
            $table->unsignedSmallInteger('number');
            $table->foreignId('reviewer_id')->nullable()->constrained('users')->restrictOnDelete();
            $table->string('email');
            $table->string('name')->nullable();
            $table->string('status', 20)->default('invited')->index();
            // The invitation link's secret, hashed; rotated when re-sent.
            $table->char('token_hash', 64)->nullable();
            $table->text('message')->nullable();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('invited_at')->nullable();
            $table->timestamp('responded_at')->nullable();
            $table->timestamp('response_due_at')->nullable();
            $table->timestamp('review_due_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamp('last_reminded_at')->nullable();
            $table->string('decline_reason', 1000)->nullable();
            $table->string('competing_interests', 2000)->nullable();
            $table->string('recommendation', 20)->nullable();
            $table->text('comments_to_author')->nullable();
            $table->text('comments_to_editor')->nullable();
            $table->timestamps();
            $table->unique(['manuscript_id', 'round', 'email']);
        });

        Schema::create('review_files', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->foreignId('review_assignment_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->string('name');
            $table->string('mime', 120);
            $table->unsignedInteger('size');
            $table->string('visibility', 10)->default('editor');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('manuscript_decisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manuscript_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('round');
            $table->string('type', 20);
            $table->text('letter');
            $table->foreignId('decided_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
        });

        Schema::table('manuscripts', function (Blueprint $table) {
            $table->timestamp('revision_due_at')->nullable()->after('submitted_at');
            $table->timestamp('accepted_at')->nullable()->after('revision_due_at');
        });

        Schema::table('manuscript_versions', function (Blueprint $table) {
            // The authors' response to the reviewers, frozen with the revision.
            $table->text('response_letter')->nullable()->after('content_hash');
        });

        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared("CREATE TRIGGER manuscript_decisions_no_update BEFORE UPDATE ON manuscript_decisions BEGIN SELECT RAISE(ABORT, 'decisions are final'); END;");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS manuscript_decisions_no_update');
        }

        Schema::table('manuscript_versions', fn (Blueprint $table) => $table->dropColumn('response_letter'));
        Schema::table('manuscripts', fn (Blueprint $table) => $table->dropColumn(['revision_due_at', 'accepted_at']));
        Schema::dropIfExists('manuscript_decisions');
        Schema::dropIfExists('review_files');
        Schema::dropIfExists('review_assignments');
    }
};
