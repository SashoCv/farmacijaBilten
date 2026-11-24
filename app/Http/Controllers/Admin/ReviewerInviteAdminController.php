<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\ReviewerInvite;
use App\Models\User;
use App\Notifications\Reviews\ReviewerListInvitation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Inertia\Inertia;

/**
 * Adding people to the journal's list of reviewers from the Reviewers page.
 * Someone with an account gets the reviewer role at once; anyone else gets an
 * e-mail with a link to create a reviewer account (ReviewerSignupController).
 * Reviewers see only the manuscripts they are invited to (ReviewAssignmentPolicy).
 */
class ReviewerInviteAdminController extends Controller
{
    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'given_name' => ['required', 'string', 'max:100'],
            'family_name' => ['required', 'string', 'max:100'],
            'affiliation' => ['nullable', 'string', 'max:255'],
            'expertise' => ['nullable', 'string', 'max:500'],
            'message' => ['nullable', 'string', 'max:3000'],
        ]);

        /** @var User $admin */
        $admin = $request->user();
        $email = mb_strtolower(trim($data['email']));
        $user = User::whereRaw('lower(email) = ?', [$email])->first();

        if ($user !== null) {
            DB::transaction(function () use ($user, $admin, $data) {
                $user->grantRole(Role::Reviewer, $admin);

                if (blank($user->expertise) && filled($data['expertise'] ?? null)) {
                    $user->forceFill(['expertise' => $data['expertise']])->save();
                }

                ReviewerInvite::acceptFor($user);
            });

            Inertia::flash('toast', ['type' => 'success', 'message' => __(':email already has an account and is now in the list of reviewers.', ['email' => $user->email])]);

            return back();
        }

        $invite = ReviewerInvite::firstOrNew(['email' => $email]);
        $invite->fill([
            'given_name' => trim($data['given_name']),
            'family_name' => trim($data['family_name']),
            'affiliation' => filled($data['affiliation'] ?? null) ? trim($data['affiliation']) : null,
            'expertise' => filled($data['expertise'] ?? null) ? trim($data['expertise']) : null,
            'message' => filled($data['message'] ?? null) ? trim($data['message']) : null,
            'invited_by' => $admin->id,
            'invited_at' => now(),
            'accepted_at' => null,
            'user_id' => null,
        ]);

        $this->send($invite);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent to :email.', ['email' => $email])]);

        return back();
    }

    /** The same e-mail again, with a new link (the old one stops working). */
    public function resend(ReviewerInvite $invite): RedirectResponse
    {
        abort_if($invite->accepted_at !== null, 404);

        $invite->invited_at = now();
        $this->send($invite);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent to :email.', ['email' => $invite->email])]);

        return back();
    }

    /** Withdraw an unanswered invitation: the link stops working. */
    public function destroy(ReviewerInvite $invite): RedirectResponse
    {
        abort_if($invite->accepted_at !== null, 404);

        $invite->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('The invitation has been withdrawn.')]);

        return back();
    }

    private function send(ReviewerInvite $invite): void
    {
        $token = $invite->newToken();
        $invite->save();

        Notification::route('mail', [$invite->email => $invite->name()])
            ->notify(new ReviewerListInvitation($invite, $token));
    }
}
