<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The shared foundation of the redesign: presenter contract, shared props,
 * routes, legacy redirects and schema.
 */
class FoundationTest extends TestCase
{
    use RefreshDatabase;

    private const SUMMARY_KEYS = [
        'number', 'issueSlug', 'issueLabel', 'title', 'titleHtml', 'titleLang', 'authors', 'type',
        'pages', 'doi', 'doiRegistered', 'doiUrl', 'publishedAt', 'publishedLabel', 'publicationDate',
        'pdf', 'pdfBytes', 'hasAbstract', 'citation',
    ];

    private const DETAIL_KEYS = [
        'affiliations', 'history', 'receivedAt', 'acceptedAt', 'onlineAt', 'pdfPages', 'pdfThumb',
        'licence', 'abstract', 'abstractLang', 'keywords', 'keywordsLang', 'references',
    ];

    private const ISSUE_SUMMARY_KEYS = [
        'slug', 'volume', 'number', 'kind', 'part', 'label', 'note', 'fullTitle', 'locationDates', 'year',
        'isCurrent', 'isPublished', 'articleCount', 'publishedRange', 'publishedSpan', 'coverImage', 'pdf', 'tocPdf',
    ];

    private const ISSUE_DETAIL_KEYS = [
        'coverPdf', 'doi', 'doiUrl', 'onlineAt', 'firstPage', 'lastPage', 'pdfPages', 'pdfBytes',
    ];

    private Issue $issue;

    protected function setUp(): void
    {
        parent::setUp();

        $this->issue = Issue::create([
            'slug' => '71-2', 'volume' => 71, 'kind' => Issue::KIND_ISSUE, 'number' => 2, 'year' => 2025,
        ]);

        $this->issue->articles()->create([
            'number' => '001',
            'position' => 1,
            'title' => 'Sugars in fruit juices',
            'authors' => ['Redzep Ali', 'Oliver Majstorov'],
            'pages' => '3–11',
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.001',
            'abstract' => 'Sugars are measured.',
            'keywords' => ['sugars'],
            'online_at' => '2025-04-30',
            'pdf' => 'volumes/Volume 71_2/71_2_001.pdf',
        ]);

        $this->issue->articles()->create([
            'number' => '002',
            'position' => 2,
            'title' => 'Фармацевтска грижа & <b>пациенти</b>',
            'authors' => ['Ana Petrova'],
            'pages' => '13–20',
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.002',
            'doi_registered' => false,
        ]);

        Journal::flush();
    }

    public function test_article_presenters_expose_the_whole_contract(): void
    {
        $article = Article::with('issue')->where('number', '001')->first();

        $summary = $article->presentSummary();
        $this->assertSame(self::SUMMARY_KEYS, array_keys($summary));
        $this->assertSame([...self::SUMMARY_KEYS, ...self::DETAIL_KEYS], array_keys($article->present()));

        $this->assertSame('Sugars in fruit juices', $summary['titleHtml']);
        $this->assertSame('en', $summary['titleLang']);
        $this->assertNull($summary['doiRegistered']);
        $this->assertSame('https://doi.org/10.33320/maced.pharm.bull.2025.71.02.001', $summary['doiUrl']);
        $this->assertSame('2025-04-30', $summary['publicationDate']);
        $this->assertTrue($summary['hasAbstract']);
        $this->assertStringEndsWith('doi: 10.33320/maced.pharm.bull.2025.71.02.001', $summary['citation']);
        $this->assertSame('en', $article->present()['abstractLang']);
    }

    public function test_unregistered_dois_are_not_linked_or_cited(): void
    {
        $article = Article::with('issue')->where('number', '002')->first();
        $summary = $article->presentSummary();

        $this->assertFalse($summary['doiRegistered']);
        $this->assertNull($summary['doiUrl']);
        $this->assertStringNotContainsString('doi:', $summary['citation']);
        // No online date: the issue year stands in.
        $this->assertSame('2025', $summary['publicationDate']);
        $this->assertSame('mk', $summary['titleLang']);
        // The plain title is escaped when there is no rich title.
        $this->assertSame('Фармацевтска грижа &amp; &lt;b&gt;пациенти&lt;/b&gt;', $summary['titleHtml']);
        $this->assertFalse($summary['hasAbstract']);
        $this->assertNull($article->present()['abstractLang']);
    }

    public function test_rich_title_and_stored_languages_win(): void
    {
        $article = Article::with('issue')->where('number', '001')->first();
        $article->update(['title_html' => '[<sup>18</sup>F]Sodium fluoride', 'title_lang' => 'mk', 'doi_registered' => true, 'doi_resolvable' => '10.33320/10.33320/x']);

        $summary = $article->presentSummary();

        $this->assertSame('[<sup>18</sup>F]Sodium fluoride', $summary['titleHtml']);
        $this->assertSame('mk', $summary['titleLang']);
        $this->assertSame('https://doi.org/10.33320/10.33320/x', $summary['doiUrl']);
    }

    public function test_issue_presenters_expose_the_whole_contract(): void
    {
        $issue = Issue::query()->withArticleStats()->with('articles')->first();

        $this->assertSame(self::ISSUE_SUMMARY_KEYS, array_keys($issue->presentSummary()));

        $detail = $issue->present();
        $this->assertSame([...self::ISSUE_SUMMARY_KEYS, ...self::ISSUE_DETAIL_KEYS], array_keys($detail));
        $this->assertTrue($detail['isCurrent']);
        $this->assertSame(2, $detail['articleCount']);
        $this->assertSame([3, 20], [$detail['firstPage'], $detail['lastPage']]);
    }

    public function test_pages_share_journal_facts_and_canonical_url(): void
    {
        $base = preg_replace('#^http://#', 'https://', url('/'));

        $this->get('/issues/71-2?q=sugar&page=2')
            ->assertOk()
            ->assertViewHas('meta', fn (array $meta) => $meta['title'] === 'Volume 71, Issue 2')
            ->assertInertia(fn (Assert $page) => $page
                ->where('journal.issnOnline', '1857-8969')
                ->where('journal.doiPrefix', '10.33320')
                ->where('journal.licence.name', config('journal.licence.name'))
                ->where('journal.indexing.0.url', 'https://doaj.org/toc/1857-8969')
                ->where('canonical', "{$base}/issues/71-2?page=2"));

        $this->get('/archive?utm_source=x')
            ->assertInertia(fn (Assert $page) => $page->where('canonical', "{$base}/archive"));
    }

    public function test_list_pages_send_summaries(): void
    {
        $this->get('/')
            ->assertInertia(fn (Assert $page) => $page
                ->where('currentArticles.0.titleHtml', 'Sugars in fruit juices')
                ->missing('currentArticles.0.abstract')
                ->has('currentIssue.coverPdf'));

        $this->get('/articles/71-2/001')
            ->assertViewHas('meta')
            ->assertInertia(fn (Assert $page) => $page
                ->where('article.keywords', ['sugars'])
                ->missing('related.0.abstract'));
    }

    public function test_information_pages_resolve(): void
    {
        foreach (['about', 'indexing', 'privacy', 'accessibility'] as $path) {
            $this->get("/{$path}")
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page->component("journal/{$path}")->has('title'));
        }

        Page::create(['path' => 'contact', 'title' => 'Contact', 'body' => '<p>magl@ff.ukim.edu.mk</p>']);
        Page::create(['path' => 'editorial-board', 'title' => 'Editorial Board', 'body' => '<p>Board</p>']);

        $this->get('/contact')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('journal/contact')->where('page.title', 'Contact'));

        $this->get('/editorial-board')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('journal/editorial-board'));
    }

    public function test_machine_endpoints_exist(): void
    {
        $this->get('/sitemap.xml')->assertOk();
        $this->get('/sitemaps/articles.xml')->assertOk();
        $this->get('/sitemaps/other.xml')->assertNotFound();
        $this->get('/feed')->assertOk();
        $this->get('/feed/early-online')->assertOk();
        $this->get('/oai?verb=Identify')->assertOk();
        // Harvesters POST without a CSRF token.
        $this->post('/oai', ['verb' => 'Identify'])->assertOk();
    }

    public function test_old_wordpress_addresses_redirect(): void
    {
        $this->get('/editorial-policies')->assertStatus(301)->assertRedirect('/guidelines/editorial-policies');
        $this->get('/instructions-for-authors')->assertStatus(301)->assertRedirect('/guidelines/instructions-for-authors');
        $this->get('/index.php/editorial-policies/')->assertStatus(301)->assertRedirect('/guidelines/editorial-policies');
        $this->get('/index.php/guidelines/aims-and-scope?x=1')->assertStatus(301)->assertRedirect('/guidelines/aims-and-scope?x=1');
        $this->get('/wp-sitemap.xml')->assertStatus(301)->assertRedirect('/sitemap.xml');
        $this->get('/comments/feed/')->assertStatus(301)->assertRedirect('/feed');

        Storage::fake('journal');
        Storage::disk('journal')->put('media/images/doaj_logo.jpg', 'x');
        Storage::disk('journal')->put('media/uploads/2025/09/Potpis Glavas.png', 'x');

        $this->get('/wp-includes/images/doaj_logo.jpg')->assertStatus(301)->assertRedirect('/media/images/doaj_logo.jpg');
        $this->get('/wp-content/uploads/2025/09/Potpis%20Glavas.png')->assertStatus(301)->assertRedirect('/media/uploads/2025/09/Potpis%20Glavas.png');
        $this->get('/wp-includes/images/missing.jpg')->assertNotFound();
        $this->get('/wp-content/uploads/../../.env')->assertNotFound();
    }

    public function test_schema_has_the_redesign_columns(): void
    {
        $this->assertTrue(Schema::hasColumns('articles', [
            'title_html', 'title_lang', 'abstract_lang', 'keywords_lang', 'doi_registered', 'doi_resolvable',
            'received_at', 'accepted_at', 'pdf_pages', 'pdf_bytes', 'pdf_thumb', 'search_text', 'wp_id',
        ]));
        $this->assertTrue(Schema::hasColumns('issues', [
            'cover_image', 'cover_pdf', 'doi', 'online_at', 'full_title', 'location_dates', 'pdf_pages', 'pdf_bytes', 'wp_id',
        ]));
        $this->assertTrue(Schema::hasColumns('pages', ['title_mk', 'body_mk', 'summary', 'wp_id']));
        $this->assertTrue(Schema::hasColumns('submissions', ['forms', 'suggested_reviewers', 'privacy_accepted_at', 'reference']));
        $this->assertTrue(Schema::hasColumns('board_members', [
            'group', 'role', 'position', 'title', 'given_name', 'family_name', 'affiliation', 'city', 'country', 'orcid', 'email', 'photo',
        ]));
    }
}
