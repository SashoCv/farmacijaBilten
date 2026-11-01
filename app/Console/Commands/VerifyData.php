<?php

namespace App\Console\Commands;

use App\Journal\Import\LegacyLinkChecker;
use App\Journal\Import\TextRepair;
use App\Models\Article;
use App\Models\Issue;
use Illuminate\Console\Command;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Support\Facades\Storage;

/**
 * Checks the imported data for problems readers would see. Exits non-zero
 * when an error is found, so it can gate a deploy:
 *
 *  - legacy-font codes (~ { } ^ ` |) left in affiliations or abstracts;
 *  - abstracts still in transliterated "Cyrillic English";
 *  - Cyrillic look-alike letters inside Latin words;
 *  - articles without a type or a publication date;
 *  - history lines that are not "Received …; Accepted …";
 *  - rich titles that do not spell the plain title;
 *  - linked files, covers and thumbnails missing on disk;
 *  - with --links: every old-site link and Crossref resource URL must end
 *    in a 200, directly or through redirects.
 *
 * Coverage figures (covers, DOIs checked) are reported as warnings.
 */
class VerifyData extends Command
{
    protected $signature = 'journal:verify-data
        {--links : Also follow every old-site link and Crossref resource URL through the app}';

    protected $description = 'Check imported journal data for encoding, metadata and link problems';

    /** @var array<string, list<string>> */
    private array $errors = [];

    /** @var list<string> */
    private array $warnings = [];

    public function handle(): int
    {
        $disk = Storage::disk('journal');
        $spell = fn (string $s) => (string) preg_replace('/[^\p{L}]+/u', '', $s);
        $richTitles = 0;

        Article::query()->with('issue')->chunkById(300, function ($articles) use ($disk, $spell, &$richTitles) {
            foreach ($articles as $article) {
                $ref = "{$article->issue->slug}/{$article->number}";

                foreach ($article->affiliations ?? [] as $affiliation) {
                    if (preg_match('/[~{}^`|]/', $affiliation)) {
                        $this->problem('legacy-font codes in affiliations', "{$ref}: {$affiliation}");
                    }
                }

                if ($article->abstract !== null) {
                    if (preg_match('/[~{}^`|]/', $article->abstract, $m)) {
                        $this->problem('legacy-font codes in abstracts', "{$ref}: \"{$m[0]}\"");
                    }

                    if (TextRepair::isTransliteratedEnglish($article->abstract)) {
                        $this->problem('English abstracts in Cyrillic letters', $ref);
                    }
                }

                foreach (['title' => $article->title, 'abstract' => (string) $article->abstract] as $field => $text) {
                    if (preg_match('/\b(?=[\p{L}]*\p{Latin})(?=[\p{L}]*\p{Cyrillic})[\p{L}]+\b/u', $text, $m)) {
                        $this->problem("mixed-script words in {$field}s", "{$ref}: {$m[0]}");
                    }
                }

                if ($article->type === null) {
                    $this->problem('articles without a type', $ref);
                } elseif (TextRepair::normalizeType($article->type) !== $article->type) {
                    $this->problem('article types not in the journal\'s list', "{$ref}: {$article->type}");
                }

                if ($article->publicationDate() === null) {
                    $this->problem('articles without a publication date', $ref);
                }

                if ($article->history !== null && TextRepair::history($article->history) === null) {
                    $this->problem('history lines that are not received/accepted dates', "{$ref}: {$article->history}");
                }

                if ($article->title_html !== null) {
                    $richTitles++;

                    if ($spell(TextRepair::plainTitle($article->title_html)) !== $spell($article->title)) {
                        $this->problem('rich titles that differ from the title', $ref);
                    }
                }

                foreach (['pdf', 'pdf_thumb'] as $field) {
                    if ($article->{$field} !== null && ! $disk->exists($article->{$field})) {
                        $this->problem("missing {$field} files", "{$ref}: {$article->{$field}}");
                    }
                }

                if ($article->doi !== null && $article->doi_registered === null) {
                    $this->warnings[] = "{$ref}: DOI not checked against Crossref (run journal:sync-crossref)";
                }
            }
        });

        foreach (Issue::all() as $issue) {
            foreach (['full_pdf', 'toc_pdf', 'cover_pdf', 'cover_image'] as $field) {
                if ($issue->{$field} !== null && ! $disk->exists($issue->{$field})) {
                    $this->problem("missing issue {$field} files", "{$issue->slug}: {$issue->{$field}}");
                }
            }
        }

        if ($this->option('links')) {
            $this->checkLinks();
        }

        $this->report($richTitles);

        return $this->errors === [] ? self::SUCCESS : self::FAILURE;
    }

    private function checkLinks(): void
    {
        // Pages render without the SSR server; only status codes matter here.
        config(['inertia.ssr.enabled' => false]);

        $checker = new LegacyLinkChecker(app(Kernel::class));
        $fixtures = base_path('tests/fixtures');
        $urls = [
            ...LegacyLinkChecker::linksFrom("{$fixtures}/legacy-links.txt"),
            ...LegacyLinkChecker::crossrefUrls("{$fixtures}/crossref-10.33320.json"),
        ];

        $bar = $this->output->createProgressBar(count($urls));
        $ok = 0;

        foreach ($urls as $url) {
            $result = $checker->check($url);
            $bar->advance();

            if ($result['ok']) {
                $ok++;
            } else {
                $this->problem('old links that do not end in a 200', "{$url} => {$result['status']} via ".implode(' → ', $result['hops']));
            }
        }

        $bar->finish();
        $this->newLine();
        $this->info("{$ok} of ".count($urls).' old links and Crossref resource URLs end in a 200.');
    }

    private function report(int $richTitles): void
    {
        $issues = Issue::count();
        $covers = Issue::whereNotNull('cover_image')->count();
        $articles = Article::count();

        $this->table(['figure', 'value'], [
            ['articles', $articles],
            ['rich titles (i/sup/sub)', $richTitles],
            ['issues with a cover image', "{$covers} of {$issues}"],
            ['articles with a thumbnail', Article::whereNotNull('pdf_thumb')->count()." of {$articles}"],
            ['registered DOIs', Article::where('doi_registered', true)->count()],
            ['unregistered DOIs', Article::where('doi_registered', false)->count()],
            ['articles without a DOI', Article::whereNull('doi')->count()],
        ]);

        if ($covers < $issues) {
            $missing = Issue::whereNull('cover_image')->orderBy('volume')->pluck('slug')->implode(', ');
            $this->warnings[] = "No cover in the PDFs for: {$missing}. Put the covers in storage/app/journal/covers-source/{slug}.pdf|jpg|png and run journal:generate-covers.";
        }

        foreach (array_slice($this->warnings, 0, 20) as $warning) {
            $this->warn($warning);
        }

        if (count($this->warnings) > 20) {
            $this->warn('… and '.(count($this->warnings) - 20).' more warnings.');
        }

        foreach ($this->errors as $kind => $items) {
            $this->error(count($items)." {$kind}:");

            foreach (array_slice($items, 0, 15) as $item) {
                $this->line('  '.$item);
            }
        }

        if ($this->errors === []) {
            $this->info('No data errors found.');
        }
    }

    private function problem(string $kind, string $detail): void
    {
        $this->errors[$kind][] = $detail;
    }
}
