<?php

namespace App\Manuscripts;

use App\Enums\DecisionType;
use App\Enums\ManuscriptStatus;
use App\Mail\EditorialOffice;
use App\Models\Manuscript;
use App\Models\ManuscriptDraft;
use App\Models\ManuscriptEvent;
use App\Models\User;
use App\Notifications\Manuscripts\ManuscriptReceived;
use App\Notifications\Manuscripts\NewManuscriptForEditors;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;

/**
 * The only place a manuscript's status changes. Each change is checked,
 * written together with its history event in one transaction, and the
 * e-mails go out after the commit.
 */
final class ManuscriptWorkflow
{
    public function create(User $author, string $type, string $language): Manuscript
    {
        return DB::transaction(function () use ($author, $type, $language) {
            $manuscript = new Manuscript([
                'submitter_id' => $author->id,
                'type' => $type,
                'language' => $language,
            ]);
            $manuscript->forceFill(['status' => ManuscriptStatus::Draft])->save();

            $manuscript->draft()->create([
                'content' => Content::blank($type, $language, $author),
                'updated_by' => $author->id,
            ]);

            $manuscript->forceFill(['submission_data' => Content::blankSubmission()])->save();

            // No events for a draft: it can be discarded without a trace.
            return $manuscript;
        });
    }

    /**
     * Autosave from the editor. Refuses a stale copy (another window saved
     * in between) with 409.
     *
     * @param  array<string, mixed>  $content
     * @param  array<string, mixed>  $submission
     * @return array{lock: int, savedAt: string, issues: list<array{level: string, field: string, message: string}>}
     */
    public function save(Manuscript $manuscript, User $user, array $content, array $submission, string $type, string $language, int $lock): array
    {
        $content = Content::normalise($content);
        $submission = Content::normaliseSubmission($submission);

        return DB::transaction(function () use ($manuscript, $user, $content, $submission, $type, $language, $lock) {
            /** @var ManuscriptDraft $draft */
            $draft = $manuscript->draft()->lockForUpdate()->firstOrFail();

            if ($draft->lock_version !== $lock) {
                throw new ConflictHttpException(__('This manuscript was changed in another window. Reload the page to continue.'));
            }

            $draft->forceFill([
                'content' => $content,
                'lock_version' => $draft->lock_version + 1,
                'updated_by' => $user->id,
            ])->save();

            $attributes = ['title' => mb_substr(Rich::text($content['title']), 0, 500), 'submission_data' => $submission];

            // The type and language can change only before the first submission.
            if ($manuscript->status === ManuscriptStatus::Draft) {
                $attributes['type'] = $type;
                $attributes['language'] = $language;
            }

            $manuscript->forceFill($attributes)->save();

            return [
                'lock' => $draft->lock_version,
                'savedAt' => $draft->updated_at?->toIso8601String() ?? now()->toIso8601String(),
                'issues' => ManuscriptChecker::check($content, $submission, $manuscript->type, $manuscript->language),
            ];
        });
    }

    /** Send the manuscript to the editorial office: freeze version 1, number it, notify. */
    public function submit(Manuscript $manuscript, User $user): Manuscript
    {
        if ($manuscript->status === ManuscriptStatus::RevisionRequested) {
            return $this->resubmit($manuscript, $user);
        }

        $manuscript->loadMissing('draft');
        $content = Content::normalise((array) $manuscript->draft?->content);
        $submission = Content::normaliseSubmission((array) $manuscript->submission_data);
        $issues = ManuscriptChecker::check($content, $submission, $manuscript->type, $manuscript->language);

        if (ManuscriptChecker::hasErrors($issues)) {
            throw ValidationException::withMessages([
                'manuscript' => array_values(array_map(
                    fn (array $i) => $i['message'],
                    array_filter($issues, fn (array $i) => $i['level'] === 'error'),
                )),
            ]);
        }

        if ($user->email_verified_at === null) {
            throw ValidationException::withMessages(['manuscript' => __('Confirm your e-mail address before sending the manuscript.')]);
        }

        DB::transaction(function () use ($manuscript, $user, $content) {
            $from = $manuscript->status;
            $now = now();

            // Compare-and-set: two clicks (or two windows) submit only once.
            $updated = Manuscript::whereKey($manuscript->id)
                ->where('status', ManuscriptStatus::Draft->value)
                ->update([
                    'status' => ManuscriptStatus::Submitted->value,
                    'reference' => $manuscript->reference ?? ReferenceNumber::next($now),
                    'current_round' => 1,
                    'received_at' => $manuscript->received_at ?? $now,
                    'submitted_at' => $now,
                    'title' => mb_substr(Rich::text($content['title']), 0, 500),
                    'updated_at' => $now,
                ]);

            if ($updated === 0) {
                throw new ConflictHttpException(__('This manuscript has already been sent.'));
            }

            $manuscript->refresh();

            $version = $manuscript->versions()->create([
                'number' => 1,
                'round' => 1,
                'kind' => 'submission',
                'content' => $content,
                'content_hash' => hash('sha256', (string) json_encode($content)),
                'created_by' => $user->id,
            ]);

            $this->record($manuscript, $user, 'submitted', $from, ManuscriptStatus::Submitted, ['version' => $version->number]);

            $manuscript->submitter->notify(new ManuscriptReceived($manuscript));

            EditorialOffice::notify(new NewManuscriptForEditors($manuscript));
        });

        return $manuscript;
    }

    /**
     * Send the revised manuscript back with the response to the reviewers:
     * freeze the next version, notify the editorial office.
     */
    public function resubmit(Manuscript $manuscript, User $user): Manuscript
    {
        $manuscript->loadMissing('draft');
        $content = Content::normalise((array) $manuscript->draft?->content);
        $submission = Content::normaliseSubmission((array) $manuscript->submission_data);
        $issues = array_filter(
            ManuscriptChecker::check($content, $submission, $manuscript->type, $manuscript->language),
            // The declarations and suggested reviewers were given with the first submission.
            fn (array $i) => $i['level'] === 'error' && ! in_array($i['field'], ['declarations', 'suggestedReviewers'], true),
        );

        $errors = array_values(array_map(fn (array $i) => $i['message'], $issues));

        $afterReturn = $manuscript->decisions()->latest('id')->value('type') === DecisionType::Return;

        if ($submission['responseToReviewers'] === '' && ! $afterReturn) {
            $errors[] = __('Write your response to the reviewers.');
        }

        if ($errors !== []) {
            throw ValidationException::withMessages(['manuscript' => $errors]);
        }

        DB::transaction(function () use ($manuscript, $user, $content, $submission) {
            $now = now();
            // After a technical return the manuscript simply goes back to the
            // editorial office: no review round has passed.
            $returned = $manuscript->decisions()->latest('id')->value('type') === DecisionType::Return;
            $to = $returned ? ManuscriptStatus::Submitted : ManuscriptStatus::Resubmitted;

            $updated = Manuscript::whereKey($manuscript->id)
                ->where('status', ManuscriptStatus::RevisionRequested->value)
                ->update([
                    'status' => $to->value,
                    'submitted_at' => $now,
                    'revision_due_at' => null,
                    'title' => mb_substr(Rich::text($content['title']), 0, 500),
                    'submission_data' => json_encode([...$submission, 'responseToReviewers' => '']),
                    'updated_at' => $now,
                ]);

            if ($updated === 0) {
                throw new ConflictHttpException(__('This manuscript has already been sent.'));
            }

            $manuscript->refresh();
            $number = (int) $manuscript->versions()->max('number') + 1;

            $version = $manuscript->versions()->create([
                'number' => $number,
                'round' => $returned ? max(1, $manuscript->current_round) : $manuscript->current_round + 1,
                'kind' => $returned ? 'correction' : 'revision',
                'content' => $content,
                'content_hash' => hash('sha256', (string) json_encode($content)),
                'response_letter' => $submission['responseToReviewers'],
                'created_by' => $user->id,
            ]);

            $this->record($manuscript, $user, 'resubmitted', ManuscriptStatus::RevisionRequested, $to, ['version' => $version->number]);

            EditorialOffice::notify(new NewManuscriptForEditors($manuscript, revision: true));
        });

        return $manuscript;
    }

    /** A never-submitted draft can be deleted without a trace. */
    public function discard(Manuscript $manuscript): void
    {
        if ($manuscript->status !== ManuscriptStatus::Draft || $manuscript->reference !== null) {
            throw ValidationException::withMessages(['manuscript' => __('Only drafts that were never sent can be deleted.')]);
        }

        DB::transaction(function () use ($manuscript) {
            $manuscript->draft()->delete();
            $manuscript->delete();
        });
    }

    /** @param  array<string, mixed>  $payload */
    private function record(Manuscript $manuscript, ?User $actor, string $type, ?ManuscriptStatus $from, ?ManuscriptStatus $to, array $payload = []): ManuscriptEvent
    {
        return $manuscript->events()->create([
            'actor_id' => $actor?->id,
            'type' => $type,
            'from_status' => $from,
            'to_status' => $to,
            'payload' => $payload ?: null,
        ]);
    }
}
