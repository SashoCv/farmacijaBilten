<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** A note is internal (editorial office only) or a message the authors see. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('manuscript_notes', function (Blueprint $table) {
            $table->boolean('visible_to_author')->default(false)->after('body');
        });
    }

    public function down(): void
    {
        Schema::table('manuscript_notes', fn (Blueprint $table) => $table->dropColumn('visible_to_author'));
    }
};
