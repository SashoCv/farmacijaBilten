<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * A frozen copy of the manuscript, made at each submission. Immutable (a
 * database trigger enforces it too), so the history of what the editors and
 * reviewers saw can always be compared.
 *
 * @property int $id
 * @property int $manuscript_id
 * @property int $number
 * @property int $round
 * @property string $kind
 * @property array<string, mixed> $content
 * @property string $content_hash
 * @property int|null $created_by
 * @property Carbon|null $created_at
 */
class ManuscriptVersion extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['content' => 'array'];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Manuscript versions are immutable.'));
    }

    /** @return BelongsTo<Manuscript, $this> */
    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }
}
