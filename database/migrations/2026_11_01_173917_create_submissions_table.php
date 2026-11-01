<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('submissions', function (Blueprint $table) {
            $table->id();
            // Set once authors can sign in; anonymous submissions stay possible.
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('email');
            $table->string('affiliation')->nullable();
            $table->text('title');
            $table->string('type', 60);
            $table->text('message')->nullable();
            // Path on the private "local" disk; never publicly reachable.
            $table->string('file_path');
            $table->string('file_name');
            $table->unsignedInteger('file_size');
            // received | under_review | accepted | rejected | withdrawn
            $table->string('status', 20)->default('received');
            $table->ipAddress('ip')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('submissions');
    }
};
