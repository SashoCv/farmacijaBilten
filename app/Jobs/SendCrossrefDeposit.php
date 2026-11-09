<?php

namespace App\Jobs;

use App\Crossref\Crossref;
use App\Models\Article;
use App\Models\CrossrefDeposit;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Throwable;

/** Sends a queued deposit to Crossref; journal:crossref-results reads the result later. */
class SendCrossrefDeposit implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 600];

    /** @param  list<int>  $articleIds */
    public function __construct(public int $depositId, public array $articleIds) {}

    public function handle(): void
    {
        $deposit = CrossrefDeposit::with('issue')->find($this->depositId);

        if ($deposit === null || $deposit->status !== 'queued' || $deposit->issue === null) {
            return;
        }

        $articles = Article::whereIn('id', $this->articleIds)->orderBy('position')->get();

        Crossref::send($deposit, Crossref::xml($deposit->issue, $articles, $deposit->batch_id));
    }

    public function failed(Throwable $e): void
    {
        CrossrefDeposit::whereKey($this->depositId)->where('status', 'queued')
            ->update(['status' => 'failed', 'message' => mb_substr($e->getMessage(), 0, 500)]);
    }
}
