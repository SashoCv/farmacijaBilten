<?php

namespace App\Models;

use App\Enums\DecisionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * An editorial decision and the letter sent to the author. Final.
 *
 * @property int $id
 * @property int $manuscript_id
 * @property int $round
 * @property DecisionType $type
 * @property string $letter
 * @property int|null $decided_by
 * @property Carbon|null $created_at
 * @property-read User|null $decider
 */
class ManuscriptDecision extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['type' => DecisionType::class];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Decisions are final.'));
    }

    /** @return BelongsTo<Manuscript, $this> */
    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }

    /** @return BelongsTo<User, $this> */
    public function decider(): BelongsTo
    {
        return $this->belongsTo(User::class, 'decided_by');
    }
}
