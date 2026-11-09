<?php

namespace App\Notifications\Manuscripts;

use App\Mail\TemplatedMail;
use App\Models\Manuscript;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Receipt for the author who sent the manuscript, in their language. */
class ManuscriptReceived extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Manuscript $manuscript)
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $m = $this->manuscript;

        return TemplatedMail::make('manuscript_received', [
            'name' => $notifiable->name ?? '',
            'title' => $m->title,
            'reference' => $m->reference,
        ], route('author.manuscripts.show', $m));
    }
}
