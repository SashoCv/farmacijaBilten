<?php

namespace App\Http\Controllers;

use App\Enums\AssignmentStatus;
use App\Enums\ManuscriptStatus;
use App\Enums\Role;
use App\Manuscripts\EditorialStats;
use App\Models\Manuscript;
use App\Models\ReviewAssignment;
use App\Models\Submission;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The page everyone lands on after signing in: one group of tasks for each
 * role the person holds (editorial office, author, reviewer).
 */
class DashboardController extends Controller
{
    public function __invoke(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        return Inertia::render('dashboard', [
            'roles' => $user->roleNames(),
            'admin' => $user->isAdmin() ? $this->admin() : null,
            'author' => $user->hasRole(Role::Author) ? $this->author($user) : null,
            'reviewer' => $user->hasRole(Role::Reviewer) || ReviewAssignment::where('email', $user->email)->exists() ? $this->reviewer($user) : null,
            'stats' => $user->isAdmin() ? EditorialStats::dashboard() : null,
            'needsSecondFactor' => $user->isAdmin()
                && config('journal.security.admin_requires_2fa')
                && ! $user->hasStrongSignIn(),
        ]);
    }

    /** @return array<string, mixed> */
    private function admin(): array
    {
        $byRole = collect(Role::cases())->mapWithKeys(fn (Role $role) => [
            $role->value => User::withRole($role)->active()->count(),
        ]);

        return [
            'people' => $byRole,
            'unverified' => User::whereNull('email_verified_at')->count(),
            'legacySubmissions' => Submission::count(),
            'legacySubmissionsLastWeek' => Submission::where('created_at', '>=', now()->subWeek())->count(),
            'newManuscripts' => Manuscript::where('status', ManuscriptStatus::Submitted->value)->count(),
            'manuscriptsInProgress' => Manuscript::whereNotIn('status', [
                ManuscriptStatus::Draft->value, ManuscriptStatus::Published->value,
                ManuscriptStatus::Rejected->value, ManuscriptStatus::Withdrawn->value,
            ])->count(),
        ];
    }

    /** @return array<string, int> */
    private function reviewer(User $user): array
    {
        $mine = ReviewAssignment::where(fn ($q) => $q->where('reviewer_id', $user->id)->orWhere('email', $user->email));

        return [
            'invitations' => (clone $mine)->where('status', AssignmentStatus::Invited->value)->count(),
            'inProgress' => (clone $mine)->where('status', AssignmentStatus::Accepted->value)->count(),
            'submitted' => (clone $mine)->where('status', AssignmentStatus::Submitted->value)->count(),
        ];
    }

    /** @return array<string, int> */
    private function author(User $user): array
    {
        $mine = Manuscript::where('submitter_id', $user->id);

        return [
            'drafts' => (clone $mine)->where('status', ManuscriptStatus::Draft->value)->count(),
            'sent' => (clone $mine)->where('status', '!=', ManuscriptStatus::Draft->value)->count(),
            'revisions' => (clone $mine)->where('status', ManuscriptStatus::RevisionRequested->value)->count(),
        ];
    }
}
