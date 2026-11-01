<?php

namespace App\Console\Commands;

use App\Journal\Import\PdfMetadataExtractor;
use App\Models\Article;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Fills abstract, keywords, DOI, pages, article type, affiliations and the
 * Received/Accepted line from each article's PDF.
 *
 * Only empty fields are filled, so corrections made by editors survive a
 * re-run; pass --force to overwrite with what the PDF says.
 */
class ExtractArticleMetadata extends Command
{
    protected $signature = 'journal:extract-metadata
        {--force : Overwrite fields that already have a value}
        {--issue= : Only this issue slug}
        {--all : Re-read PDFs already processed}';

    protected $description = 'Read abstracts, keywords, DOI and pages from the article PDFs';

    private const FIELDS = ['pages', 'doi', 'type', 'abstract', 'keywords', 'affiliations', 'history'];

    public function handle(PdfMetadataExtractor $extractor): int
    {
        $disk = Storage::disk('journal');

        $query = Article::query()
            ->whereNotNull('pdf')
            ->when($this->option('issue'), fn ($q, $slug) => $q->whereHas('issue', fn ($i) => $i->where('slug', $slug)))
            ->when(! $this->option('all') && ! $this->option('force'), fn ($q) => $q->whereNull('extracted_at'));

        $total = $query->count();

        if ($total === 0) {
            $this->info('Nothing to extract.');

            return self::SUCCESS;
        }

        $found = array_fill_keys(self::FIELDS, 0);
        $failed = [];
        $authorChanges = [];
        $bar = $this->output->createProgressBar($total);

        $query->with('issue')->chunkById(100, function ($articles) use ($extractor, $disk, &$found, &$failed, &$authorChanges, $bar) {
            foreach ($articles as $article) {
                $bar->advance();

                if (! $disk->exists($article->pdf)) {
                    $failed[] = "{$article->issue->slug}/{$article->number}: PDF not downloaded";

                    continue;
                }

                try {
                    $data = $extractor->extract($disk->path($article->pdf), $article->title);
                } catch (Throwable $e) {
                    $failed[] = "{$article->issue->slug}/{$article->number}: {$e->getMessage()}";

                    continue;
                }

                foreach (self::FIELDS as $field) {
                    $value = $data[$field];
                    $empty = $value === null || $value === [];

                    if (! $empty) {
                        $found[$field]++;
                    }

                    $current = $article->getAttribute($field);
                    $hasValue = $current !== null && $current !== [] && $current !== '';

                    if (! $empty && ($this->option('force') || ! $hasValue)) {
                        $article->setAttribute($field, $value);
                    }
                }

                if ($change = $this->preferPdfAuthors($article, $data['authors'])) {
                    $authorChanges[] = $change;
                }

                $article->extracted_at = now();
                $article->save();
            }
        });

        $bar->finish();
        $this->newLine(2);

        $this->table(
            ['field', 'found', 'coverage'],
            array_map(fn ($field) => [$field, $found[$field], round($found[$field] / $total * 100).'%'], self::FIELDS),
        );

        if ($authorChanges !== []) {
            $this->info(count($authorChanges).' author lists corrected from the PDFs (names added or removed):');

            foreach ($authorChanges as $line) {
                $this->line('  '.$line);
            }
        }

        foreach ($failed as $line) {
            $this->warn($line);
        }

        return self::SUCCESS;
    }

    /**
     * Uses the author list printed in the PDF when it parsed cleanly and is
     * recognisably the same paper's list. The old site's listings miss or add
     * names in places; the PDF also keeps diacritics.
     *
     * @param  list<string>  $pdfAuthors
     * @return string|null A line describing a change in who is listed.
     */
    private function preferPdfAuthors(Article $article, array $pdfAuthors): ?string
    {
        if ($article->authors_source === 'editor' || ! PdfMetadataExtractor::looksLikeNames($pdfAuthors)) {
            return null;
        }

        $web = self::surnames($article->authors);
        $pdf = self::surnames($pdfAuthors);

        if ($web !== [] && count(array_intersect($web, $pdf)) < count($web) / 2) {
            return null;
        }

        $before = $article->authors;
        $article->authors = $pdfAuthors;
        $article->authors_source = 'pdf';

        $added = array_diff($pdf, $web);
        $removed = array_diff($web, $pdf);

        if ($added === [] && $removed === []) {
            return null;
        }

        return "{$article->issue->slug}/{$article->number}: ".implode(', ', $before).'  =>  '.implode(', ', $pdfAuthors);
    }

    /**
     * Last names, without accents or case, for comparing two lists.
     *
     * @param  list<string>  $names
     * @return list<string>
     */
    private static function surnames(array $names): array
    {
        return array_values(array_unique(array_map(function (string $name) {
            $words = preg_split('/\s+/u', trim($name)) ?: [''];
            $last = (string) \Normalizer::normalize((string) end($words), \Normalizer::FORM_D);

            return mb_strtolower((string) preg_replace('/[^\p{L}]|\p{Mn}/u', '', $last));
        }, $names)));
    }
}
