<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Mail\MailTemplates;
use App\Mail\TemplatedMail;
use App\Models\MailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The wording of the e-mails the system sends, in English and Macedonian,
 * editable by the editorial office (with a preview and a reset to default).
 */
class MailTemplateAdminController extends Controller
{
    /** Sample values for the preview. */
    private const SAMPLE = [
        'name' => 'Ana Petrovska',
        'title' => 'Development and validation of an HPLC-UV method for paracetamol and caffeine in tablets',
        'reference' => 'MPB-2026-0042',
        'type' => 'Original scientific paper',
        'author' => 'Ana Petrovska',
        'reviewer' => 'Marko Stojanov',
        'decision' => 'Minor revision requested',
        'letter' => "Dear authors,\n\nThe reviewers found your manuscript interesting. Please address their comments below.\n\nReviewer 1:\nPlease add the validation data for robustness.",
        'message' => 'Your manuscript is now with two reviewers. We expect the reviews within three weeks.',
        'issue' => 'Volume 73, Issue 1',
        'doi' => 'DOI: https://doi.org/10.33320/maced.pharm.bull.2027.73.01.004',
        'answer_by' => '16 November 2026',
        'review_by' => '7 December 2026',
        'reason' => 'Reason: I am travelling this month.',
    ];

    public function index(): Response
    {
        $saved = MailTemplate::all()->groupBy('key');

        return Inertia::render('admin/mail-templates/index', [
            'templates' => collect(MailTemplates::all())->map(fn (array $t, string $key) => [
                'key' => $key,
                'audience' => $t['audience'],
                'description' => $t['description'],
                'subject' => TemplatedMail::text($key, App::getLocale() === 'mk' ? 'mk' : 'en')[0],
                'customised' => $saved->has($key),
                'updatedAt' => $saved->get($key)?->max('updated_at')?->toIso8601String(),
                'url' => route('admin.mail-templates.edit', $key),
            ])->values()->all(),
        ]);
    }

    public function edit(string $key): Response
    {
        $template = MailTemplates::get($key) ?? abort(404);

        $languages = [];

        foreach (['en', 'mk'] as $locale) {
            [$subject, $body] = TemplatedMail::text($key, $locale);
            $languages[$locale] = [
                'subject' => $subject,
                'body' => $body,
                'defaultSubject' => $template['subject'][$locale],
                'defaultBody' => $template['body'][$locale],
                'customised' => MailTemplate::where('key', $key)->where('locale', $locale)->exists(),
            ];
        }

        return Inertia::render('admin/mail-templates/edit', [
            'template' => [
                'key' => $key,
                'audience' => $template['audience'],
                'description' => $template['description'],
                'placeholders' => $template['placeholders'],
                'hasButton' => $template['action'] !== null,
                'languages' => $languages,
            ],
            'urls' => [
                'update' => route('admin.mail-templates.update', $key),
                'reset' => route('admin.mail-templates.reset', $key),
                'preview' => route('admin.mail-templates.preview', $key),
                'index' => route('admin.mail-templates.index'),
            ],
        ]);
    }

    public function update(Request $request, string $key): RedirectResponse
    {
        MailTemplates::get($key) ?? abort(404);

        $data = $request->validate([
            'en.subject' => ['required', 'string', 'max:300'],
            'en.body' => ['required', 'string', 'max:20000'],
            'mk.subject' => ['required', 'string', 'max:300'],
            'mk.body' => ['required', 'string', 'max:20000'],
        ]);

        foreach (['en', 'mk'] as $locale) {
            [$subject, $body] = [trim($data[$locale]['subject']), trim(str_replace("\r\n", "\n", $data[$locale]['body']))];
            $default = MailTemplates::get($key);

            // Text equal to the default is not stored, so later default improvements apply.
            if ($subject === $default['subject'][$locale] && $body === $default['body'][$locale]) {
                MailTemplate::where('key', $key)->where('locale', $locale)->delete();

                continue;
            }

            MailTemplate::updateOrCreate(
                ['key' => $key, 'locale' => $locale],
                ['subject' => $subject, 'body' => $body, 'updated_by' => $request->user()?->id],
            );
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('E-mail template saved.')]);

        return back();
    }

    public function reset(string $key): RedirectResponse
    {
        MailTemplates::get($key) ?? abort(404);
        MailTemplate::where('key', $key)->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('The template is back to its original wording.')]);

        return back();
    }

    /** The e-mail as it will look, from the (unsaved) text, with sample values. */
    public function preview(Request $request, string $key): JsonResponse
    {
        MailTemplates::get($key) ?? abort(404);

        $data = $request->validate([
            'locale' => ['required', 'in:en,mk'],
            'subject' => ['required', 'string', 'max:300'],
            'body' => ['required', 'string', 'max:20000'],
        ]);

        $previous = App::getLocale();
        App::setLocale($data['locale']);

        try {
            $mail = TemplatedMail::build($key, $data['subject'], $data['body'], self::SAMPLE, url('/'), $data['locale']);
            $html = (string) $mail->render();
        } finally {
            App::setLocale($previous);
        }

        return response()->json(['subject' => $mail->subject, 'html' => $html]);
    }
}
