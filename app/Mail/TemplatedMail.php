<?php

namespace App\Mail;

use App\Models\MailTemplate;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

/**
 * Builds a notification e-mail from its template (the editorial office's
 * wording if saved, else the default) in the current language.
 */
final class TemplatedMail
{
    /**
     * @param  array<string, string|null>  $vars  placeholder values (plain text)
     */
    public static function make(string $key, array $vars, ?string $actionUrl = null, ?string $locale = null): MailMessage
    {
        $locale = in_array($locale ?? app()->getLocale(), ['en', 'mk'], true) ? ($locale ?? app()->getLocale()) : 'en';
        [$subject, $body] = self::text($key, $locale);

        return self::build($key, $subject, $body, $vars, $actionUrl, $locale);
    }

    /**
     * The same from a given subject and body (the editor's preview of unsaved text).
     *
     * @param  array<string, string|null>  $vars
     */
    public static function build(string $key, string $subject, string $body, array $vars, ?string $actionUrl, string $locale): MailMessage
    {
        $template = MailTemplates::get($key) ?? throw new InvalidArgumentException("Unknown mail template {$key}.");

        $journal = $locale === 'mk' ? (string) config('journal.name_mk') : (string) config('journal.name_en');
        $vars = ['journal' => $journal, ...$vars];

        $mail = (new MailMessage)
            ->subject(self::fill($subject, $vars))
            ->salutation(__('Editorial office, :journal', ['journal' => $journal]));

        if ($editorial = config('journal.editorial_email')) {
            $mail->replyTo($editorial);
        }

        $button = false;

        foreach (self::paragraphs(self::fill($body, $vars, keepButton: true)) as $paragraph) {
            if ($paragraph === '{button}') {
                if ($actionUrl !== null && $template['action'] !== null && ! $button) {
                    $mail->action($template['action'][$locale], $actionUrl);
                    $button = true;
                }

                continue;
            }

            $mail->line($paragraph);
        }

        // A template edited without {button} still links to the page.
        if (! $button && $actionUrl !== null && $template['action'] !== null) {
            $mail->action($template['action'][$locale], $actionUrl);
        }

        return $mail;
    }

    /**
     * Subject and body in a language: the saved wording or the default.
     *
     * @return array{0: string, 1: string}
     */
    public static function text(string $key, string $locale): array
    {
        $default = MailTemplates::get($key) ?? throw new InvalidArgumentException("Unknown mail template {$key}.");
        $saved = Schema::hasTable('mail_templates')
            ? MailTemplate::where('key', $key)->where('locale', $locale)->first()
            : null;

        return [$saved->subject ?? $default['subject'][$locale], $saved->body ?? $default['body'][$locale]];
    }

    /** @param  array<string, string|null>  $vars */
    public static function fill(string $text, array $vars, bool $keepButton = false): string
    {
        return (string) preg_replace_callback('/\{([a-z_]+)\}/', function (array $m) use ($vars, $keepButton) {
            if ($m[1] === 'button') {
                return $keepButton ? '{button}' : '';
            }

            return array_key_exists($m[1], $vars) ? trim((string) $vars[$m[1]]) : $m[0];
        }, $text);
    }

    /**
     * Paragraphs of the body; empty ones (an empty placeholder such as
     * {message}) are dropped. Multi-paragraph values (letters) stay apart.
     *
     * @return list<string>
     */
    private static function paragraphs(string $body): array
    {
        $parts = preg_split('/\R{2,}/u', str_replace("\r\n", "\n", $body)) ?: [];

        return array_values(array_filter(array_map('trim', $parts), fn (string $p) => $p !== ''));
    }
}
