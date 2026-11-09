<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Manuscripts\EditorialStats;
use App\Models\User;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Every reviewer (everyone ever invited, and everyone with the reviewer
 * role): invitations, answers, reviews, what is open and what is overdue.
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

        return Inertia::render('admin/reviewers/index', ['reviewers' => $reviewers]);
    }
}
