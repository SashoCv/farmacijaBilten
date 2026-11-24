<?php

namespace App\Notifications\Reviews;

use App\Mail\TemplatedMail;
use App\Models\User;
use Illuminate\Notifications\Messages\MailMessage;

/** To someone with an account: the editorial office made them a reviewer. */
class ReviewerAdded extends ReviewMail
{
    public function __construct(public ?string $message = null)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        return TemplatedMail::make('reviewer_added', [
            'name' => $notifiable instanceof User ? $notifiable->name : __('colleague'),
            'message' => (string) $this->message,
        ], route('reviewer.reviews.index'));
    }
}
