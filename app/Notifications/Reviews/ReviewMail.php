<?php

namespace App\Notifications\Reviews;

use App\Models\ReviewAssignment;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\URL;

/**
 * Shared setup of the peer-review e-mails: queued after the commit, retried,
 * signed by the editorial office with Reply-To to its mailbox.
 */
abstract class ReviewMail extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct()
    {
        $this->afterCommit();
    }

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    protected function journal(): string
    {
        return app()->getLocale() === 'mk' ? (string) config('journal.name_mk') : (string) config('journal.name_en');
    }

    protected function mail(): MailMessage
    {
        $mail = (new MailMessage)->salutation(__('Editorial office, :journal', ['journal' => $this->journal()]));

        if ($editorial = config('journal.editorial_email')) {
            $mail->replyTo($editorial);
        }

        return $mail;
    }

    /** The invitation link: signed, valid until well after the answer date. */
    protected static function invitationUrl(ReviewAssignment $a, string $token): string
    {
        $expires = ($a->response_due_at ?? now())->copy()->addDays((int) config('journal.review.expire_after_days', 7) + 30);

        return URL::temporarySignedRoute('invitations.show', $expires, ['assignment' => $a->public_id, 'token' => $token]);
    }

    protected static function date(?\DateTimeInterface $date): string
    {
        return $date ? CarbonImmutable::instance($date)->settings(['locale' => app()->getLocale()])->translatedFormat('j F Y') : '—';
    }
}
