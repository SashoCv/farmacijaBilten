<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Journal\Search\ArticleSearch;
use App\Journal\Search\Folder;
use App\Journal\Search\ScopeTopics;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SearchTest extends TestCase
{
    use RefreshDatabase;

    private Issue $regular;

    private Issue $older;

    private Issue $supplement;

    protected function setUp(): void
    {
        parent::setUp();

        $this->regular = $this->issue('71-2', 71, Issue::KIND_ISSUE, 2);
        $this->older = $this->issue('62-1', 62, Issue::KIND_ISSUE, 1);
        $this->supplement = $this->issue('72-s1', 72, Issue::KIND_SUPPLEMENT, 1);

        $this->article($this->regular, '001', 'Mycological profile of dermatomycoses', ['Gordana Mirchevska', 'Emel Dauti Jahja'], type: 'Original scientific paper');
        $this->article($this->regular, '002', 'Antifungal susceptibility of Aspergillus', ['Gordana Mircevska'], type: 'Review paper');
        $this->article($this->older, '003', 'Bacterial resistance in Skopje', ['Gordana Mirčevska', 'Zorica Fustik'], type: 'Original scientific paper');
        $this->article($this->supplement, '004', 'Агилни курикулуми за фармација', ['Анета Мирчевска'], type: 'Short communication');
        $this->article($this->older, '005', 'Effects of amifostin in prevention of nephrotoxicity', ['Aneta Dimitrovska'],
            abstract: 'Cisplatin is a widely used anticancer drug. '.str_repeat('Renal function was followed in every group of rats over the study period. ', 12).'АМИФОСТИН reduced the damage markedly in treated animals. '.str_repeat('Further histology confirmed the protective effect in all treated animals. ', 8),
            keywords: ['amifostine', 'cisplatin', 'nephrotoxicity'],
            type: 'Original scientific paper');

        Journal::flush();
    }

    public function test_folding_merges_scripts_spellings_and_case(): void
    {
        $this->assertSame('mircevska', Folder::fold('Мирчевска'));
        $this->assertSame('mircevska', Folder::fold('Mirčevska'));
        $this->assertSame('mircevska', Folder::fold('Mirchevska'));
        $this->assertSame('mircevska', Folder::fold('MIRCEVSKA'));
        $this->assertSame('fustik', Folder::fold('Фуштиќ'));
        $this->assertSame('gorgievska', Folder::fold('Ѓорѓиевска'));
        $this->assertSame('gorgievska', Folder::fold('Gjorgjievska'));
        $this->assertSame('kaftandzieva', Folder::fold('Кафтанџиева'));
        $this->assertSame('ljubica', Folder::fold('Љубица'));
        $this->assertSame('dordevic', Folder::fold('Đorđević'));
        $this->assertSame('glavas dodov', Folder::fold('Glavas-Dodov'));
        // Compatibility forms too: superscripts, ligatures.
        $this->assertSame('18f fdg', Folder::fold('[¹⁸F]-FDG'));
        $this->assertSame('fluorescence', Folder::fold('ﬂuorescence'));

        $this->assertSame(['mircevska', 'drug delivery'], Folder::terms('Мирчевска "drug  delivery" a'));
        $this->assertSame(['hplc'], Folder::terms('HPLC hplc'));

        // Light stemming of the last word: plural and silent endings.
        $this->assertSame(['amifostin', 'tablet', 'stud', 'dose', 'drug delivery'], Folder::terms('amifostine tablets studies dose "drug delivery"'));
        $this->assertSame(['analys', 'gas'], Folder::terms('analyses gas'));
    }

    public function test_cyrillic_latin_and_diacritic_spellings_find_the_same_articles(): void
    {
        foreach (['Мирчевска', 'Mircevska', 'Mirchevska', 'Mirčevska', 'MIRČEVSKA'] as $query) {
            $this->get(route('search', ['q' => $query]))
                ->assertOk()
                ->assertInertia(fn (Assert $page) => $page
                    ->component('journal/search')
                    ->where('terms', ['mircevska'])
                    ->where('pagination.total', 4)
                    ->has('results', 4));
        }

        // "amifostine" finds "amifostin" (stemmed), with the other word anywhere.
        $this->get(route('search', ['q' => 'amifostine nephrotoxicity']))
            ->assertInertia(fn (Assert $page) => $page->where('pagination.total', 1));

        // Upper-case Cyrillic in the query, Latin in the data.
        $this->get(route('search', ['q' => 'АМИФОСТИН']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination.total', 1)
                ->where('results.0.number', '005'));

        // Latin query, Cyrillic title.
        $this->get(route('search', ['q' => 'kurikulumi']))
            ->assertInertia(fn (Assert $page) => $page->where('results.0.number', '004'));
    }

    public function test_filters_and_facets(): void
    {
        $this->get(route('search', ['q' => 'mircevska', 'kind' => 'regular']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination.total', 3)
                ->where('filters.kind', 'regular')
                // A facet is counted without its own filter.
                ->where('facets.kinds', [['value' => 'regular', 'count' => 3], ['value' => 'supplement', 'count' => 1]])
                ->where('facets.types', [
                    ['value' => 'Original scientific paper', 'count' => 2],
                    ['value' => 'Review paper', 'count' => 1],
                ]));

        $this->get(route('search', ['q' => 'mircevska', 'kind' => 'supplement']))
            ->assertInertia(fn (Assert $page) => $page->where('pagination.total', 1)->where('results.0.number', '004'));

        $this->get(route('search', ['q' => 'mircevska', 'type' => 'Review paper']))
            ->assertInertia(fn (Assert $page) => $page->where('pagination.total', 1)->where('results.0.number', '002'));

        // Year range (from/to swapped when reversed) and volume.
        $this->get(route('search', ['q' => 'mircevska', 'from' => 2020, 'to' => 2010]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.from', 2010)->where('filters.to', 2020)
                ->where('pagination.total', 1)->where('results.0.number', '003'));

        $this->get(route('search', ['q' => 'mircevska', 'volume' => 71]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination.total', 2)
                ->where('facets.volumes', [
                    ['value' => 72, 'year' => 2026, 'count' => 1],
                    ['value' => 71, 'year' => 2025, 'count' => 2],
                    ['value' => 62, 'year' => 2016, 'count' => 1],
                ]));

        // Unknown values are ignored rather than failing.
        $this->get(route('search', ['q' => 'mircevska', 'kind' => 'nope', 'from' => 'x', 'sort' => 'bogus', 'volume' => '-3']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters', ['type' => null, 'kind' => null, 'from' => null, 'to' => null, 'volume' => null, 'sort' => 'relevance'])
                ->where('pagination.total', 4));

        // Filters alone browse the journal (newest first).
        $this->get(route('search', ['type' => 'Original scientific paper']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('filters.sort', 'newest')
                ->where('pagination.total', 3)
                ->where('results.0.number', '001'));
    }

    public function test_sorting(): void
    {
        $numbers = fn (string $sort) => collect($this->get(route('search', ['q' => 'mircevska', 'sort' => $sort]))
            ->viewData('page')['props']['results'])->pluck('number')->all();

        $this->assertSame(['004', '001', '002', '003'], $numbers('newest'));
        $this->assertSame(['003', '001', '002', '004'], $numbers('oldest'));

        // Relevance: a title match outranks an author match.
        $this->get(route('search', ['q' => 'amifostin']))
            ->assertInertia(fn (Assert $page) => $page->where('filters.sort', 'relevance')->where('results.0.number', '005'));

        Article::query()->where('number', '002')->update(['title' => 'Mircevska method revisited', 'search_text' => null]);

        $this->assertSame('002', $numbers('relevance')[0]);
    }

    public function test_pagination_is_real_and_clamped(): void
    {
        foreach (range(10, 54) as $n) {
            $this->article($this->older, sprintf('%03d', $n), "HPLC assay number {$n}", ['Ana Test']);
        }

        $this->get(route('search', ['q' => 'hplc']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination', ['page' => 1, 'lastPage' => 3, 'perPage' => 20, 'total' => 45])
                ->has('results', 20));

        $this->get(route('search', ['q' => 'hplc', 'kind' => 'regular', 'page' => 3]))
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination.page', 3)
                ->has('results', 5));

        $this->get(route('search', ['q' => 'hplc', 'page' => 99]))
            ->assertInertia(fn (Assert $page) => $page->where('pagination.page', 3));
    }

    public function test_results_carry_an_excerpt_not_the_abstract(): void
    {
        $response = $this->get(route('search', ['q' => 'АМИФОСТИН']));
        $result = $response->viewData('page')['props']['results'][0];

        $this->assertArrayNotHasKey('abstract', $result);
        $this->assertArrayNotHasKey('references', $result);
        $this->assertTrue($result['excerptMatch']);
        $this->assertStringContainsString('АМИФОСТИН reduced', $result['excerpt']);
        $this->assertStringStartsWith('…', $result['excerpt']);
        $this->assertLessThanOrEqual(305, mb_strlen($result['excerpt']));
        $this->assertSame(['amifostine'], $result['matchedKeywords']);
        $this->assertSame(['volume' => 62, 'year' => 2016, 'kind' => 'issue', 'number' => 1, 'published' => true], [
            'volume' => $result['volume'], 'year' => $result['year'], 'kind' => $result['issueKind'],
            'number' => $result['issueNumber'], 'published' => $result['issuePublished'],
        ]);

        $this->assertSame('Short text.', ArticleSearch::excerpt('<p>Short text.</p>', ['short']));
        $this->assertNull(ArticleSearch::excerpt(null, ['x']));
    }

    public function test_a_full_page_of_long_results_stays_small(): void
    {
        foreach (range(10, 40) as $n) {
            $this->article($this->older, sprintf('%03d', $n), "Chromatographic study {$n}", ['Ana Test', 'Boris Test', 'Vesna Test'],
                abstract: str_repeat('A long abstract sentence about chromatography and validation. ', 60),
                keywords: ['chromatography', 'validation', 'HPLC']);
        }

        $page = $this->get(route('search', ['q' => 'chromatography']))->assertOk()->viewData('page');
        $results = $page['props']['results'];

        $this->assertCount(20, $results);
        // Excerpts instead of 3,700-character abstracts: about 1 KB per row.
        $this->assertLessThan(30 * 1024, strlen((string) json_encode($results, JSON_UNESCAPED_UNICODE)));
        $this->assertLessThan(16 * 1024, strlen((string) json_encode($page['props']['facets'])));
    }

    public function test_nothing_found_offers_scope_topics_that_lead_somewhere(): void
    {
        Page::create([
            'path' => ScopeTopics::PAGE,
            'title' => 'Aims and scope',
            'body' => '<p>The journal publishes papers from all fields of pharmacy (pharmaceutical chemistry, immunology, nephrotoxicity, mycology, toxicology, history of pharmacy etc.).</p>',
        ]);

        $this->assertSame(
            ['pharmaceutical chemistry', 'immunology', 'nephrotoxicity', 'mycology', 'toxicology', 'history of pharmacy'],
            ScopeTopics::parse((string) Page::query()->where('path', ScopeTopics::PAGE)->value('body')),
        );

        $this->get(route('search', ['q' => 'zzqx']))
            ->assertInertia(fn (Assert $page) => $page
                ->where('pagination.total', 0)
                ->has('results', 0)
                ->where('scopePath', ScopeTopics::PAGE)
                // Only the topics that have matches.
                ->where('topics', [['label' => 'nephrotoxicity', 'count' => 1]]));

        // The landing page (no words, no filters) lists nothing, but offers browsing.
        $this->get(route('search'))
            ->assertInertia(fn (Assert $page) => $page
                ->where('query', '')
                ->has('results', 0)
                ->where('pagination.total', 0)
                ->where('facets.kinds', [['value' => 'regular', 'count' => 4], ['value' => 'supplement', 'count' => 1]])
                ->where('topics', []));
    }

    public function test_search_is_not_indexed_by_robots(): void
    {
        $meta = $this->get(route('search', ['q' => 'hplc']))->viewData('meta');

        $this->assertSame('noindex,follow', $meta['robots']);
    }

    public function test_index_command_and_lazy_indexing(): void
    {
        $this->artisan('journal:index-search')->expectsOutput('Indexed 5 articles.')->assertSuccessful();

        $text = Article::query()->where('number', '004')->value('search_text');
        $this->assertStringContainsString(' agilni kurikulumi za farmacija |a| aneta mircevska |k| ', (string) $text);

        $this->artisan('journal:index-search --missing')->expectsOutput('Indexed 0 articles.');

        // An article added later (search_text null) is indexed on the next search.
        $this->article($this->regular, '009', 'Шумски билки', ['Tester']);

        $this->get(route('search', ['q' => 'sumski']))
            ->assertInertia(fn (Assert $page) => $page->where('pagination.total', 1));
    }

    private function issue(string $slug, int $volume, string $kind, ?int $number): Issue
    {
        return Issue::create([
            'slug' => $slug,
            'volume' => $volume,
            'kind' => $kind,
            'number' => $number,
            'year' => $volume + 1954,
            'is_published' => true,
        ]);
    }

    /**
     * @param  list<string>  $authors
     * @param  list<string>|null  $keywords
     */
    private function article(Issue $issue, string $number, string $title, array $authors, ?string $abstract = null, ?array $keywords = null, ?string $type = null): Article
    {
        return $issue->articles()->create([
            'number' => $number,
            'position' => (int) $number,
            'title' => $title,
            'authors' => $authors,
            'abstract' => $abstract,
            'keywords' => $keywords,
            'type' => $type,
        ]);
    }
}
