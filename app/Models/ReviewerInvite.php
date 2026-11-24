<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * Someone the editorial office added to its list of reviewers who has no
 * account yet. The e-mail carries a signed link with a secret (only its hash
 * is stored); following it creates a reviewer account. Pending until then.
 *
 * @property int $id
 * @property string $email
 * @property string $given_name
 * @property string $family_name
 * @property string|null $affiliation
 * @property string|null $expertise
 * @property string|null $message
 * @property string|null $token_hash
 * @property int|null $invited_by
 * @property Carbon $invited_at
 * @property int|null $user_id
 * @property Carbon|null $accepted_at
 */
class ReviewerInvite extends Model
{
    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'invited_at' => 'datetime',
            'accepted_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function inviter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by');
    }

    /** @param  Builder<ReviewerInvite>  $query */
    public function scopePending(Builder $query): void
    {
        $query->whereNull('accepted_at');
    }

    public function name(): string
    {
        return trim("{$this->given_name} {$this->family_name}");
    }

    /** A new secret for the link; returns the plain value (sent by e-mail, never stored). */
    public function newToken(): string
    {
        $plain = Str::random(40);
        $this->token_hash = hash('sha256', $plain);

        return $plain;
    }

    public function tokenMatches(string $plain): bool
    {
        return $this->token_hash !== null && hash_equals($this->token_hash, hash('sha256', $plain));
    }

    /** The person now has an account: the invitation is done. */
    public static function acceptFor(User $user): void
    {
        self::pending()->where('email', mb_strtolower($user->email))
            ->update(['accepted_at' => now(), 'user_id' => $user->id, 'token_hash' => null]);
    }
}
