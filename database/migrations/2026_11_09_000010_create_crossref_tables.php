<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Crossref: settings the editorial office keeps in the back-office (the
 * depositor's name and e-mail, automatic deposits on or off) and a log of
 * every deposit sent, with Crossref's answer.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        Schema::create('crossref_deposits', function (Blueprint $table) {
            $table->id();
            $table->string('batch_id')->unique();
            $table->foreignId('issue_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            // The DOIs in the deposit.
            $table->json('dois');
            // queued | sent | succeeded | partly | failed
            $table->string('status', 20)->default('queued');
            // "manual" (download), "button" (sent from the back-office), "publish" (automatic)
            $table->string('trigger', 20);
            $table->boolean('test')->default(false);
            $table->text('message')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('checked_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'sent_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crossref_deposits');
        Schema::dropIfExists('settings');
    }
};
