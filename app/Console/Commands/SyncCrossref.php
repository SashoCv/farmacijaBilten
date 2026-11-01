<?php

namespace App\Console\Commands;

use App\Models\Article;
use App\Models\Issue;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Checks every article DOI against what the journal has actually deposited
 * at Crossref (prefix 10.33320) and records the result:
 *
 *  - articles.doi_registered: true when the DOI resolves to this article's
 *    PDF, false when it is not registered (or registered for another paper);
 *  - articles.doi_resolvable: the form that resolves at doi.org. Some DOIs
 *    were deposited with a doubled prefix ("10.33320/10.33320/…") or a typo;
 *    links use that form until Crossref aliases them;
 *  - articles.doi for articles without one (matched by PDF), and DOIs read
 *    from a reference list by mistake are replaced;
 *  - issues.doi from the issue- and volume-level deposits.
 *
 * Writes CSV lists for the editors to storage/app/reports. Idempotent.
 */
class SyncCrossref extends Command
{
    protected $signature = 'journal:sync-crossref
        {--fixture= : Read Crossref records from this JSON file instead of the API}
        {--save= : Also save the fetched records to this JSON file}
        {--check=0 : Afterwards, check this many registered DOIs at doi.org (expects a redirect)}
        {--reports= : Folder for the CSV lists (default storage/app/reports)}
        {--dry-run : Report without saving}';

    protected $description = 'Verify article DOIs against Crossref and record which ones resolve';

    private const API = 'https://api.crossref.org/prefixes/10.33320/works';

    private const PREFIX = '10.33320/';

    /** @var array<string, int> */
    private array $counts = [];

    public function handle(): int
    {
        $records = $this->option('fixture') ? $this->fromFile((string) $this->option('fixture')) : $this->fetch();

        if ($records === []) {
            $this->error('No Crossref records: nothing changed.');

            return self::FAILURE;
        }

        if ($save = $this->option('save')) {
            File::put((string) $save, (string) json_encode($records, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
        }

        $this->info(count($records).' Crossref records for prefix 10.33320.');

        $byDoi = [];
        $byPath = [];

        foreach ($records as $record) {
            $byDoi[self::normalize($record['DOI'])] ??= $record;

            if ($record['type'] === 'journal-article' && ($path = self::resourcePath($record['url']))) {
                $byPath[$path] = $record;
            }
        }

        $reports = ['unregistered' => [], 'double' => [], 'mismatch' => []];
        $dry = (bool) $this->option('dry-run');
        $articles = Article::query()->with('issue:id,slug')->orderBy('id')->get();

        // Pass 1: DOIs missing from the database, or taken from a cited work.
        foreach ($articles as $article) {
            $record = $article->pdf ? ($byPath[$article->pdf] ?? null) : null;

            if ($record === null || ($article->doi && str_starts_with(strtolower($article->doi), self::PREFIX))) {
                continue;
            }

            if ($article->doi) {
                $reports['mismatch'][] = $this->row($article, $record, 'The PDF parser took a cited DOI; replaced with the one registered for this PDF');
                $this->count('foreign DOIs replaced');
            } else {
                $this->count('missing DOIs filled from Crossref');
            }

            $article->doi = self::normalize($record['DOI']);
        }

        $known = [];

        foreach ($articles as $article) {
            if ($article->doi) {
                $known[self::normalize($article->doi)] = $article->id;
            }
        }

        // Pass 2: does each DOI resolve to this article?
        foreach ($articles as $article) {
            [$registered, $resolvable] = [null, null];

            if ($article->doi) {
                $doi = self::normalize($article->doi);
                $record = $byDoi[$doi] ?? null;
                $forPdf = $article->pdf ? ($byPath[$article->pdf] ?? null) : null;
                $target = $record ? self::resourcePath($record['url']) : null;

                if ($record && ($target === null || $target === $article->pdf || ! str_starts_with($target, 'volumes/'))) {
                    [$registered, $resolvable] = [true, $record['DOI']];

                    if (strcasecmp($record['DOI'], $article->doi) !== 0) {
                        $reports['double'][] = [$article->issue->slug, $article->number, $article->doi, $record['DOI']];
                    }
                } elseif ($record) {
                    // Registered, but pointing at another paper's PDF.
                    $registered = false;
                    $reports['mismatch'][] = $this->row($article, $record, 'This DOI is registered for a different PDF');
                } elseif ($forPdf && ! isset($known[self::normalize($forPdf['DOI'])])) {
                    // This PDF is registered under a mistyped DOI, which does resolve here.
                    [$registered, $resolvable] = [true, $forPdf['DOI']];
                    $reports['mismatch'][] = $this->row($article, $forPdf, 'This PDF is registered under a mistyped DOI');
                } elseif ($forPdf) {
                    $registered = false;
                    $reports['mismatch'][] = $this->row($article, $forPdf, "This PDF is registered under another article's DOI");
                } else {
                    $registered = false;
                    $reports['unregistered'][] = [
                        $article->issue->slug, $article->number, $article->doi, $article->title, $article->pdf,
                        url("/articles/{$article->issue->slug}/{$article->number}"),
                    ];
                }
            }

            $article->doi_registered = $registered;
            $article->doi_resolvable = $resolvable;

            $this->count(match ($registered) {
                true => 'articles with a registered DOI',
                false => 'articles with an unregistered DOI',
                null => 'articles without a DOI',
            });

            if ($article->isDirty()) {
                $this->count('articles changed');

                if (! $dry) {
                    $article->save();
                }
            }
        }

        $this->syncIssues($records, $dry);

        if (! $dry) {
            $this->writeReports($reports);
        }

        $this->table(['', 'count'], collect($this->counts)->map(fn ($n, $k) => [$k, $n])->values()->all());

        return (int) $this->option('check') > 0 ? $this->checkResolution((int) $this->option('check')) : self::SUCCESS;
    }

    /**
     * Issue DOIs: "…2023.69.02" is issue 2; "…69.03"/"…69.04" are supplements
     * 1 and 2 (the folder convention); a bare volume DOI belongs to a
     * single-issue volume only.
     *
     * @param  list<array{DOI: string, type: string, url: string}>  $records
     */
    private function syncIssues(array $records, bool $dry): void
    {
        $slugs = [];

        foreach ($records as $record) {
            if (! in_array($record['type'], ['journal-issue', 'journal-volume'], true)
                || ! preg_match('/maced\.pharm\.bull\.\d{4}\.(\d+)(?:\.(\d{2}))?$/', self::normalize($record['DOI']), $m)) {
                continue;
            }

            $part = isset($m[2]) ? (int) $m[2] : null;
            $slug = match (true) {
                $part === null => $m[1],
                $part <= 2 => "{$m[1]}-{$part}",
                default => "{$m[1]}-s".($part - 2),
            };

            // An issue deposit wins over a volume deposit for the same issue.
            if (! isset($slugs[$slug]) || $record['type'] === 'journal-issue') {
                $slugs[$slug] = $record['DOI'];
            }
        }

        foreach (Issue::all() as $issue) {
            $issue->doi = $slugs[$issue->slug] ?? null;

            if ($issue->doi) {
                $this->count('issues with a registered DOI');
            }

            if ($issue->isDirty() && ! $dry) {
                $issue->save();
            }
        }
    }

    /**
     * @return list<array{DOI: string, type: string, url: string}>
     */
    private function fetch(): array
    {
        $mailto = config('journal.crossref_mailto') ?? config('journal.editorial_email');
        $records = [];
        $cursor = '*';

        // Sequential pages with a cursor, as Crossref asks of polite clients.
        do {
            $response = Http::withUserAgent('MPB-site/1.0 ('.config('app.url').'; mailto:'.$mailto.')')
                ->timeout(120)
                ->retry(3, 3000)
                ->get(self::API, [
                    'select' => 'DOI,resource,type',
                    'rows' => 1000,
                    'cursor' => $cursor,
                    'mailto' => $mailto,
                ])
                ->throw();

            $items = $response->json('message.items') ?? [];
            $cursor = (string) $response->json('message.next-cursor');

            foreach ($items as $item) {
                $records[] = self::record($item);
            }
        } while ($items !== [] && $cursor !== '' && count($records) < (int) $response->json('message.total-results'));

        return $records;
    }

    /**
     * @return list<array{DOI: string, type: string, url: string}>
     */
    private function fromFile(string $path): array
    {
        $data = json_decode((string) File::get($path), true);

        if (! is_array($data)) {
            throw new RuntimeException("{$path} is not a JSON list of Crossref records.");
        }

        return array_values(array_map(self::record(...), $data['message']['items'] ?? $data));
    }

    /**
     * @param  array<string, mixed>  $item
     * @return array{DOI: string, type: string, url: string}
     */
    private static function record(array $item): array
    {
        return [
            'DOI' => (string) $item['DOI'],
            'type' => (string) ($item['type'] ?? 'journal-article'),
            'url' => (string) ($item['url'] ?? $item['resource']['primary']['URL'] ?? ''),
        ];
    }

    /** Lower case, without a doubled prefix: the DOI as it should be. */
    public static function normalize(string $doi): string
    {
        $doi = strtolower(trim($doi));

        while (str_starts_with($doi, self::PREFIX.self::PREFIX)) {
            $doi = substr($doi, strlen(self::PREFIX));
        }

        return $doi;
    }

    /** "http://bulletin.mfd.org.mk/volumes/Volume%2071_2/71_2_001.pdf" => "volumes/Volume 71_2/71_2_001.pdf". */
    public static function resourcePath(string $url): ?string
    {
        $url = (string) preg_replace('#^(https?://)+#i', 'http://', trim($url));
        $path = parse_url($url, PHP_URL_PATH);

        return is_string($path) && $path !== '/' ? ltrim(rawurldecode($path), '/') : null;
    }

    /**
     * @param  array{DOI: string, type: string, url: string}  $record
     * @return list<string|null>
     */
    private function row(Article $article, array $record, string $problem): array
    {
        return [$article->issue->slug, $article->number, $article->doi, $article->pdf, $record['DOI'], self::resourcePath($record['url']), $problem];
    }

    /**
     * @param  array{unregistered: list<list<string|null>>, double: list<list<string|null>>, mismatch: list<list<string|null>>}  $reports
     */
    private function writeReports(array $reports): void
    {
        $dir = (string) ($this->option('reports') ?: storage_path('app/reports'));
        File::ensureDirectoryExists($dir);

        $files = [
            'doi-unregistered.csv' => [['issue', 'number', 'doi', 'title', 'pdf', 'article_url'], $reports['unregistered']],
            'doi-double-prefix.csv' => [['issue', 'number', 'doi', 'registered_as'], $reports['double']],
            'doi-mismatch.csv' => [['issue', 'number', 'doi_in_database', 'pdf', 'crossref_doi', 'crossref_target', 'problem'], $reports['mismatch']],
        ];

        foreach ($files as $name => [$header, $rows]) {
            $handle = fopen("{$dir}/{$name}", 'w');

            if ($handle === false) {
                throw new RuntimeException("Cannot write {$dir}/{$name}.");
            }

            foreach ([$header, ...$rows] as $row) {
                fputcsv($handle, $row, escape: '');
            }

            fclose($handle);
            $this->line(sprintf('  %-24s %4d rows  %s/%s', $name, count($rows), $dir, $name));
        }
    }

    /** HEAD requests to doi.org for a random sample of registered DOIs; each must redirect. */
    private function checkResolution(int $sample): int
    {
        $failed = 0;

        $articles = Article::query()->where('doi_registered', true)->inRandomOrder()->limit($sample)->get();

        foreach ($articles as $article) {
            $url = $article->doiUrl();
            $status = Http::withOptions(['allow_redirects' => false])->timeout(30)->head((string) $url)->status();
            $ok = $status >= 300 && $status < 400;
            $failed += $ok ? 0 : 1;

            $this->line(sprintf('  %s %d %s', $ok ? 'ok  ' : 'FAIL', $status, $url));
        }

        $this->info(($sample - $failed)." of {$sample} sampled DOIs redirect from doi.org.");

        return $failed === 0 ? self::SUCCESS : self::FAILURE;
    }

    private function count(string $key): void
    {
        $this->counts[$key] = ($this->counts[$key] ?? 0) + 1;
    }
}
