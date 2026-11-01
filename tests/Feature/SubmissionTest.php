<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\Submission;
use App\Models\User;
use App\Notifications\ManuscriptSubmitted;
use App\Notifications\SubmissionReceipt;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class SubmissionTest extends TestCase
{
    use RefreshDatabase;

    private const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    protected function setUp(): void
    {
        parent::setUp();

        // routes/submissions.php is required from routes/web.php; load it here
        // too in case this branch runs before that line lands.
        if (! Route::has('submissions.file')) {
            Route::middleware('web')->group(base_path('routes/submissions.php'));
            Route::getRoutes()->refreshNameLookups();
            Route::getRoutes()->refreshActionLookups();
        }

        Page::create(['path' => 'submit-your-paper', 'title' => 'Submit your Paper', 'body' => '']);
        Storage::fake('local');
        Notification::fake();
        config(['journal.submissions_email' => 'editor@example.org']);
    }

    private function payload(array $overrides = []): array
    {
        return [
            'name' => 'Ana Author',
            'email' => 'ana@example.org',
            'title' => 'A study of things',
            'type' => 'Original scientific paper',
            'manuscript' => UploadedFile::fake()->create('paper.docx', 300, self::DOCX),
            'consent' => '1',
            'privacy' => '1',
            ...$overrides,
        ];
    }

    private function editorsNotification(): ManuscriptSubmitted
    {
        $sent = null;

        Notification::assertSentTo(
            new AnonymousNotifiable,
            ManuscriptSubmitted::class,
            function (ManuscriptSubmitted $n, $channels, $notifiable) use (&$sent) {
                $sent = $n;

                return $notifiable->routes['mail'] === 'editor@example.org';
            },
        );

        return $sent;
    }

    public function test_a_manuscript_is_stored_privately_and_both_sides_are_notified(): void
    {
        $this->post(route('submissions.store'), $this->payload())
            ->assertRedirect('/submit-your-paper')
            ->assertSessionHas('submitted');

        $submission = Submission::sole();

        $this->assertSame('A study of things', $submission->title);
        $this->assertSame('paper.docx', $submission->file_name);
        $this->assertStringEndsWith('.docx', $submission->file_path);
        $this->assertNotNull($submission->privacy_accepted_at);
        Storage::disk('local')->assertExists($submission->file_path);

        $this->editorsNotification();
        Notification::assertSentTo(
            new AnonymousNotifiable,
            SubmissionReceipt::class,
            fn ($n, $channels, $notifiable) => $notifiable->routes['mail'] === 'ana@example.org',
        );
    }

    public function test_the_reference_is_stored_and_quoted_to_the_author(): void
    {
        $this->post(route('submissions.store'), $this->payload());

        $submission = Submission::sole();
        $expected = sprintf('MPB-%s-%04d', now()->format('Y'), $submission->id);

        $this->assertSame($expected, $submission->reference);
        $this->assertSame($expected, session('submitted'));

        Notification::assertSentTo(
            new AnonymousNotifiable,
            SubmissionReceipt::class,
            function (SubmissionReceipt $n, $channels, $notifiable) use ($expected) {
                $mail = $n->toMail($notifiable);

                return str_contains($mail->subject, $expected) && $mail->attachments === [];
            },
        );
    }

    public function test_signed_forms_and_suggested_reviewers_are_stored(): void
    {
        $reviewers = "Reviewer One, University A, one@example.org\nReviewer Two, University B, two@example.org\nReviewer Three, University C, three@example.org";

        $this->post(route('submissions.store'), $this->payload([
            'forms' => [
                UploadedFile::fake()->create('AUTHOR DISCLOSURE FORM.pdf', 120, 'application/pdf'),
                UploadedFile::fake()->create('ethical-responsibility.docx', 80, self::DOCX),
            ],
            'reviewers' => $reviewers,
        ]))->assertRedirect('/submit-your-paper')->assertSessionHasNoErrors();

        $submission = Submission::sole();

        $this->assertSame($reviewers, $submission->suggested_reviewers);
        $this->assertCount(2, $submission->forms);
        $this->assertSame('AUTHOR DISCLOSURE FORM.pdf', $submission->forms[0]['name']);
        $this->assertSame('ethical-responsibility.docx', $submission->forms[1]['name']);

        foreach ($submission->forms as $form) {
            Storage::disk('local')->assertExists($form['path']);
            $this->assertMatchesRegularExpression('#^submissions/\d{4}/[0-9a-f-]{36}\.(pdf|docx)$#', $form['path']);
        }

        $this->assertSame(['manuscript', 'form-1', 'form-2'], array_column($submission->files(), 'key'));
    }

    public function test_invalid_submissions_are_rejected(): void
    {
        $this->post(route('submissions.store'), $this->payload([
            'email' => 'not-an-email',
            'manuscript' => UploadedFile::fake()->create('virus.exe', 10),
            'consent' => null,
            'privacy' => null,
        ]))->assertSessionHasErrors(['email', 'manuscript', 'consent', 'privacy']);

        $this->assertSame(0, Submission::count());
    }

    public function test_a_renamed_file_is_rejected_by_content(): void
    {
        // Named .docx, but the content is an executable.
        $this->post(route('submissions.store'), $this->payload([
            'manuscript' => UploadedFile::fake()->create('paper.docx', 10, 'application/x-msdownload'),
        ]))->assertSessionHasErrors('manuscript');

        $this->assertSame(0, Submission::count());
    }

    public function test_too_many_or_wrong_signed_forms_are_rejected(): void
    {
        $pdf = fn (string $name) => UploadedFile::fake()->create($name, 10, 'application/pdf');

        $this->post(route('submissions.store'), $this->payload([
            'forms' => [$pdf('a.pdf'), $pdf('b.pdf'), $pdf('c.pdf')],
        ]))->assertSessionHasErrors('forms');

        $this->post(route('submissions.store'), $this->payload([
            'forms' => [UploadedFile::fake()->create('scan.odt', 10, 'application/vnd.oasis.opendocument.text')],
        ]))->assertSessionHasErrors('forms.0');

        $this->assertSame(0, Submission::count());
    }

    public function test_the_paper_types_follow_the_instructions(): void
    {
        $this->assertSame(
            ['Original scientific paper', 'Short communication', 'Review paper', 'Professional paper'],
            Submission::TYPES,
        );

        $this->post(route('submissions.store'), $this->payload(['type' => 'Case report']))
            ->assertSessionHasErrors('type');
    }

    public function test_errors_are_specific_and_translatable(): void
    {
        $this->post(route('submissions.store'), [])
            ->assertSessionHasErrors([
                'name' => 'Enter the name of the corresponding author.',
                'email' => 'Enter an e-mail address.',
                'manuscript' => 'Choose the manuscript file to upload.',
                'privacy' => 'Confirm that you have read the privacy notice.',
            ]);
    }

    public function test_the_attachment_name_is_sanitised(): void
    {
        $this->post(route('submissions.store'), $this->payload([
            'manuscript' => UploadedFile::fake()->create('..\\evil"name<script>.docx', 20, self::DOCX),
        ]))->assertSessionHasNoErrors();

        $name = Submission::sole()->file_name;

        $this->assertDoesNotMatchRegularExpression('#[\\\\/"<>]#', $name);
        $this->assertStringEndsWith('.docx', $name);

        $this->assertSame('Труд за HPLC (v2).pdf', Submission::safeFileName('C:\\fakepath\\Труд за HPLC (v2).PDF', 'pdf'));
        $this->assertSame('file.pdf', Submission::safeFileName('"".pdf', 'pdf'));
    }

    public function test_large_files_are_linked_not_attached_and_links_are_signed(): void
    {
        $this->post(route('submissions.store'), $this->payload([
            'manuscript' => UploadedFile::fake()->create('big.pdf', 15 * 1024, 'application/pdf'),
            'forms' => [UploadedFile::fake()->create('form.pdf', 200, 'application/pdf')],
        ]))->assertSessionHasNoErrors();

        $submission = Submission::sole();
        $notification = $this->editorsNotification();
        $mail = $notification->toMail(new AnonymousNotifiable);

        // Only the small form is attached; nothing over 10 MB goes by e-mail.
        $attachedKeys = array_column($notification->attachedFiles(), 'key');
        $this->assertSame(['form-1'], $attachedKeys);
        $this->assertCount(1, $mail->attachments);
        $this->assertSame('form.pdf', $mail->attachments[0]['options']['as']);

        foreach ($notification->attachedFiles() as $file) {
            $this->assertLessThanOrEqual(Submission::ATTACHMENT_LIMIT_BYTES, $file['size']);
        }

        // Every file has a signed link in the mail, valid for 30 days.
        $body = implode("\n", $mail->introLines);
        preg_match_all('#\((https?://[^)\s]+/submissions/\d+/files/[a-z0-9-]+\?[^)\s]+)\)#', $body, $links);
        $this->assertCount(2, $links[1]);

        $manuscriptUrl = $links[1][0];
        $this->assertStringContainsString('/files/manuscript?', $manuscriptUrl);
        $this->assertTrue(URL::hasValidSignature(request()->create($manuscriptUrl)));

        parse_str((string) parse_url($manuscriptUrl, PHP_URL_QUERY), $query);
        $this->assertEqualsWithDelta(now()->addDays(30)->getTimestamp(), (int) $query['expires'], 120);

        $this->get($manuscriptUrl)
            ->assertOk()
            ->assertDownload('big.pdf');

        $this->travel(31)->days();
        $this->get($manuscriptUrl)->assertForbidden();
    }

    public function test_file_links_need_a_valid_signature(): void
    {
        $this->post(route('submissions.store'), $this->payload());
        $submission = Submission::sole();

        $this->get("/submissions/{$submission->id}/files/manuscript")->assertForbidden();

        $tampered = str_replace('/files/manuscript', '/files/form-1', $submission->fileUrl('manuscript', now()->addHour()));
        $this->get($tampered)->assertForbidden();

        $this->get($submission->fileUrl('form-1', now()->addHour()))->assertNotFound();
    }

    public function test_the_spam_trap_silently_drops_bots(): void
    {
        $this->post(route('submissions.store'), $this->payload(['website' => 'http://spam.example']));

        $this->assertSame(0, Submission::count());
        Notification::assertNothingSent();
    }

    public function test_without_an_editors_address_the_submission_is_still_kept(): void
    {
        config(['journal.submissions_email' => null]);

        $this->post(route('submissions.store'), $this->payload())->assertRedirect('/submit-your-paper');

        $this->assertSame(1, Submission::count());
        Notification::assertNotSentTo(new AnonymousNotifiable, ManuscriptSubmitted::class);
    }

    public function test_the_page_offers_the_form(): void
    {
        $this->get('/submit-your-paper')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('journal/page')
                ->has('submission.types', count(Submission::TYPES))
                ->where('submission.maxMb', 20));
    }

    public function test_guests_cannot_see_the_admin_list_or_export(): void
    {
        $this->get('/admin/submissions')->assertRedirect(route('login'));
        $this->get('/admin/submissions/export')->assertRedirect(route('login'));
    }

    public function test_editors_see_the_list_with_signed_file_links(): void
    {
        $this->post(route('submissions.store'), $this->payload([
            'forms' => [UploadedFile::fake()->create('form.pdf', 50, 'application/pdf')],
            'reviewers' => 'Reviewer One, University A, one@example.org',
        ]));
        $this->post(route('submissions.store'), $this->payload(['title' => 'Second manuscript']));

        $editor = User::factory()->create();

        $this->actingAs($editor)
            ->get('/admin/submissions')
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('admin/submissions/index')
                ->has('submissions', 2)
                ->where('submissions.0.title', 'Second manuscript')
                ->where('submissions.1.reviewers', 'Reviewer One, University A, one@example.org')
                ->has('submissions.1.files', 2)
                ->where('pagination.total', 2)
                ->where('totalAll', 2));

        $this->actingAs($editor)
            ->get('/admin/submissions?q=Second')
            ->assertInertia(fn ($page) => $page->has('submissions', 1));

        $url = Submission::where('title', 'A study of things')->sole()->fileUrl('form-1', now()->addHour());
        $this->assertTrue(URL::hasValidSignature(request()->create($url)));
        $this->get($url)->assertOk()->assertDownload('form.pdf');
    }

    public function test_editors_can_export_csv(): void
    {
        $this->post(route('submissions.store'), $this->payload(['title' => '=HYPERLINK("http://evil")', 'name' => 'Ана Авторка']));

        $response = $this->actingAs(User::factory()->create())->get('/admin/submissions/export');

        $response->assertOk();
        $this->assertStringStartsWith('text/csv', $response->headers->get('Content-Type'));

        $csv = $response->streamedContent();
        $this->assertStringStartsWith("\xEF\xBB\xBFReference,", $csv);
        $this->assertStringContainsString(Submission::sole()->reference, $csv);
        $this->assertStringContainsString('Ана Авторка', $csv);
        // Formula neutralised.
        $this->assertStringContainsString("'=HYPERLINK", $csv);
    }

    public function test_the_create_editor_command_creates_and_updates_a_verified_user(): void
    {
        $this->artisan('journal:create-editor', ['email' => 'Editor@Example.org', 'name' => 'Marija Editor'])
            ->expectsOutputToContain('Password:')
            ->assertSuccessful();

        $user = User::sole();
        $this->assertSame('editor@example.org', $user->email);
        $this->assertNotNull($user->email_verified_at);
        $hash = $user->password;

        $this->artisan('journal:create-editor', ['email' => 'editor@example.org', 'name' => 'Marija G. Editor'])
            ->assertSuccessful();

        $user->refresh();
        $this->assertSame(1, User::count());
        $this->assertSame('Marija G. Editor', $user->name);
        $this->assertNotSame($hash, $user->password);

        $this->artisan('journal:create-editor', ['email' => 'not-an-email', 'name' => 'X'])->assertFailed();
    }
}
