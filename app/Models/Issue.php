<?php

namespace App\Models;

use App\Journal\Journal;
use App\Support\JournalFiles;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property string $slug
 * @property int $volume
 * @property string $kind issue|supplement|volume|abstracts
 * @property int|null $number
 * @property string|null $note
 * @property string|null $full_title Full congress or special-issue title.
 * @property string|null $location_dates "Ohrid, 1–4 October 2026"
 * @property int|null $year
 * @property Carbon|null $online_at
 * @property bool $is_published
 * @property string|null $full_pdf
 * @property int|null $pdf_pages
 * @property int|null $pdf_bytes
 * @property string|null $toc_pdf
 * @property string|null $cover_image Public path of the printed cover.
 * @property string|null $cover_pdf Path on the "journal" disk.
 * @property string|null $doi
 * @property string|null $source_url
 * @property int|null $wp_id
 */
class Issue extends Model
{
    public const KIND_ISSUE = 'issue';

    public const KIND_SUPPLEMENT = 'supplement';

    public const KIND_VOLUME = 'volume';

    public const KIND_ABSTRACTS = 'abstracts';

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'volume' => 'integer',
            'number' => 'integer',
            'year' => 'integer',
            'is_published' => 'boolean',
            'online_at' => 'date',
            'pdf_pages' => 'integer',
            'pdf_bytes' => 'integer',
            'wp_id' => 'integer',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return HasMany<Article, $this> */
    public function articles(): HasMany
    {
        return $this->hasMany(Article::class)->orderBy('position');
    }

    /**
     * Newest first: by volume, then regular issues before supplements, then number.
     *
     * @param  Builder<Issue>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('volume')
            ->orderByRaw("case kind when 'supplement' then 0 when 'issue' then 1 else 2 end")
            ->orderByDesc('number');
    }

    /**
     * Adds articles_count and the first/last article online dates, used by
     * the presenters for "N articles" and "April–June 2025".
     *
     * @param  Builder<Issue>  $query
     */
    public function scopeWithArticleStats(Builder $query): void
    {
        $query->withCount('articles')
            ->withMin('articles', 'online_at')
            ->withMax('articles', 'online_at');
    }

    /** @param  Builder<Issue>  $query */
    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }

    /** "Issue 2", "Supplement 1", "Book of Abstracts", or null for a whole volume. */
    public function part(): ?string
    {
        $part = match ($this->kind) {
            self::KIND_ISSUE => __('Issue :number', ['number' => $this->number]),
            self::KIND_SUPPLEMENT => __('Supplement :number', ['number' => $this->number]),
            self::KIND_ABSTRACTS => __('Book of Abstracts'),
            default => null,
        };

        // __() returns an array only for group keys, which these are not.
        return is_string($part) ? $part : null;
    }

    public function label(): string
    {
        $values = ['volume' => $this->volume, 'number' => $this->number];

        // Whole phrases, so languages can lower-case the part ("Том 71, број 2").
        return match ($this->kind) {
            self::KIND_ISSUE => __('Volume :volume, Issue :number', $values),
            self::KIND_SUPPLEMENT => __('Volume :volume, Supplement :number', $values),
            self::KIND_ABSTRACTS => __('Volume :volume, Book of Abstracts', $values),
            default => __('Volume :volume', $values),
        };
    }

    /**
     * Shape of an issue card or list item (`IssueSummary` in resources/js/types/journal.ts).
     * `currentSlug` defaults to the journal's current issue.
     *
     * @return array<string, mixed>
     */
    public function presentSummary(?int $articleCount = null, ?string $currentSlug = null): array
    {
        $count = $articleCount ?? $this->articles_count ?? null;
        $currentSlug ??= Journal::currentIssueSlug();
        // Present when loaded with withArticleStats() (withMin/withMax('articles', 'online_at')).
        [$first, $last] = [$this->articles_min_online_at ?? null, $this->articles_max_online_at ?? null];

        // Issues released as a whole carry their own date ("Available on-line 03 November 2017").
        if ($first === null && $this->online_at !== null) {
            $first = $last = $this->online_at->toDateString();
        }

        return [
            'slug' => $this->slug,
            'volume' => $this->volume,
            'number' => $this->number,
            'kind' => $this->kind,
            'part' => $this->part(),
            'label' => $this->label(),
            'note' => $this->note,
            'fullTitle' => $this->full_title,
            'locationDates' => $this->location_dates,
            'year' => $this->year,
            'isCurrent' => $currentSlug !== null && $this->slug === $currentSlug,
            'isPublished' => $this->is_published,
            'articleCount' => $count,
            'publishedRange' => self::range($first, $last, 'j F Y', 'j F'),
            'publishedSpan' => self::range($first, $last, 'F Y', 'F'),
            'coverImage' => JournalFiles::url($this->cover_image ? ltrim($this->cover_image, '/') : null),
            'pdf' => JournalFiles::url($this->full_pdf),
            'tocPdf' => JournalFiles::url($this->toc_pdf),
        ];
    }

    /**
     * Shape of the issue page (`IssueDetail` in resources/js/types/journal.ts).
     *
     * @return array<string, mixed>
     */
    public function present(?int $articleCount = null, ?string $currentSlug = null): array
    {
        [$firstPage, $lastPage] = $this->pageRange();

        return [
            ...$this->presentSummary($articleCount, $currentSlug),
            'coverPdf' => JournalFiles::url($this->cover_pdf),
            'doi' => $this->doi,
            'doiUrl' => $this->doi ? 'https://doi.org/'.$this->doi : null,
            'onlineAt' => $this->online_at?->toDateString(),
            'firstPage' => $firstPage,
            'lastPage' => $lastPage,
            'pdfPages' => $this->pdf_pages,
            'pdfBytes' => $this->pdf_bytes,
        ];
    }

    /**
     * First and last printed page, from the articles' page ranges when the
     * articles relation is loaded.
     *
     * @return array{0: int|null, 1: int|null}
     */
    private function pageRange(): array
    {
        if (! $this->relationLoaded('articles')) {
            return [null, null];
        }

        $pages = $this->articles->pluck('pages')->filter()
            ->flatMap(fn (string $p) => preg_match_all('/\d+/', $p, $m) ? array_map('intval', $m[0]) : []);

        return $pages->isEmpty() ? [null, null] : [$pages->min(), $pages->max()];
    }

    /** "30 April – 5 June 2025", collapsing the shared year. */
    private static function range(?string $first, ?string $last, string $full, string $short): ?string
    {
        if (! $first) {
            return null;
        }

        $from = now()->parse($first);
        $to = now()->parse($last ?? $first);

        // translatedFormat follows the app locale ("30 април 2025" in Macedonian).
        if ($from->format($full) === $to->format($full)) {
            return $from->translatedFormat($full);
        }

        $separator = $full === 'F Y' ? '–' : ' – ';

        return $from->year === $to->year
            ? $from->translatedFormat($short).$separator.$to->translatedFormat($full)
            : $from->translatedFormat($full).$separator.$to->translatedFormat($full);
    }
}
