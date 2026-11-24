<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Manuscripts\EditorialStats;
use App\Models\ReviewerInvite;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every reviewer (everyone ever invited, and everyone with the reviewer
 * role): invitations, answers, reviews, what is open and what is overdue;
 * and the people invited to the list who have no account yet.
 */
class ReviewerAdminController extends Controller
{
    public function __invoke(): Response
    {
        $reviewers = EditorialStats::reviewers();
        $known = array_column($reviewers, 'email');

        foreach (User::withRole(Role::Reviewer)->get() as $user) {
            if (! in_array($user->email, $known, true)) {
                $reviewers[] = [
                    'email' => $user->email,
                    'name' => $user->name,
                    'userId' => $user->id,
                    'affiliation' => $user->affiliation,
                    'expertise' => $user->expertise,
                    'hasAccount' => true,
                    'counts' => ['invited' => 0, 'accepted' => 0, 'declined' => 0, 'submitted' => 0, 'expired' => 0],
                    'averageDays' => null,
                    'lastActivity' => null,
                    'assignments' => [],
                ];
            }
        }

        usort($reviewers, fn (array $a, array $b) => strcoll(mb_strtolower($a['name']), mb_strtolower($b['name'])));

        $accounts = User::pluck('email')->map(fn (string $e) => mb_strtolower($e))->all();

        // Invited to the list, no account yet.
        $invites = ReviewerInvite::pending()->with('inviter')->orderBy('family_name')->orderBy('given_name')->get()
            ->reject(fn (ReviewerInvite $i) => in_array($i->email, $accounts, true))
            ->map(fn (ReviewerInvite $i) => [
                'id' => $i->id,
                'email' => $i->email,
                'name' => $i->name(),
                'affiliation' => $i->affiliation,
                'expertise' => $i->expertise,
                'invitedAt' => $i->invited_at->toIso8601String(),
                'invitedBy' => $i->inviter?->name,
                'resendUrl' => route('admin.reviewer-invites.resend', $i),
                'withdrawUrl' => route('admin.reviewer-invites.destroy', $i),
            ])->values()->all();

        return Inertia::render('admin/reviewers/index', [
            'reviewers' => $reviewers,
            'invites' => $invites,
            'storeUrl' => route('admin.reviewers.store'),
        ]);
    }
}
