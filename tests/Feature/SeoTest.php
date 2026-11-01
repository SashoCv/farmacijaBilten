<?php

namespace Tests\Feature;

use App\Journal\Journal;
use App\Journal\Seo\HeadFilter;
use App\Journal\Seo\Oai\OaiPmh;
use App\Journal\Seo\SeoMeta;
use App\Journal\Seo\Sitemap;
use App\Journal\Seo\Text;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use DOMDocument;
use DOMXPath;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Ssr\Gateway;
use Inertia\Ssr\Response as SsrResponse;
use SimpleXMLElement;
use Tests\TestCase;

/**
 * WS8: server-rendered metadata (meta, Open Graph, citation_*, Dublin Core,
 * JSON-LD), sitemaps, Atom feeds, OAI-PMH and robots.txt.
 */
class SeoTest extends TestCase
{
    use RefreshDatabase;

    private Issue $current;

    private Issue $supplement;

    private Issue $early;

    private string $base;

    protected function setUp(): void
    {
        parent::setUp();

        // Indexers must get the metadata without the Node SSR process.
        config(['inertia.ssr.enabled' => false]);

        $this->base = preg_replace('#^http://#', 'https://', url('/'));

        $this->current = Issue::create(['slug' => '71-2', 'volume' => 71, 'kind' => Issue::KIND_ISSUE, 'number' => 2, 'year' => 2025, 'is_published' => true]);
        $this->supplement = Issue::create(['slug' => '72-s1', 'volume' => 72, 'kind' => Issue::KIND_SUPPLEMENT, 'number' => 1, 'year' => 2026, 'is_published' => true]);
        $this->early = Issue::create(['slug' => '72-1', 'volume' => 72, 'kind' => Issue::KIND_ISSUE, 'number' => 1, 'year' => 2026, 'is_published' => false]);
        Issue::create(['slug' => '59', 'volume' => 59, 'kind' => Issue::KIND_VOLUME, 'year' => 2013, 'is_published' => true]);

        $this->current->articles()->create([
            'number' => '001', 'position' => 1,
            'title' => 'Analytical methods for sugar content in fruit juices',
            'authors' => ['Redzep Ali', 'Oliver Majstorov'],
            'affiliations' => ['Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje, Mother Tereza 47, 1000 Skopje'],
            'type' => 'Review paper',
            'pages' => '3–11',
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.001',
            'doi_registered' => null,
            'abstract' => str_repeat('Sugars in fruit juices are measured by classical and modern methods. ', 6),
            'keywords' => ['sugars', 'fruit juices'],
            'pdf' => 'volumes/Volume 71_2/71_2_001.pdf',
            'online_at' => '2025-04-30',
        ]);

        $this->current->articles()->create([
            'number' => '002', 'position' => 2,
            'title' => 'Isatin-derived hybrids',
            'authors' => ['Aleksandar Dimkovski', 'Evgenija Mihajloska', 'Ana Poceva Panovska'],
            'affiliations' => ['Institute for Pharmaceutical Chemistry', 'Institute for Applied Chemistry'],
            'type' => 'Original scientific paper',
            'pages' => '13-25',
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.002',
            'doi_registered' => true,
            'pdf' => 'volumes/Volume 71_2/71_2_002.pdf',
        ]);

        $this->current->articles()->create([
            'number' => '003', 'position' => 3,
            'title' => 'Never registered',
            'authors' => ['Gordana Mirchevska'],
            'pages' => '27–30',
            'doi' => '10.33320/maced.pharm.bull.2025.71.02.003',
            'doi_registered' => false,
        ]);

        $this->supplement->articles()->create([
            'number' => '001', 'position' => 1,
            'title' => 'Фармацевтска грижа во аптеките',
            'authors' => ['Borut Božič'],
            'type' => 'Short communication',
            'pages' => '145',
        ]);

        $this->early->articles()->create([
            'number' => '002', 'position' => 2,
            'title' => 'Detection of sibutramine in slimming teas',
            'authors' => ['Darko Dukovski'],
            'online_at' => '2025-07-02',
            'abstract' => 'Sibutramine was found.',
        ]);

        Page::create(['path' => 'guidelines', 'title' => 'Guidelines', 'body' => '<p>Index of the guidelines.</p>']);
        Page::create(['path' => 'guidelines/aims-and-scope', 'title' => 'Aims and scope', 'parent_path' => 'guidelines', 'body' => '<p>The journal publishes <b>original</b> research.</p>']);
        Page::create(['path' => 'contact', 'title' => 'Contact', 'body' => '<p>Write to us.</p>']);

        Journal::flush();
        Sitemap::flush();
    }

    // ---------------------------------------------------------------- meta

    public function test_article_metadata_is_server_rendered_without_ssr(): void
    {
        $html = $this->get('/articles/71-2/001')->assertOk()->getContent();
        $meta = $this->metaTags($html);

        $this->assertStringContainsString('<title>Analytical methods for sugar content in fruit juices – Macedonian Pharmaceutical Bulletin</title>', $html);
        $this->assertStringContainsString('<link rel="canonical" href="'.$this->base.'/articles/71-2/001"', $html);

        $this->assertSame(['Analytical methods for sugar content in fruit juices'], $meta['citation_title']);
        $this->assertSame(['Redzep Ali', 'Oliver Majstorov'], $meta['citation_author']);
        // One affiliation: shared by every author.
        $this->assertCount(2, $meta['citation_author_institution']);
        $this->assertSame(['2025/04/30'], $meta['citation_publication_date']);
        $this->assertSame(['2025/04/30'], $meta['citation_online_date']);
        $this->assertSame(['Macedonian Pharmaceutical Bulletin'], $meta['citation_journal_title']);
        $this->assertSame(['Maced. Pharm. Bull.'], $meta['citation_journal_abbrev']);
        $this->assertSame([config('journal.publisher.name_en')], $meta['citation_publisher']);
        $this->assertSame(['1409-8695', '1857-8969'], $meta['citation_issn']);
        $this->assertSame(['71'], $meta['citation_volume']);
        $this->assertSame(['2'], $meta['citation_issue']);
        $this->assertSame(['3'], $meta['citation_firstpage']);
        $this->assertSame(['11'], $meta['citation_lastpage']);
        $this->assertSame([$this->base.'/volumes/Volume%2071_2/71_2_001.pdf'], $meta['citation_pdf_url']);
        $this->assertSame([$this->base.'/articles/71-2/001'], $meta['citation_abstract_html_url']);
        $this->assertSame(['sugars; fruit juices'], $meta['citation_keywords']);
        $this->assertSame(['en'], $meta['citation_language']);
        $this->assertArrayHasKey('citation_abstract', $meta);
        // Registration not yet checked against Crossref: no DOI.
        $this->assertArrayNotHasKey('citation_doi', $meta);

        $this->assertSame(['article'], $meta['og:type']);
        $this->assertSame([$this->base.'/og/journal-card.png'], $meta['og:image']);
        $this->assertSame(['1200'], $meta['og:image:width']);
        $this->assertSame(['en_US'], $meta['og:locale']);
        $this->assertSame(['mk_MK'], $meta['og:locale:alternate']);
        $this->assertSame(['summary_large_image'], $meta['twitter:card']);
        $this->assertSame(['Redzep Ali', 'Oliver Majstorov'], $meta['DC.creator']);
        $this->assertSame(['2025-04-30'], $meta['DC.date']);
        $this->assertSame(['Review paper'], $meta['article:section']);

        // Abstract cut on a word boundary.
        $this->assertLessThanOrEqual(156, mb_strlen($meta['description'][0]));
        $this->assertStringEndsWith('…', $meta['description'][0]);
        $this->assertStringStartsWith('Sugars in fruit juices are measured', $meta['description'][0]);
    }

    public function test_every_article_has_a_date_and_no_unregistered_doi(): void
    {
        foreach (Article::with('issue')->get() as $article) {
            $tags = collect(SeoMeta::forArticle($article)['tags']);

            $this->assertNotEmpty(
                $tags->firstWhere('name', 'citation_publication_date')['content'] ?? null,
                "{$article->issue->slug}/{$article->number} has no citation_publication_date",
            );

            $doi = $tags->firstWhere('name', 'citation_doi')['content'] ?? null;
            $this->assertSame($article->doi_registered === true ? $article->doi : null, $doi);

            if ($article->doi_registered !== true) {
                $jsonLd = json_encode(SeoMeta::forArticle($article)['jsonLd']);
                $this->assertStringNotContainsString('doi.org', $jsonLd);
            }
        }

        // The supplement article has no online date: the issue year stands in.
        $meta = $this->metaTags($this->get('/articles/72-s1/001')->getContent());
        $this->assertSame(['2026'], $meta['citation_publication_date']);
        $this->assertSame(['Suppl. 1'], $meta['citation_issue']);
        $this->assertSame(['145'], $meta['citation_firstpage']);
        $this->assertArrayNotHasKey('citation_lastpage', $meta);
        $this->assertSame(['mk'], $meta['citation_language']);
        $this->assertSame(['Short communication by Borut Božič, Volume 72, Supplement 1 (2026), pp. 145.'], $meta['description']);

        // Registered DOI: emitted, and the hyphenated page range is split too.
        $meta = $this->metaTags($this->get('/articles/71-2/002')->getContent());
        $this->assertSame(['10.33320/maced.pharm.bull.2025.71.02.002'], $meta['citation_doi']);
        $this->assertSame(['13'], $meta['citation_firstpage']);
        $this->assertSame(['25'], $meta['citation_lastpage']);
        // Several affiliations without a known mapping: none attributed per author.
        $this->assertArrayNotHasKey('citation_author_institution', $meta);
        $this->assertSame(['Original scientific paper by Aleksandar Dimkovski et al., Volume 71, Issue 2 (2025), pp. 13-25.'], $meta['description']);
    }

    public function test_listing_issue_and_page_descriptions(): void
    {
        $meta = $this->metaTags($this->get('/issues/71-2')->getContent());
        $this->assertSame(['Volume 71, Issue 2 (2025) of the Macedonian Pharmaceutical Bulletin: 3 peer-reviewed articles, free to read and download as PDF.'], $meta['description']);
        $this->assertSame(['website'], $meta['og:type']);

        $meta = $this->metaTags($this->get('/issues/72-1')->getContent());
        $this->assertStringContainsString('in progress: 1 peer-reviewed article published online so far', $meta['description'][0]);

        $meta = $this->metaTags($this->get('/issues/72-s1')->getContent());
        $this->assertStringContainsString('1 contribution,', $meta['description'][0]);

        $meta = $this->metaTags($this->get('/guidelines/aims-and-scope')->getContent());
        $this->assertSame(['The journal publishes original research.'], $meta['description']);

        $meta = $this->metaTags($this->get('/archive')->getContent());
        $this->assertNotEmpty($meta['description']);
        $this->assertArrayNotHasKey('robots', $meta);

        $html = $this->get('/archive?utm_source=newsletter')->getContent();
        $this->assertStringContainsString('<link rel="canonical" href="'.$this->base.'/archive"', $html);
    }

    public function test_search_and_private_pages_are_not_indexed(): void
    {
        $this->assertSame(['noindex,follow'], $this->metaTags($this->get('/search?q=sugar')->getContent())['robots']);
        $this->assertSame(['noindex,follow'], $this->metaTags($this->get('/login')->getContent())['robots']);

        $html = $this->get('/login')->getContent();
        $this->assertStringNotContainsString('rel="canonical"', $html);
        $this->assertStringNotContainsString('application/atom+xml', $html);
    }

    public function test_head_carries_icons_manifest_and_feed_links(): void
    {
        $html = $this->get('/')->getContent();

        $this->assertStringContainsString('<link rel="icon" href="/favicon.svg" type="image/svg+xml">', $html);
        $this->assertStringContainsString('<link rel="apple-touch-icon" href="/apple-touch-icon.png">', $html);
        $this->assertStringContainsString('<link rel="manifest" href="/site.webmanifest">', $html);
        $this->assertStringContainsString('<meta name="theme-color" content="#1F3770">', $html);
        $this->assertStringContainsString('type="application/atom+xml"', $html);
        $this->assertStringContainsString('href="'.url('/feed').'"', $html);
        $this->assertStringContainsString('href="'.url('/feed/early-online').'"', $html);
    }

    public function test_journal_and_sign_in_pages_stay_light(): void
    {
        $this->withUnencryptedCookie('appearance', 'dark');

        $this->assertStringNotContainsString('class="dark"', $this->get('/')->getContent());
        $this->assertStringNotContainsString('class="dark"', $this->get('/login')->getContent());
    }

    public function test_ssr_head_cannot_duplicate_the_seo_tags(): void
    {
        config(['inertia.ssr.enabled' => true]);

        $this->app->instance(Gateway::class, new class implements Gateway
        {
            public function dispatch(array $page, $request = null): ?SsrResponse
            {
                return new SsrResponse(
                    "<title data-inertia>From SSR</title>\n<meta name=\"description\" content=\"stale\" data-inertia>\n<meta name=\"citation_title\" content=\"stale\" data-inertia>\n<script type=\"application/ld+json\" data-inertia>{}</script>",
                    '<div id="app"></div>',
                );
            }
        });

        $html = $this->get('/articles/71-2/001')->getContent();

        $this->assertSame(1, substr_count($html, '<title'));
        $this->assertStringContainsString('<title data-inertia>From SSR</title>', $html);
        $this->assertSame(1, substr_count($html, 'name="citation_title"'));
        $this->assertSame(1, substr_count($html, 'name="description"'));
        $this->assertSame(1, substr_count($html, 'application/ld+json'));
        $this->assertStringNotContainsString('stale', $html);
    }

    public function test_head_filter_keeps_other_tags(): void
    {
        $head = '<title data-inertia>T</title><meta property="og:title" content="x"><link rel="canonical" href="/x"><link rel="preload" href="/f.woff2">';

        $this->assertSame('<title data-inertia>T</title><link rel="preload" href="/f.woff2">', HeadFilter::strip($head));
    }

    public function test_text_excerpt_cuts_on_a_word_boundary(): void
    {
        $this->assertSame('Short text', Text::excerpt('<p>Short   text</p>'));
        $this->assertSame('alpha beta…', Text::excerpt('alpha beta gamma', 12));
        $this->assertSame('ab', Text::xml("a\x01b"));
    }

    // ------------------------------------------------------------- JSON-LD

    public function test_json_ld_describes_journal_issue_article_and_contact(): void
    {
        $home = $this->jsonLd($this->get('/')->getContent());
        $periodical = $this->node($home, 'Periodical');
        $this->assertSame(['1409-8695', '1857-8969'], $periodical['issn']);
        $this->assertContains(config('journal.name_mk'), $periodical['alternateName']);
        $this->assertTrue($periodical['isAccessibleForFree']);
        $this->assertSame(config('journal.licence.url'), $periodical['license']);
        $this->assertSame(config('journal.publisher.name_en'), $this->node($home, 'Organization')['name']);
        $this->assertSame(config('journal.co_publisher.name_en'), $this->node($home, 'CollegeOrUniversity')['name']);

        $issue = $this->node($this->jsonLd($this->get('/issues/71-2')->getContent()), 'PublicationIssue');
        $this->assertSame('2', $issue['issueNumber']);
        $this->assertSame('PublicationVolume', $issue['isPartOf']['@type']);
        $this->assertSame('71', $issue['isPartOf']['volumeNumber']);
        $this->assertStringEndsWith('#periodical', $issue['isPartOf']['isPartOf']['@id']);

        $volume = $this->node($this->jsonLd($this->get('/issues/59')->getContent()), 'PublicationVolume');
        $this->assertSame('59', $volume['volumeNumber']);

        $article = $this->node($this->jsonLd($this->get('/articles/71-2/001')->getContent()), 'ScholarlyArticle');
        $this->assertSame('Analytical methods for sugar content in fruit juices', $article['name']);
        $this->assertSame('3', $article['pageStart']);
        $this->assertSame('11', $article['pageEnd']);
        $this->assertSame('Organization', $article['author'][0]['affiliation']['@type']);
        $this->assertSame('application/pdf', $article['encoding']['encodingFormat']);
        $this->assertArrayNotHasKey('identifier', $article);
        $this->assertArrayNotHasKey('sameAs', $article);
        $this->assertSame('PublicationIssue', $article['isPartOf']['@type']);

        $registered = $this->node($this->jsonLd($this->get('/articles/71-2/002')->getContent()), 'ScholarlyArticle');
        $this->assertSame('DOI', $registered['identifier']['propertyID']);
        $this->assertSame('https://doi.org/10.33320/maced.pharm.bull.2025.71.02.002', $registered['sameAs']);

        $contact = $this->node($this->jsonLd($this->get('/contact')->getContent()), 'ContactPage');
        $this->assertSame('PostalAddress', $contact['mainEntity']['address']['@type']);
        $this->assertSame(config('journal.address.street'), $contact['mainEntity']['address']['streetAddress']);
        $this->assertSame(config('journal.editorial_email'), $contact['mainEntity']['contactPoint']['email']);
    }

    // ------------------------------------------------------------ sitemaps

    public function test_sitemap_index_and_documents(): void
    {
        $index = $this->xml($this->get('/sitemap.xml')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/xml; charset=UTF-8')
            ->getContent());

        $index->registerXPathNamespace('s', 'http://www.sitemaps.org/schemas/sitemap/0.9');
        $this->assertSame([
            $this->base.'/sitemaps/pages.xml',
            $this->base.'/sitemaps/issues.xml',
            $this->base.'/sitemaps/articles.xml',
        ], array_map('strval', $index->xpath('//s:sitemap/s:loc')));
        $this->assertCount(3, $index->xpath('//s:sitemap/s:lastmod'));

        $articles = $this->locs('/sitemaps/articles.xml');
        $this->assertCount(Article::count(), $articles);
        $this->assertContains($this->base.'/articles/71-2/001', $articles);

        $this->assertCount(Issue::count(), $this->locs('/sitemaps/issues.xml'));

        $pages = $this->locs('/sitemaps/pages.xml');
        foreach (['', '/archive', '/early-online', '/about', '/contact', '/guidelines', '/guidelines/aims-and-scope'] as $path) {
            $this->assertContains($this->base.$path, $pages);
        }
        $this->assertSame(count($pages), count(array_unique($pages)));

        $this->get('/sitemaps/other.xml')->assertNotFound();
    }

    public function test_robots_txt_points_to_the_sitemap(): void
    {
        $robots = file_get_contents(public_path('robots.txt'));

        $this->assertStringContainsString('Sitemap: https://bulletin.mfd.org.mk/sitemap.xml', $robots);

        foreach (['/search', '/locale/', '/login', '/register', '/dashboard', '/settings', '/admin'] as $path) {
            $this->assertMatchesRegularExpression('#^Disallow: '.preg_quote($path, '#').'$#m', $robots);
        }
    }

    // --------------------------------------------------------------- feeds

    public function test_latest_feed_lists_early_online_first(): void
    {
        $response = $this->get('/feed')->assertOk()->assertHeader('Content-Type', 'application/atom+xml; charset=UTF-8');
        $feed = $this->xml($response->getContent());
        $feed->registerXPathNamespace('a', 'http://www.w3.org/2005/Atom');

        $this->assertSame($this->base.'/feed', (string) $feed->xpath('/a:feed/a:link[@rel="self"]/@href')[0]);
        $entries = $feed->xpath('/a:feed/a:entry');
        $this->assertCount(Article::count(), $entries);

        // Early online first, then the newest published issue (72-s1) before 71-2.
        $links = array_map(function (SimpleXMLElement $entry) {
            $entry->registerXPathNamespace('a', 'http://www.w3.org/2005/Atom');

            return (string) $entry->xpath('a:link[@rel="alternate"]/@href')[0];
        }, $entries);
        $this->assertSame($this->base.'/articles/72-1/002', $links[0]);
        $this->assertSame($this->base.'/articles/72-s1/001', $links[1]);
        $this->assertSame($this->base.'/articles/71-2/001', $links[2]);

        $first = $feed->xpath('/a:feed/a:entry[a:id="'.$this->base.'/articles/71-2/001"]')[0];
        $first->registerXPathNamespace('a', 'http://www.w3.org/2005/Atom');
        $this->assertSame('application/pdf', (string) $first->xpath('a:link[@rel="enclosure"]/@type')[0]);
        $this->assertCount(2, $first->xpath('a:author'));
        $this->assertSame('2025-04-30T00:00:00+00:00', (string) $first->xpath('a:published')[0]);
        $this->assertStringStartsWith('Sugars in fruit juices', (string) $first->xpath('a:summary')[0]);

        // A registered DOI is the entry id.
        $this->assertCount(1, $feed->xpath('/a:feed/a:entry[a:id="https://doi.org/10.33320/maced.pharm.bull.2025.71.02.002"]'));
    }

    public function test_early_online_feed(): void
    {
        $feed = $this->xml($this->get('/feed/early-online')->assertOk()->getContent());
        $feed->registerXPathNamespace('a', 'http://www.w3.org/2005/Atom');

        $this->assertCount(1, $feed->xpath('/a:feed/a:entry'));
        $this->assertSame($this->base.'/early-online', (string) $feed->xpath('/a:feed/a:link[@rel="alternate"]/@href')[0]);
    }

    // ------------------------------------------------------------- OAI-PMH

    public function test_oai_identify_formats_and_sets(): void
    {
        $xml = $this->oai('verb=Identify');
        $this->assertSame('Macedonian Pharmaceutical Bulletin', (string) $xml->Identify->repositoryName);
        $this->assertSame($this->base.'/oai', (string) $xml->Identify->baseURL);
        $this->assertSame('2.0', (string) $xml->Identify->protocolVersion);
        $this->assertSame('YYYY-MM-DDThh:mm:ssZ', (string) $xml->Identify->granularity);
        $this->assertSame('no', (string) $xml->Identify->deletedRecord);
        $this->assertSame('Identify', (string) $xml->request['verb']);

        $xml = $this->oai('verb=ListMetadataFormats');
        $this->assertSame('oai_dc', (string) $xml->ListMetadataFormats->metadataFormat->metadataPrefix);

        $xml = $this->oai('verb=ListSets');
        $specs = [];
        foreach ($xml->ListSets->set as $set) {
            $specs[] = (string) $set->setSpec;
        }
        $this->assertContains('issue', $specs);
        $this->assertContains('issue:71-2', $specs);
        $this->assertContains('issue:72-s1', $specs);
    }

    public function test_oai_get_record_in_dublin_core(): void
    {
        $xml = $this->oai('verb=GetRecord&identifier=oai:bulletin.mfd.org.mk:article/71-2/001&metadataPrefix=oai_dc');
        $record = $xml->GetRecord->record;

        $this->assertSame('oai:bulletin.mfd.org.mk:article/71-2/001', (string) $record->header->identifier);
        $this->assertSame('issue:71-2', (string) $record->header->setSpec);
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', (string) $record->header->datestamp);

        $dc = $record->metadata->children('http://www.openarchives.org/OAI/2.0/oai_dc/')->dc->children('http://purl.org/dc/elements/1.1/');
        $this->assertSame('Analytical methods for sugar content in fruit juices', (string) $dc->title);
        $this->assertCount(2, $dc->creator);
        $this->assertSame('2025-04-30', (string) $dc->date);
        $this->assertSame('en', (string) $dc->language);

        $types = array_map('strval', iterator_to_array($dc->type, false));
        $this->assertContains('info:eu-repo/semantics/article', $types);

        $sources = array_map('strval', iterator_to_array($dc->source, false));
        $this->assertContains('Macedonian Pharmaceutical Bulletin; Vol 71 No 2 (2025); 3–11; ISSN 1857-8969', $sources);

        $identifiers = array_map('strval', iterator_to_array($dc->identifier, false));
        $this->assertSame([$this->base.'/articles/71-2/001'], $identifiers);

        // Registered DOI is an identifier; unregistered ones are never published.
        $dc = $this->oai('verb=GetRecord&identifier=oai:bulletin.mfd.org.mk:article/71-2/002&metadataPrefix=oai_dc')
            ->GetRecord->record->metadata->children('http://www.openarchives.org/OAI/2.0/oai_dc/')->dc->children('http://purl.org/dc/elements/1.1/');
        $this->assertContains('https://doi.org/10.33320/maced.pharm.bull.2025.71.02.002', array_map('strval', iterator_to_array($dc->identifier, false)));

        $body = $this->get('/oai?verb=ListRecords&metadataPrefix=oai_dc')->getContent();
        $this->assertStringNotContainsString('maced.pharm.bull.2025.71.02.003', $body);
        $this->assertStringNotContainsString('maced.pharm.bull.2025.71.02.001', $body);
    }

    public function test_oai_lists_page_with_resumption_tokens(): void
    {
        $issue = Issue::create(['slug' => '60-1', 'volume' => 60, 'kind' => Issue::KIND_ISSUE, 'number' => 1, 'year' => 2014, 'is_published' => true]);

        foreach (range(1, 110) as $n) {
            $issue->articles()->create([
                'number' => sprintf('%03d', $n), 'position' => $n,
                'title' => "Article {$n}", 'authors' => ['A. Author'],
            ]);
        }

        $total = Article::count();
        $seen = [];

        $xml = $this->oai('verb=ListIdentifiers&metadataPrefix=oai_dc');
        $this->assertCount(OaiPmh::PAGE_SIZE, $xml->ListIdentifiers->header);
        $token = $xml->ListIdentifiers->resumptionToken;
        $this->assertSame((string) $total, (string) $token['completeListSize']);
        $this->assertSame('0', (string) $token['cursor']);

        foreach ($xml->ListIdentifiers->header as $header) {
            $seen[] = (string) $header->identifier;
        }

        $xml = $this->oai('verb=ListIdentifiers&resumptionToken='.urlencode((string) $token));
        foreach ($xml->ListIdentifiers->header as $header) {
            $seen[] = (string) $header->identifier;
        }
        $last = $xml->ListIdentifiers->resumptionToken;
        $this->assertSame('', (string) $last);
        $this->assertSame('100', (string) $last['cursor']);

        $this->assertCount($total, array_unique($seen));

        // A set narrows the list; ListRecords pages the same way.
        $xml = $this->oai('verb=ListRecords&metadataPrefix=oai_dc&set=issue:60-1');
        $this->assertCount(100, $xml->ListRecords->record);
        $this->assertSame('110', (string) $xml->ListRecords->resumptionToken['completeListSize']);

        $xml = $this->oai('verb=ListRecords&metadataPrefix=oai_dc&set=issue:71-2');
        $this->assertCount(3, $xml->ListRecords->record);
        $this->assertCount(0, $xml->ListRecords->resumptionToken);
    }

    public function test_oai_selective_harvesting_by_date(): void
    {
        Article::query()->update(['updated_at' => '2025-01-10 12:00:00']);
        Article::where('number', '001')->where('issue_id', $this->current->id)->update(['updated_at' => '2025-03-01 08:00:00']);

        $xml = $this->oai('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2025-02-01');
        $this->assertCount(1, $xml->ListIdentifiers->header);

        $xml = $this->oai('verb=ListIdentifiers&metadataPrefix=oai_dc&until=2025-01-10');
        $this->assertCount(Article::count() - 1, $xml->ListIdentifiers->header);

        $xml = $this->oai('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2025-03-01T08:00:00Z&until=2025-03-01T08:00:00Z');
        $this->assertCount(1, $xml->ListIdentifiers->header);

        $this->assertSame('2025-01-10T12:00:00Z', (string) $this->oai('verb=Identify')->Identify->earliestDatestamp);
    }

    public function test_oai_errors(): void
    {
        $cases = [
            '' => 'badVerb',
            'verb=Bogus' => 'badVerb',
            'verb=Identify&extra=1' => 'badArgument',
            'verb=Identify&verb=Identify' => 'badArgument',
            'verb=ListRecords' => 'badArgument',
            'verb=GetRecord&metadataPrefix=oai_dc' => 'badArgument',
            'verb=ListRecords&metadataPrefix=oai_dc&from=2025-13-40' => 'badArgument',
            'verb=ListRecords&metadataPrefix=oai_dc&from=2025-01-01&until=2025-01-01T00:00:00Z' => 'badArgument',
            'verb=ListRecords&metadataPrefix=oai_dc&from=2025-02-01&until=2025-01-01' => 'badArgument',
            'verb=ListRecords&metadataPrefix=oai_dc&resumptionToken=abc' => 'badArgument',
            'verb=ListRecords&metadataPrefix=marc21' => 'cannotDisseminateFormat',
            'verb=GetRecord&identifier=oai:bulletin.mfd.org.mk:article/71-2/001&metadataPrefix=marc21' => 'cannotDisseminateFormat',
            'verb=GetRecord&identifier=oai:bulletin.mfd.org.mk:article/99-9/001&metadataPrefix=oai_dc' => 'idDoesNotExist',
            'verb=GetRecord&identifier=nonsense&metadataPrefix=oai_dc' => 'idDoesNotExist',
            'verb=ListMetadataFormats&identifier=oai:example.org:1' => 'idDoesNotExist',
            'verb=ListRecords&metadataPrefix=oai_dc&from=2099-01-01' => 'noRecordsMatch',
            'verb=ListRecords&metadataPrefix=oai_dc&set=issue:99-9' => 'noRecordsMatch',
            'verb=ListRecords&resumptionToken=not-a-token' => 'badResumptionToken',
            'verb=ListSets&resumptionToken=anything' => 'badResumptionToken',
        ];

        foreach ($cases as $query => $code) {
            $xml = $this->oai($query);
            $this->assertSame($code, (string) $xml->error['code'], "Query: {$query}");

            // badVerb and badArgument echo the request without attributes.
            if (in_array($code, ['badVerb', 'badArgument'], true)) {
                $this->assertCount(0, $xml->request->attributes(), "Query: {$query}");
            }
        }
    }

    public function test_oai_accepts_post_without_csrf_token(): void
    {
        $xml = $this->xml($this->post('/oai', ['verb' => 'Identify'])->assertOk()->getContent());

        $this->assertSame('Macedonian Pharmaceutical Bulletin', (string) $xml->Identify->repositoryName);
    }

    // -------------------------------------------------------------- helpers

    /**
     * Meta tags of an HTML page, by name or property.
     *
     * @return array<string, list<string>>
     */
    private function metaTags(string $html): array
    {
        $dom = new DOMDocument;
        @$dom->loadHTML('<?xml encoding="UTF-8">'.$html);
        $tags = [];

        foreach ((new DOMXPath($dom))->query('//head/meta[@name or @property]') as $meta) {
            $key = $meta->getAttribute('name') ?: $meta->getAttribute('property');
            $tags[$key][] = $meta->getAttribute('content');
        }

        return $tags;
    }

    /** @return array<string, mixed> */
    private function jsonLd(string $html): array
    {
        $this->assertSame(1, preg_match('#<script type="application/ld\+json"[^>]*>(.*?)</script>#s', $html, $m));

        return json_decode($m[1], true, flags: JSON_THROW_ON_ERROR);
    }

    /**
     * @param  array<string, mixed>  $graph
     * @return array<string, mixed>
     */
    private function node(array $graph, string $type): array
    {
        $this->assertSame('https://schema.org', $graph['@context']);

        foreach ($graph['@graph'] as $node) {
            if ($node['@type'] === $type) {
                return $node;
            }
        }

        $this->fail("No {$type} node in the JSON-LD graph.");
    }

    private function xml(string $body): SimpleXMLElement
    {
        $previous = libxml_use_internal_errors(true);
        $xml = simplexml_load_string($body);
        $errors = libxml_get_errors();
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $this->assertNotFalse($xml, 'Invalid XML: '.json_encode(array_map(fn ($e) => trim($e->message), $errors)));

        return $xml;
    }

    /** @return list<string> */
    private function locs(string $url): array
    {
        $xml = $this->xml($this->get($url)->assertOk()->getContent());
        $xml->registerXPathNamespace('s', 'http://www.sitemaps.org/schemas/sitemap/0.9');

        return array_map('strval', $xml->xpath('//s:url/s:loc'));
    }

    private function oai(string $query): SimpleXMLElement
    {
        $response = $this->get('/oai'.($query === '' ? '' : '?'.$query))
            ->assertOk()
            ->assertHeader('Content-Type', 'text/xml; charset=UTF-8');

        $xml = $this->xml($response->getContent());
        $this->assertSame('OAI-PMH', $xml->getName());
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/', (string) $xml->responseDate);

        return $xml;
    }
}
