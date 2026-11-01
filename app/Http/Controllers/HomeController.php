<?php

namespace App\Http\Controllers;

use App\Journal\Journal;
use App\Journal\Seo\SeoMeta;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /** Printed cover mirrored from the old home page, used until per-issue covers exist (WS9). */
    public const FALLBACK_COVER = 'media/images/naslovna.jpg';

    /** Rows per "Latest articles" tab for the long lists (early online, supplement). */
    public const TAB_LIMIT = 10;

    /** Issues in the archive cover strip. */
    public const RECENT_ISSUES = 6;

    public function __invoke(): Response
    {
        $current = Issue::query()->withArticleStats()->where('slug', Journal::currentIssueSlug())->firstOrFail();
        $supplement = Issue::query()->withArticleStats()->where('slug', Journal::featuredSupplementSlug())->first();

        $currentIssue = $current->present(currentSlug: $current->slug);
        $currentIssue['coverImage'] ??= $this->fallbackCover();

        $published = Issue::published()->latestFirst()->get();

        return Inertia::render('journal/home', [
            'currentIssue' => $currentIssue,
            // The whole table of contents of the current issue.
            'currentArticles' => $current->articles()->get()
                ->map(fn (Article $a) => $a->setRelation('issue', $current)->presentSummary()),
            'supplement' => $supplement?->present(),
            'supplementArticles' => $supplement
                ? $supplement->articles()->limit(self::TAB_LIMIT)->get()
                    ->map(fn (Article $a) => $a->setRelation('issue', $supplement)->presentSummary())
                : [],
            'earlyOnlineCount' => Article::query()->earlyOnline()->count(),
            'earlyOnlineArticles' => Article::query()->earlyOnline()->with('issue')
                ->orderByDesc('online_at')->orderBy('position')
                ->limit(self::TAB_LIMIT)->get()
                ->map(fn (Article $a) => $a->presentSummary()),
            'recentIssues' => $published
                ->reject(fn (Issue $issue) => $issue->slug === $current->slug)
                ->take(self::RECENT_ISSUES)
                ->map(fn (Issue $issue) => $issue->presentSummary(currentSlug: $current->slug))
                ->values(),
            'archiveStart' => ($oldest = $published->sortBy('volume')->first())
                ? ['volume' => $oldest->volume, 'year' => $oldest->year]
                : null,
            'volumes' => $this->volumes($published),
            'editorQuote' => $this->editorQuote(),
        ])->withViewData(['meta' => SeoMeta::forHome()]);
    }

    /** Public URL of the mirrored printed cover, when the file is there. */
    private function fallbackCover(): ?string
    {
        return Storage::disk('journal')->exists(self::FALLBACK_COVER) ? '/'.self::FALLBACK_COVER : null;
    }

    /**
     * The mission sentence from the Editor's words (page "editorial"), word for
     * word: the home page quotes it, so it must never be paraphrased.
     */
    private function editorQuote(): ?string
    {
        $body = Page::query()->where('path', 'editorial')->value('body');

        if (! is_string($body) || ! preg_match_all('#<p\b[^>]*>(.*?)</p>#is', $body, $matches)) {
            return null;
        }

        foreach ($matches[1] as $html) {
            $text = trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8')));

            if (preg_match('/\bmission\b/i', $text)) {
                return $text;
            }
        }

        return null;
    }

    /**
     * Volume links for the archive strip: one per volume with a published
     * issue, newest first, with a summary of what the volume holds.
     *
     * @param  Collection<int, Issue>  $published
     * @return list<array{volume: int, summary: string}>
     */
    private function volumes(Collection $published): array
    {
        return array_values($published
            ->groupBy('volume')
            ->map(function (Collection $issues, int $volume) {
                $regular = $issues->where('kind', Issue::KIND_ISSUE)->count();
                $supplements = $issues->where('kind', Issue::KIND_SUPPLEMENT);
                $summary = [];

                if ($regular > 1) {
                    $summary[] = __('Issues 1 and :last', ['last' => $regular]);
                } elseif ($regular === 1) {
                    $summary[] = __('Issue :number', ['number' => $issues->firstWhere('kind', Issue::KIND_ISSUE)->number]);
                }

                if ($supplements->count() === 1) {
                    $s = $supplements->first();
                    $summary[] = __('Supplement :number', ['number' => $s->number]).($s->note ? " ({$s->note})" : '');
                } elseif ($supplements->count() > 1) {
                    $summary[] = __('Supplements :list', [
                        'list' => $supplements->sortBy('number')->pluck('number')->join(', ', ' '.__('and').' '),
                    ]);
                }

                if ($issues->contains('kind', Issue::KIND_ABSTRACTS)) {
                    $summary[] = __('Book of Abstracts');
                }

                if ($issues->contains('kind', Issue::KIND_VOLUME)) {
                    $summary[] = __('Single issue');
                }

                return ['volume' => $volume, 'summary' => implode(', ', $summary)];
            })
            ->all());
    }
}
