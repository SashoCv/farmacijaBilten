<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One deposit of DOIs at Crossref and its result.
 *
 * @property int $id
 * @property string $batch_id
 * @property int|null $issue_id
 * @property int|null $user_id
 * @property list<string> $dois
 * @property string $status queued | sent | succeeded | partly | failed
 * @property string $trigger button | publish
 * @property bool $test
 * @property string|null $message
 * @property CarbonInterface|null $sent_at
 * @property CarbonInterface|null $checked_at
 * @property CarbonInterface|null $created_at
 */
class CrossrefDeposit extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'dois' => 'array',
            'test' => 'boolean',
            'sent_at' => 'datetime',
            'checked_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<Issue, $this> */
    public function issue(): BelongsTo
    {
        return $this->belongsTo(Issue::class);
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
