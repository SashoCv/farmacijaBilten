<?php

namespace Database\Seeders;

use App\Models\BoardMember;
use App\Models\Page;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seeds `board_members` by parsing the imported editorial-board page
 * (BoardMember::parseHtml()). The rows keep the date the old page was last
 * modified as their timestamps, so "Last updated" on /editorial-board tells
 * the truth until the editors change the list.
 *
 * Leaves an existing board alone unless $force is set
 * (`php artisan journal:repair-pages --board`).
 */
class BoardMemberSeeder extends Seeder
{
    public bool $force = false;

    /** When the source page was last modified (from the WordPress API), if known. */
    public ?Carbon $sourceModified = null;

    public function run(): void
    {
        $body = Page::where('path', 'editorial-board')->value('body');

        if (! $body) {
            $this->command?->warn('No editorial-board page to parse; board members not seeded.');

            return;
        }

        if (BoardMember::query()->exists() && ! $this->force) {
            $this->command?->info('Board members already exist; left unchanged.');

            return;
        }

        $members = BoardMember::parseHtml($body);
        $stamp = $this->sourceModified ?? now();

        DB::transaction(function () use ($members, $stamp) {
            BoardMember::query()->delete();

            foreach ($members as $member) {
                $row = new BoardMember($member);
                $row->timestamps = false;
                $row->created_at = $stamp;
                $row->updated_at = $stamp;
                $row->save();
            }
        });

        $this->command?->info('Seeded '.count($members).' board members.');
    }
}
