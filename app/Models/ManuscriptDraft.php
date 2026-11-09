<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * The author's working copy (ManuscriptContent in resources/js/types/manuscript.ts).
 * `lock_version` guards against two windows overwriting each other.
 *
 * @property int $id
 * @property int $manuscript_id
 * @property array<string, mixed> $content
 * @property int $lock_version
 * @property int|null $updated_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class ManuscriptDraft extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['content' => 'array'];
    }

    /** @return BelongsTo<Manuscript, $this> */
    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }
}
