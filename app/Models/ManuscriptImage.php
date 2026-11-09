<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUlids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * A figure image in a manuscript, on the private `local` disk.
 *
 * @property int $id
 * @property string $public_id
 * @property int $manuscript_id
 * @property string $path
 * @property string $mime
 * @property int $width
 * @property int $height
 * @property int $bytes
 * @property int|null $uploaded_by
 * @property Carbon|null $created_at
 */
class ManuscriptImage extends Model
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

    /** @return BelongsTo<Manuscript, $this> */
    public function manuscript(): BelongsTo
    {
        return $this->belongsTo(Manuscript::class);
    }

    public function url(): string
    {
        return route('manuscripts.image', [$this->manuscript->public_id, $this->public_id]);
    }
}
