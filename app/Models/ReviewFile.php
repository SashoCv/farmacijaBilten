<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A file a reviewer attaches to a review (an annotated PDF, a table of
 * comments). `visibility`: 'author' (shared with the decision) or 'editor'.
 *
 * @property int $id
 * @property string $public_id
 * @property int $review_assignment_id
 * @property string $path
 * @property string $name
 * @property string $mime
 * @property int $size
 * @property string $visibility
 * @property Carbon|null $created_at
 * @property-read ReviewAssignment $assignment
 */
class ReviewFile extends Model
{
    use HasUlids;

    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    /** @return list<string> */
    public function uniqueIds(): array
    {
        return ['public_id'];
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }

    /** @return BelongsTo<ReviewAssignment, $this> */
    public function assignment(): BelongsTo
    {
        return $this->belongsTo(ReviewAssignment::class, 'review_assignment_id');
    }
}
