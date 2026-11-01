<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class JournalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $current = $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->article($current, '001', 'Analytical methods for sugar content', ['Redzep Ali', 'Oliver Majstorov'], '2025-04-30');
        $this->article($current, '004', 'Ceftazidime/avibactam as a treatment option', ['Ana Kaftandzieva', 'Gordana Mirchevska'], '2025-04-30');
        $this->article($current, '005', 'Mycological profile of dermatomycoses', ['Gordana Mirchevska', 'Emel Dauti Jahja'], '2025-06-05');

        $supplement = $this->issue('72-s1', 72, Issue::KIND_SUPPLEMENT, 1, note: '8CPM');
        $this->article($supplement, '001', 'Agile pharmacy curricula', ['Borut Božič']);

        $early = $this->issue('72-1', 72, Issue::KIND_ISSUE, 1, published: false);
        $this->article($early, '002', 'Detection of sibutramine in slimming teas', ['Darko Dukovski'], '2025-07-02');

        $this->issue('47', 47, Issue::KIND_VOLUME, null, fullPdf: 'volumes/Volume 47/Volume_47.pdf');

        Page::create(['path' => 'guidelines', 'title' => 'Guidelines', 'body' => '<p>Index</p>']);
        Page::create(['path' => 'guidelines/aims-and-scope', 'title' => 'Aims and scope', 'parent_path' => 'guidelines', 'body' => '<p>Scope</p>']);

        Journal::flush();
    }

    public function test_home_shows_the_newest_issue_and_supplement(): void
    {
        $this->get(route('home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/home')
                ->where('currentIssue.slug', '71-2')
                ->where('currentIssue.publishedSpan', 'April–June 2025')
                ->has('currentArticles', 3)
                ->where('supplement.slug', '72-s1')
                ->where('earlyOnlineCount', 1)
                // Volume 72 only has unpublished regular issues, plus the supplement.
                ->where('volumes.0', ['volume' => 72, 'summary' => 'Supplement 1 (8CPM)'])
                ->where('currentIssueSlug', '71-2'));
    }

    public function test_issue_page_lists_contents_with_pdf_urls(): void
    {
        $this->get(route('issues.show', '71-2'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/issue')
                ->where('issue.label', 'Volume 71, Issue 2')
                ->where('issue.isCurrent', true)
                ->has('articles.data', 3)
                ->where('matchCount', 3)
                ->where('articles.data.0.pdf', '/volumes/Volume%2071_2/71_2_001.pdf'));
    }

    public function test_issue_search_and_sort_run_on_the_server(): void
    {
        $this->get(route('issues.show', ['issue' => '71-2', 'q' => 'mirchevska', 'sort' => 'newest']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('matchCount', 2)
                ->where('filters', ['q' => 'mirchevska', 'sort' => 'newest'])
                // Newest online first: 005 (5 June) before 004 (30 April).
                ->where('articles.data.0.number', '005')
                ->where('articles.data.1.number', '004'));
    }

    public function test_single_pdf_volume_renders_without_articles(): void
    {
        $this->get(route('issues.show', '47'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('issue.label', 'Volume 47')
                ->where('issue.pdf', '/volumes/Volume%2047/Volume_47.pdf')
                ->has('articles.data', 0));
    }

    public function test_article_page_builds_citation(): void
    {
        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '004']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/article')
                ->where('article.citation', 'Kaftandzieva A, Mirchevska G. Ceftazidime/avibactam as a treatment option. Maced. Pharm. Bull. 2025;71(2):[pp–pp].')
                ->has('related', 2)
                ->where('pdfUrl', url('/volumes/Volume%2071_2/71_2_004.pdf')));
    }

    public function test_search_matches_titles_and_authors_including_diacritics(): void
    {
        $this->get(route('search', ['q' => 'Mirchevska']))
            ->assertInertia(fn (Assert $page) => $page->has('results', 2));

        $this->get(route('search', ['q' => 'Božič']))
            ->assertInertia(fn (Assert $page) => $page->has('results', 1));

        // Words match independently and in any order.
        $this->get(route('search', ['q' => 'Mirchevska Kaftandzieva']))
            ->assertInertia(fn (Assert $page) => $page->has('results', 1)->where('results.0.number', '004'));
    }

    public function test_archive_groups_published_issues_by_volume(): void
    {
        $this->get(route('archive'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/archive')
                ->has('volumes', 3)
                ->where('volumes.0.volume', 72)
                ->has('volumes.0.issues', 1));
    }

    public function test_early_online_lists_articles_of_unpublished_issues(): void
    {
        $this->get(route('early-online'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->has('articles', 1)
                ->where('articles.0.issueLabel', 'Volume 72, Issue 1'));
    }

    public function test_editorial_page_shows_its_section(): void
    {
        $this->get('/guidelines/aims-and-scope')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/page')
                ->where('page.title', 'Aims and scope')
                ->where('section.path', 'guidelines')
                ->has('section.pages', 1));
    }

    public function test_old_site_addresses_redirect_permanently(): void
    {
        $this->get('/volume-71-2/')->assertRedirect('/issues/71-2')->assertStatus(301);
        // Redirects go to the issue only when it exists, otherwise to its volume in the archive.
        $this->issue('68-s1', 68, Issue::KIND_SUPPLEMENT, 1);
        $this->issue('53', 53, Issue::KIND_ABSTRACTS, null);
        $this->get('/68-supp-1')->assertRedirect('/issues/68-s1');
        $this->get('/72_3_2026-8cpm/')->assertRedirect('/issues/72-s1');
        $this->get('/volume-55')->assertRedirect('/issues/53');
        $this->get('/volume-62')->assertRedirect('/archive#volume-62');
        $this->get('/index.php/instructions-for-authors/')->assertRedirect('/guidelines/instructions-for-authors');
    }

    public function test_interface_switches_to_macedonian(): void
    {
        $this->get('/locale/mk')->assertRedirect()->assertPlainCookie('locale', 'mk');

        $this->withUnencryptedCookie('locale', 'mk')
            ->get(route('issues.show', '71-2'))
            ->assertSee('lang="mk"', false)
            ->assertInertia(fn (Assert $page) => $page
                ->where('locale', 'mk')
                ->where('issue.label', 'Том 71, број 2')
                ->where('issue.publishedRange', '30 април – 5 јуни 2025'));

        $this->get('/locale/xx')->assertNotFound();
    }

    public function test_unknown_issue_and_article_return_404(): void
    {
        $this->get('/issues/99-9')->assertNotFound();
        $this->get('/articles/71-2/999')->assertNotFound();
        $this->get('/guidelines/nope')->assertNotFound();
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

    /** @param  list<string>  $authors */
    private function article(Issue $issue, string $number, string $title, array $authors, ?string $online = null): Article
    {
        $folder = $issue->kind === Issue::KIND_SUPPLEMENT ? "{$issue->volume}_3" : "{$issue->volume}_{$issue->number}";

        return $issue->articles()->create([
            'number' => $number,
            'position' => (int) $number,
            'title' => $title,
            'authors' => $authors,
            'pdf' => "volumes/Volume {$folder}/{$folder}_{$number}.pdf",
            'online_at' => $online,
        ]);
    }
}
