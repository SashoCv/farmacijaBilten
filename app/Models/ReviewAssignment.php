<?php

namespace App\Models;

use App\Enums\AssignmentStatus;
use App\Enums\Recommendation;
use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One reviewer for one round of a manuscript: the invitation, the answer and
 * the review. Changed only through App\Manuscripts\ReviewWorkflow.
 *
 * @property int $id
 * @property string $public_id
 * @property int $manuscript_id
 * @property int $round
 * @property int $number
 * @property int|null $reviewer_id
 * @property string $email
 * @property string|null $name
 * @property AssignmentStatus $status
 * @property string|null $token_hash
 * @property string|null $message
 * @property int|null $invited_by
 * @property Carbon|null $invited_at
 * @property Carbon|null $responded_at
 * @property Carbon|null $response_due_at
 * @property Carbon|null $review_due_at
 * @property Carbon|null $submitted_at
 * @property Carbon|null $last_reminded_at
 * @property string|null $decline_reason
 * @property string|null $competing_interests
 * @property Recommendation|null $recommendation
 * @property string|null $comments_to_author
 * @property string|null $comments_to_editor
 * @property-read Manuscript $manuscript
 * @property-read User|null $reviewer
 */
class ReviewAssignment extends Model
{
    use HasUlids;

    protected $guarded = ['id', 'status'];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return [
            'status' => AssignmentStatus::class,
            'recommendation' => Recommendation::class,
            'invited_at' => 'datetime',
            'responded_at' => 'datetime',
            'response_due_at' => 'datetime',
            'review_due_at' => 'datetime',
            'submitted_at' => 'datetime',
            'last_reminded_at' => 'datetime',
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

    /** @return BelongsTo<Manuscript, $this> */
    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /** @return HasMany<ReviewFile, $this> */
    public function files(): HasMany
    {
        return $this->hasMany(ReviewFile::class);
    }

    public function displayName(): string
    {
        return $this->reviewer->name ?? $this->name ?? $this->email;
    }
}
