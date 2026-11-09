<?php

namespace App\Notifications\Manuscripts;

use App\Mail\TemplatedMail;
use App\Models\Manuscript;
use App\Models\ManuscriptNote;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** A message from the editorial office about the author's manuscript. */
class MessageFromEditors extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Manuscript $manuscript, public ManuscriptNote $note)
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
        return TemplatedMail::make('message_to_author', [
            'name' => $notifiable->name ?? '',
            'title' => $this->manuscript->title,
            'reference' => $this->manuscript->reference,
            'message' => $this->note->body,
        ], route('author.manuscripts.show', $this->manuscript));
    }
}
