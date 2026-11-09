<?php

namespace App\Notifications\Reviews;

use App\Mail\TemplatedMail;
use App\Models\ReviewAssignment;
use Illuminate\Notifications\Messages\MailMessage;

/** To the editorial office: a review was submitted. */
class ReviewReceived extends ReviewMail
{
    public function __construct(public ReviewAssignment $assignment)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $a = $this->assignment;

        return TemplatedMail::make('review_received', [
            'title' => $a->manuscript->title,
            'reference' => $a->manuscript->reference,
            'reviewer' => $a->displayName(),
        ], route('admin.manuscripts.show', $a->manuscript));
    }
}
