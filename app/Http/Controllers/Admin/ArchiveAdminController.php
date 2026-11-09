<?php

namespace App\Http\Controllers\Admin;

use App\Crossref\Crossref;
use App\Http\Controllers\Controller;
use App\Journal\Search\Folder;
use App\Models\Article;
use App\Models\CrossrefDeposit;
use App\Models\Issue;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The published archive (volumes 47 to today) for the editorial office,
 * read-only. These articles were published as PDFs in the journal's old
 * layout (two columns, made in Word): they are shown as they are, marked as
 * archived, and never opened in the new editor or template.
 */
class ArchiveAdminController extends Controller
{
    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));

        $issues = Issue::query()->withCount('articles')
            ->orderByDesc('volume')
            ->orderByRaw("case kind when 'issue' then 0 when 'supplement' then 1 else 2 end")
            ->orderByDesc('number')
            ->get()
            ->map(fn (Issue $i) => [
                'slug' => $i->slug,
                'label' => $i->label(),
                'volume' => $i->volume,
                'kind' => $i->kind,
                'year' => $i->year,
                'published' => (bool) $i->is_published,
                'articles' => $i->articles_count,
                'cover' => $i->cover_image ? Storage::disk('journal')->url($i->cover_image) : null,
                'url' => route('admin.archive.issue', $i),
                'publicUrl' => route('issues.show', $i),
                // Open issues (in preparation) are managed on the issue page.
                'manageUrl' => $i->is_published ? null : route('admin.issues.show', $i),
            ])->values()->all();

        $results = [];

        if ($q !== '') {
            $terms = Folder::terms($q);
            $query = Article::query()->with('issue');

            foreach ($terms as $term) {
                $query->whereRaw('instr(articles.search_text, ?) > 0', [$term]);
            }

            if (preg_match('#^10\.\d{4,9}/#', $q)) {
                $query = Article::query()->with('issue')->where('doi', $q);
            }

            $results = $query->limit(50)->get()->map(fn (Article $a) => $this->row($a))->values()->all();
        }

        return Inertia::render('admin/archive/index', [
            'issues' => $issues,
            'filters' => ['q' => $q],
            'createIssueUrl' => route('admin.issues.store'),
            'doiCheckUrl' => route('admin.archive.dois'),
            'nextIssue' => self::nextIssue(),
            'results' => $results,
            'totals' => [
                'issues' => count($issues),
                'articles' => Article::count(),
                'doiUnregistered' => Article::whereNotNull('doi')->where('doi_registered', false)->count(),
                'withoutAbstract' => Article::whereNull('abstract')->orWhere('abstract', '')->count(),
                'withoutKeywords' => Article::whereNull('keywords')->orWhere('keywords', '[]')->count(),
            ],
        ]);
    }

    /**
     * Which DOIs do not resolve, and why. The verdicts come from
     * `php artisan journal:sync-crossref`, which downloads every DOI the
     * journal has deposited at Crossref (prefix 10.33320) and compares them
     * with the articles; its reasons are in storage/app/reports.
     */
    public function dois(): Response
    {
        $reasons = Crossref::problems();

        $checked = storage_path('app/reports/doi-unregistered.csv');

        $groups = Article::query()->with('issue')
            ->whereNotNull('doi')->where('doi_registered', false)
            ->get()
            ->groupBy('issue_id')
            ->map(function ($articles) use ($reasons) {
                /** @var Issue $issue */
                $issue = $articles->first()->issue;

                return [
                    'slug' => $issue->slug,
                    'label' => $issue->label(),
                    'year' => $issue->year,
                    'volume' => $issue->volume,
                    'url' => route('admin.archive.issue', $issue),
                    'total' => $issue->articles()->count(),
                    // Not registered and safe to deposit (not the ones to check by hand).
                    'pending' => Crossref::pending($issue)->count(),
                    'xmlUrl' => route('admin.crossref.xml', $issue),
                    'depositUrl' => route('admin.crossref.deposit', $issue),
                    'articles' => $articles->sortBy('number')->map(fn (Article $a) => [
                        'number' => $a->number,
                        'title' => $a->title,
                        'doi' => (string) $a->doi,
                        'problem' => $reasons[$issue->slug.'/'.$a->number]['problem'] ?? 'Not found at Crossref',
                        'crossrefDoi' => $reasons[$issue->slug.'/'.$a->number]['crossrefDoi'] ?? null,
                        'url' => route('admin.archive.article', [$issue, $a->number]),
                    ])->values()->all(),
                ];
            })
            ->sortByDesc(fn (array $g) => [$g['volume'], $g['slug']])
            ->values()->all();

        // Registered only in a mistyped form, by issue: depositing registers the printed DOI.
        $double = Article::query()->with('issue')
            ->whereNotNull('doi_resolvable')->whereColumn('doi_resolvable', '!=', 'doi')
            ->get()
            ->groupBy('issue_id')
            ->map(function ($articles) {
                /** @var Issue $issue */
                $issue = $articles->first()->issue;

                return [
                    'slug' => $issue->slug,
                    'label' => $issue->label(),
                    'volume' => $issue->volume,
                    'pending' => Crossref::pending($issue)->count(),
                    'xmlUrl' => route('admin.crossref.xml', $issue),
                    'depositUrl' => route('admin.crossref.deposit', $issue),
                    'articles' => $articles->sortBy('number')->map(fn (Article $a) => [
                        'number' => $a->number,
                        'doi' => (string) $a->doi,
                        'registeredAs' => (string) $a->doi_resolvable,
                        'url' => route('admin.archive.article', [$issue, $a->number]),
                    ])->values()->all(),
                ];
            })
            ->sortByDesc(fn (array $g) => [$g['volume'], $g['slug']])
            ->values()->all();

        return Inertia::render('admin/archive/dois', [
            'checkedAt' => is_file($checked) ? date(DATE_ATOM, (int) filemtime($checked)) : null,
            'prefix' => '10.33320',
            'groups' => $groups,
            'double' => $double,
            'indexUrl' => route('admin.archive.index'),
            'crossref' => [
                'depositorName' => Setting::get(Crossref::SETTING_NAME),
                'depositorEmail' => Setting::get(Crossref::SETTING_EMAIL),
                'auto' => Setting::get(Crossref::SETTING_AUTO) === '1',
                'connected' => Crossref::connected(),
                'testMode' => Crossref::testMode(),
                'target' => config('crossref.target') === 'page' ? 'page' : 'pdf',
                'settingsUrl' => route('admin.crossref.settings'),
                'accountUrl' => route('admin.crossref.account'),
                // Never the password: only whether one is saved.
                'username' => Crossref::username(),
                'accountSource' => Crossref::accountSource(),
            ],
            'deposits' => CrossrefDeposit::with(['issue', 'user'])->latest('id')->limit(20)->get()
                ->map(fn (CrossrefDeposit $d) => [
                    'id' => $d->id,
                    'batchId' => $d->batch_id,
                    'issue' => $d->issue?->label(),
                    'count' => count($d->dois),
                    'dois' => $d->dois,
                    'status' => $d->status,
                    'trigger' => $d->trigger,
                    'test' => $d->test,
                    'message' => $d->message,
                    'by' => $d->user?->name,
                    'at' => $d->created_at?->toIso8601String(),
                ])->values()->all(),
        ]);
    }

    public function issue(Issue $issue): Response
    {
        return Inertia::render('admin/archive/issue', [
            'issue' => [
                'slug' => $issue->slug,
                'label' => $issue->label(),
                'year' => $issue->year,
                'published' => (bool) $issue->is_published,
                'fullPdf' => $issue->full_pdf ? Storage::disk('journal')->url($issue->full_pdf) : null,
                'publicUrl' => route('issues.show', $issue),
                'indexUrl' => route('admin.archive.index'),
            ],
            'articles' => $issue->articles()->with('issue')->orderBy('position')->get()
                ->map(fn (Article $a) => $this->row($a))->values()->all(),
        ]);
    }

    public function show(Issue $issue, string $number): Response
    {
        $article = $this->article($issue, $number);

        return Inertia::render('admin/archive/article', [
            'article' => [
                ...$this->row($article),
                'abstract' => (string) $article->abstract,
                'keywords' => $article->keywords ?? [],
                'affiliations' => $article->affiliations ?? [],
                'onlineAt' => $article->online_at?->format('Y-m-d'),
                'issueUrl' => route('admin.archive.issue', $issue),
            ],
        ]);
    }

    /**
     * A sensible default for the "New issue" form: the issue after the newest one.
     *
     * @return array{volume: int, number: int, year: int}
     */
    private static function nextIssue(): array
    {
        $last = Issue::where('kind', Issue::KIND_ISSUE)->orderByDesc('volume')->orderByDesc('number')->first();

        if ($last === null) {
            return ['volume' => 1, 'number' => 1, 'year' => (int) now()->year];
        }

        return $last->number >= 2
            ? ['volume' => $last->volume + 1, 'number' => 1, 'year' => (int) ($last->year ?? now()->year) + 1]
            : ['volume' => $last->volume, 'number' => $last->number + 1, 'year' => (int) ($last->year ?? now()->year)];
    }

    private function article(Issue $issue, string $number): Article
    {
        return Article::where('issue_id', $issue->id)->where('number', $number)->with('issue')->firstOrFail();
    }

    /** @return array<string, mixed> */
    private function row(Article $a): array
    {
        return [
            'id' => $a->id,
            'number' => $a->number,
            'issueLabel' => $a->issue->label(),
            'title' => $a->title,
            'authors' => $a->authors ?? [],
            'type' => $a->type,
            'pages' => $a->pages,
            'doi' => $a->doi,
            'doiRegistered' => $a->doi_registered,
            'hasAbstract' => filled($a->abstract),
            'keywordsCount' => count($a->keywords ?? []),
            'pdfUrl' => $a->pdf ? Storage::disk('journal')->url($a->pdf) : null,
            'publicUrl' => route('articles.show', [$a->issue, $a->number]),
            'url' => route('admin.archive.article', [$a->issue, $a->number]),
        ];
    }
}
