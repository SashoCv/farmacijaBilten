<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Accounts for the editorial back-office (docs/backoffice, release 1):
 * profile fields, roles (one person may be admin, author and reviewer at
 * once) and an account history.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('given_name')->nullable()->after('name');
            $table->string('family_name')->nullable()->after('given_name');
            $table->string('academic_title', 40)->nullable()->after('family_name');
            $table->string('affiliation')->nullable();
            $table->string('department')->nullable();
            $table->string('city', 120)->nullable();
            $table->char('country_code', 2)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('orcid', 19)->nullable();
            $table->string('expertise', 500)->nullable();
            $table->string('locale', 5)->default('en');
            $table->timestamp('privacy_accepted_at')->nullable();
            $table->timestamp('deactivated_at')->nullable();
        });

        Schema::create('user_roles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('role', 20);
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('created_at')->nullable();
            $table->unique(['user_id', 'role']);
            $table->index('role');
        });

        // Append-only. Payloads hold ids and role names, never personal data.
        Schema::create('user_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('type', 40);
            $table->json('payload')->nullable();
            $table->timestamp('created_at')->nullable();
            $table->index(['user_id', 'created_at']);
        });

        // Until now only the editorial office had accounts.
        $now = now();

        foreach (DB::table('users')->pluck('id') as $id) {
            DB::table('user_roles')->insert(['user_id' => $id, 'role' => 'admin', 'created_at' => $now]);
        }

        foreach (DB::table('users')->get(['id', 'name']) as $user) {
            $parts = preg_split('/\s+/u', trim((string) $user->name), 2) ?: [];

            DB::table('users')->where('id', $user->id)->update([
                'given_name' => $parts[0] ?? null,
                'family_name' => $parts[1] ?? null,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('user_events');
        Schema::dropIfExists('user_roles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'given_name', 'family_name', 'academic_title', 'affiliation', 'department', 'city',
                'country_code', 'phone', 'orcid', 'expertise', 'locale', 'privacy_accepted_at', 'deactivated_at',
            ]);
        });
    }
};
