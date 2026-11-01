<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Models\Article;
use App\Models\Issue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/** Issue pages, archive and early online (WS3). */
class BrowseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Journal::flush();
    }

    public function test_early_online_issue_reads_in_number_order_not_posting_order(): void
    {
        // As imported for 72-1: posted 002, 003, 004, 001, 005; no page numbers yet.
        $issue = $this->issue('72-1', 72, Issue::KIND_ISSUE, 1, published: false);

        foreach (['002', '003', '004', '001', '005'] as $position => $number) {
            $this->article($issue, $number, position: $position + 1, online: '2025-07-02');
        }

        $this->get(route('issues.show', '72-1'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/issue')
                ->where('articles.data.0.number', '001')
                ->where('articles.data.1.number', '002')
                ->where('articles.data.2.number', '003')
                ->where('articles.data.3.number', '004')
                ->where('articles.data.4.number', '005'));
    }

    public function test_toc_follows_printed_pages_then_number(): void
    {
        $issue = $this->issue('68-2', 68, Issue::KIND_ISSUE, 2);
        $this->article($issue, '001', pages: '17–25', position: 1);
        $this->article($issue, '010', pages: '3–15', position: 2);
        $this->article($issue, '002', pages: '97–102', position: 3);
        $this->article($issue, '003', pages: null, position: 4);

        $this->get(route('issues.show', '68-2'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('articles.data.0.number', '010')
                ->where('articles.data.1.number', '001')
                ->where('articles.data.2.number', '002')
                // Not yet paginated: after the printed ones.
                ->where('articles.data.3.number', '003')
                ->where('issue.firstPage', 3)
                ->where('issue.lastPage', 102));
    }

    public function test_newest_first_uses_online_date_then_posting_order(): void
    {
        $issue = $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->article($issue, '001', pages: '3–11', position: 2, online: '2025-04-30');
        $this->article($issue, '002', pages: '13–25', position: 1, online: '2025-06-05');

        $this->get(route('issues.show', ['issue' => '71-2', 'sort' => 'newest']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sort', 'newest')
                ->where('articles.data.0.number', '002')
                ->where('articles.data.1.number', '001'));
    }

    public function test_rows_are_summaries_and_carry_abstracts_only_when_filtering(): void
    {
        $issue = $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->article($issue, '001', abstract: 'We measured fructose in juices.');

        $this->get(route('issues.show', '71-2'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('articles.data.0.hasAbstract', true)
                ->missing('articles.data.0.abstract')
                ->missing('articles.data.0.references')
                ->has('articles.data.0.titleHtml')
                ->has('articles.data.0.doiRegistered'));

        $this->get(route('issues.show', ['issue' => '71-2', 'q' => 'fructose']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('matchCount', 1)
                ->where('articles.data.0.abstract', 'We measured fructose in juices.'));
    }

    public function test_large_supplement_paginates_with_a_crawlable_next_link(): void
    {
        $issue = $this->issue('72-s1', 72, Issue::KIND_SUPPLEMENT, 1, note: '8CPM');

        for ($n = 1; $n <= 45; $n++) {
            $this->article($issue, sprintf('%03d', $n), pages: (2 * $n + 1).'–'.(2 * $n + 2), position: $n);
        }

        $this->get(route('issues.show', '72-s1'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('articles.data', 40)
                ->where('articles.total', 45)
                ->where('matchCount', 45));

        $this->get(route('issues.show', ['issue' => '72-s1', 'page' => 2]))
            ->assertInertia(fn (Assert $page) => $page
                ->has('articles.data', 5)
                ->where('articles.data.0.number', '041'));
    }

    public function test_empty_issue_reports_its_pdf_size_and_no_articles(): void
    {
        $this->issue('53', 53, Issue::KIND_ABSTRACTS, null, fullPdf: 'volumes/__ws3_test_missing.pdf');

        $this->get(route('issues.show', '53'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('issue.articleCount', 0)
                ->where('matchCount', 0)
                ->has('articles.data', 0)
                // The file is not mirrored in tests, so there is no size to show.
                ->where('issue.pdfBytes', null));
    }

    public function test_browse_list_puts_early_online_issues_first(): void
    {
        $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->issue('72-1', 72, Issue::KIND_ISSUE, 1, published: false);
        $this->issue('73-1', 73, Issue::KIND_ISSUE, 1, published: false);

        $this->get(route('issues.show', '71-2'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('issues.0.slug', '73-1')
                ->where('issues.0.isPublished', false)
                ->where('issues.1.slug', '72-1')
                ->where('issues.2.slug', '71-2'));
    }

    public function test_early_online_lists_issues_in_progress(): void
    {
        $published = $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->article($published, '001', online: '2025-04-30');
        $early = $this->issue('72-1', 72, Issue::KIND_ISSUE, 1, published: false);
        $this->article($early, '001', online: '2025-07-02');

        $this->get(route('early-online'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/early-online')
                ->has('articles', 1)
                ->has('issues', 1)
                ->where('issues.0.slug', '72-1')
                ->where('issues.0.articleCount', 1));
    }

    public function test_archive_lists_only_published_issues_with_years(): void
    {
        $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->issue('72-1', 72, Issue::KIND_ISSUE, 1, published: false);
        $this->issue('72-s1', 72, Issue::KIND_SUPPLEMENT, 1, note: '8CPM');

        $this->get(route('archive', ['view' => 'list']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/archive')
                ->has('volumes', 2)
                ->where('volumes.0.volume', 72)
                ->has('volumes.0.issues', 1)
                ->where('volumes.0.issues.0.note', '8CPM')
                ->where('volumes.0.issues.0.year', 2026));
    }

    private function issue(string $slug, int $volume, string $kind, ?int $number, ?string $note = null, bool $published = true, ?string $fullPdf = null): Issue
    {
        return Issue::create([
            'slug' => $slug,
            'volume' => $volume,
            'kind' => $kind,
            'number' => $number,
            'note' => $note,
            'year' => $volume + 1954,
            'is_published' => $published,
            'full_pdf' => $fullPdf,
        ]);
    }

    private function article(Issue $issue, string $number, ?string $pages = null, ?int $position = null, ?string $online = null, ?string $abstract = null): Article
    {
        return $issue->articles()->create([
            'number' => $number,
            'position' => $position ?? (int) $number,
            'title' => "Article {$number}",
            'authors' => ['Ana Petrova'],
            'type' => 'Original scientific paper',
            'pages' => $pages,
            'abstract' => $abstract,
            'online_at' => $online,
        ]);
    }
}
