<?php

namespace App\Notifications;

use App\Models\Submission;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Receipt for the submitting author, with the reference to quote. It never
 * carries the files or links to them. Sent in the language the author used
 * on the site (the controller calls ->locale()).
 */
class SubmissionReceipt extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Submission $submission) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $s = $this->submission;
        $journal = app()->getLocale() === 'mk' ? config('journal.name_mk') : config('journal.name_en');

        $mail = (new MailMessage)
            ->subject(__('Manuscript received (:reference)', ['reference' => $s->reference]))
            ->greeting(__('Dear :name,', ['name' => $s->name]))
            ->line(__('Thank you for submitting “:title” to the :journal.', ['title' => $s->title, 'journal' => $journal]))
            ->line(__('Your reference is :reference. Please quote it in any correspondence about this manuscript.', ['reference' => $s->reference]))
            ->line(__('Files received:'));

        foreach ($s->files() as $file) {
            $mail->line('– '.$file['name']);
        }

        if ($editorial = config('journal.editorial_email')) {
            $mail->replyTo($editorial);
        }

        return $mail
            ->line(__('The editorial office will contact you after the initial assessment. Reply to this e-mail if you have any questions.'))
            ->salutation(__('Editorial office, :journal', ['journal' => $journal]));
    }
}
