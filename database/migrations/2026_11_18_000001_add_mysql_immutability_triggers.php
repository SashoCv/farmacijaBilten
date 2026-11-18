<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * The append-only tables (frozen versions, history, final decisions) on
 * MySQL/MariaDB, as the SQLite triggers do in the migrations that create
 * them. Shared hosting may refuse CREATE TRIGGER (no TRIGGER privilege, or
 * binary logging without SUPER); the application never updates these rows
 * either, so the site works without them and the migration only warns.
 */
return new class extends Migration
{
    /** @var array<string, string> table => message */
    private const TABLES = [
        'manuscript_versions' => 'manuscript versions are immutable',
        'manuscript_events' => 'manuscript events are append-only',
        'manuscript_decisions' => 'decisions are final',
    ];

    public function up(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        foreach (self::TABLES as $table => $message) {
            try {
                DB::unprepared("DROP TRIGGER IF EXISTS {$table}_no_update");
                DB::unprepared("CREATE TRIGGER {$table}_no_update BEFORE UPDATE ON {$table} FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '{$message}'");
            } catch (Throwable $e) {
                Log::warning("Trigger {$table}_no_update not created: ".$e->getMessage());
                echo "  Warning: trigger {$table}_no_update not created (the database user may lack the TRIGGER privilege).\n";
            }
        }
    }

    public function down(): void
    {
        if (! in_array(DB::getDriverName(), ['mysql', 'mariadb'], true)) {
            return;
        }

        foreach (array_keys(self::TABLES) as $table) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$table}_no_update");
        }
    }
};
