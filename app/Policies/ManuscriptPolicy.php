<?php

namespace App\Policies;

use App\Enums\AssignmentStatus;
use App\Enums\ManuscriptStatus;
use App\Enums\Role;
use App\Models\Manuscript;
use App\Models\User;

/**
 * Who may see and change a manuscript. The author sees their own; the
 * editorial office sees every manuscript once it has been sent (drafts stay
 * private to the author).
 */
class ManuscriptPolicy
{
    public function view(User $user, Manuscript $manuscript): bool
    {
        return $this->owns($user, $manuscript)
            || ($user->hasRole(Role::Admin) && $manuscript->status !== ManuscriptStatus::Draft)
            || $this->reviews($user, $manuscript);
    }

    /** A reviewer who accepted (or submitted) a review of this manuscript. */
    public function reviews(User $user, Manuscript $manuscript): bool
    {
        return $user->isActive() && $manuscript->assignments()
            ->where('reviewer_id', $user->id)
            ->whereIn('status', [AssignmentStatus::Accepted->value, AssignmentStatus::Submitted->value])
            ->exists();
    }

    /** The authors' own view (not a reviewer's): names, affiliations, letters. */
    public function viewAsAuthorOrEditor(User $user, Manuscript $manuscript): bool
    {
        return $this->owns($user, $manuscript)
            || ($user->hasRole(Role::Admin) && $manuscript->status !== ManuscriptStatus::Draft);
    }

    public function update(User $user, Manuscript $manuscript): bool
    {
        return $this->owns($user, $manuscript) && $manuscript->status->isEditableByAuthor();
    }

    public function submit(User $user, Manuscript $manuscript): bool
    {
        return $this->owns($user, $manuscript) && $manuscript->status->isEditableByAuthor();
    }

    public function delete(User $user, Manuscript $manuscript): bool
    {
        return $this->owns($user, $manuscript)
            && $manuscript->status === ManuscriptStatus::Draft
            && $manuscript->reference === null;
    }

    private function owns(User $user, Manuscript $manuscript): bool
    {
        return $user->isActive() && $user->hasRole(Role::Author) && $manuscript->submitter_id === $user->id;
    }
}
