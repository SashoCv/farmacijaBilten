<?php

namespace App\Models;

use App\Enums\ManuscriptStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * The history of a manuscript: every status change and editorial action,
 * append-only. Payloads hold ids and short codes, never personal data.
 *
 * @property int $id
 * @property int $manuscript_id
 * @property int|null $actor_id
 * @property string $type
 * @property ManuscriptStatus|null $from_status
 * @property ManuscriptStatus|null $to_status
 * @property array<string, mixed>|null $payload
 * @property Carbon|null $created_at
 * @property-read User|null $actor
 */
class ManuscriptEvent extends Model
{
    public const UPDATED_AT = null;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'from_status' => ManuscriptStatus::class,
            'to_status' => ManuscriptStatus::class,
            'payload' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(fn () => throw new LogicException('Manuscript events are append-only.'));
    }

    /** @return BelongsTo<Manuscript, $this> */
    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }
}
