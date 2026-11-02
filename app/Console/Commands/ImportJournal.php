<?php

namespace App\Console\Commands;

use App\Journal\Import\HtmlSanitizer;
use App\Journal\Import\IssueContentParser;
use App\Journal\Import\IssueMap;
use App\Journal\Import\SourceUrls;
use App\Journal\Journal;
use App\Journal\Seo\Sitemap;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Console\Command;
use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Pool;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

/**
 * Mirrors the old WordPress site (bulletin.mfd.org.mk): every issue with its
 * articles, the editorial pages, and all linked files.
 *
 * Safe to re-run: issues, articles and pages are updated in place (editorial
 * fields such as abstracts are never overwritten) and files already on disk
 * are skipped.
 *
 * The full pipeline, run by this command in order:
 *   journal:import → journal:extract-metadata → journal:repair-text
 *   → journal:sync-crossref → journal:generate-covers → (check) journal:verify-data
 */
class ImportJournal extends Command
{
    protected $signature = 'journal:import
        {--skip-files : Import content only, without downloading files}
        {--skip-pages : Leave the editorial pages as they are (only record their WordPress IDs)}
        {--no-crossref : Do not check DOIs against Crossref afterwards}
        {--only-files : Only download files missing for already-imported content}
        {--dry-run : Parse and report, without saving anything}
        {--concurrency=6 : Parallel file downloads}';

    protected $description = 'Import issues, articles, pages and files from bulletin.mfd.org.mk';

    /** WordPress post/page IDs => old slug or path, for "/?p=ID" and "/?page_id=ID" addresses. */
    public const WP_IDS_FILE = 'legacy/wp-ids.json';

    /** Files linked from the old home page and theme. */
    private const EXTRA_FILES = [
        'media/images/naslovna.jpg',
        'media/images/doaj_logo.jpg',
        'media/images/ebsco_logo.jpg',
    ];

    /** @var array<string, true> */
    private array $files = [];

    private Filesystem $disk;

    public function handle(IssueContentParser $parser, HtmlSanitizer $sanitizer): int
    {
        $this->disk = Storage::disk('journal');

        if (! $this->option('only-files')) {
            $posts = $this->fetchAll('posts');
            $pages = $this->fetchAll('pages');

            $this->info(sprintf('Fetched %d posts and %d pages.', count($posts), count($pages)));

            if ($this->option('dry-run')) {
                $this->report($posts, $parser);

                return self::SUCCESS;
            }

            DB::transaction(function () use ($posts, $pages, $parser, $sanitizer) {
                $this->importIssues($posts, $parser);

                if ($this->option('skip-pages')) {
                    $this->recordPageIds($pages);
                } else {
                    $this->importPages($pages, $sanitizer);
                }
            });

            $this->writeWordPressIds($posts, $pages);

            Journal::flush();
            Sitemap::flush();
        } else {
            $this->collectKnownFiles();
        }

        foreach (self::EXTRA_FILES as $file) {
            $this->files[$file] = true;
        }

        if ($this->option('dry-run')) {
            return self::SUCCESS;
        }

        if ($this->option('skip-files')) {
            // Titles and authors were re-read from the site: repair them again.
            $this->call('journal:repair-text');

            return self::SUCCESS;
        }

        $status = $this->downloadFiles();

        // Abstracts, keywords, DOI, pages and authors come from the PDFs themselves,
        // then encodings are repaired, DOIs checked and covers rendered.
        $this->newLine();
        $this->call('journal:extract-metadata');
        $this->call('journal:index-search');
        $this->call('journal:repair-text');

        if (! $this->option('no-crossref')) {
            $this->call('journal:sync-crossref');
        }

        $this->call('journal:generate-covers');

        return $status;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fetchAll(string $type): array
    {
        $items = [];
        $page = 1;

        do {
            $response = $this->http()
                ->get(SourceUrls::BASE."/wp-json/wp/v2/{$type}", [
                    'per_page' => 100,
                    'page' => $page,
                    '_fields' => 'id,slug,link,title,content,parent,menu_order,date',
                ])
                ->throw();

            array_push($items, ...$response->json());
            $total = (int) $response->header('X-WP-TotalPages');
            $page++;
        } while ($page <= $total);

        return $items;
    }

    /**
     * @param  list<array<string, mixed>>  $posts
     */
    private function importIssues(array $posts, IssueContentParser $parser): void
    {
        // Regular posts first, so early-online articles attach to issues that already exist.
        usort($posts, fn ($a, $b) => ($a['slug'] === IssueMap::EARLY_ONLINE_POST) <=> ($b['slug'] === IssueMap::EARLY_ONLINE_POST));

        $issueCount = 0;
        $articleCount = 0;

        foreach ($posts as $post) {
            $parsed = $parser->parse($post['content']['rendered']);

            foreach ($parsed['warnings'] as $warning) {
                $this->warn("[{$post['slug']}] {$warning}");
            }

            if ($post['slug'] === IssueMap::EARLY_ONLINE_POST) {
                $articleCount += $this->importEarlyOnline($post, $parsed['articles']);

                continue;
            }

            $map = IssueMap::forPost($post['slug']);

            if ($map === null) {
                if (IssueMap::containerVolume($post['slug']) === null) {
                    $this->warn("Skipped post \"{$post['slug']}\": no issue mapping.");
                }

                continue;
            }

            $issue = Issue::updateOrCreate(['slug' => $map['slug']], array_filter([
                ...$map,
                ...(IssueMap::DETAILS[$map['slug']] ?? []),
                'is_published' => true,
                'full_pdf' => $this->file($parsed['full_pdf']),
                'toc_pdf' => $this->file($parsed['toc_pdf']),
                'cover_pdf' => $this->file($parsed['cover_pdf']),
                // "Available on-line 03 November 2017" on the issue post.
                'online_at' => $parsed['online_at'],
                'source_url' => $post['link'],
                'wp_id' => $post['id'] ?? null,
            ], fn ($value, $key) => $value !== null || in_array($key, ['number', 'note', 'full_pdf', 'toc_pdf'], true), ARRAY_FILTER_USE_BOTH));

            $issueCount++;
            $articleCount += $this->upsertArticles($issue, $parsed['articles']);
        }

        $this->info("Imported {$issueCount} issues and {$articleCount} articles.");
    }

    /**
     * Early-online articles belong to the issue named by their PDF folder
     * (e.g. "Volume 72_1"), which stays unpublished until its post appears.
     *
     * @param  array<string, mixed>  $post
     * @param  list<array<string, mixed>>  $articles
     */
    private function importEarlyOnline(array $post, array $articles): int
    {
        $byIssue = [];

        foreach ($articles as $article) {
            $map = $article['pdf'] ? IssueMap::forFile($article['pdf']) : null;

            if ($map === null) {
                $this->warn("[early-online] Can't tell the issue of \"{$article['title']}\".");

                continue;
            }

            $byIssue[$map['slug']]['map'] = $map;
            $byIssue[$map['slug']]['articles'][] = $article;
        }

        $count = 0;

        foreach ($byIssue as $slug => $group) {
            $issue = Issue::firstOrCreate(['slug' => $slug], [
                ...$group['map'],
                'is_published' => false,
                'source_url' => $post['link'],
            ]);

            $count += $this->upsertArticles($issue, $group['articles']);
        }

        return $count;
    }

    /**
     * @param  list<array<string, mixed>>  $articles
     */
    private function upsertArticles(Issue $issue, array $articles): int
    {
        foreach ($articles as $position => $data) {
            $article = Article::firstOrNew(['issue_id' => $issue->id, 'number' => $data['number']]);

            $article->fill([
                'position' => $position + 1,
                'title' => $data['title'],
                'title_html' => $data['title_html'] ?? null,
                'pdf' => $this->file($data['pdf']),
                'online_at' => $data['online_at'],
            ]);

            // Authors read from the PDF or fixed by an editor beat the site's listing.
            if (in_array($article->authors_source, [null, 'web'], true)) {
                $article->authors = $data['authors'];
                $article->authors_source = 'web';
            }

            $article->save();
        }

        return count($articles);
    }

    /**
     * @param  list<array<string, mixed>>  $pages
     */
    private function importPages(array $pages, HtmlSanitizer $sanitizer): void
    {
        foreach ($pages as $page) {
            $path = self::pagePath($page['link']);

            $clean = $sanitizer->clean($page['content']['rendered']);

            foreach ($clean['files'] as $file) {
                $this->files[$file] = true;
            }

            $existing = Page::where('path', $path)->first();

            Page::updateOrCreate(['path' => $path], [
                'wp_id' => $page['id'] ?? null,
                // Titles are edited after import (journal:repair-pages); keep them.
                'title' => $existing->title ?? html_entity_decode($page['title']['rendered'], ENT_QUOTES | ENT_HTML5),
                'parent_path' => str_contains($path, '/') ? dirname($path) : null,
                'position' => (int) ($page['menu_order'] ?? 0),
                'body' => $clean['html'],
                'source_url' => $page['link'],
            ]);
        }

        $this->info('Imported '.count($pages).' pages.');
    }

    /**
     * Records the WordPress IDs of pages already imported, without touching
     * their content (which editors may have changed since).
     *
     * @param  list<array<string, mixed>>  $pages
     */
    private function recordPageIds(array $pages): void
    {
        foreach ($pages as $page) {
            Page::where('path', self::pagePath($page['link']))->update(['wp_id' => $page['id']]);
        }

        $this->info('Recorded the WordPress IDs of '.count($pages).' pages (content left as is).');
    }

    /**
     * Saves every post and page ID with its old address, so "/?p=ID" links
     * also work for posts that are not issues (volume overviews, early online).
     *
     * @param  list<array<string, mixed>>  $posts
     * @param  list<array<string, mixed>>  $pages
     */
    private function writeWordPressIds(array $posts, array $pages): void
    {
        $this->disk->put(self::WP_IDS_FILE, (string) json_encode([
            'posts' => array_column($posts, 'slug', 'id'),
            'pages' => array_map(self::pagePath(...), array_column($pages, 'link', 'id')),
        ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
    }

    /** Path of an imported page from its old link ("https://…/guidelines/x/" => "guidelines/x"). */
    private static function pagePath(string $link): string
    {
        $path = trim((string) parse_url($link, PHP_URL_PATH), '/');

        // The old home page held the editor's welcome.
        return $path === '' ? 'editorial' : $path;
    }

    private function file(?string $path): ?string
    {
        if ($path !== null) {
            $this->files[$path] = true;
        }

        return $path;
    }

    private function collectKnownFiles(): void
    {
        Issue::query()->get(['full_pdf', 'toc_pdf', 'cover_pdf'])->each(function (Issue $issue) {
            $this->file($issue->full_pdf);
            $this->file($issue->toc_pdf);
            $this->file($issue->cover_pdf);
        });

        Article::query()->whereNotNull('pdf')->pluck('pdf')->each(fn (string $pdf) => $this->file($pdf));

        Page::query()->pluck('body')->each(function (string $body) {
            preg_match_all('#(?:href|src)="/((?:volumes|downloads|media)/[^"]+)"#', $body, $m);

            foreach ($m[1] as $url) {
                $this->file(rawurldecode($url));
            }
        });
    }

    private function downloadFiles(): int
    {
        $missing = array_values(array_filter(
            array_keys($this->files),
            fn (string $path) => ! $this->disk->exists($path),
        ));

        $total = count($this->files);

        if ($missing === []) {
            $this->info("All {$total} files are already downloaded.");

            return self::SUCCESS;
        }

        $this->info(sprintf('Downloading %d of %d files...', count($missing), $total));

        $failed = [];
        $bar = $this->output->createProgressBar(count($missing));
        $concurrency = max(1, (int) $this->option('concurrency'));

        foreach (array_chunk($missing, $concurrency) as $chunk) {
            $responses = Http::pool(fn (Pool $pool) => array_map(
                fn (string $path) => $pool->as($path)
                    ->withUserAgent($this->userAgent())
                    ->timeout(180)
                    ->retry(2, 2000, throw: false)
                    ->get(SourceUrls::fileSource($path)),
                $chunk,
            ));

            foreach ($responses as $path => $response) {
                if ($response instanceof Response && $response->successful()) {
                    $this->disk->put($path, $response->body());
                } else {
                    $failed[$path] = $response instanceof Response
                        ? 'HTTP '.$response->status()
                        : $response->getMessage();
                }

                $bar->advance();
            }
        }

        $bar->finish();
        $this->newLine(2);

        if ($failed !== []) {
            $this->warn(count($failed).' files failed (re-run to retry):');

            foreach ($failed as $path => $reason) {
                $this->line("  {$path}: {$reason}");
            }

            return self::FAILURE;
        }

        $this->info('All files downloaded.');

        return self::SUCCESS;
    }

    /**
     * @param  list<array<string, mixed>>  $posts
     */
    private function report(array $posts, IssueContentParser $parser): void
    {
        $rows = [];

        foreach ($posts as $post) {
            $map = IssueMap::forPost($post['slug']);
            $parsed = $parser->parse($post['content']['rendered']);

            if ($map === null && $post['slug'] !== IssueMap::EARLY_ONLINE_POST) {
                continue;
            }

            $first = $parsed['articles'][0] ?? null;
            $noAuthors = count(array_filter($parsed['articles'], fn ($a) => $a['authors'] === []));

            $rows[] = [
                $post['slug'],
                $map['slug'] ?? 'early',
                count($parsed['articles']),
                $noAuthors,
                $parsed['full_pdf'] ? 'yes' : '',
                $parsed['toc_pdf'] ? 'yes' : '',
                $first ? mb_strimwidth($first['title'], 0, 40, '…') : '',
                $first ? mb_strimwidth(implode(', ', $first['authors']), 0, 30, '…') : '',
            ];

            foreach ($parsed['warnings'] as $warning) {
                $this->warn("[{$post['slug']}] {$warning}");
            }
        }

        $this->table(['post', 'issue', 'articles', 'no authors', 'full', 'toc', 'first title', 'first authors'], $rows);
    }

    private function http(): PendingRequest
    {
        return Http::withUserAgent($this->userAgent())->timeout(60)->retry(3, 1000);
    }

    private function userAgent(): string
    {
        return 'MPB-site-migration/1.0 (+'.config('app.url').')';
    }
}
