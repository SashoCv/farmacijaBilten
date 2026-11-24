<?php

namespace App\Http\Controllers;

use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Enums\Role;
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
 * Where the e-mail inviting someone to the list of reviewers leads (a signed
 * link with the invitation's secret). The link proves the e-mail address, so
 * the reviewer account is created in one step; someone who already has an
 * account just gets the reviewer role.
 */
class ReviewerSignupController extends Controller
{
    use PasswordValidationRules, ProfileValidationRules;

    public function show(Request $request, ReviewerInvite $invite): Response|RedirectResponse
    {
        $open = $invite->accepted_at === null && $invite->tokenMatches((string) $request->query('token'));
        $user = $request->user();
        $existing = User::whereRaw('lower(email) = ?', [$invite->email])->first();

        if ($open && $existing !== null) {
            // The link proves the address: give the role to the existing account.
            DB::transaction(function () use ($existing) {
                $existing->grantRole(Role::Reviewer);
                ReviewerInvite::acceptFor($existing);
            });

            if ($user instanceof User && $user->is($existing)) {
                return $this->welcome();
            }

            $open = false;
        }

        if ($open && $user instanceof User) {
            $mode = 'wrong_account';
        } elseif ($open) {
            $mode = 'create';
        } elseif ($existing !== null && $existing->hasRole(Role::Reviewer)) {
            $mode = 'sign_in';
        } else {
            $mode = 'closed';
        }

        return Inertia::render('auth/reviewer-signup', [
            'email' => $invite->email,
            'givenName' => $open ? $invite->given_name : null,
            'familyName' => $open ? $invite->family_name : null,
            'affiliation' => $open ? $invite->affiliation : null,
            'message' => $open ? $invite->message : null,
            'mode' => $mode,
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

    /** One-step reviewer account from the link. */
    public function store(Request $request, ReviewerInvite $invite): RedirectResponse
    {
        abort_unless($invite->accepted_at === null && $invite->tokenMatches((string) $request->query('token')), 403);
        abort_if($request->user() !== null || User::whereRaw('lower(email) = ?', [$invite->email])->exists(), 409);

        $data = $request->validate([
            ...$this->personRules(),
            'password' => $this->passwordRules(),
            'privacy' => ['accepted'],
        ]);

        $user = DB::transaction(function () use ($invite, $data) {
            $user = User::create([
                ...array_intersect_key($data, array_flip(['given_name', 'family_name', 'academic_title', 'affiliation', 'country_code', 'orcid', 'password'])),
                'email' => $invite->email,
                'expertise' => $invite->expertise,
                'locale' => app()->getLocale(),
            ]);

            // The link proved the address.
            $user->forceFill(['email_verified_at' => now(), 'privacy_accepted_at' => now()])->save();
            $user->recordEvent('registered', null, ['via' => 'reviewer_list']);
            $user->grantRole(Role::Reviewer, $invite->inviter);
            ReviewerInvite::acceptFor($user);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        return $this->welcome();
    }

    private function welcome(): RedirectResponse
    {
        Inertia::flash('toast', ['type' => 'success', 'message' => __('You are in the list of reviewers. Invitations to review will come by e-mail and appear here.')]);

        return to_route('reviewer.reviews.index');
    }
}
