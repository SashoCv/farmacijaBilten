<?php

namespace Tests\Feature;

use App\Models\Article;
use App\Models\Issue;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The published archive in the back-office, read-only: browse issues, find
 * an article, see its data and the original PDF in the old layout.
 */
class ArchiveAdminTest extends TestCase
{
    use RefreshDatabase;

    private Issue $issue;

    private Article $article;

    protected function setUp(): void
    {
        parent::setUp();

        $this->issue = Issue::create(['slug' => '71-2', 'volume' => 71, 'kind' => Issue::KIND_ISSUE, 'number' => 2, 'year' => 2025]);
        $this->article = Article::create([
            'issue_id' => $this->issue->id, 'number' => '001', 'position' => 1,
            'title' => 'Analytical methods for sugars', 'title_html' => '<i>Old</i> title',
            'authors' => ['Redzep Ali', 'Oliver Majstorov'], 'type' => 'Review paper', 'pages' => '3-11',
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.001', 'doi_registered' => true,
            'pdf' => 'volumes/Volume 71_2/71_2_001.pdf', 'keywords' => ['sugars'],
        ]);
    }

    private function admin(): User
    {
        return User::factory()->admin()->create();
    }

    public function test_the_office_browses_issues_and_finds_articles(): void
    {
        $this->actingAs($this->admin())->get('/admin/archive')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/archive/index')
                ->where('issues.0.slug', '71-2')
                ->where('issues.0.articles', 1)
                ->where('totals.articles', 1)
                ->has('results', 0)
            );

        $this->actingAs($this->admin())->get('/admin/archive?q=majstorov')
            ->assertInertia(fn (Assert $page) => $page->has('results', 1)->where('results.0.title', 'Analytical methods for sugars'));

        $this->actingAs($this->admin())->get('/admin/archive/71-2')
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/archive/issue')
                ->where('articles.0.number', '001')
                ->where('articles.0.pdfUrl', fn (string $url) => str_contains($url, '71_2_001.pdf'))
            );

        $this->actingAs(User::factory()->author()->create())->get('/admin/archive')->assertForbidden();
    }

    public function test_an_archived_article_is_shown_read_only_with_its_original_pdf(): void
    {
        $this->actingAs($this->admin())->get('/admin/archive/71-2/001')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/archive/article')
                ->where('article.title', 'Analytical methods for sugars')
                ->where('article.pdfUrl', fn (string $url) => str_contains($url, '71_2_001.pdf'))
                ->missing('article.updateUrl')
            );

        // No editing of archived articles.
        $this->actingAs($this->admin())->put('/admin/archive/71-2/001', ['title' => 'Changed'])->assertStatus(405);
        $this->assertSame('Analytical methods for sugars', $this->article->fresh()->title);
    }

    public function test_the_doi_check_lists_unregistered_dois_by_issue(): void
    {
        Article::create([
            'issue_id' => $this->issue->id, 'number' => '002', 'position' => 2,
            'title' => 'Not deposited', 'authors' => ['A. B.'],
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.002', 'doi_registered' => false,
            'pdf' => 'volumes/Volume 71_2/71_2_002.pdf',
        ]);
        Article::create([
            'issue_id' => $this->issue->id, 'number' => '003', 'position' => 3,
            'title' => 'Doubled prefix', 'authors' => ['A. B.'],
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.003', 'doi_registered' => true,
            'doi_resolvable' => '10.33320/10.33320/maced.pharm.bull.2025.71.02.003',
            'pdf' => 'volumes/Volume 71_2/71_2_003.pdf',
        ]);

        $this->actingAs($this->admin())->get('/admin/archive')
            ->assertInertia(fn (Assert $page) => $page->where('totals.doiUnregistered', 1)->has('doiCheckUrl'));

        $this->actingAs($this->admin())->get('/admin/archive-dois')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/archive/dois')
                ->has('groups', 1)
                ->where('groups.0.slug', '71-2')
                ->where('groups.0.total', 3)
                ->has('groups.0.articles', 1)
                ->where('groups.0.articles.0.doi', '10.33320/maced.pharm.bull.2025.71.02.002')
                ->has('groups.0.articles.0.problem')
                ->has('double', 1)
                ->where('double.0.articles.0.registeredAs', '10.33320/10.33320/maced.pharm.bull.2025.71.02.003')
            );

        $author = User::factory()->author()->create();
        $this->actingAs($author)->get('/admin/archive-dois')->assertForbidden();
    }
}
