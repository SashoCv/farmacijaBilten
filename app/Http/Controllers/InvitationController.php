<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\AssignmentStatus;
use App\Enums\Role;
use App\Manuscripts\ManuscriptPresenter;
use App\Manuscripts\Rendering\ManuscriptRenderer;
use App\Manuscripts\ReviewWorkflow;
use App\Models\ReviewAssignment;
use App\Models\ReviewerInvite;
use App\Models\User;
use App\Support\Countries;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Where the invitation e-mail leads (a signed link with the invitation's
 * secret). The invited person signs in, or creates a reviewer account in
 * one step — the link proves the e-mail address — and continues to the
 * invitation in their workspace.
 */
class InvitationController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function show(Request $request, ReviewAssignment $assignment): Response|RedirectResponse
    {
        $open = $assignment->status === AssignmentStatus::Invited
            && ReviewWorkflow::tokenMatches($assignment, (string) $request->query('token'));
        $user = $request->user();

        if ($open && $user instanceof User && mb_strtolower($user->email) === $assignment->email) {
            return to_route('reviewer.reviews.show', $assignment);
        }

        // Already answered by this person: straight to the review.
        if ($user instanceof User && $assignment->reviewer_id === $user->id) {
            return to_route('reviewer.reviews.show', $assignment);
        }

        $exists = User::where('email', $assignment->email)->exists();

        if ($open && ! $user && $exists) {
            // After signing in, Fortify returns to the invitation in the workspace.
            $request->session()->put('url.intended', route('reviewer.reviews.show', $assignment));
        }

        $m = $assignment->manuscript;
        $content = ManuscriptPresenter::content($m);

        return Inertia::render('auth/invitation', [
            'email' => $assignment->email,
            'name' => $assignment->name,
            'manuscript' => [
                'title' => $m->title,
                'typeLabel' => $m->typeLabel(),
                'abstractHtml' => $open ? ManuscriptRenderer::render($content, [
                    'type' => $m->type,
                    'language' => $m->language,
                    'anonymous' => true,
                    'frontOnly' => true,
                ]) : '',
            ],
            'responseDueAt' => $assignment->response_due_at?->toIso8601String(),
            'reviewDueAt' => $assignment->review_due_at?->toIso8601String(),
            'message' => $open ? $assignment->message : null,
            'mode' => match (true) {
                ! $open => 'closed',
                $user instanceof User => 'wrong_account',
                $exists => 'sign_in',
                default => 'create',
            },
            'signedInAs' => $user?->email,
            'countries' => Countries::CODES,
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
            'urls' => [
                'createAccount' => $request->fullUrl(),
                'signIn' => route('login'),
                'signOut' => route('logout'),
            ],
        ]);
    }

    /** One-step reviewer account from the invitation link. */
    public function createAccount(Request $request, ReviewAssignment $assignment): RedirectResponse
    {
        abort_unless(
            $assignment->status === AssignmentStatus::Invited
                && ReviewWorkflow::tokenMatches($assignment, (string) $request->query('token')),
            403,
        );
        abort_if($request->user() !== null || User::where('email', $assignment->email)->exists(), 409);

        $data = $request->validate([
            ...$this->personRules(),
            'password' => $this->passwordRules(),
            'privacy' => ['accepted'],
        ]);

        $user = DB::transaction(function () use ($assignment, $data) {
            $user = User::create([
                ...array_intersect_key($data, array_flip(['given_name', 'family_name', 'academic_title', 'affiliation', 'country_code', 'orcid', 'password'])),
                'email' => $assignment->email,
                'locale' => app()->getLocale(),
            ]);

            // The invitation link proved the address.
            $user->forceFill(['email_verified_at' => now(), 'privacy_accepted_at' => now()])->save();
            $user->recordEvent('registered', null, ['via' => 'invitation']);
            $user->grantRole(Role::Reviewer);
            $assignment->forceFill(['reviewer_id' => $user->id])->save();
            ReviewerInvite::acceptFor($user);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return to_route('reviewer.reviews.show', $assignment);
    }
}
