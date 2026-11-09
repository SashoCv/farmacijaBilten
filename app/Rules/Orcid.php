<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * An ORCID iD (0000-0002-1825-0097): four groups of four, the last character a
 * digit or X, with a valid ISO 7064 11,2 check digit.
 */
class Orcid implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) || ! self::isValid($value)) {
            $fail(__('Enter an ORCID iD such as 0000-0002-1825-0097.'));
        }
    }

    public static function isValid(string $value): bool
    {
        if (! preg_match('/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/', $value)) {
            return false;
        }

        $digits = str_replace('-', '', $value);
        $total = 0;

        for ($i = 0; $i < 15; $i++) {
            $total = ($total + (int) $digits[$i]) * 2;
        }

        $check = (12 - $total % 11) % 11;

        return $digits[15] === ($check === 10 ? 'X' : (string) $check);
    }
}
