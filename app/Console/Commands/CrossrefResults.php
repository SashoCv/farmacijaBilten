<?php

namespace App\Console\Commands;

use App\Crossref\Crossref;
use App\Models\CrossrefDeposit;
use Illuminate\Console\Command;
use Throwable;

/**
 * Reads Crossref's result for the deposits sent in the last week and still
 * waiting (Crossref processes them in its queue, usually within minutes).
 * Scheduled every ten minutes.
 */
class CrossrefResults extends Command
{
    protected $signature = 'journal:crossref-results';

    protected $description = 'Read the results of the deposits sent to Crossref';

    public function handle(): int
    {
        if (! Crossref::connected()) {
            return self::SUCCESS;
        }

        $waiting = CrossrefDeposit::where('status', 'sent')->where('sent_at', '>=', now()->subWeek())->get();

        foreach ($waiting as $deposit) {
            try {
                Crossref::check($deposit);
                $this->line("{$deposit->batch_id}: {$deposit->status}");
            } catch (Throwable $e) {
                $this->warn("{$deposit->batch_id}: {$e->getMessage()}");
            }
        }

        return self::SUCCESS;
    }
}
