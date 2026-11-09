<?php

namespace App\Policies;

use App\Enums\AssignmentStatus;
use App\Enums\Role;
use App\Models\ReviewAssignment;
use App\Models\User;

/**
 * A reviewer sees their own invitations and reviews; the editorial office
 * sees all of them.
 */
class ReviewAssignmentPolicy
{
    public function view(User $user, ReviewAssignment $assignment): bool
    {
        return $user->isActive() && (
            $assignment->reviewer_id === $user->id
            || ($assignment->status === AssignmentStatus::Invited && $assignment->email === mb_strtolower($user->email))
            || $user->hasRole(Role::Admin)
        );
    }

    public function respond(User $user, ReviewAssignment $assignment): bool
    {
        return $user->isActive()
            && $assignment->status === AssignmentStatus::Invited
            && ($assignment->email === mb_strtolower($user->email) || $assignment->reviewer_id === $user->id);
    }

    public function review(User $user, ReviewAssignment $assignment): bool
    {
        return $user->isActive()
            && $assignment->reviewer_id === $user->id
            && $assignment->status === AssignmentStatus::Accepted;
    }
}
