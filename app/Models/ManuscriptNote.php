<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * An internal note of the editorial office on a manuscript.
 *
 * @property int $id
 * @property int $manuscript_id
 * @property int|null $user_id
 * @property string $body
 * @property bool $visible_to_author
 * @property Carbon|null $created_at
 * @property-read User|null $user
 */
class ManuscriptNote extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['visible_to_author' => 'boolean'];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
