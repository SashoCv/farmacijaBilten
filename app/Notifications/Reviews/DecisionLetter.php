<?php

namespace App\Notifications\Reviews;

use App\Mail\TemplatedMail;
use App\Models\Manuscript;
use App\Models\ManuscriptDecision;
use Illuminate\Notifications\Messages\MailMessage;

/** The editorial decision and its letter, to the submitting author. */
class DecisionLetter extends ReviewMail
{
    public function __construct(public Manuscript $manuscript, public ManuscriptDecision $decision)
    {
        parent::__construct();
    }

    public function toMail(object $notifiable): MailMessage
    {
        $m = $this->manuscript;

        return TemplatedMail::make('decision', [
            'name' => $notifiable->name ?? '',
            'title' => $m->title,
            'reference' => $m->reference,
            'decision' => __($this->decision->type->label()),
            'letter' => $this->decision->letter,
        ], route('author.manuscripts.show', $m));
    }
}
