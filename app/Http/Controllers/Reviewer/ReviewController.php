<?php

namespace App\Http\Controllers\Reviewer;

use App\Enums\AssignmentStatus;
use App\Enums\Recommendation;
use App\Http\Controllers\Controller;
use App\Manuscripts\ReviewPresenter;
use App\Manuscripts\ReviewWorkflow;
use App\Models\ReviewAssignment;
use App\Models\ReviewFile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The reviewer's workspace: invitations to answer, the (anonymised)
 * manuscript, the review form and its files.
 */
class ReviewController extends Controller
{
    public function __construct(private ReviewWorkflow $workflow) {}

    public function index(Request $request): Response
    {
        /** @var User $user */
        $user = $request->user();

        $assignments = ReviewAssignment::query()
            ->with('manuscript')
            ->where(fn ($q) => $q->where('reviewer_id', $user->id)
                ->orWhere(fn ($q) => $q->where('email', $user->email)->where('status', AssignmentStatus::Invited->value)))
            ->whereNotIn('status', [AssignmentStatus::Cancelled->value])
            ->orderByDesc('invited_at')
            ->get()
            ->map(fn (ReviewAssignment $a) => [
                'id' => $a->public_id,
                'status' => $a->status->value,
                'round' => $a->round,
                'reference' => $a->manuscript->reference,
                'title' => $a->manuscript->title,
                'typeLabel' => $a->manuscript->typeLabel(),
                'invitedAt' => $a->invited_at?->toIso8601String(),
                'responseDueAt' => $a->response_due_at?->toIso8601String(),
                'reviewDueAt' => $a->review_due_at?->toIso8601String(),
                'submittedAt' => $a->submitted_at?->toIso8601String(),
                'url' => route('reviewer.reviews.show', $a),
            ])->values()->all();

        return Inertia::render('reviewer/reviews/index', ['assignments' => $assignments]);
    }

    public function show(ReviewAssignment $assignment): Response
    {
        Gate::authorize('view', $assignment);

        return Inertia::render('reviewer/reviews/show', ReviewPresenter::forReviewer($assignment));
    }

    public function respond(Request $request, ReviewAssignment $assignment): RedirectResponse
    {
        Gate::authorize('respond', $assignment);

        $data = $request->validate([
            'decision' => ['required', 'in:accept,decline'],
            'competing_interests' => ['required_if:decision,accept', 'nullable', 'in:none,declared'],
            'competing_interests_note' => ['required_if:competing_interests,declared', 'nullable', 'string', 'max:2000'],
            'decline_reason' => ['nullable', 'string', 'max:1000'],
        ]);

        /** @var User $user */
        $user = $request->user();
        $accept = $data['decision'] === 'accept';
        $interests = ($data['competing_interests'] ?? 'none') === 'declared' ? (string) $data['competing_interests_note'] : 'none';

        $this->workflow->respond($assignment, $user, $accept, $interests, $data['decline_reason'] ?? null);

        Inertia::flash('toast', ['type' => 'success', 'message' => $accept
            ? __('Thank you for accepting. The manuscript is now open for your review.')
            : __('Thank you for letting us know.')]);

        return to_route('reviewer.reviews.show', $assignment);
    }

    /** Save the review as a draft (JSON from autosave, or a form post). */
    public function update(Request $request, ReviewAssignment $assignment): JsonResponse|RedirectResponse
    {
        Gate::authorize('review', $assignment);

        $this->workflow->saveReview($assignment, $this->reviewData($request));

        if ($request->wantsJson()) {
            return response()->json(['savedAt' => now()->toIso8601String()]);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Draft saved.')]);

        return back();
    }

    public function submit(Request $request, ReviewAssignment $assignment): RedirectResponse
    {
        Gate::authorize('review', $assignment);

        /** @var User $user */
        $user = $request->user();
        $this->workflow->submitReview($assignment, $user, $this->reviewData($request));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Thank you! Your review has been sent to the editorial office.')]);

        return to_route('reviewer.reviews.show', $assignment);
    }

    public function upload(Request $request, ReviewAssignment $assignment): JsonResponse
    {
        Gate::authorize('review', $assignment);

        $data = $request->validate([
            'file' => ['required', 'file', 'max:'.((int) config('journal.review.file_max_mb', 20) * 1024), 'extensions:'.implode(',', (array) config('journal.review.file_extensions'))],
            'visibility' => ['required', Rule::in(['author', 'editor'])],
        ]);

        $upload = $request->file('file');
        $extension = strtolower((string) $upload->getClientOriginalExtension());
        $path = $upload->storeAs("reviews/{$assignment->public_id}", Str::ulid()->toBase32().'.'.$extension, 'local');

        $file = $assignment->files()->create([
            'path' => (string) $path,
            // Shown to others as "Reviewer N – file.pdf": strip anything identifying from the name.
            'name' => Str::limit(preg_replace('/[^\pL\pN ._()-]+/u', '_', $upload->getClientOriginalName()) ?: "file.{$extension}", 150, ''),
            'mime' => (string) $upload->getMimeType(),
            'size' => (int) $upload->getSize(),
            'visibility' => $data['visibility'],
        ]);

        return response()->json([
            'id' => $file->public_id,
            'name' => $file->name,
            'size' => $file->size,
            'visibility' => $file->visibility,
            'url' => route('review-files.show', $file),
            'deleteUrl' => route('reviewer.reviews.files.destroy', [$assignment, $file]),
        ], 201);
    }

    public function destroyFile(ReviewAssignment $assignment, ReviewFile $file): JsonResponse|RedirectResponse
    {
        Gate::authorize('review', $assignment);
        abort_unless($file->review_assignment_id === $assignment->id, 404);

        Storage::disk('local')->delete($file->path);
        $file->delete();

        return request()->wantsJson() ? response()->json(['deleted' => true]) : back();
    }

    /** @return array{recommendation: ?string, comments_to_author: ?string, comments_to_editor: ?string} */
    private function reviewData(Request $request): array
    {
        $data = $request->validate([
            'recommendation' => ['nullable', Rule::in(Recommendation::values())],
            'comments_to_author' => ['nullable', 'string', 'max:60000'],
            'comments_to_editor' => ['nullable', 'string', 'max:60000'],
        ]);

        return [
            'recommendation' => $data['recommendation'] ?? null,
            'comments_to_author' => $data['comments_to_author'] ?? null,
            'comments_to_editor' => $data['comments_to_editor'] ?? null,
        ];
    }
}
