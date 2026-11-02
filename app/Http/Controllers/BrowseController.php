<?php

namespace App\Http\Controllers;

use App\Journal\Seo\SeoMeta;
use App\Models\Article;
use App\Models\Issue;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class BrowseController extends Controller
{
    /** Rows per page of a table of contents; large supplements load more on demand. */
    public const PER_PAGE = 40;

    public function archive(): Response
    {
        $issues = Issue::query()->withArticleStats()->published()->latestFirst()->get();

        return Inertia::render('journal/archive', [
            'volumes' => $issues->groupBy('volume')->map(fn (Collection $group, int $volume) => [
                'volume' => $volume,
                'year' => $group->first()->year,
                'issues' => $group->map(fn (Issue $issue) => $issue->presentSummary())->values(),
            ])->values(),
        ])->withViewData(['meta' => SeoMeta::forListing(__('Archive'))]);
    }

    public function earlyOnline(): Response
    {
        $articles = Article::query()->earlyOnline()->with('issue')
            ->orderByDesc('online_at')->orderBy('position')->get();

        return Inertia::render('journal/early-online', [
            'articles' => $articles->map(fn (Article $a) => $a->presentSummary()),
            'issues' => Issue::query()->withArticleStats()->where('is_published', false)
                ->latestFirst()->get()
                ->map(fn (Issue $i) => $i->presentSummary()),
        ])->withViewData(['meta' => SeoMeta::forListing(__('Early online'))]);
    }

    public function issue(Request $request, string $issue): Response
    {
        $found = Issue::query()->withArticleStats()->where('slug', $issue)->firstOrFail();
        $query = (string) $request->string('q')->trim()->limit(120, '');
        $sort = $request->string('sort')->toString() === 'newest' ? 'newest' : 'toc';
        $terms = Article::searchTerms($query);

        // Page numbers only: enough for the issue's first–last page range.
        $found->load(['articles' => fn (HasMany $q) => $q->select('id', 'issue_id', 'pages')]);

        $articles = self::ordered($found->articles()->getQuery(), $sort)
            ->matching($terms)
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(function (Article $a) use ($found, $terms) {
                $row = $a->setRelation('issue', $found)->presentSummary();

                // The abstract and keywords only travel when a filter needs excerpts.
                return $terms === [] ? $row : [
                    ...$row,
                    'abstract' => $a->abstract,
                    'keywords' => $a->keywords ?? [],
                ];
            });

        $detail = $found->present();
        // Size of the whole-issue PDF from the mirror until the importer stores it.
        $detail['pdfBytes'] ??= self::fileSize($found->full_pdf);

        return Inertia::render('journal/issue', [
            'issue' => $detail,
            'articles' => Inertia::scroll($articles),
            'matchCount' => $articles->total(),
            'filters' => ['q' => $query, 'sort' => $sort],
            'issues' => self::browseList(),
        ])->withViewData(['meta' => SeoMeta::forIssue($found)]);
    }

    /**
     * Printed order: by first page, then by article number (early-online
     * issues have no pages yet). Posting order is used only for "Newest
     * online first".
     *
     * @param  Builder<Article>  $query
     * @return Builder<Article>
     */
    public static function ordered(Builder $query, string $sort = 'toc'): Builder
    {
        $query->reorder();

        if ($sort === 'newest') {
            return $query->orderByDesc('online_at')->orderBy('position');
        }

        // The leading digits as an integer: "3–11" → 3, "001" → 1.
        [$firstPage, $number] = match (DB::connection($query->getModel()->getConnectionName())->getDriverName()) {
            'pgsql' => ["nullif(substring(pages from '^[0-9]+'), '')::int", "nullif(substring(number from '^[0-9]+'), '')::int"],
            'mysql', 'mariadb' => ['cast(pages as signed)', 'cast(number as signed)'],
            default => ['cast(pages as integer)', 'cast(number as integer)'],
        };

        return $query
            ->orderByRaw("case when pages is null or pages = '' then 1 else 0 end")
            ->orderByRaw($firstPage)
            ->orderByRaw($number)
            ->orderBy('position');
    }

    /**
     * "Browse issues" rail: issues still being released online first, then
     * the newest published ones.
     *
     * @return list<array<string, mixed>>
     */
    private static function browseList(): array
    {
        $early = Issue::query()->where('is_published', false)->latestFirst()->get();
        $published = Issue::published()->latestFirst()->limit(8)->get();

        return array_values($early->concat($published)
            ->map(fn (Issue $i) => $i->presentSummary())
            ->all());
    }

    private static function fileSize(?string $path): ?int
    {
        if (! $path) {
            return null;
        }

        $file = storage_path('app/journal/'.ltrim($path, '/'));

        return is_file($file) ? (filesize($file) ?: null) : null;
    }
}
