<?php

namespace App\Notifications\Manuscripts;

use App\Mail\TemplatedMail;
use App\Models\Manuscript;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Tells the editorial office a manuscript arrived; the text stays in the system. */
class NewManuscriptForEditors extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Manuscript $manuscript, public bool $revision = false)
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

        return TemplatedMail::make($this->revision ? 'revision_received' : 'new_manuscript', [
            'title' => $m->title,
            'reference' => $m->reference,
            'type' => $m->typeLabel(),
            'author' => $m->submitter->name,
        ], route('admin.manuscripts.show', $m));
    }
}
