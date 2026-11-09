<?php

namespace App\Models;

use App\Enums\ManuscriptStatus;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Support\Carbon;

/**
 * A paper written in the manuscript system. The status only changes through
 * App\Manuscripts\ManuscriptWorkflow, which also records the history.
 *
 * @property int $id
 * @property string $public_id
 * @property string|null $reference
 * @property string|null $doi
 * @property int|null $volume
 * @property string|null $issue
 * @property int|null $first_page
 * @property int|null $last_page
 * @property int|null $publication_year
 * @property int|null $issue_id
 * @property int|null $issue_position
 * @property int|null $article_id
 * @property Carbon|null $published_at
 * @property-read Issue|null $journalIssue
 * @property-read Article|null $article
 * @property int $submitter_id
 * @property string $type
 * @property string $language
 * @property string $title Plain-text title, kept in step with the draft for lists.
 * @property ManuscriptStatus $status
 * @property int $current_round
 * @property array<string, mixed>|null $submission_data
 * @property Carbon|null $received_at
 * @property Carbon|null $submitted_at
 * @property Carbon|null $revision_due_at
 * @property Carbon|null $accepted_at
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read User $submitter
 * @property-read ManuscriptDraft|null $draft
 */
class Manuscript extends Model
{
    use HasUlids;

    protected $guarded = ['id', 'status'];

    protected function casts(): array
    {
        return [
            'status' => ManuscriptStatus::class,
            'submission_data' => 'array',
            'received_at' => 'datetime',
            'submitted_at' => 'datetime',
            'revision_due_at' => 'datetime',
            'accepted_at' => 'datetime',
            'published_at' => 'datetime',
        ];
    }

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<User, $this> */
    public function submitter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitter_id');
    }

    /** @return HasOne<ManuscriptDraft, $this> */
    public function draft(): HasOne
    {
        return $this->hasOne(ManuscriptDraft::class);
    }

    /** @return HasMany<ManuscriptVersion, $this> */
    public function versions(): HasMany
    {
        return $this->hasMany(ManuscriptVersion::class);
    }

    /** @return HasMany<ManuscriptEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(ManuscriptEvent::class);
    }

    /**
     * The issue it is placed in. (Not `issue()`: the `issue` column holds the
     * printed issue number, e.g. "2".)
     *
     * @return BelongsTo<Issue, $this>
     */
    public function journalIssue(): BelongsTo
    {
        return $this->belongsTo(Issue::class, 'issue_id');
    }

    /** @return BelongsTo<Article, $this> */
    public function article(): BelongsTo
    {
        return $this->belongsTo(Article::class);
    }

    /** @return HasMany<ReviewAssignment, $this> */
    public function assignments(): HasMany
    {
        return $this->hasMany(ReviewAssignment::class);
    }

    /** @return HasMany<ManuscriptDecision, $this> */
    public function decisions(): HasMany
    {
        return $this->hasMany(ManuscriptDecision::class);
    }

    /** @return HasMany<ManuscriptNote, $this> */
    public function notes(): HasMany
    {
        return $this->hasMany(ManuscriptNote::class);
    }

    /** @return HasMany<ManuscriptImage, $this> */
    public function images(): HasMany
    {
        return $this->hasMany(ManuscriptImage::class);
    }

    public function latestVersion(): ?ManuscriptVersion
    {
        return $this->versions()->orderByDesc('number')->first();
    }

    /** "71 (2) 3 – 11 (2025)", or as much of it as is known; null before any is set. */
    public function citationLine(): ?string
    {
        if ($this->volume === null) {
            return null;
        }

        $line = (string) $this->volume;

        if ($this->issue !== null && $this->issue !== '') {
            $line .= " ({$this->issue})";
        }

        if ($this->first_page !== null) {
            $line .= ' '.$this->first_page.($this->last_page !== null && $this->last_page !== $this->first_page ? ' – '.$this->last_page : '');
        }

        if ($this->publication_year !== null) {
            $line .= " ({$this->publication_year})";
        }

        return $line;
    }

    /**
     * The journal's DOI for this article, from config('journal.doi_pattern'):
     * 10.33320/maced.pharm.bull.2025.71.02.001. Null until volume, issue and year are set.
     */
    public function suggestedDoi(int $number): ?string
    {
        if ($this->volume === null || $this->publication_year === null || $this->issue === null || ! ctype_digit($this->issue)) {
            return null;
        }

        return config('journal.doi_prefix').'/'.strtr((string) config('journal.doi_pattern'), [
            '{year}' => (string) $this->publication_year,
            '{volume}' => (string) $this->volume,
            '{issue}' => str_pad($this->issue, 2, '0', STR_PAD_LEFT),
            '{number}' => str_pad((string) $number, 3, '0', STR_PAD_LEFT),
        ]);
    }

    /** English label of the article type (config/manuscript.php). */
    public function typeLabel(?string $locale = null): string
    {
        $labels = (array) config("manuscript.types.{$this->type}.label", []);
        $locale ??= app()->getLocale();

        return (string) ($labels[$locale] ?? $labels['en'] ?? $this->type);
    }
}
