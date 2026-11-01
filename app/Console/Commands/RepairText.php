<?php

namespace App\Console\Commands;

use App\Journal\Import\IssueMap;
use App\Journal\Import\PdfMetadataExtractor;
use App\Journal\Import\TextRepair;
use App\Models\Article;
use App\Models\Issue;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Throwable;

/**
 * Repairs imported text in place:
 *
 *  - English abstracts that a legacy font turned into Cyrillic letters
 *    ("Тхе интродуцтион оф …") are mapped back to Latin;
 *  - YUSCII codes in old Latin-script affiliations ("Pri{tina" => "Priština");
 *  - Cyrillic look-alike letters inside Latin words;
 *  - "Primen … prifaten …" / "Received … accepted …" moved out of the
 *    affiliations into the history line, with received/accepted dates;
 *  - article types normalised (Review => Review paper) and missing ones read
 *    from the PDFs;
 *  - title, abstract and keyword languages recorded;
 *  - congress titles and place/dates of the supplements.
 *
 * Idempotent: a second run changes nothing.
 */
class RepairText extends Command
{
    protected $signature = 'journal:repair-text
        {--dry-run : Report what would change without saving}
        {--no-pdf : Do not read PDFs for missing article types}';

    protected $description = 'Repair encodings, history lines, types and languages of imported articles';

    /** @var array<string, int> */
    private array $counts = [];

    /** @var list<string> */
    private array $notes = [];

    public function handle(PdfMetadataExtractor $extractor): int
    {
        $dry = (bool) $this->option('dry-run');

        Article::query()->with('issue:id,slug')->chunkById(200, function ($articles) use ($extractor, $dry) {
            foreach ($articles as $article) {
                $this->repair($article, $extractor);

                if ($article->isDirty()) {
                    $this->count('articles changed');

                    if (! $dry) {
                        $article->save();
                    }
                }
            }
        });

        foreach (IssueMap::DETAILS as $slug => $details) {
            $issue = Issue::where('slug', $slug)->first();

            if ($issue === null) {
                continue;
            }

            $issue->fill($details);

            if ($issue->isDirty()) {
                $this->count('issue congress titles set');

                if (! $dry) {
                    $issue->save();
                }
            }
        }

        $this->table(['repair', 'count'], collect($this->counts)->map(fn ($n, $k) => [$k, $n])->values()->all());

        foreach ($this->notes as $note) {
            $this->line('  '.$note);
        }

        if ($dry) {
            $this->warn('Dry run: nothing was saved.');
        }

        return self::SUCCESS;
    }

    private function repair(Article $article, PdfMetadataExtractor $extractor): void
    {
        $ref = "{$article->issue->slug}/{$article->number}";

        // (a) English typed through a Latin-to-Cyrillic font.
        if ($article->abstract && TextRepair::isTransliteratedEnglish($article->abstract)) {
            $article->abstract = TextRepair::cyrillicToLatinKeys($article->abstract);
            $article->keywords = array_map(TextRepair::cyrillicToLatinKeys(...), $article->keywords ?? []);
            $this->count('abstracts mapped back from Cyrillic letters');
            $this->notes[] = "{$ref} (#{$article->id}): abstract and keywords mapped back to Latin";
        }

        // (b, d) YUSCII and history tails in affiliations; drop the title/author line caught as one.
        if ($article->affiliations) {
            $affiliations = [];
            $tail = null;
            $titleStart = mb_strtolower(mb_substr($article->title, 0, 30));

            foreach ($article->affiliations as $affiliation) {
                $fixed = TextRepair::homoglyphs(TextRepair::yuscii($affiliation));
                [$fixed, $history] = TextRepair::splitHistoryTail($fixed);
                $tail ??= $history;

                // Author names caught with the affiliations ("Aneta Dimitrovska 1 Farmacevtski …").
                $fixed = self::withoutAuthorNames($fixed, $article->authors);

                if ($fixed === '' || ($titleStart !== '' && str_starts_with(mb_strtolower($fixed), $titleStart))) {
                    continue;
                }

                $affiliations[] = $fixed;
            }

            if ($affiliations !== $article->affiliations) {
                $article->affiliations = $affiliations === [] ? null : $affiliations;
                $this->count('affiliations repaired');
            }

            if ($tail !== null && TextRepair::history($article->history) === null) {
                $article->history = $tail;
                $this->count('history moved out of affiliations');
            }
        }

        $this->repairHistory($article);

        // (c) Look-alike letters, typing habits, page furniture.
        $article->title = TextRepair::typography(TextRepair::homoglyphs($article->title));
        $article->authors = array_map(TextRepair::homoglyphs(...), $article->authors);

        if ($article->abstract) {
            $abstract = TextRepair::cleanAbstract(TextRepair::homoglyphs($article->abstract));
            $article->abstract = TextRepair::lang($abstract) === 'en' ? TextRepair::typography($abstract) : $abstract;
        }

        if ($article->keywords) {
            $article->keywords = array_map(fn (string $k) => TextRepair::typography(TextRepair::homoglyphs($k)), $article->keywords);
        }

        foreach (['title', 'abstract', 'keywords', 'authors'] as $field) {
            if ($article->isDirty($field)) {
                $this->count("{$field} text repaired");
            }
        }

        $this->repairTitleHtml($article);
        $this->repairType($article, $extractor, $ref);

        // (f) Languages, from the share of Cyrillic letters.
        $article->title_lang = TextRepair::lang($article->title);
        $article->abstract_lang = $article->abstract ? TextRepair::lang($article->abstract) : null;
        $article->keywords_lang = $article->keywords ? TextRepair::lang(implode(' ', $article->keywords)) : null;

        if ($article->isDirty(['title_lang', 'abstract_lang', 'keywords_lang'])) {
            $this->count('languages recorded');
        }
    }

    /** Canonical "Received: April 2006; Accepted: June 2006" plus the dates; drops body text caught as history. */
    private function repairHistory(Article $article): void
    {
        $history = TextRepair::history($article->history);

        if ($history === null) {
            if ($article->history !== null) {
                $article->history = null;
                $this->count('non-history text removed from history');
            }

            $article->received_at = null;
            $article->accepted_at = null;

            return;
        }

        $article->history = $history['text'];
        $article->received_at = $history['received'] ? Carbon::parse($history['received']['date']) : null;
        $article->accepted_at = $history['accepted'] ? Carbon::parse($history['accepted']['date']) : null;

        if ($article->isDirty('history')) {
            $this->count('history lines normalised');
        }

        if ($article->isDirty(['received_at', 'accepted_at'])) {
            $this->count('received/accepted dates set');
        }
    }

    /** Rich title kept only while it spells the plain title; isotope labels as superscripts. */
    private function repairTitleHtml(Article $article): void
    {
        $spell = fn (string $s) => (string) preg_replace('/[^\p{L}]+/u', '', $s);
        $html = $article->title_html;

        if ($html !== null && $spell(TextRepair::plainTitle($html)) !== $spell($article->title)) {
            $html = null;
        }

        $html = $html !== null
            ? TextRepair::richTitle(TextRepair::typography(TextRepair::homoglyphs($html)))
            : TextRepair::richTitle(e($article->title));

        $article->title_html = $html;

        // "[ 18 F]NaF" reads "[18F]NaF" in the plain title too.
        if ($html !== null) {
            $article->title = TextRepair::plainTitle($html);
        }

        if ($article->isDirty('title_html')) {
            $this->count('rich titles set');
        }
    }

    /** (e) The journal's type names; types missing in the database are read from the PDF. */
    private function repairType(Article $article, PdfMetadataExtractor $extractor, string $ref): void
    {
        if ($article->type !== null) {
            $type = TextRepair::normalizeType($article->type);

            if ($type === null) {
                $this->notes[] = "{$ref}: unknown type \"{$article->type}\" left as is";
            } elseif ($type !== $article->type) {
                $article->type = $type;
                $this->count('types normalised');
            }

            return;
        }

        $disk = Storage::disk('journal');

        if ($this->option('no-pdf') || ! $article->pdf || ! $disk->exists($article->pdf)) {
            return;
        }

        try {
            $type = $extractor->extract($disk->path($article->pdf))['type'];
        } catch (Throwable $e) {
            $this->notes[] = "{$ref}: could not read the PDF ({$e->getMessage()})";

            return;
        }

        if ($type !== null) {
            $article->type = $type;
            $this->count('types read from PDFs');
        } else {
            $this->notes[] = "{$ref}: no article type found in the PDF";
        }
    }

    /**
     * Removes author names from an affiliation entry: a whole entry that only
     * lists authors, or one author's name (with its mark) in front.
     *
     * @param  list<string>  $authors
     */
    private static function withoutAuthorNames(string $affiliation, array $authors): string
    {
        $fold = fn (string $s) => mb_strtolower(trim((string) preg_replace(
            ['/\p{Mn}/u', '/[\d*¹²³⁴⁵⁶⁷⁸⁹\s]+/u'],
            ['', ' '],
            (string) \Normalizer::normalize($s, \Normalizer::FORM_D),
        )));
        $names = array_map($fold, $authors);
        $parts = preg_split('/\s*,\s*/u', $affiliation) ?: [];

        if ($names !== [] && array_diff(array_map($fold, $parts), $names) === []) {
            return '';
        }

        foreach ($authors as $author) {
            if (preg_match('/^'.preg_quote($author, '/').'\s*[\d*¹²³⁴⁵⁶⁷⁸⁹]+\s+(?=\p{Lu})/u', $affiliation, $m)) {
                return mb_substr($affiliation, mb_strlen($m[0]));
            }
        }

        return $affiliation;
    }

    private function count(string $key): void
    {
        $this->counts[$key] = ($this->counts[$key] ?? 0) + 1;
    }
}
