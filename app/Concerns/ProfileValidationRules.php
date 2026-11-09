<?php

namespace App\Concerns;

use App\Models\User;
use App\Rules\Orcid;
use App\Support\Countries;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\In;
use Illuminate\Validation\Rules\Unique;

trait ProfileValidationRules
{
    /**
     * Profile settings: the person, the e-mail and the optional details.
     *
     * @return array<string, array<int, Unique|ValidationRule|array<mixed>|string>>
     */
    protected function profileRules(?int $userId = null): array
    {
        return [
            ...$this->personRules(),
            'email' => $this->emailRules($userId),
            'department' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40', 'regex:/^[0-9+()\/.\s-]{6,40}$/'],
            'expertise' => ['nullable', 'string', 'max:500'],
            'locale' => ['required', Rule::in(['en', 'mk'])],
        ];
    }

    /**
     * Who the person is: required at sign-up and in the profile.
     *
     * @return array<string, array<int, ValidationRule|string|In>>
     */
    protected function personRules(): array
    {
        return [
            'given_name' => ['required', 'string', 'max:100'],
            'family_name' => ['required', 'string', 'max:100'],
            'academic_title' => ['nullable', Rule::in(User::ACADEMIC_TITLES)],
            'affiliation' => ['required', 'string', 'max:255'],
            'country_code' => ['required', Rule::in(Countries::CODES)],
            'orcid' => ['nullable', 'string', new Orcid],
        ];
    }

    /**
     * Get the validation rules used to validate user emails.
     *
     * @return array<int, Unique|ValidationRule|array<mixed>|string>
     */
    protected function emailRules(?int $userId = null): array
    {
        return [
            'required',
            'string',
            'email',
            'max:255',
            $userId === null
                ? Rule::unique(User::class)
                : Rule::unique(User::class)->ignore($userId),
        ];
    }
}
