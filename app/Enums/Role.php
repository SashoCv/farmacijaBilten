<?php

namespace App\Enums;

/**
 * Back-office roles. One person can hold several (a professor is often both
 * an author and a reviewer).
 */
enum Role: string
{
    /** The editorial office. */
    case Admin = 'admin';
    case Author = 'author';
    case Reviewer = 'reviewer';

    /** English label; translated with __() / t(). */
    public function label(): string
    {
        return match ($this) {
            self::Admin => 'Editorial office',
            self::Author => 'Author',
            self::Reviewer => 'Reviewer',
        };
    }

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $role) => $role->value, self::cases());
    }
}
