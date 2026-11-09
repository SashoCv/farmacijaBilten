<?php

namespace App\Models;

use App\Enums\Role;
use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Translation\HasLocalePreference;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;

/**
 * @property int $id
 * @property string $name Display name, kept as "given family".
 * @property string|null $given_name
 * @property string|null $family_name
 * @property string|null $academic_title
 * @property string $email
 * @property string|null $affiliation
 * @property string|null $department
 * @property string|null $city
 * @property string|null $country_code
 * @property string|null $phone
 * @property string|null $orcid
 * @property string|null $expertise
 * @property string $locale
 * @property Carbon|null $email_verified_at
 * @property Carbon|null $privacy_accepted_at
 * @property Carbon|null $deactivated_at
 * @property string $password
 * @property string|null $two_factor_secret
 * @property string|null $two_factor_recovery_codes
 * @property Carbon|null $two_factor_confirmed_at
 * @property string|null $remember_token
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, UserRole> $roles
 */
#[Fillable([
    'name', 'given_name', 'family_name', 'academic_title', 'email', 'password',
    'affiliation', 'department', 'city', 'country_code', 'phone', 'orcid', 'expertise', 'locale',
])]
#[Hidden(['password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token', 'phone'])]
class User extends Authenticatable implements HasLocalePreference, MustVerifyEmail, PasskeyUser
{
    /** Academic titles offered in the forms (printed before the name). */
    public const ACADEMIC_TITLES = ['Prof.', 'Assoc. Prof.', 'Asst. Prof.', 'Dr', 'MSc', 'MPharm', 'BPharm'];

    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'privacy_accepted_at' => 'datetime',
            'deactivated_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (User $user) {
            $user->email = mb_strtolower(trim($user->email));

            $full = trim(($user->given_name ?? '').' '.($user->family_name ?? ''));

            if ($full !== '') {
                $user->name = $full;
            }
        });
    }

    /** @return HasMany<UserRole, $this> */
    public function roles(): HasMany
    {
        return $this->hasMany(UserRole::class);
    }

    /** @return HasMany<UserEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(UserEvent::class);
    }

    public function hasRole(Role $role): bool
    {
        return $this->roles->contains(fn (UserRole $r) => $r->role === $role);
    }

    public function isAdmin(): bool
    {
        return $this->hasRole(Role::Admin);
    }

    /** @return list<string> Role values, in the enum's order. */
    public function roleNames(): array
    {
        return array_values(array_filter(
            Role::values(),
            fn (string $value) => $this->roles->contains(fn (UserRole $r) => $r->role->value === $value),
        ));
    }

    /** Idempotent: granting a role the user already has records nothing. */
    public function grantRole(Role $role, ?User $by = null): void
    {
        DB::transaction(function () use ($role, $by) {
            $created = $this->roles()->firstOrCreate(['role' => $role], ['granted_by' => $by?->id])->wasRecentlyCreated;

            if ($created) {
                $this->recordEvent('role_granted', $by, ['role' => $role->value]);
            }
        });

        $this->unsetRelation('roles');
    }

    public function revokeRole(Role $role, ?User $by = null): void
    {
        DB::transaction(function () use ($role, $by) {
            if ($this->roles()->where('role', $role)->delete() > 0) {
                $this->recordEvent('role_revoked', $by, ['role' => $role->value]);
            }
        });

        $this->unsetRelation('roles');
    }

    /** @param  array<string, mixed>  $payload */
    public function recordEvent(string $type, ?User $actor = null, array $payload = []): UserEvent
    {
        return $this->events()->create([
            'actor_id' => $actor?->id,
            'type' => $type,
            'payload' => $payload ?: null,
        ]);
    }

    public function isActive(): bool
    {
        return $this->deactivated_at === null;
    }

    public function hasStrongSignIn(): bool
    {
        return $this->two_factor_confirmed_at !== null;
    }

    /**
     * @param  Builder<User>  $query
     */
    public function scopeWithRole(Builder $query, Role $role): void
    {
        $query->whereHas('roles', fn (Builder $q) => $q->where('role', $role));
    }

    /**
     * @param  Builder<User>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->whereNull('deactivated_at');
    }

    /** Queued mail is sent in the language the person uses the site in. */
    public function preferredLocale(): string
    {
        return in_array($this->locale, ['en', 'mk'], true) ? $this->locale : 'en';
    }

    /**
     * The signed-in user as the frontend sees it (`User` in resources/js/types/auth.ts).
     *
     * @return array<string, mixed>
     */
    public function presentForAuth(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'roles' => $this->roleNames(),
            'locale' => $this->preferredLocale(),
            'two_factor_enabled' => $this->two_factor_confirmed_at !== null,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
