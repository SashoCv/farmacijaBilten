<?php

namespace App\Mail;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Notifications\Notification as BaseNotification;
use Illuminate\Support\Facades\Notification;

/**
 * Messages for the editorial office (new manuscript, revised manuscript,
 * reviewer accepted or declined, review received) go to the editorial
 * mailbox (config journal.editorial_email), in Macedonian. Without a
 * mailbox they go to every active editorial office account.
 */
final class EditorialOffice
{
    public static function notify(BaseNotification $notification): void
    {
        $mailbox = config('journal.editorial_email');

        if (filled($mailbox)) {
            Notification::route('mail', [(string) $mailbox => (string) config('journal.name_en')])
                ->notify($notification->locale((string) config('journal.editorial_locale', 'mk')));

            return;
        }

        $editors = User::withRole(Role::Admin)->active()->get();

        if ($editors->isNotEmpty()) {
            Notification::send($editors, $notification);
        }
    }
}
