<?php

namespace App\Models;

use App\Journal\Import\TextRepair;
use App\Journal\Search\SearchIndex;
use App\Support\JournalFiles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $issue_id
 * @property string $number
 * @property int $position
 * @property string $title
 * @property string|null $title_html Title with i/em/sup/sub markup kept.
 * @property string|null $title_lang "en" | "mk"
 * @property list<string> $authors
 * @property list<string>|null $affiliations
 * @property string|null $type
 * @property string|null $pages "3–11"
 * @property string|null $doi
 * @property bool|null $doi_registered Null until checked against Crossref.
 * @property string|null $doi_resolvable
 * @property string|null $licence
 * @property string|null $abstract
 * @property string|null $abstract_lang
 * @property list<string>|null $keywords
 * @property string|null $keywords_lang
 * @property string|null $references
 * @property string|null $history
 * @property string|null $pdf
 * @property int|null $pdf_pages
 * @property int|null $pdf_bytes
 * @property string|null $pdf_thumb Public path of the first-page thumbnail.
 * @property Carbon|null $online_at
 * @property Carbon|null $received_at
 * @property Carbon|null $accepted_at
 * @property string|null $search_text
 * @property int|null $wp_id
 * @property-read Issue $issue
 */
class Article extends Model
{
    protected $guarded = [];

    protected static function booted(): void
    {
        // Keep the folded search text in step with the fields it is built from.
        static::saving(function (Article $article) {
            if ($article->isDirty(['title', 'authors', 'keywords', 'abstract', 'doi']) || $article->search_text === null) {
                $article->search_text = SearchIndex::document($article);
            }
        });
    }

    protected function casts(): array
    {
        return [
            'authors' => 'array',
            'affiliations' => 'array',
            'keywords' => 'array',
            'extracted_at' => 'datetime',
            'online_at' => 'date',
            'received_at' => 'date',
            'accepted_at' => 'date',
            'position' => 'integer',
            'doi_registered' => 'boolean',
            'pdf_pages' => 'integer',
            'pdf_bytes' => 'integer',
            'wp_id' => 'integer',
        ];
    }

    /**
     * Keep names readable in the JSON column ("Božič", not "Bo\u017ei\u010d") so
     * SQL LIKE search matches them.
     */
    protected function asJson($value, $flags = 0)
    {
        return parent::asJson($value, $flags | JSON_UNESCAPED_UNICODE);
    }

    /**
     * Search words from a query: whitespace-separated, at least 2 characters.
     *
     * @return list<string>
     */
    public static function searchTerms(string $query): array
    {
        $terms = preg_split('/\s+/u', trim($query)) ?: [];
        // Wildcards would need an ESCAPE clause on SQLite; just drop them.
        $terms = array_map(fn (string $t) => str_replace(['%', '_'], '', $t), $terms);

        return array_slice(array_values(array_unique(array_filter($terms, fn (string $t) => mb_strlen($t) >= 2))), 0, 8);
    }

    /**
     * Every term must appear in the title, authors, keywords or abstract, so
     * "Evgenija Mihajloska" also finds "Mihajloska E." in any order.
     *
     * @param  Builder<Article>  $query
     * @param  list<string>  $terms
     */
    public function scopeMatching(Builder $query, array $terms): void
    {
        foreach ($terms as $term) {
            $like = "%{$term}%";
            // JSON columns compare case-sensitively on MySQL/MariaDB (binary
            // collation): both sides lower-cased, as LIKE does on SQLite.
            $lower = '%'.mb_strtolower($term).'%';

            $query->where(fn (Builder $q) => $q
                ->where('articles.title', 'like', $like)
                ->orWhereRaw('lower(articles.authors) like ?', [$lower])
                ->orWhereRaw('lower(articles.keywords) like ?', [$lower])
                ->orWhere('articles.abstract', 'like', $like));
        }
    }

    /**
     * Articles of issues that are still being released online first.
     *
     * @param  Builder<Article>  $query
     */
    public function scopeEarlyOnline(Builder $query): void
    {
        $query->whereHas('issue', fn (Builder $q) => $q->where('is_published', false));
    }

    /** @return BelongsTo<Issue, $this> */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    /**
     * Vancouver-style reference, as used by the journal.
     */
    public function citation(): string
    {
        $issue = $this->issue;

        $ref = match ($issue->kind) {
            Issue::KIND_SUPPLEMENT => "{$issue->volume}(Suppl {$issue->number})",
            Issue::KIND_ISSUE => "{$issue->volume}({$issue->number})",
            default => (string) $issue->volume,
        };

        $authors = implode(', ', array_map(self::citationName(...), $this->authors));
        $title = rtrim($this->title, '. ');
        $pages = $this->pages ?: '[pp–pp]';

        // A DOI known to be unregistered would not resolve, so it is left out.
        $doi = $this->doi && $this->doi_registered !== false ? " doi: {$this->doi}" : '';

        return trim(($authors ? "{$authors}. " : '')."{$title}. Maced. Pharm. Bull. {$issue->year};{$ref}:{$pages}.{$doi}");
    }

    /**
     * Link target at doi.org, or null when there is no DOI or it is known not
     * to be registered. Uses the form that resolves (some DOIs were deposited
     * with a doubled prefix).
     */
    public function doiUrl(): ?string
    {
        if (! $this->doi || $this->doi_registered === false) {
            return null;
        }

        return 'https://doi.org/'.($this->doi_resolvable ?: $this->doi);
    }

    /**
     * Date for citations and metadata: the online date, else the issue year
     * ("2025-04-30" or "2025"), so every article has one.
     */
    public function publicationDate(): ?string
    {
        return $this->online_at?->toDateString()
            ?? ($this->issue->year ? (string) $this->issue->year : null);
    }

    /**
     * Shape of a row in a table of contents or result list
     * (`ArticleSummary` in resources/js/types/journal.ts).
     *
     * @return array<string, mixed>
     */
    public function presentSummary(): array
    {
        return [
            'number' => $this->number,
            'issueSlug' => $this->issue->slug,
            'issueLabel' => $this->issue->label(),
            'title' => $this->title,
            // Rich title (sanitised on import: i/em/sup/sub only); plain title escaped otherwise.
            'titleHtml' => $this->title_html ?: e($this->title),
            'titleLang' => $this->title_lang ?? self::detectLang($this->title),
            'authors' => $this->authors,
            'type' => $this->type,
            'pages' => $this->pages,
            'doi' => $this->doi,
            'doiRegistered' => $this->doi_registered,
            'doiUrl' => $this->doiUrl(),
            'publishedAt' => $this->online_at?->toDateString(),
            'publishedLabel' => $this->online_at?->translatedFormat('j F Y'),
            'publicationDate' => $this->publicationDate(),
            'pdf' => JournalFiles::url($this->pdf),
            'pdfBytes' => $this->pdf_bytes,
            'hasAbstract' => filled($this->abstract),
            'citation' => $this->citation(),
        ];
    }

    /**
     * Shape of the article page (`ArticleDetail` in resources/js/types/journal.ts).
     *
     * @return array<string, mixed>
     */
    public function present(): array
    {
        $keywords = $this->keywords ?? [];

        return [
            ...$this->presentSummary(),
            'affiliations' => $this->affiliations ?? [],
            'history' => $this->history,
            // ISO 8601 at the precision printed on the paper: "2025-02" for "February 2025".
            'receivedAt' => $this->historyDate('received'),
            'acceptedAt' => $this->historyDate('accepted'),
            'onlineAt' => $this->online_at?->toDateString(),
            'pdfPages' => $this->pdf_pages,
            'pdfThumb' => JournalFiles::url($this->pdf_thumb ? ltrim($this->pdf_thumb, '/') : null),
            // Article-specific licence; null means the journal's licence (shared `journal.licence`).
            'licence' => $this->licence,
            'abstract' => $this->abstract,
            'abstractLang' => $this->abstract_lang ?? ($this->abstract ? self::detectLang($this->abstract) : null),
            'keywords' => $keywords,
            'keywordsLang' => $this->keywords_lang ?? ($keywords ? self::detectLang(implode(' ', $keywords)) : null),
            'references' => $this->references,
        ];
    }

    /**
     * Received or accepted date as "YYYY-MM-DD", "YYYY-MM" or "YYYY",
     * following how precisely the history line states it.
     */
    public function historyDate(string $which): ?string
    {
        $date = $which === 'received' ? $this->received_at : $this->accepted_at;

        if ($date === null) {
            return null;
        }

        return match (TextRepair::history($this->history)[$which]['precision'] ?? 'day') {
            'year' => $date->format('Y'),
            'month' => $date->format('Y-m'),
            default => $date->toDateString(),
        };
    }

    /** "mk" when most letters are Cyrillic, else "en". */
    public static function detectLang(string $text): string
    {
        return TextRepair::lang($text);
    }

    /** "Tanja Petreska Ivanovska" => "Petreska Ivanovska T"; "K. Goracinova" => "Goracinova K". */
    private static function citationName(string $name): string
    {
        $parts = preg_split('/\s+/u', trim($name)) ?: [];

        if (count($parts) < 2) {
            return $name;
        }

        $given = array_shift($parts);

        return implode(' ', $parts).' '.mb_substr($given, 0, 1);
    }
}
