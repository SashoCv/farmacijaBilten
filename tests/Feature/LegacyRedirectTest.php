<?php

namespace Tests\Feature;

use App\Console\Commands\ImportJournal;
use App\Journal\Import\IssueMap;
use App\Journal\Import\LegacyLinkChecker;
use App\Journal\Journal;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Every address of the old WordPress site keeps working: old links found in
 * its pages and posts (tests/fixtures/legacy-links.txt), and the resource
 * URLs registered at Crossref for the journal's DOIs
 * (tests/fixtures/crossref-10.33320.json). Each must answer 200, directly or
 * through redirects.
 *
 * The database holds the issues and pages the import creates from the old
 * posts. Mirrored PDFs are served by the web server, not the app, so for
 * those the file must exist on the "journal" disk; that part runs only where
 * the mirror is present (journal:verify-data --links does the same walk
 * against the real data).
 */
class LegacyRedirectTest extends TestCase
{
    use RefreshDatabase;

    private const PAGES = [
        'editorial' => 4, 'contact' => 13, 'editorial-board' => 16, 'submit-your-paper' => 18,
        'guidelines' => 115, 'guidelines/editorial-policies' => 113, 'guidelines/instructions-for-authors' => 11,
        'guidelines/review-policies' => 139, 'guidelines/aims-and-scope' => 141,
        'guidelines/article-processing-charges' => 146, 'guidelines/open-access-policy' => 151,
        'guidelines/downloads' => 181,
    ];

    protected function setUp(): void
    {
        parent::setUp();

        config(['inertia.ssr.enabled' => false]);

        $posts = $this->posts();

        // The issues journal:import creates from the old posts, plus the early-online issues.
        foreach ($posts as $id => $slug) {
            if ($map = IssueMap::forPost($slug)) {
                Issue::updateOrCreate(['slug' => $map['slug']], [...$map, 'is_published' => true, 'wp_id' => $id]);
            }
        }

        foreach (['72-1', '72-2', '73-1'] as $slug) {
            [$volume, $number] = explode('-', $slug);
            Issue::create(['slug' => $slug, 'volume' => $volume, 'kind' => Issue::KIND_ISSUE, 'number' => $number, 'year' => $volume + 1954, 'is_published' => false]);
        }

        foreach (self::PAGES as $path => $id) {
            Page::create([
                'path' => $path,
                'title' => ucfirst(basename($path)),
                'parent_path' => str_contains($path, '/') ? dirname($path) : null,
                'body' => '<p>Text</p>',
                'wp_id' => $id,
            ]);
        }

        Journal::flush();
    }

    public function test_every_old_page_link_and_crossref_landing_url_ends_in_a_200(): void
    {
        $checker = new LegacyLinkChecker(app(Kernel::class));
        $failures = [];
        $checked = 0;

        foreach ($this->pageUrls() as $url) {
            $result = $checker->check($url);
            $checked++;

            if (! $result['ok']) {
                $failures[] = "{$url} => {$result['status']} via ".implode(' → ', $result['hops']);
            }
        }

        $this->assertGreaterThan(100, $checked);
        $this->assertSame([], $failures);
    }

    public function test_every_old_file_link_and_crossref_pdf_is_mirrored(): void
    {
        if (! is_dir(Storage::disk('journal')->path('volumes'))) {
            $this->markTestSkipped('The file mirror (storage/app/journal) is not present.');
        }

        $checker = new LegacyLinkChecker(app(Kernel::class));
        $failures = [];
        $urls = array_diff($this->allUrls(), $this->pageUrls());

        foreach ($urls as $url) {
            if (! $checker->check($url)['ok']) {
                $failures[] = $url;
            }
        }

        $this->assertGreaterThan(1000, count($urls));
        $this->assertSame([], $failures);
    }

    public function test_crossref_issue_urls_for_missing_slugs_reach_existing_pages(): void
    {
        // Registered as the resource of …2020.66.03 and …2023.69.03.
        $this->get('/volume-66-3')->assertStatus(301)->assertRedirect('/issues/66-s1');
        $this->get('/volume-69-3/')->assertRedirect('/issues/69-s1');

        // Volume-level DOIs of multi-issue volumes.
        foreach ([65, 66, 67] as $volume) {
            $this->get("/volume-{$volume}/")->assertStatus(301)->assertRedirect("/archive#volume-{$volume}");
        }
    }

    public function test_an_issue_that_does_not_exist_leads_to_its_volume_in_the_archive(): void
    {
        $this->get('/volume-71-3')->assertStatus(301)->assertRedirect('/archive#volume-71');
        $this->get('/volume-99-1')->assertStatus(301)->assertRedirect('/archive#volume-99');
    }

    public function test_wordpress_post_and_page_ids_redirect(): void
    {
        Storage::fake('journal');
        Storage::disk('journal')->put(ImportJournal::WP_IDS_FILE, (string) json_encode([
            'posts' => ['390' => 'early-online', '254' => 'volume-62'],
            'pages' => [],
        ]));

        $this->get('/?p=590')->assertStatus(301)->assertRedirect('/issues/71-2');
        $this->get('/?page_id=13')->assertStatus(301)->assertRedirect('/contact');
        $this->get('/?page_id=4')->assertRedirect('/editorial');
        $this->get('/?p=390')->assertRedirect('/early-online');
        // A volume overview: the legacy post route then sends it to the archive.
        $this->get('/?p=254')->assertRedirect('/volume-62');
        $this->get('/?s=HPLC')->assertRedirect('/search?q=HPLC');
        $this->get('/?feed=rss2')->assertRedirect('/feed');

        // Unknown IDs and other queries fall through to the home page.
        $this->get('/?p=99999')->assertOk();
        $this->get('/?page=2')->assertOk();
    }

    public function test_wordpress_system_addresses_redirect(): void
    {
        $this->get('/wp-sitemap.xml')->assertStatus(301)->assertRedirect('/sitemap.xml');
        $this->get('/comments/feed/')->assertStatus(301)->assertRedirect('/feed');
        $this->get('/wp-includes/images/no-such-file.jpg')->assertNotFound();
    }

    /** @return array<int, string> WordPress post ID => slug, from the fixture's permalinks. */
    private function posts(): array
    {
        $ids = [
            624 => '72_3_2026-8cpm', 590 => 'volume-71-2', 585 => 'volume-71-1', 566 => 'volume-70-2', 552 => 'volume-70-1',
            548 => 'volume-69-2', 512 => 'volume-69-1', 510 => 'volume-68-2', 492 => 'volume-69-suppl-1', 480 => 'volume-68-1',
            471 => '68-supp-2', 463 => '68-supp-1', 441 => 'volume-67-2', 427 => 'volume-66-suppl-2', 418 => 'volume-67-1',
            388 => 'volume-66-2', 375 => 'volume-66-1', 344 => 'volume-66-supp-1', 325 => 'volume-65-2', 318 => 'volume-65-1',
            260 => 'volume-64-2', 276 => 'volume-64-1', 287 => 'volume-63-2', 213 => 'volume-63-1', 238 => 'volume-62-2',
            185 => 'volume-62-1', 177 => 'volume-62-supp', 204 => 'volume-61-2', 65 => 'volume-61-1', 125 => 'volume-60-2',
            118 => 'volume-60-1', 62 => 'volume-59', 60 => 'volume-58', 58 => 'volume-57', 56 => 'volume-56',
            54 => 'volume-55-2', 51 => 'volume-55', 49 => 'volume-52', 47 => 'volume-51', 45 => 'volume-48', 30 => 'volume-47',
        ];

        // Every post permalink in the links fixture must be one of these.
        foreach (LegacyLinkChecker::linksFrom(base_path('tests/fixtures/legacy-links.txt')) as $url) {
            $slug = trim((string) parse_url($url, PHP_URL_PATH), '/');

            if (preg_match('/^(volume-\d+(-\d|-supp|-suppl?-\d)?|\d+-supp-\d|72_3_2026-8cpm)$/', $slug)) {
                $this->assertTrue(in_array($slug, $ids, true) || IssueMap::containerVolume($slug) !== null, "Unknown post {$slug}");
            }
        }

        return $ids;
    }

    /** @return list<string> */
    private function allUrls(): array
    {
        return array_values(array_unique([
            ...LegacyLinkChecker::linksFrom(base_path('tests/fixtures/legacy-links.txt')),
            ...LegacyLinkChecker::crossrefUrls(base_path('tests/fixtures/crossref-10.33320.json')),
        ]));
    }

    /** Links answered by the app (not mirrored files). @return list<string> */
    private function pageUrls(): array
    {
        return array_values(array_filter(
            $this->allUrls(),
            fn (string $url) => ! preg_match('#^(?:https?://)+[^/]+/(volumes|downloads|media|wp-content|wp-includes)/#i', $url),
        ));
    }
}
