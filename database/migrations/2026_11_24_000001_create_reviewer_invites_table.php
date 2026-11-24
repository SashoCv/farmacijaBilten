<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * People the editorial office adds to its list of reviewers before they have
 * an account: the e-mail asks them to create one (App\Models\ReviewerInvite).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviewer_invites', function (Blueprint $table) {
            $table->id();
            $table->string('email')->unique();
            $table->string('given_name', 100);
            $table->string('family_name', 100);
            $table->string('affiliation')->nullable();
            $table->string('expertise', 500)->nullable();
            $table->text('message')->nullable();
            $table->char('token_hash', 64)->nullable();
            $table->foreignId('invited_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('invited_at');
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviewer_invites');
    }
};
