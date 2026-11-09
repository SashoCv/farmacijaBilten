<?php

namespace App\Notifications\Reviews;

use App\Enums\AssignmentStatus;
use App\Mail\TemplatedMail;
use App\Models\ReviewAssignment;
use Illuminate\Notifications\Messages\MailMessage;

/** Reminder: an unanswered invitation (with a fresh link) or a review due soon or overdue. */
class ReviewReminder extends ReviewMail
{
    public function __construct(public ReviewAssignment $assignment, public ?string $token = null)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $a = $this->assignment;
        $invited = $a->status === AssignmentStatus::Invited;

        return TemplatedMail::make($invited ? 'review_reminder_answer' : 'review_reminder_review', [
            'name' => $a->name ?? __('colleague'),
            'title' => $a->manuscript->title,
            'reference' => $a->manuscript->reference,
            'review_by' => self::date($a->review_due_at),
        ], $invited && $this->token ? self::invitationUrl($a, $this->token) : route('reviewer.reviews.show', $a));
    }
}
