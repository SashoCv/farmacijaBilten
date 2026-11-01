<?php

namespace App\Console\Commands;

use App\Journal\Import\HtmlSanitizer;
use App\Journal\Import\SourceUrls;
use App\Models\Page;
use Database\Seeders\BoardMemberSeeder;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;

/**
 * Rebuilds the editorial pages from the cached WordPress source with the
 * current HtmlSanitizer (section headings with their old ids, sub-headings,
 * checklists, labelled links), applies the sentence-case English and the
 * Macedonian titles and summaries from Page::CATALOGUE, and seeds the
 * editorial board.
 *
 * Without a cached source (and without --fetch) it re-sanitizes the stored
 * bodies instead; that restores sub-headings and checklists but not ids the
 * first import already lost.
 *
 * Safe to re-run. Never deletes pages.
 */
class RepairPages extends Command
{
    public const SOURCE = 'app/private/wordpress/pages.json';

    protected $signature = 'journal:repair-pages
        {--source= : WordPress pages JSON (default: storage/'.self::SOURCE.')}
        {--fetch : Download the pages from the WordPress API when there is no cached source}
        {--board : Re-seed the editorial board from the page, replacing existing members}
        {--dry-run : Report what would change, without saving}';

    protected $description = 'Re-sanitize the editorial pages, set their titles and seed the editorial board';

    public function handle(HtmlSanitizer $sanitizer): int
    {
        $source = $this->loadSource();
        $dry = (bool) $this->option('dry-run');
        $modified = [];

        if ($source !== null) {
            foreach ($source as $item) {
                $path = trim((string) parse_url((string) ($item['link'] ?? ''), PHP_URL_PATH), '/');
                // The old home page held the editor's welcome.
                $path = $path === '' ? 'editorial' : $path;
                $modified[$path] = $item['modified'] ?? null;

                $page = Page::firstOrNew(['path' => $path]);
                $page->fill([
                    'title' => $page->title ?? html_entity_decode((string) ($item['title']['rendered'] ?? $path), ENT_QUOTES | ENT_HTML5),
                    'parent_path' => str_contains($path, '/') ? dirname($path) : null,
                    'body' => $sanitizer->clean((string) ($item['content']['rendered'] ?? ''))['html'],
                    'source_url' => $item['link'] ?? $page->source_url,
                    'wp_id' => $item['id'] ?? $page->wp_id,
                ]);

                if (isset($item['menu_order'])) {
                    $page->position = (int) $item['menu_order'];
                }

                $this->save($page, $dry);
            }
        } else {
            $this->warn('No cached WordPress source: re-sanitizing the stored page bodies.');

            Page::query()->each(function (Page $page) use ($sanitizer, $dry) {
                $page->body = $sanitizer->clean($page->body)['html'];

                $this->save($page, $dry);
            });
        }

        foreach (Page::CATALOGUE as $path => $values) {
            if ($page = Page::where('path', $path)->first()) {
                $page->fill($values);
                $this->save($page, $dry);
            }
        }

        $this->reportAnchors();

        if (! $dry) {
            $seeder = new BoardMemberSeeder;
            $seeder->force = (bool) $this->option('board');
            $seeder->sourceModified = isset($modified['editorial-board']) ? Carbon::parse($modified['editorial-board']) : null;
            $seeder->setCommand($this)->__invoke();
        }

        return self::SUCCESS;
    }

    /**
     * @return list<array<string, mixed>>|null
     */
    private function loadSource(): ?array
    {
        $file = $this->option('source') ?: storage_path(self::SOURCE);

        if (! is_file($file) && $this->option('fetch')) {
            $this->info('Fetching pages from '.SourceUrls::BASE.' …');

            $response = Http::withUserAgent('MPB-site-migration/1.0 (+'.config('app.url').')')
                ->timeout(60)
                ->retry(3, 1000)
                ->get(SourceUrls::BASE.'/wp-json/wp/v2/pages', [
                    'per_page' => 100,
                    '_fields' => 'id,slug,link,title,content,parent,menu_order,date,modified',
                ])
                ->throw();

            File::ensureDirectoryExists(dirname($file));
            File::put($file, $response->body());
        }

        if (! is_file($file)) {
            return null;
        }

        $data = json_decode((string) file_get_contents($file), true);

        if (! is_array($data) || ! array_is_list($data)) {
            $this->error("{$file} is not a list of WordPress pages.");

            return null;
        }

        $this->info('Using '.count($data)." pages from {$file}.");

        return $data;
    }

    private function save(Page $page, bool $dry): void
    {
        if (! $page->isDirty()) {
            return;
        }

        $this->line(sprintf('  %s %s (%s)', $page->exists ? 'update' : 'create', $page->path, implode(', ', array_keys($page->getDirty()))));

        if (! $dry) {
            $page->save();
        }
    }

    /** Warns about in-page links whose target id does not exist. */
    private function reportAnchors(): void
    {
        $broken = 0;

        Page::query()->each(function (Page $page) use (&$broken) {
            foreach (self::brokenFragments($page) as $href) {
                $this->warn("  {$page->path}: no target for {$href}");
                $broken++;
            }
        });

        $broken === 0
            ? $this->info('Every in-page link resolves.')
            : $this->warn("{$broken} in-page links have no target.");
    }

    /**
     * Links in a page body to a fragment of the same page ("#x" or "/path#x")
     * whose id is missing.
     *
     * @return list<string>
     */
    public static function brokenFragments(Page $page): array
    {
        if (trim($page->body) === '') {
            return [];
        }

        $doc = new DOMDocument;
        $doc->loadHTML('<?xml encoding="utf-8"?><div>'.$page->body.'</div>', LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);
        $xpath = new DOMXPath($doc);

        $ids = [];

        foreach ($xpath->query('//*[@id] | //a[@name]') ?: [] as $el) {
            /** @var DOMElement $el */
            $ids[$el->getAttribute('id') ?: $el->getAttribute('name')] = true;
        }

        $broken = [];

        foreach ($xpath->query('//a[contains(@href, "#")]') ?: [] as $a) {
            /** @var DOMElement $a */
            $href = $a->getAttribute('href');
            [$path, $fragment] = explode('#', $href, 2) + [1 => ''];

            $samePage = $path === '' || trim($path, '/') === $page->path;

            if ($samePage && $fragment !== '' && ! isset($ids[rawurldecode($fragment)])) {
                $broken[] = $href;
            }
        }

        return $broken;
    }
}
