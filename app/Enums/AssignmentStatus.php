<?php

namespace App\Enums;

/** A reviewer's invitation and review for one round. */
enum AssignmentStatus: string
{
    case Invited = 'invited';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Submitted = 'submitted';
    case Cancelled = 'cancelled';
    case Expired = 'expired';

    /** Still waiting for the reviewer (an answer or the review). */
    public function isOpen(): bool
    {
        return $this === self::Invited || $this === self::Accepted;
    }
}
