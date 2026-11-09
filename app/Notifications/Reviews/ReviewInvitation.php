<?php

namespace App\Notifications\Reviews;

use App\Mail\TemplatedMail;
use App\Models\ReviewAssignment;
use Illuminate\Notifications\Messages\MailMessage;

/** Invitation to review, with the title and abstract and a personal sign-in link. */
class ReviewInvitation extends ReviewMail
{
    public function __construct(public ReviewAssignment $assignment, public string $token)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $a = $this->assignment;

        return TemplatedMail::make('review_invitation', [
            'name' => $a->name ?? __('colleague'),
            'title' => $a->manuscript->title,
            'reference' => $a->manuscript->reference,
            'type' => $a->manuscript->typeLabel(),
            'answer_by' => self::date($a->response_due_at),
            'review_by' => self::date($a->review_due_at),
            'message' => (string) $a->message,
        ], self::invitationUrl($a, $this->token));
    }
}
