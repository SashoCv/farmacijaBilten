<?php

namespace App\Manuscripts;

use App\Enums\AssignmentStatus;
use App\Enums\DecisionType;
use App\Enums\ManuscriptStatus;
use App\Models\Manuscript;
use App\Models\ManuscriptDecision;
use App\Models\ReviewAssignment;
use Carbon\CarbonInterface;
use Illuminate\Support\Collection;

/**
 * Figures for the editorial office's dashboard and the reviewers page
 * (`AdminDashboard` and `ReviewersIndexProps` in resources/js/types/review.ts).
 * Volumes are small (tens of manuscripts a year), so this works on
 * collections rather than SQL aggregates.
 */
final class EditorialStats
{
    /** @return array<string, mixed> */
    public static function dashboard(): array
    {
        $manuscripts = Manuscript::query()->with('submitter')->where('status', '!=', ManuscriptStatus::Draft->value)->get();
        $assignments = ReviewAssignment::query()->with(['manuscript', 'reviewer'])->get();
        $decisions = ManuscriptDecision::query()->get();
        $now = now();

        $byStatus = [];

        foreach (ManuscriptStatus::cases() as $status) {
            if ($status !== ManuscriptStatus::Draft) {
                $byStatus[$status->value] = $manuscripts->where('status', $status)->count();
            }
        }

        $byType = [];

        foreach (array_keys((array) config('manuscript.types')) as $type) {
            $byType[] = [
                'type' => $type,
                'label' => (string) (config("manuscript.types.{$type}.label.".app()->getLocale()) ?? config("manuscript.types.{$type}.label.en")),
                'count' => $manuscripts->where('type', $type)->count(),
            ];
        }

        // Received per month, last 12 months.
        $months = [];

        for ($i = 11; $i >= 0; $i--) {
            $month = $now->copy()->startOfMonth()->subMonths($i);
            $months[] = [
                'month' => $month->format('Y-m'),
                'received' => $manuscripts->filter(fn (Manuscript $m) => (bool) $m->received_at?->isSameMonth($month))->count(),
                'decided' => $decisions->filter(fn (ManuscriptDecision $d) => (bool) $d->created_at?->isSameMonth($month))->count(),
            ];
        }

        $final = $decisions->whereIn('type', [DecisionType::Accept, DecisionType::Reject]);
        $accepted = $final->where('type', DecisionType::Accept)->count();

        // Days from receipt to the first decision.
        $firstDecisionDays = $manuscripts->map(function (Manuscript $m) use ($decisions) {
            $first = $decisions->where('manuscript_id', $m->id)->sortBy('id')->first();

            return $first && $m->received_at ? $m->received_at->diffInDays($first->created_at) : null;
        })->filter(fn ($d) => $d !== null);

        $submitted = $assignments->where('status', AssignmentStatus::Submitted);
        $reviewDays = $submitted->map(fn (ReviewAssignment $a) => $a->responded_at && $a->submitted_at ? $a->responded_at->diffInDays($a->submitted_at) : null)
            ->filter(fn ($d) => $d !== null);

        return [
            'totals' => [
                'received' => $manuscripts->count(),
                'thisYear' => $manuscripts->filter(fn (Manuscript $m) => $m->received_at?->year === $now->year)->count(),
                'inProgress' => $manuscripts->whereIn('status', [
                    ManuscriptStatus::Submitted, ManuscriptStatus::UnderReview, ManuscriptStatus::RevisionRequested, ManuscriptStatus::Resubmitted,
                ])->count(),
                'accepted' => $accepted,
                'rejected' => $final->count() - $accepted,
                'acceptanceRate' => $final->count() > 0 ? round(100 * $accepted / $final->count()) : null,
                'daysToFirstDecision' => $firstDecisionDays->isNotEmpty() ? (int) round((float) $firstDecisionDays->avg()) : null,
            ],
            'byStatus' => $byStatus,
            'byType' => $byType,
            'months' => $months,
            'reviews' => [
                'awaitingAnswer' => $assignments->where('status', AssignmentStatus::Invited)->count(),
                'inProgress' => $assignments->where('status', AssignmentStatus::Accepted)->count(),
                'overdue' => $assignments->filter(fn (ReviewAssignment $a) => self::overdue($a, $now))->count(),
                'submitted' => $submitted->count(),
                'declined' => $assignments->where('status', AssignmentStatus::Declined)->count(),
                'averageDays' => $reviewDays->isNotEmpty() ? (int) round((float) $reviewDays->avg()) : null,
            ],
            'attention' => self::attention($manuscripts, $assignments, $now),
        ];
    }

    /**
     * What needs the editorial office now, most urgent first.
     *
     * @param  Collection<int, Manuscript>  $manuscripts
     * @param  Collection<int, ReviewAssignment>  $assignments
     * @return list<array<string, mixed>>
     */
    private static function attention(Collection $manuscripts, Collection $assignments, CarbonInterface $now): array
    {
        $items = [];

        foreach ($manuscripts as $m) {
            $round = $assignments->where('manuscript_id', $m->id)->where('round', max(1, $m->current_round));
            $reason = match (true) {
                $m->status === ManuscriptStatus::Submitted => 'new',
                $m->status === ManuscriptStatus::Resubmitted => 'revision_received',
                $m->status === ManuscriptStatus::UnderReview && $round->isNotEmpty() && $round->every(fn (ReviewAssignment $a) => ! $a->status->isOpen()) && $round->where('status', AssignmentStatus::Submitted)->isNotEmpty() => 'ready_for_decision',
                $m->status === ManuscriptStatus::UnderReview && $round->filter(fn (ReviewAssignment $a) => $a->status->isOpen() || $a->status === AssignmentStatus::Submitted)->count() < 2 => 'needs_reviewers',
                default => null,
            };

            if ($reason !== null) {
                $items[] = [
                    'kind' => $reason,
                    'reference' => $m->reference,
                    'title' => $m->title,
                    'author' => $m->submitter->name,
                    'since' => ($m->submitted_at ?? $m->updated_at)?->toIso8601String(),
                    'url' => route('admin.manuscripts.show', $m),
                    'reviewer' => null,
                    'dueAt' => null,
                ];
            }
        }

        foreach ($assignments as $a) {
            if (self::overdue($a, $now)) {
                $items[] = [
                    'kind' => $a->status === AssignmentStatus::Invited ? 'answer_overdue' : 'review_overdue',
                    'reference' => $a->manuscript->reference,
                    'title' => $a->manuscript->title,
                    'author' => null,
                    'since' => null,
                    'url' => route('admin.manuscripts.show', $a->manuscript),
                    'reviewer' => $a->displayName(),
                    'dueAt' => ($a->status === AssignmentStatus::Invited ? $a->response_due_at : $a->review_due_at)?->toIso8601String(),
                ];
            }
        }

        $order = ['review_overdue' => 0, 'answer_overdue' => 1, 'ready_for_decision' => 2, 'revision_received' => 3, 'new' => 4, 'needs_reviewers' => 5];
        usort($items, fn ($a, $b) => [$order[$a['kind']], $a['dueAt'] ?? $a['since']] <=> [$order[$b['kind']], $b['dueAt'] ?? $b['since']]);

        return array_slice($items, 0, 25);
    }

    public static function overdue(ReviewAssignment $a, CarbonInterface $now): bool
    {
        return ($a->status === AssignmentStatus::Invited && $a->response_due_at?->lt($now))
            || ($a->status === AssignmentStatus::Accepted && $a->review_due_at?->lt($now));
    }

    /**
     * Everyone ever invited to review, with how far each one is.
     *
     * @return list<array<string, mixed>>
     */
    public static function reviewers(): array
    {
        $now = now();

        return array_values(ReviewAssignment::query()->with(['manuscript', 'reviewer'])->get()
            ->groupBy('email')
            ->map(function (Collection $rows, string $email) use ($now) {
                /** @var ReviewAssignment $first */
                $first = $rows->sortByDesc('id')->first();
                $done = $rows->where('status', AssignmentStatus::Submitted);
                $days = $done->map(fn (ReviewAssignment $a) => $a->responded_at && $a->submitted_at ? $a->responded_at->diffInDays($a->submitted_at) : null)->filter(fn ($d) => $d !== null);

                return [
                    'email' => $email,
                    'name' => $first->displayName(),
                    'userId' => $first->reviewer_id,
                    'affiliation' => $first->reviewer?->affiliation,
                    'expertise' => $first->reviewer?->expertise,
                    'hasAccount' => $first->reviewer_id !== null,
                    'counts' => [
                        'invited' => $rows->count(),
                        'accepted' => $rows->whereIn('status', [AssignmentStatus::Accepted, AssignmentStatus::Submitted])->count(),
                        'declined' => $rows->where('status', AssignmentStatus::Declined)->count(),
                        'submitted' => $done->count(),
                        'expired' => $rows->where('status', AssignmentStatus::Expired)->count(),
                    ],
                    'averageDays' => $days->isNotEmpty() ? (int) round((float) $days->avg()) : null,
                    'lastActivity' => $rows->map(fn (ReviewAssignment $a) => $a->submitted_at ?? $a->responded_at ?? $a->invited_at)->filter()->max()?->toIso8601String(),
                    'assignments' => $rows->sortByDesc('id')->map(fn (ReviewAssignment $a) => [
                        'id' => $a->public_id,
                        'reference' => $a->manuscript->reference,
                        'title' => $a->manuscript->title,
                        'round' => $a->round,
                        'status' => $a->status->value,
                        'invitedAt' => $a->invited_at?->toIso8601String(),
                        'dueAt' => ($a->status === AssignmentStatus::Invited ? $a->response_due_at : $a->review_due_at)?->toIso8601String(),
                        'submittedAt' => $a->submitted_at?->toIso8601String(),
                        'overdue' => self::overdue($a, $now),
                        'recommendation' => $a->recommendation?->value,
                        'url' => route('admin.manuscripts.show', $a->manuscript),
                    ])->values()->all(),
                ];
            })
            ->sortBy([['name', 'asc']])
            ->all());
    }
}
