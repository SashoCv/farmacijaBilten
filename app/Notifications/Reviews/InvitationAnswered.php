<?php

namespace App\Notifications\Reviews;

use App\Enums\AssignmentStatus;
use App\Mail\TemplatedMail;
use App\Models\ReviewAssignment;
use Illuminate\Notifications\Messages\MailMessage;

/** To the editorial office: a reviewer accepted or declined. */
class InvitationAnswered extends ReviewMail
{
    public function __construct(public ReviewAssignment $assignment)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $a = $this->assignment;
        $accepted = $a->status === AssignmentStatus::Accepted;

        return TemplatedMail::make($accepted ? 'invitation_accepted' : 'invitation_declined', [
            'title' => $a->manuscript->title,
            'reference' => $a->manuscript->reference,
            'reviewer' => $a->displayName(),
            'reason' => $a->decline_reason ? __('Reason: :reason', ['reason' => $a->decline_reason]) : '',
        ], route('admin.manuscripts.show', $a->manuscript));
    }
}
