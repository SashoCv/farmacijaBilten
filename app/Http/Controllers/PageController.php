<?php

namespace App\Http\Controllers;

use App\Enums\Role;
use App\Journal\Seo\SeoMeta;
use App\Models\Article;
use App\Models\BoardMember;
use App\Models\Issue;
use App\Models\Page;
use App\Models\Submission;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Editorial pages: the imported CMS pages (guidelines, board, editorial, the
 * submission page) and the structured information pages built from
 * config('journal.*') (about, indexing, contact, privacy, accessibility).
 */
class PageController extends Controller
{
    /** Paths of the editorial pages, used to constrain the route. */
    public const PATHS = 'editorial|editorial-board|submit-your-paper|guidelines(?:/[a-z0-9-]+)?';

    /** Pages with a dedicated component; the rest render journal/page. */
    private const COMPONENTS = [
        'editorial-board' => 'journal/editorial-board',
        'guidelines' => 'journal/guidelines',
    ];

    public function show(string $path): Response
    {
        $page = Page::where('path', $path)->firstOrFail();

        $props = [
            ...$this->pageProps($page),
            'submission' => $page->path === 'submit-your-paper' && config('journal.guest_submissions') ? [
                ...Submission::formConfig(),
                // Reference of the manuscript just sent, shown as a confirmation.
                'received' => session('submitted'),
            ] : null,
            // Submitting needs an account: where to go from this page.
            'submitAccess' => $page->path === 'submit-your-paper' && ! config('journal.guest_submissions') ? [
                'signedIn' => auth()->check(),
                'isAuthor' => auth()->user()?->hasRole(Role::Author) ?? false,
                'register' => route('register'),
                'login' => route('login'),
                'manuscripts' => route('author.manuscripts.index'),
            ] : null,
        ];

        $props += match ($page->path) {
            'editorial-board' => $this->boardProps(),
            'guidelines' => ['children' => $this->children($page)],
            'guidelines/downloads' => ['files' => $page->linkedFiles()],
            default => [],
        };

        return Inertia::render(self::COMPONENTS[$page->path] ?? 'journal/page', $props)
            ->withViewData(['meta' => $this->meta($page)]);
    }

    /** Dedicated contact page, built from config('journal.*'). */
    public function contact(): Response
    {
        $page = Page::where('path', 'contact')->first();

        return Inertia::render('journal/contact', [
            'title' => $page?->localizedTitle() ?? __('Contact'),
            // Titles only: the old contact text is replaced by config('journal.*'),
            // the one place the street address is kept.
            'page' => $page ? [
                'path' => $page->path,
                'title' => $page->title,
                'titleMk' => $page->title_mk,
                'summary' => $page->summary,
            ] : null,
        ])->withViewData(['meta' => $page ? $this->meta($page) : SeoMeta::forListing(__('Contact'))]);
    }

    public function about(): Response
    {
        $title = __('About the journal');

        $issues = Issue::published();

        return Inertia::render('journal/about', [
            'title' => $title,
            'archive' => [
                'firstVolume' => (clone $issues)->min('volume'),
                'firstYear' => (clone $issues)->min('year'),
                'lastVolume' => (clone $issues)->max('volume'),
                'lastYear' => (clone $issues)->max('year'),
                'issues' => (clone $issues)->count(),
                'articles' => Article::whereIn('issue_id', (clone $issues)->select('id'))->count(),
            ],
        ])->withViewData(['meta' => $this->listingMeta($title, 'Facts about the Macedonian Pharmaceutical Bulletin: publisher, ISSN, DOI prefix, licence, peer review, charges and indexing.')]);
    }

    public function indexing(): Response
    {
        $title = __('Indexing and abstracting');

        return Inertia::render('journal/indexing', ['title' => $title])
            ->withViewData(['meta' => $this->listingMeta($title, 'Where the Macedonian Pharmaceutical Bulletin is indexed, and its identifiers: ISSN and Crossref DOI prefix.')]);
    }

    public function privacy(): Response
    {
        $title = __('Privacy notice');

        return Inertia::render('journal/privacy', [
            'title' => $title,
            'cookies' => [
                ['name' => config('session.cookie'), 'purpose' => 'session', 'minutes' => (int) config('session.lifetime')],
                ['name' => 'XSRF-TOKEN', 'purpose' => 'xsrf', 'minutes' => (int) config('session.lifetime')],
                ['name' => 'locale', 'purpose' => 'locale', 'minutes' => null],
            ],
            'maxMb' => Submission::manuscriptMaxMb(),
        ])->withViewData(['meta' => $this->listingMeta($title, 'How the Macedonian Pharmaceutical Bulletin handles personal data and cookies.')]);
    }

    public function accessibility(): Response
    {
        $title = __('Accessibility statement');

        return Inertia::render('journal/accessibility', ['title' => $title])
            ->withViewData(['meta' => $this->listingMeta($title, 'Accessibility of the Macedonian Pharmaceutical Bulletin website: target standard, known limitations and how to ask for an accessible format.')]);
    }

    /**
     * @return array<string, mixed>
     */
    private function meta(Page $page): array
    {
        $meta = SeoMeta::forPage($page);
        $meta['description'] ??= $page->description();

        return $meta;
    }

    /**
     * @return array<string, mixed>
     */
    private function listingMeta(string $title, string $description): array
    {
        $meta = SeoMeta::forListing($title);
        $meta['description'] ??= $description;

        return $meta;
    }

    /**
     * @return array{page: array<string, mixed>, toc: list<array{id: string, title: string}>, section: array<string, mixed>|null}
     */
    private function pageProps(Page $page): array
    {
        $section = $page->parent_path ?? $page->path;

        $siblings = Page::query()
            ->where('parent_path', $section)
            ->orderBy('position')
            ->orderBy('title')
            ->get(['path', 'title', 'title_mk', 'summary']);

        $sectionPage = $section === $page->path ? $page : Page::where('path', $section)->first();
        $toc = $page->hasToc() ? $page->outline() : [];

        return [
            'page' => [
                'path' => $page->path,
                'title' => $page->title,
                'titleMk' => $page->title_mk,
                'body' => $page->displayBody(),
                'bodyMk' => filled($page->body_mk) ? $page->displayBody($page->body_mk) : null,
                'summary' => $page->summary,
                'signOff' => $page->hasSignOff(),
            ],
            'toc' => $toc,
            'section' => $siblings->isEmpty() ? null : [
                'title' => $sectionPage->title ?? 'For authors',
                'titleMk' => $sectionPage?->title_mk,
                'summary' => $sectionPage?->summary,
                'path' => $section,
                'pages' => $siblings->map(fn (Page $p) => ['path' => $p->path, 'title' => $p->title, 'titleMk' => $p->title_mk, 'summary' => $p->summary]),
            ],
        ];
    }

    /**
     * Child pages of a section hub, with their one-line summaries.
     *
     * @return list<array{path: string, title: string, titleMk: string|null, summary: string|null}>
     */
    private function children(Page $page): array
    {
        return array_values(Page::query()
            ->where('parent_path', $page->path)
            ->orderBy('position')
            ->orderBy('title')
            ->get(['path', 'title', 'title_mk', 'summary'])
            ->map(fn (Page $p) => ['path' => $p->path, 'title' => $p->title, 'titleMk' => $p->title_mk, 'summary' => $p->summary])
            ->all());
    }

    /**
     * @return array{members: list<array<string, mixed>>, updatedAt: string|null, updatedLabel: string|null}
     */
    private function boardProps(): array
    {
        $members = BoardMember::query()->ordered()->get();

        $sorted = $members
            ->groupBy('group')
            ->flatMap(fn ($group, string $key) => $key === BoardMember::GROUP_INTERNATIONAL
                // Alphabetical by family name, as on the boards of international journals.
                ? $group->sortBy(fn (BoardMember $m) => mb_strtolower(Str::ascii($m->family_name.' '.$m->given_name)))->values()
                : $group);

        $updated = $members->max('updated_at');

        return [
            'members' => array_values($sorted->map(fn (BoardMember $m) => $m->present())->all()),
            'updatedAt' => $updated ? Carbon::parse($updated)->toDateString() : null,
            // "16 December 2020" / "16 декември 2020", formatted on the server for SSR.
            'updatedLabel' => $updated ? Carbon::parse($updated)->translatedFormat('j F Y') : null,
        ];
    }
}
