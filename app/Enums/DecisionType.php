<?php

namespace App\Enums;

/**
 * What the editorial office decides. `Return` sends the manuscript back to
 * the authors for technical corrections before review (no review round).
 */
enum DecisionType: string
{
    case Accept = 'accept';
    case MinorRevision = 'minor_revision';
    case MajorRevision = 'major_revision';
    case Reject = 'reject';
    case Return = 'return';

    /** @return list<string> */
    public static function values(): array
    {
        return array_map(fn (self $d) => $d->value, self::cases());
    }

    /** English label of the decision, as the author reads it. */
    public function label(): string
    {
        return match ($this) {
            self::Accept => 'Accepted for publication',
            self::MinorRevision => 'Minor revision requested',
            self::MajorRevision => 'Major revision requested',
            self::Reject => 'Rejected',
            self::Return => 'Returned for corrections',
        };
    }

    public function status(): ManuscriptStatus
    {
        return match ($this) {
            self::Accept => ManuscriptStatus::Accepted,
            self::Reject => ManuscriptStatus::Rejected,
            default => ManuscriptStatus::RevisionRequested,
        };
    }
}
