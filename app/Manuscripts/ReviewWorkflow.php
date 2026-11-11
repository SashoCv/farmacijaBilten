<?php

namespace App\Manuscripts;

use App\Enums\AssignmentStatus;
use App\Enums\DecisionType;
use App\Enums\ManuscriptStatus;
use App\Enums\Recommendation;
use App\Enums\Role;
use App\Mail\EditorialOffice;
use App\Models\Manuscript;
use App\Models\ManuscriptDecision;
use App\Models\ReviewAssignment;
use App\Models\User;
use App\Notifications\Reviews\DecisionLetter;
use App\Notifications\Reviews\InvitationAnswered;
use App\Notifications\Reviews\InvitationWithdrawn;
use App\Notifications\Reviews\ReviewInvitation;
use App\Notifications\Reviews\ReviewReceived;
use App\Notifications\Reviews\ReviewReminder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * Peer review: inviting reviewers, their answers and reviews, reminders, and
 * the editorial decision. Every change is recorded in the manuscript's
 * history (payloads hold ids only) and e-mails go out after the commit.
 */
final class ReviewWorkflow
{
    /** Statuses in which reviewers can be invited. */
    private const INVITABLE = [ManuscriptStatus::Submitted, ManuscriptStatus::UnderReview, ManuscriptStatus::Resubmitted];

    public function invite(Manuscript $m, User $admin, string $email, ?string $name, int $responseDays, int $reviewDays, ?string $message): ReviewAssignment
    {
        $email = mb_strtolower(trim($email));

        if (! in_array($m->status, self::INVITABLE, true)) {
            throw ValidationException::withMessages(['email' => __('Reviewers can be invited only while the manuscript is with the editorial office or under review.')]);
        }

        if (in_array($email, self::authorEmails($m), true)) {
            throw ValidationException::withMessages(['email' => __('This person is an author of the manuscript.')]);
        }

        $plain = Str::random(48);

        $assignment = DB::transaction(function () use ($m, $admin, $email, $name, $responseDays, $reviewDays, $message, $plain) {
            $m = Manuscript::whereKey($m->id)->lockForUpdate()->firstOrFail();
            $from = $m->status;

            // A revision goes to a new round when the first reviewer is invited.
            if ($m->status === ManuscriptStatus::Resubmitted) {
                $m->forceFill(['current_round' => $m->current_round + 1])->save();
            }

            $round = max(1, $m->current_round);

            if ($m->assignments()->where('round', $round)->where('email', $email)->whereNotIn('status', [AssignmentStatus::Cancelled->value])->exists()) {
                throw ValidationException::withMessages(['email' => __('This reviewer is already invited in this round.')]);
            }

            if ($from !== ManuscriptStatus::UnderReview) {
                $m->forceFill(['status' => ManuscriptStatus::UnderReview])->save();
                self::record($m, $admin, 'under_review', $from, ManuscriptStatus::UnderReview, ['round' => $round]);
            }

            // "Reviewer N" stays the same person across rounds.
            $number = (int) ($m->assignments()->where('email', $email)->value('number')
                ?? ((int) $m->assignments()->max('number') + 1));

            $user = User::where('email', $email)->first();

            $assignment = new ReviewAssignment([
                'manuscript_id' => $m->id,
                'round' => $round,
                'number' => $number,
                'reviewer_id' => $user?->id,
                'email' => $email,
                'name' => $name !== null && trim($name) !== '' ? trim($name) : $user?->name,
                'message' => $message !== null && trim($message) !== '' ? trim($message) : null,
                'invited_by' => $admin->id,
                'invited_at' => now(),
                'response_due_at' => now()->addDays(max(1, $responseDays))->endOfDay(),
                'review_due_at' => now()->addDays(max(1, $responseDays) + max(1, $reviewDays))->endOfDay(),
            ]);
            $assignment->forceFill(['status' => AssignmentStatus::Invited, 'token_hash' => hash('sha256', $plain)])->save();

            self::record($m, $admin, 'reviewer_invited', null, null, ['assignment' => $assignment->public_id]);

            return $assignment;
        });

        $assignment->setRelation('manuscript', $m->fresh());
        self::mailReviewer($assignment, new ReviewInvitation($assignment, $plain));

        return $assignment;
    }

    /** The invitation link's secret matches (single link per invitation; rotated by re-sending). */
    public static function tokenMatches(ReviewAssignment $assignment, string $plain): bool
    {
        return $assignment->token_hash !== null && hash_equals($assignment->token_hash, hash('sha256', $plain));
    }

    public function respond(ReviewAssignment $a, User $user, bool $accept, ?string $competingInterests, ?string $declineReason): void
    {
        if ($a->status !== AssignmentStatus::Invited) {
            throw new ConflictHttpException(__('This invitation has already been answered.'));
        }

        if (mb_strtolower($user->email) !== $a->email && $a->reviewer_id !== $user->id) {
            abort(403);
        }

        DB::transaction(function () use ($a, $user, $accept, $competingInterests, $declineReason) {
            $a->forceFill([
                'status' => $accept ? AssignmentStatus::Accepted : AssignmentStatus::Declined,
                'reviewer_id' => $user->id,
                'responded_at' => now(),
                'competing_interests' => $accept ? Str::limit(trim((string) $competingInterests), 2000, '') : null,
                'decline_reason' => $accept ? null : (Str::limit(trim((string) $declineReason), 1000, '') ?: null),
            ])->save();

            if ($accept) {
                $user->grantRole(Role::Reviewer);
            }

            self::record($a->manuscript, $user, $accept ? 'invitation_accepted' : 'invitation_declined', null, null, ['assignment' => $a->public_id]);
        });

        self::mailEditors(new InvitationAnswered($a));
    }

    /**
     * @param  array{recommendation?: ?string, comments_to_author?: ?string, comments_to_editor?: ?string}  $data
     */
    public function saveReview(ReviewAssignment $a, array $data): void
    {
        if ($a->status !== AssignmentStatus::Accepted) {
            throw new ConflictHttpException(__('This review can no longer be changed.'));
        }

        $a->forceFill([
            'recommendation' => Recommendation::tryFrom((string) ($data['recommendation'] ?? '')),
            'comments_to_author' => self::text($data['comments_to_author'] ?? null),
            'comments_to_editor' => self::text($data['comments_to_editor'] ?? null),
        ])->save();
    }

    /**
     * @param  array{recommendation?: ?string, comments_to_author?: ?string, comments_to_editor?: ?string}  $data
     */
    public function submitReview(ReviewAssignment $a, User $user, array $data): void
    {
        $this->saveReview($a, $data);

        $errors = [];

        if ($a->recommendation === null) {
            $errors['recommendation'] = __('Choose a recommendation.');
        }

        if (trim((string) $a->comments_to_author) === '') {
            $errors['comments_to_author'] = __('Write your comments to the authors.');
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }

        DB::transaction(function () use ($a, $user) {
            $a->forceFill(['status' => AssignmentStatus::Submitted, 'submitted_at' => now()])->save();
            self::record($a->manuscript, $user, 'review_submitted', null, null, ['assignment' => $a->public_id]);
        });

        self::mailEditors(new ReviewReceived($a));
    }

    public function cancel(ReviewAssignment $a, User $admin): void
    {
        if (! $a->status->isOpen()) {
            throw new ConflictHttpException(__('This invitation is no longer open.'));
        }

        DB::transaction(function () use ($a, $admin) {
            $a->forceFill(['status' => AssignmentStatus::Cancelled, 'token_hash' => null])->save();
            self::record($a->manuscript, $admin, 'invitation_cancelled', null, null, ['assignment' => $a->public_id]);
        });

        self::mailReviewer($a, new InvitationWithdrawn($a));
    }

    /** E-mail a reminder now (by the editorial office, or the daily scheduler). A new link is issued. */
    public function remind(ReviewAssignment $a): void
    {
        if (! $a->status->isOpen()) {
            throw new ConflictHttpException(__('This invitation is no longer open.'));
        }

        $plain = Str::random(48);
        $a->forceFill([
            'last_reminded_at' => now(),
            'token_hash' => $a->status === AssignmentStatus::Invited ? hash('sha256', $plain) : $a->token_hash,
        ])->save();

        self::mailReviewer($a, new ReviewReminder($a, $a->status === AssignmentStatus::Invited ? $plain : null));
    }

    public function expire(ReviewAssignment $a): void
    {
        if ($a->status !== AssignmentStatus::Invited) {
            return;
        }

        DB::transaction(function () use ($a) {
            $a->forceFill(['status' => AssignmentStatus::Expired, 'token_hash' => null])->save();
            self::record($a->manuscript, null, 'invitation_expired', null, null, ['assignment' => $a->public_id]);
        });
    }

    public function decide(Manuscript $m, User $admin, DecisionType $type, string $letter): ManuscriptDecision
    {
        if (! in_array($m->status, self::INVITABLE, true)) {
            throw ValidationException::withMessages(['type' => __('A decision can be made only while the manuscript is with the editorial office or under review.')]);
        }

        // A technical return happens before review.
        if ($type === DecisionType::Return && $m->status === ManuscriptStatus::UnderReview) {
            throw ValidationException::withMessages(['type' => __('A manuscript under review cannot be returned for corrections; request a revision instead.')]);
        }

        if (trim($letter) === '') {
            throw ValidationException::withMessages(['letter' => __('Write the letter to the authors.')]);
        }

        $to = $type->status();

        $decision = DB::transaction(function () use ($m, $admin, $type, $letter, $to) {
            $from = $m->status;
            $updated = Manuscript::whereKey($m->id)->where('status', $from->value)->update([
                'status' => $to->value,
                'revision_due_at' => $to === ManuscriptStatus::RevisionRequested ? now()->addDays((int) config('journal.review.revision_days', 30))->endOfDay() : null,
                'accepted_at' => $to === ManuscriptStatus::Accepted ? now() : $m->accepted_at,
                'updated_at' => now(),
            ]);

            if ($updated === 0) {
                throw new ConflictHttpException(__('Someone else just changed this manuscript. Reload the page.'));
            }

            $m->refresh();
            $round = max(1, $m->current_round);

            // The round is over: invitations still open are withdrawn.
            foreach ($type === DecisionType::Return ? [] : $m->assignments()->where('round', $round)->whereIn('status', [AssignmentStatus::Invited->value, AssignmentStatus::Accepted->value])->get() as $open) {
                $open->forceFill(['status' => AssignmentStatus::Cancelled, 'token_hash' => null])->save();
            }

            $decision = $m->decisions()->create([
                'round' => $round,
                'type' => $type,
                'letter' => trim($letter),
                'decided_by' => $admin->id,
            ]);

            self::record($m, $admin, 'decision', $from, $to, ['decision' => $decision->id, 'type' => $type->value]);

            return $decision;
        });

        $m->submitter->notify(new DecisionLetter($m, $decision));

        return $decision;
    }

    /**
     * E-mail addresses of the manuscript's authors (the submitter and the
     * authors listed in the latest text), so they are never invited to review it.
     *
     * @return list<string>
     */
    public static function authorEmails(Manuscript $m): array
    {
        $emails = [mb_strtolower($m->submitter->email)];

        foreach ((array) (ManuscriptPresenter::content($m)['authors'] ?? []) as $author) {
            if (($author['email'] ?? '') !== '') {
                $emails[] = mb_strtolower($author['email']);
            }
        }

        return array_values(array_unique($emails));
    }

    private static function text(mixed $value): ?string
    {
        $text = is_string($value) ? trim($value) : '';

        return $text === '' ? null : Str::limit($text, 60000, '');
    }

    /** @param  array<string, mixed>  $payload */
    private static function record(Manuscript $m, ?User $actor, string $type, ?ManuscriptStatus $from, ?ManuscriptStatus $to, array $payload = []): void
    {
        $m->events()->create([
            'actor_id' => $actor?->id,
            'type' => $type,
            'from_status' => $from,
            'to_status' => $to,
            'payload' => $payload ?: null,
        ]);
    }

    private static function mailReviewer(ReviewAssignment $a, \Illuminate\Notifications\Notification $notification): void
    {
        $user = $a->reviewer ?? User::where('email', $a->email)->first();

        if ($user !== null) {
            $user->notify($notification);
        } else {
            Notification::route('mail', [$a->email => $a->name ?? $a->email])->notify($notification);
        }
    }

    private static function mailEditors(\Illuminate\Notifications\Notification $notification): void
    {
        EditorialOffice::notify($notification);
    }
}
