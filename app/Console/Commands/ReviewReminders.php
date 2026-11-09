<?php

namespace App\Console\Commands;

use App\Enums\AssignmentStatus;
use App\Manuscripts\ReviewWorkflow;
use App\Models\ReviewAssignment;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

/**
 * Daily: remind reviewers who have not answered or whose review is due in
 * three days or overdue (at most once every few days), and expire
 * invitations nobody answered.
 */
#[Signature('journal:review-reminders')]
#[Description('Send review reminders and expire unanswered invitations')]
class ReviewReminders extends Command
{
    public function handle(ReviewWorkflow $workflow): int
    {
        $now = now();
        $interval = (int) config('journal.review.reminder_interval_days', 5);
        $expireAfter = (int) config('journal.review.expire_after_days', 7);
        $reminded = 0;
        $expired = 0;

        $open = ReviewAssignment::query()->with('manuscript')
            ->whereIn('status', [AssignmentStatus::Invited->value, AssignmentStatus::Accepted->value])
            ->get();

        foreach ($open as $a) {
            $quiet = $a->last_reminded_at === null || $a->last_reminded_at->lt($now->copy()->subDays($interval));

            if ($a->status === AssignmentStatus::Invited && $a->response_due_at?->lt($now)) {
                if ($a->response_due_at->copy()->addDays($expireAfter)->lt($now)) {
                    $workflow->expire($a);
                    $expired++;
                } elseif ($quiet) {
                    $workflow->remind($a);
                    $reminded++;
                }

                continue;
            }

            if ($a->status === AssignmentStatus::Accepted && $a->review_due_at?->lt($now->copy()->addDays(3)) && $quiet) {
                $workflow->remind($a);
                $reminded++;
            }
        }

        $this->components->info("Reminded {$reminded}, expired {$expired}.");

        return self::SUCCESS;
    }
}
