<?php

namespace App\Manuscripts;

use App\Enums\AssignmentStatus;
use App\Enums\DecisionType;
use App\Enums\ManuscriptStatus;
use App\Enums\Recommendation;
use App\Enums\Role;
use App\Manuscripts\Rendering\ManuscriptRenderer;
use App\Models\Manuscript;
use App\Models\ManuscriptDecision;
use App\Models\ReviewAssignment;
use App\Models\ReviewerInvite;
use App\Models\ReviewFile;
use App\Models\User;

/**
 * Peer review in the shapes of resources/js/types/review.ts. Authors only
 * ever see "Reviewer N" and the comments meant for them.
 */
final class ReviewPresenter
{
    /** @return array<string, mixed> AdminReviews */
    public static function forAdmin(Manuscript $m): array
    {
        $authorEmails = ReviewWorkflow::authorEmails($m);
        $submission = Content::normaliseSubmission((array) $m->submission_data);
        $canInvite = in_array($m->status, [ManuscriptStatus::Submitted, ManuscriptStatus::UnderReview, ManuscriptStatus::Resubmitted], true);

        $assignments = $m->assignments()->with(['reviewer', 'files'])
            ->orderByDesc('round')->orderBy('number')->get()
            ->map(fn (ReviewAssignment $a) => [
                'id' => $a->public_id,
                'round' => $a->round,
                'number' => $a->number,
                'name' => $a->displayName(),
                'email' => $a->email,
                'status' => $a->status->value,
                'invitedAt' => $a->invited_at?->toIso8601String(),
                'respondedAt' => $a->responded_at?->toIso8601String(),
                'responseDueAt' => $a->response_due_at?->toIso8601String(),
                'reviewDueAt' => $a->review_due_at?->toIso8601String(),
                'submittedAt' => $a->submitted_at?->toIso8601String(),
                'declineReason' => $a->decline_reason,
                'competingInterests' => $a->competing_interests,
                'review' => $a->status === AssignmentStatus::Submitted ? self::review($a, forEditor: true) : null,
                'cancelUrl' => $a->status->isOpen() ? route('admin.assignments.cancel', $a) : null,
                'remindUrl' => $a->status->isOpen() ? route('admin.assignments.remind', $a) : null,
            ])->values()->all();

        $pool = User::withRole(Role::Reviewer)->active()
            ->orderBy('family_name')->orderBy('given_name')->get()
            ->reject(fn (User $u) => in_array($u->email, $authorEmails, true))
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'affiliation' => $u->affiliation,
                'expertise' => $u->expertise,
                'pending' => false,
            ])->values();

        // Invited to the list of reviewers, no account yet: the invitation
        // to review lets them create one.
        $accounts = User::pluck('email')->map(fn (string $e) => mb_strtolower($e))->all();
        $pending = ReviewerInvite::pending()->orderBy('family_name')->orderBy('given_name')->get()
            ->reject(fn (ReviewerInvite $i) => in_array($i->email, $accounts, true) || in_array($i->email, $authorEmails, true))
            ->map(fn (ReviewerInvite $i) => [
                'id' => null,
                'name' => $i->name(),
                'email' => $i->email,
                'affiliation' => $i->affiliation,
                'expertise' => $i->expertise,
                'pending' => true,
            ]);

        $pool = $pool->concat($pending)->values()->all();

        return [
            'round' => max(1, $m->current_round) + ($m->status === ManuscriptStatus::Resubmitted ? 1 : 0),
            'canInvite' => $canInvite,
            'inviteUrl' => route('admin.manuscripts.reviewers.store', $m),
            'defaults' => [
                'responseDays' => (int) config('journal.review.response_days', 7),
                'reviewDays' => (int) config('journal.review.review_days', 21),
            ],
            'suggested' => $submission['suggestedReviewers'],
            'pool' => $pool,
            'assignments' => $assignments,
            'decision' => [
                'canDecide' => $canInvite,
                'url' => route('admin.manuscripts.decision', $m),
                'types' => DecisionType::values(),
            ],
            'decisions' => $m->decisions()->with('decider')->orderByDesc('id')->get()
                ->map(fn (ManuscriptDecision $d) => [
                    'id' => $d->id,
                    'round' => $d->round,
                    'type' => $d->type->value,
                    'letter' => $d->letter,
                    'decidedBy' => $d->decider?->name,
                    'at' => $d->created_at?->toIso8601String(),
                ])->values()->all(),
            'anonymity' => config('journal.review.anonymity') === 'single' ? 'single' : 'double',
        ];
    }

    /** @return list<array<string, mixed>> AuthorDecision[] */
    public static function forAuthor(Manuscript $m): array
    {
        return array_values($m->decisions()->orderByDesc('id')->get()->map(fn (ManuscriptDecision $d) => [
            'round' => $d->round,
            'type' => $d->type->value,
            'letter' => $d->letter,
            'at' => $d->created_at?->toIso8601String(),
            'reviews' => $m->assignments()->with('files')
                ->where('round', $d->round)
                ->where('status', AssignmentStatus::Submitted->value)
                ->orderBy('number')->get()
                ->map(fn (ReviewAssignment $a) => [
                    'number' => $a->number,
                    'commentsToAuthor' => (string) $a->comments_to_author,
                    'files' => self::files($a, authorView: true),
                ])->values()->all(),
        ])->all());
    }

    /** @return array<string, mixed> ReviewerShowProps */
    public static function forReviewer(ReviewAssignment $a): array
    {
        $m = $a->manuscript;
        $content = ManuscriptPresenter::content($m);
        $accepted = in_array($a->status, [AssignmentStatus::Accepted, AssignmentStatus::Submitted], true);
        $anonymous = config('journal.review.anonymity') !== 'single';
        $latest = $m->latestVersion();

        return [
            'assignment' => [
                'id' => $a->public_id,
                'status' => $a->status->value,
                'round' => $a->round,
                'number' => $a->number,
                'invitedAt' => $a->invited_at?->toIso8601String(),
                'responseDueAt' => $a->response_due_at?->toIso8601String(),
                'reviewDueAt' => $a->review_due_at?->toIso8601String(),
                'submittedAt' => $a->submitted_at?->toIso8601String(),
                'message' => $a->message,
            ],
            'manuscript' => [
                'reference' => $m->reference,
                'title' => $m->title,
                'typeLabel' => $m->typeLabel(),
                'html' => ManuscriptRenderer::render($content, [
                    'type' => $m->type,
                    'language' => $m->language,
                    'anonymous' => $anonymous,
                    'frontOnly' => ! $accepted,
                    'images' => $accepted ? ManuscriptPresenter::imageUrls($m) : [],
                ]),
                'docxUrl' => $accepted ? route('manuscripts.docx', $m) : null,
                'responseToReviewers' => $accepted && $a->round > 1 ? $latest?->response_letter : null,
            ],
            'review' => self::review($a, forEditor: true, forReviewer: true),
            'recommendations' => Recommendation::values(),
            'urls' => [
                'respond' => route('reviewer.reviews.respond', $a),
                'save' => route('reviewer.reviews.update', $a),
                'submit' => route('reviewer.reviews.submit', $a),
                'upload' => route('reviewer.reviews.files.store', $a),
            ],
            'files' => [
                'maxMb' => (int) config('journal.review.file_max_mb', 20),
                'extensions' => (array) config('journal.review.file_extensions'),
            ],
        ];
    }

    /** @return array<string, mixed> */
    private static function review(ReviewAssignment $a, bool $forEditor, bool $forReviewer = false): array
    {
        $review = [
            'recommendation' => $a->recommendation?->value,
            'commentsToAuthor' => (string) $a->comments_to_author,
            'files' => self::files($a, authorView: false, deletable: $forReviewer && $a->status === AssignmentStatus::Accepted),
            'submittedAt' => $a->submitted_at?->toIso8601String(),
        ];

        if ($forEditor) {
            $review['commentsToEditor'] = (string) $a->comments_to_editor;
        }

        return $review;
    }

    /** @return list<array<string, mixed>> ReviewFile[] */
    private static function files(ReviewAssignment $a, bool $authorView, bool $deletable = false): array
    {
        return array_values($a->files->filter(fn (ReviewFile $f) => ! $authorView || $f->visibility === 'author')
            ->map(fn (ReviewFile $f) => [
                'id' => $f->public_id,
                'name' => $f->name,
                'size' => $f->size,
                'visibility' => $f->visibility,
                'url' => route('review-files.show', $f),
                'deleteUrl' => $deletable ? route('reviewer.reviews.files.destroy', [$a, $f]) : null,
            ])->all());
    }
}
