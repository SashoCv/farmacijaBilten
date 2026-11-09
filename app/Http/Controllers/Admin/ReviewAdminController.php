<?php

namespace App\Http\Controllers\Admin;

use App\Enums\DecisionType;
use App\Http\Controllers\Controller;
use App\Manuscripts\ReviewWorkflow;
use App\Models\Manuscript;
use App\Models\ReviewAssignment;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/**
 * The editorial office's side of peer review: invite reviewers, withdraw or
 * remind, and decide.
 */
class ReviewAdminController extends Controller
{
    public function __construct(private ReviewWorkflow $workflow) {}

    public function invite(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('view', $manuscript);

        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'name' => ['nullable', 'string', 'max:200'],
            'response_days' => ['nullable', 'integer', 'between:1,60'],
            'review_days' => ['nullable', 'integer', 'between:1,120'],
            'message' => ['nullable', 'string', 'max:3000'],
        ]);

        /** @var User $admin */
        $admin = $request->user();

        $assignment = $this->workflow->invite(
            $manuscript,
            $admin,
            $data['email'],
            $data['name'] ?? null,
            (int) ($data['response_days'] ?? config('journal.review.response_days', 7)),
            (int) ($data['review_days'] ?? config('journal.review.review_days', 21)),
            $data['message'] ?? null,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Invitation sent to :email.', ['email' => $assignment->email])]);

        return back();
    }

    public function cancel(Request $request, ReviewAssignment $assignment): RedirectResponse
    {
        Gate::authorize('view', $assignment->manuscript);

        /** @var User $admin */
        $admin = $request->user();
        $this->workflow->cancel($assignment, $admin);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('The invitation has been withdrawn.')]);

        return back();
    }

    public function remind(ReviewAssignment $assignment): RedirectResponse
    {
        Gate::authorize('view', $assignment->manuscript);

        $this->workflow->remind($assignment);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Reminder sent to :email.', ['email' => $assignment->email])]);

        return back();
    }

    public function decide(Request $request, Manuscript $manuscript): RedirectResponse
    {
        Gate::authorize('view', $manuscript);

        $data = $request->validate([
            'type' => ['required', Rule::in(DecisionType::values())],
            'letter' => ['required', 'string', 'max:60000'],
        ]);

        /** @var User $admin */
        $admin = $request->user();
        $this->workflow->decide($manuscript, $admin, DecisionType::from($data['type']), $data['letter']);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('The decision has been sent to the authors.')]);

        return back();
    }
}
