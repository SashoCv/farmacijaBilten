<?php

namespace App\Notifications\Reviews;

use App\Mail\TemplatedMail;
use App\Models\ReviewerInvite;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\URL;

/** Invitation to join the journal's list of reviewers: create an account. */
class ReviewerListInvitation extends ReviewMail
{
    /** Days the link stays valid (a new e-mail gives a new link). */
    public const VALID_DAYS = 60;

    public function __construct(public ReviewerInvite $invite, public string $token)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        return TemplatedMail::make('reviewer_list_invitation', [
            'name' => $this->invite->name(),
            'message' => (string) $this->invite->message,
        ], self::url($this->invite, $this->token));
    }

    public static function url(ReviewerInvite $invite, string $token): string
    {
        return URL::temporarySignedRoute('reviewer-signup.show', now()->addDays(self::VALID_DAYS), ['invite' => $invite->id, 'token' => $token]);
    }
}
