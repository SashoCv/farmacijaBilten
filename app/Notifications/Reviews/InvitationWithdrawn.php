<?php

namespace App\Notifications\Reviews;

use App\Mail\TemplatedMail;
use App\Models\ReviewAssignment;
use Illuminate\Notifications\Messages\MailMessage;

/** Polite note that the invitation is no longer needed. */
class InvitationWithdrawn extends ReviewMail
{
    public function __construct(public ReviewAssignment $assignment)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        return TemplatedMail::make('invitation_withdrawn', [
            'name' => $this->assignment->name ?? __('colleague'),
            'title' => $this->assignment->manuscript->title,
            'reference' => $this->assignment->manuscript->reference,
        ]);
    }
}
