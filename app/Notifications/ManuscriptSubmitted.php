<?php

namespace App\Notifications;

use App\Models\Submission;
use Carbon\CarbonImmutable;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Number;

/**
 * Tells the editorial office about a new manuscript.
 *
 * Every file gets a signed download link that works for 30 days. Files are
 * also attached while the attachments stay within 10 MB in total, so large
 * manuscripts never bounce off the university mail server. The admin list
 * (/admin/submissions) keeps everything reachable after the links expire.
 */
class ManuscriptSubmitted extends Notification implements ShouldQueue
{
    use Queueable;

    public const LINK_DAYS = 30;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [60, 300];

    public function __construct(public Submission $submission) {}

    /** @return list<string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function linksExpireAt(): CarbonImmutable
    {
        return CarbonImmutable::instance($this->submission->created_at ?? now())->addDays(self::LINK_DAYS);
    }

    /**
     * The files that fit in the e-mail, in order, within ATTACHMENT_LIMIT_BYTES.
     *
     * @return list<array{key: string, kind: string, path: string, name: string, size: int}>
     */
    public function attachedFiles(): array
    {
        $attached = [];
        $total = 0;

        foreach ($this->submission->files() as $file) {
            if ($total + $file['size'] <= Submission::ATTACHMENT_LIMIT_BYTES) {
                $attached[] = $file;
                $total += $file['size'];
            }
        }

        return $attached;
    }

    public function toMail(object $notifiable): MailMessage
    {
        $s = $this->submission;
        $expires = $this->linksExpireAt();
        $attached = array_column($this->attachedFiles(), 'key');

        $mail = (new MailMessage)
            ->subject("New submission {$s->reference}: {$s->title}")
            ->replyTo($s->email, $s->name)
            ->greeting("New submission {$s->reference}")
            ->line("**Title:** {$s->title}")
            ->line("**Type:** {$s->type}")
            ->line("**Corresponding author:** {$s->name} <{$s->email}>")
            ->line('**Affiliation:** '.($s->affiliation ?: '—'))
            ->line('**Submitted:** '.$s->created_at?->format('j M Y, H:i T'));

        foreach (['Suggested reviewers' => $s->suggested_reviewers, 'Message to the editor' => $s->message] as $label => $text) {
            if (filled($text)) {
                $mail->line("**{$label}:**");

                foreach (preg_split('/\R+/', trim((string) $text)) ?: [] as $paragraph) {
                    $mail->line($paragraph);
                }
            }
        }

        $mail->line('**Files** (download links valid until '.$expires->format('j M Y').'):');

        // Without the route (routes/submissions.php) the files are still
        // listed, so a missing link never stops the editors being told.
        $links = Route::has('submissions.file');

        if (! $links) {
            Log::error("Submission {$s->reference}: route submissions.file is missing; the editors' e-mail has no download links.");
        }

        foreach ($s->files() as $file) {
            $label = $file['kind'] === 'manuscript' ? 'Manuscript' : 'Signed form';
            $note = in_array($file['key'], $attached, true) ? 'attached' : 'too large to attach, use the link';
            $name = $links ? "[{$file['name']}](".$s->fileUrl($file['key'], $expires).')' : $file['name'];

            $mail->line("{$label}: {$name} (".Number::fileSize($file['size'], 1).", {$note})");
        }

        foreach ($this->attachedFiles() as $file) {
            $mail->attach(Storage::disk('local')->path($file['path']), ['as' => $file['name']]);
        }

        return $mail
            ->action('Open the submissions list', url('admin/submissions'))
            ->line('Reply to this e-mail to write to the corresponding author.')
            ->salutation('Macedonian Pharmaceutical Bulletin website');
    }
}
