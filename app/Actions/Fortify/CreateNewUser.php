<?php

namespace App\Actions\Fortify;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\Role;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Laravel\Fortify\Contracts\CreatesNewUsers;

/**
 * Public sign-up creates an author account. Reviewers join by invitation from
 * the editorial office, and admins are created with `journal:editor`.
 */
class CreateNewUser implements CreatesNewUsers
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Validate and create a newly registered user.
     *
     * @param  array<string, mixed>  $input
     */
    public function create(array $input): User
    {
        // A filled honeypot is a bot: fail like a validation error, quietly.
        if (filled($input['website'] ?? null)) {
            throw ValidationException::withMessages(['email' => __('We could not create the account. Please try again.')]);
        }

        if (is_string($input['email'] ?? null)) {
            $input['email'] = mb_strtolower(trim($input['email']));
        }

        $data = Validator::make($input, [
            ...$this->personRules(),
            'email' => $this->emailRules(),
            'password' => $this->passwordRules(),
            'privacy' => ['accepted'],
        ])->validate();

        return DB::transaction(function () use ($data) {
            $user = User::create([
                ...collect($data)->only([
                    'given_name', 'family_name', 'academic_title', 'email', 'password',
                    'affiliation', 'country_code', 'orcid',
                ])->all(),
                'locale' => app()->getLocale(),
            ]);

            $user->forceFill(['privacy_accepted_at' => now()])->save();
            $user->recordEvent('registered');
            $user->grantRole(Role::Author);

            return $user;
        });
    }
}
