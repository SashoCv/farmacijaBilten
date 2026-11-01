<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Models\Article;
use App\Models\Issue;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ArticlePageTest extends TestCase
{
    use RefreshDatabase;

    private Issue $issue;

    protected function setUp(): void
    {
        parent::setUp();

        $this->issue = Issue::create([
            'slug' => '71-2',
            'volume' => 71,
            'number' => 2,
            'kind' => Issue::KIND_ISSUE,
            'year' => 2025,
            'is_published' => true,
        ]);

        foreach (['001', '002', '003', '004', '005'] as $number) {
            $this->article($number);
        }

        Journal::flush();
    }

    public function test_article_page_sends_the_detail_contract(): void
    {
        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '002']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/article')
                ->where('issue.slug', '71-2')
                ->where('article.number', '002')
                ->where('article.titleLang', 'en')
                ->where('article.abstractLang', 'mk')
                ->where('article.receivedAt', '2025-02-01')
                ->where('article.pdfPages', 9)
                ->has('article.affiliations', 1)
                ->has('journal.licence.name')
                ->has('canonical')
                ->where('pdfUrl', url('/volumes/Volume%2071_2/71_2_002.pdf'))
                ->has('related', 3));
    }

    public function test_related_articles_follow_the_current_one_and_wrap_around(): void
    {
        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '002']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('related.0.number', '003')
                ->where('related.1.number', '004')
                ->where('related.2.number', '005'));

        // The last article borrows from the start of the issue, never itself.
        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '005']))
            ->assertInertia(fn (Assert $page) => $page
                ->has('related', 3)
                ->where('related.0.number', '001')
                ->where('related.1.number', '002')
                ->where('related.2.number', '003'));
    }

    public function test_unregistered_doi_is_neither_linked_nor_cited(): void
    {
        Article::query()->where('number', '001')->update(['doi_registered' => false]);

        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '001']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('article.doiRegistered', false)
                ->where('article.doiUrl', null)
                ->where('article.citation', fn (string $citation) => ! str_contains($citation, '10.33320')));
    }

    public function test_registered_doi_links_to_the_resolvable_form(): void
    {
        Article::query()->where('number', '001')->update([
            'doi_registered' => true,
            'doi_resolvable' => '10.33320/10.33320/maced.pharm.bull.2025.71.02.001',
        ]);

        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '001']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('article.doiUrl', 'https://doi.org/10.33320/10.33320/maced.pharm.bull.2025.71.02.001'));
    }

    public function test_article_page_passes_seo_meta_to_the_view(): void
    {
        $this->get(route('articles.show', ['issue' => '71-2', 'article' => '003']))
            ->assertViewHas('meta', fn (array $meta) => $meta['title'] === 'Article 003 title');
    }

    public function test_article_page_has_no_client_side_scholar_tags(): void
    {
        // citation_* tags are printed once by the server layout (WS8), not by the page component.
        $html = file_get_contents(resource_path('js/pages/journal/article.tsx'));

        $this->assertStringNotContainsString('citation_title', $html);
        $this->assertStringNotContainsString('creativecommons.org/licenses', $html);
    }

    public function test_unknown_article_in_known_issue_is_not_found(): void
    {
        $this->get('/articles/71-2/999')->assertNotFound();
        $this->get('/articles/99-9/001')->assertNotFound();
    }

    private function article(string $number): Article
    {
        return $this->issue->articles()->create([
            'number' => $number,
            'position' => (int) $number,
            'title' => "Article {$number} title",
            'authors' => ['Redzep Ali', 'Oliver Majstorov'],
            'affiliations' => ['Faculty of Pharmacy, Skopje'],
            'pages' => '3–11',
            'doi' => "10.33320/maced.pharm.bull.2025.71.02.{$number}",
            'abstract' => 'Амифостин е релативно нов органски цитопротективен лек.',
            'received_at' => '2025-02-01',
            'accepted_at' => '2025-04-01',
            'online_at' => '2025-04-30',
            'pdf' => "volumes/Volume 71_2/71_2_{$number}.pdf",
            'pdf_pages' => 9,
        ]);
    }
}
