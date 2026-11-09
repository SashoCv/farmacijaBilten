<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Manuscripts written in the app (docs/backoffice, releases 2–3).
 *
 * - `manuscripts`: one row per paper, its status and the editorial facts.
 *   `submission_data` (suggested reviewers, cover letter, declarations) is
 *   kept apart from the content, so it can never reach a reviewer.
 * - `manuscript_drafts`: the author's working copy (one per manuscript).
 * - `manuscript_versions`: frozen copies, one per submission; immutable.
 * - `manuscript_events`: the history of every status change (append-only).
 * - `reference_sequences`: MPB-YYYY-NNNN numbers, shared with the website
 *   form, so the two never collide.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('manuscripts', function (Blueprint $table) {
            $table->id();
            $table->ulid('public_id')->unique();
            $table->string('reference', 20)->nullable()->unique();
            $table->foreignId('submitter_id')->constrained('users')->restrictOnDelete();
            $table->string('type', 40);
            $table->char('language', 2)->default('en');
            $table->string('title', 500)->default('');
            $table->string('status', 30)->default('draft')->index();
            $table->unsignedSmallInteger('current_round')->default(0);
            $table->json('submission_data')->nullable();
            $table->timestamp('received_at')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->timestamps();
            $table->index(['submitter_id', 'status']);
        });

        Schema::create('manuscript_drafts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manuscript_id')->unique()->constrained()->cascadeOnDelete();
            $table->json('content');
            $table->unsignedInteger('lock_version')->default(1);
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('manuscript_versions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manuscript_id')->constrained()->restrictOnDelete();
            $table->unsignedSmallInteger('number');
            $table->unsignedSmallInteger('round');
            $table->string('kind', 20)->default('submission');
            $table->json('content');
            $table->char('content_hash', 64);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->unique(['manuscript_id', 'number']);
        });

        Schema::create('manuscript_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manuscript_id')->constrained()->restrictOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40);
            $table->string('from_status', 30)->nullable();
            $table->string('to_status', 30)->nullable();
            // Ids and short codes only, never personal data.
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['manuscript_id', 'id']);
        });

        Schema::create('reference_sequences', function (Blueprint $table) {
            $table->unsignedSmallInteger('year')->primary();
            $table->unsignedInteger('last')->default(0);
        });

        // Continue after the website form's references (MPB-YYYY-NNNN from submissions.id).
        if (Schema::hasTable('submissions')) {
            foreach (DB::table('submissions')->whereNotNull('reference')->pluck('reference') as $reference) {
                if (preg_match('/^MPB-(\d{4})-(\d+)$/', (string) $reference, $m)) {
                    $year = (int) $m[1];
                    $last = (int) DB::table('reference_sequences')->where('year', $year)->value('last');
                    DB::table('reference_sequences')->updateOrInsert(['year' => $year], ['last' => max($last, (int) $m[2])]);
                }
            }
        }

        // Frozen versions and history cannot be changed, even outside the app.
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared("CREATE TRIGGER manuscript_versions_no_update BEFORE UPDATE ON manuscript_versions BEGIN SELECT RAISE(ABORT, 'manuscript versions are immutable'); END;");
            DB::unprepared("CREATE TRIGGER manuscript_events_no_update BEFORE UPDATE ON manuscript_events BEGIN SELECT RAISE(ABORT, 'manuscript events are append-only'); END;");
        }
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'sqlite') {
            DB::unprepared('DROP TRIGGER IF EXISTS manuscript_versions_no_update');
            DB::unprepared('DROP TRIGGER IF EXISTS manuscript_events_no_update');
        }

        Schema::dropIfExists('reference_sequences');
        Schema::dropIfExists('manuscript_events');
        Schema::dropIfExists('manuscript_versions');
        Schema::dropIfExists('manuscript_drafts');
        Schema::dropIfExists('manuscripts');
    }
};
