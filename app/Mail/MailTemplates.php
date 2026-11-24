<?php

namespace App\Mail;

/**
 * Every e-mail the system sends, with its default subject and text in
 * English and Macedonian. The editorial office can change them under
 * Settings of the editorial office → E-mail templates (stored in
 * `mail_templates`); a template can always be reset to these defaults.
 *
 * Text format: paragraphs separated by a blank line; {placeholders} are
 * replaced; a paragraph that is just {button} places the button there; a
 * paragraph starting with "> " is shown as a quotation (letters).
 */
final class MailTemplates
{
    public const AUDIENCES = ['author', 'reviewer', 'editors'];

    /**
     * @return array<string, array{audience: string, description: string, placeholders: array<string, string>, action: array{en: string, mk: string}|null, subject: array{en: string, mk: string}, body: array{en: string, mk: string}}>
     */
    public static function all(): array
    {
        $journal = ['journal' => 'Name of the journal'];
        $manuscript = ['title' => 'Title of the manuscript', 'reference' => 'Reference (MPB-2026-0001)'];
        $person = ['name' => 'Name of the recipient'];

        return [
            'manuscript_received' => [
                'audience' => 'author',
                'description' => 'Receipt sent to the author who submitted a manuscript.',
                'placeholders' => $person + $manuscript + $journal,
                'action' => ['en' => 'Follow your manuscript', 'mk' => 'Следете го ракописот'],
                'subject' => ['en' => 'Manuscript received ({reference})', 'mk' => 'Ракописот е примен ({reference})'],
                'body' => [
                    'en' => "Dear {name},\n\nThank you for submitting “{title}” to the {journal}.\n\nYour reference is {reference}. Please quote it in any correspondence about this manuscript.\n\n{button}\n\nThe editorial office will contact you after the initial assessment.",
                    'mk' => "Почитувани {name},\n\nВи благодариме што го поднесовте ракописот „{title}“ до {journal}.\n\nВашата референца е {reference}. Ве молиме наведувајте ја во секоја преписка за овој ракопис.\n\n{button}\n\nРедакцијата ќе ве контактира по првичната проценка.",
                ],
            ],
            'decision' => [
                'audience' => 'author',
                'description' => 'The editorial decision with the letter written by the editor.',
                'placeholders' => $person + $manuscript + $journal + ['decision' => 'The decision (e.g. Minor revision requested)', 'letter' => 'The letter written in the decision form'],
                'action' => ['en' => 'Open your manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'Decision on your manuscript {reference}', 'mk' => 'Одлука за вашиот ракопис {reference}'],
                'body' => [
                    'en' => "Dear {name},\n\nThe editorial office has reached a decision on your manuscript “{title}”: **{decision}**.\n\n{letter}\n\n{button}",
                    'mk' => "Почитувани {name},\n\nРедакцијата донесе одлука за вашиот ракопис „{title}“: **{decision}**.\n\n{letter}\n\n{button}",
                ],
            ],
            'message_to_author' => [
                'audience' => 'author',
                'description' => 'A message the editorial office sends to the authors (a note marked "Send to the authors").',
                'placeholders' => $person + $manuscript + $journal + ['message' => 'The text of the message'],
                'action' => ['en' => 'Open your manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'Message about your manuscript {reference}', 'mk' => 'Порака за вашиот ракопис {reference}'],
                'body' => [
                    'en' => "Dear {name},\n\nA message from the editorial office about “{title}”:\n\n{message}\n\n{button}",
                    'mk' => "Почитувани {name},\n\nПорака од редакцијата за „{title}“:\n\n{message}\n\n{button}",
                ],
            ],
            'article_published' => [
                'audience' => 'author',
                'description' => 'The article is published online.',
                'placeholders' => $person + $manuscript + $journal + ['issue' => 'Volume and issue', 'doi' => 'DOI link'],
                'action' => ['en' => 'See the article', 'mk' => 'Погледнете го трудот'],
                'subject' => ['en' => 'Your article is published ({reference})', 'mk' => 'Вашиот труд е објавен ({reference})'],
                'body' => [
                    'en' => "Dear {name},\n\nWe are pleased to tell you that “{title}” is now published online in the {journal}, {issue}.\n\n{doi}\n\n{button}\n\nThank you for publishing with us.",
                    'mk' => "Почитувани {name},\n\nСо задоволство ве известуваме дека „{title}“ е објавен онлајн во {journal}, {issue}.\n\n{doi}\n\n{button}\n\nВи благодариме што објавувате кај нас.",
                ],
            ],
            'review_invitation' => [
                'audience' => 'reviewer',
                'description' => 'Invitation to review, with the personal sign-in link.',
                'placeholders' => $person + $manuscript + $journal + ['type' => 'Type of paper', 'answer_by' => 'Date to answer by', 'review_by' => 'Date the review is due', 'message' => 'The personal note added when inviting (may be empty)'],
                'action' => ['en' => 'See the invitation', 'mk' => 'Погледнете ја поканата'],
                'subject' => ['en' => 'Invitation to review for the {journal}', 'mk' => 'Покана за рецензија за {journal}'],
                'body' => [
                    'en' => "Dear {name},\n\nThe editorial office invites you to review a manuscript submitted to the {journal}:\n\n“{title}” ({type})\n\n{message}\n\nPlease accept or decline by {answer_by}. If you accept, the review is due by {review_by}.\n\n{button}\n\nThe link opens the invitation; if you have no account yet, you create one in one step. Please do not forward it.\n\nWe keep your name and e-mail address to manage this review (see the privacy statement on the journal website).",
                    'mk' => "Почитувани {name},\n\nРедакцијата ве поканува да рецензирате ракопис поднесен до {journal}:\n\n„{title}“ ({type})\n\n{message}\n\nВе молиме прифатете или одбијте до {answer_by}. Ако прифатите, рецензијата е потребна до {review_by}.\n\n{button}\n\nЛинкот ја отвора поканата; ако сè уште немате сметка, ја отворате во еден чекор. Ве молиме не го препраќајте.\n\nВашето име и е-адреса ги чуваме за водење на оваа рецензија (видете ја изјавата за приватност на веб-страницата на списанието).",
                ],
            ],
            'review_reminder_answer' => [
                'audience' => 'reviewer',
                'description' => 'Reminder to answer an invitation (sent automatically or by the editorial office).',
                'placeholders' => $person + $manuscript + $journal,
                'action' => ['en' => 'See the invitation', 'mk' => 'Погледнете ја поканата'],
                'subject' => ['en' => 'Reminder: invitation to review', 'mk' => 'Потсетник: покана за рецензија'],
                'body' => [
                    'en' => "Dear {name},\n\n“{title}”\n\nWe would be grateful for your answer to our invitation to review this manuscript.\n\n{button}",
                    'mk' => "Почитувани {name},\n\n„{title}“\n\nЌе бидеме благодарни за вашиот одговор на поканата за рецензија на овој ракопис.\n\n{button}",
                ],
            ],
            'review_reminder_review' => [
                'audience' => 'reviewer',
                'description' => 'Reminder that the review is due soon or overdue.',
                'placeholders' => $person + $manuscript + $journal + ['review_by' => 'Date the review is due'],
                'action' => ['en' => 'Open the review', 'mk' => 'Отворете ја рецензијата'],
                'subject' => ['en' => 'Reminder: your review for the {journal}', 'mk' => 'Потсетник: вашата рецензија за {journal}'],
                'body' => [
                    'en' => "Dear {name},\n\n“{title}”\n\nYour review is due by {review_by}. Thank you for your help.\n\n{button}",
                    'mk' => "Почитувани {name},\n\n„{title}“\n\nРецензијата е потребна до {review_by}. Ви благодариме за помошта.\n\n{button}",
                ],
            ],
            'invitation_withdrawn' => [
                'audience' => 'reviewer',
                'description' => 'The editorial office withdrew an invitation.',
                'placeholders' => $person + $manuscript + $journal,
                'action' => null,
                'subject' => ['en' => 'Review invitation withdrawn', 'mk' => 'Поканата за рецензија е повлечена'],
                'body' => [
                    'en' => "Dear {name},\n\nYour review of “{title}” is no longer needed. Thank you for your time and willingness to help.",
                    'mk' => "Почитувани {name},\n\nВашата рецензија на „{title}“ повеќе не е потребна. Ви благодариме за времето и подготвеноста да помогнете.",
                ],
            ],
            'reviewer_list_invitation' => [
                'audience' => 'reviewer',
                'description' => 'Invitation to join the journal’s list of reviewers and create an account (from the Reviewers page).',
                'placeholders' => $person + $journal + ['message' => 'The personal note added when inviting (may be empty)'],
                'action' => ['en' => 'Create your account', 'mk' => 'Отворете сметка'],
                'subject' => ['en' => 'Invitation to join the reviewers of the {journal}', 'mk' => 'Покана да станете рецензент на {journal}'],
                'body' => [
                    'en' => "Dear {name},\n\nThe editorial office invites you to join the list of reviewers of the {journal}.\n\n{message}\n\nWith a reviewer account you receive our invitations to review, read the manuscripts you agree to review and send your reviews. You see only the manuscripts you are invited to.\n\n{button}\n\nThe link is personal; please do not forward it. If you do not wish to join, simply ignore this e-mail.\n\nWe keep your name and e-mail address to manage reviews (see the privacy statement on the journal website).",
                    'mk' => "Почитувани {name},\n\nРедакцијата ве поканува да се приклучите кон рецензентите на {journal}.\n\n{message}\n\nСо рецензентска сметка ги добивате нашите покани за рецензија, ги читате ракописите што ќе прифатите да ги рецензирате и ги праќате рецензиите. Ги гледате само ракописите на кои сте поканети.\n\n{button}\n\nЛинкот е личен; ве молиме не го препраќајте. Ако не сакате да се приклучите, само занемарете ја оваа порака.\n\nВашето име и е-адреса ги чуваме за водење на рецензиите (видете ја изјавата за приватност на веб-страницата на списанието).",
                ],
            ],
            'reviewer_added' => [
                'audience' => 'reviewer',
                'description' => 'To someone who already has an account: they were added to the list of reviewers (from the Reviewers page).',
                'placeholders' => $person + $journal + ['message' => 'The personal note added when inviting (may be empty)'],
                'action' => ['en' => 'Open your reviews', 'mk' => 'Отворете ги рецензиите'],
                'subject' => ['en' => 'You are now a reviewer for the {journal}', 'mk' => 'Сега сте рецензент на {journal}'],
                'body' => [
                    'en' => "Dear {name},\n\nThe editorial office has added you to the list of reviewers of the {journal}. You can use your existing account.\n\n{message}\n\nOur invitations to review will come by e-mail and appear in your account. You see only the manuscripts you are invited to.\n\n{button}",
                    'mk' => "Почитувани {name},\n\nРедакцијата ве додаде во листата на рецензенти на {journal}. Ја користите постојната сметка.\n\n{message}\n\nНашите покани за рецензија ќе стигнуваат по е-пошта и ќе се појавуваат во вашата сметка. Ги гледате само ракописите на кои сте поканети.\n\n{button}",
                ],
            ],
            'new_manuscript' => [
                'audience' => 'editors',
                'description' => 'To the editorial office: a new manuscript arrived.',
                'placeholders' => $manuscript + $journal + ['type' => 'Type of paper', 'author' => 'Submitting author'],
                'action' => ['en' => 'Open the manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'New manuscript {reference}', 'mk' => 'Нов ракопис {reference}'],
                'body' => [
                    'en' => "A new manuscript has been submitted:\n\n“{title}”\n\n{type}, submitted by {author}.\n\n{button}",
                    'mk' => "Поднесен е нов ракопис:\n\n„{title}“\n\n{type}, поднесен од {author}.\n\n{button}",
                ],
            ],
            'revision_received' => [
                'audience' => 'editors',
                'description' => 'To the editorial office: the authors sent a revised manuscript.',
                'placeholders' => $manuscript + $journal + ['author' => 'Submitting author'],
                'action' => ['en' => 'Open the manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'Revised manuscript {reference}', 'mk' => 'Ревидиран ракопис {reference}'],
                'body' => [
                    'en' => "The authors have sent the revised manuscript with their response to the reviewers:\n\n“{title}”\n\n{button}",
                    'mk' => "Авторите го испратија ревидираниот ракопис со одговор до рецензентите:\n\n„{title}“\n\n{button}",
                ],
            ],
            'invitation_accepted' => [
                'audience' => 'editors',
                'description' => 'To the editorial office: a reviewer accepted.',
                'placeholders' => $manuscript + $journal + ['reviewer' => 'Name of the reviewer'],
                'action' => ['en' => 'Open the manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'Reviewer accepted – {reference}', 'mk' => 'Рецензентот прифати – {reference}'],
                'body' => [
                    'en' => "{reviewer} accepted to review “{title}”.\n\n{button}",
                    'mk' => "{reviewer} прифати да го рецензира „{title}“.\n\n{button}",
                ],
            ],
            'invitation_declined' => [
                'audience' => 'editors',
                'description' => 'To the editorial office: a reviewer declined.',
                'placeholders' => $manuscript + $journal + ['reviewer' => 'Name of the reviewer', 'reason' => 'Reason given (may be empty)'],
                'action' => ['en' => 'Open the manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'Reviewer declined – {reference}', 'mk' => 'Рецензентот одби – {reference}'],
                'body' => [
                    'en' => "{reviewer} declined to review “{title}”.\n\n{reason}\n\n{button}",
                    'mk' => "{reviewer} одби да го рецензира „{title}“.\n\n{reason}\n\n{button}",
                ],
            ],
            'review_received' => [
                'audience' => 'editors',
                'description' => 'To the editorial office: a review was submitted.',
                'placeholders' => $manuscript + $journal + ['reviewer' => 'Name of the reviewer'],
                'action' => ['en' => 'Open the manuscript', 'mk' => 'Отворете го ракописот'],
                'subject' => ['en' => 'Review received – {reference}', 'mk' => 'Примена рецензија – {reference}'],
                'body' => [
                    'en' => "{reviewer} submitted a review of “{title}”.\n\n{button}",
                    'mk' => "{reviewer} испрати рецензија за „{title}“.\n\n{button}",
                ],
            ],
        ];
    }

    /** @return array<string, mixed>|null */
    public static function get(string $key): ?array
    {
        return self::all()[$key] ?? null;
    }
}
