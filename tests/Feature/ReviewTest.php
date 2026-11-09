<?php

namespace Tests\Feature;

use App\Enums\AssignmentStatus;
use App\Enums\ManuscriptStatus;
use App\Models\Manuscript;
use App\Models\ManuscriptDecision;
use App\Models\ReviewAssignment;
use App\Models\User;
use App\Notifications\Manuscripts\MessageFromEditors;
use App\Notifications\Reviews\DecisionLetter;
use App\Notifications\Reviews\InvitationAnswered;
use App\Notifications\Reviews\InvitationWithdrawn;
use App\Notifications\Reviews\ReviewInvitation;
use App\Notifications\Reviews\ReviewReceived;
use App\Notifications\Reviews\ReviewReminder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\TestCase;

/**
 * Peer review (docs/backoffice, release 2b): invitations by e-mail, the
 * reviewer's account and workspace, anonymity, reviews, decisions, the
 * revision round, reminders and the editorial statistics.
 */
class ReviewTest extends TestCase
{
    use RefreshDatabase;

    private User $author;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();

        Notification::fake();
        $this->author = User::factory()->author()->create(['email' => 'author@example.org', 'given_name' => 'Ana', 'family_name' => 'Avtorska']);
        $this->admin = User::factory()->admin()->create();
    }

    private function doc(string ...$paragraphs): array
    {
        return ['type' => 'doc', 'content' => array_map(
            fn (string $text) => ['type' => 'paragraph', 'content' => [['type' => 'text', 'text' => $text]]],
            $paragraphs,
        )];
    }

    /** A sent manuscript (status submitted). */
    private function submitted(): Manuscript
    {
        $this->actingAs($this->author)->post('/author/manuscripts', ['type' => 'original_scientific_paper', 'language' => 'en']);
        $m = Manuscript::latest('id')->firstOrFail();

        $content = [
            'title' => $this->doc('Sugars in juices'),
            'abstract' => $this->doc('Abstract text.'),
            'keywords' => ['a', 'b', 'c'],
            'authors' => [[
                'id' => 'a1', 'givenName' => 'Ana', 'familyName' => 'Avtorska', 'givenNameAlt' => 'Ана', 'familyNameAlt' => 'Авторска',
                'email' => 'author@example.org', 'orcid' => '', 'phone' => '+389 2 000', 'affiliations' => ['f1'], 'corresponding' => true,
            ], [
                'id' => 'a2', 'givenName' => 'Co', 'familyName' => 'Author', 'givenNameAlt' => 'Ко', 'familyNameAlt' => 'Автор',
                'email' => 'coauthor@example.org', 'orcid' => '', 'phone' => '', 'affiliations' => ['f1'], 'corresponding' => false,
            ]],
            'affiliations' => [['id' => 'f1', 'text' => 'Secret Faculty, Skopje', 'textAlt' => 'Таен факултет']],
            'sections' => [
                ['key' => 'introduction', 'heading' => 'Introduction', 'body' => $this->doc('Intro.')],
                ['key' => 'methods', 'heading' => 'Material and methods', 'body' => $this->doc('Methods.')],
                ['key' => 'results', 'heading' => 'Results and discussion', 'body' => $this->doc('Results.')],
                ['key' => 'conclusion', 'heading' => 'Conclusion', 'body' => $this->doc('Conclusion.')],
            ],
            'conflictOfInterest' => 'None.',
            'references' => $this->doc('Ref, A., 2020. Title. J. 1, 1.'),
            'summary' => ['title' => $this->doc('Шеќери'), 'abstract' => $this->doc('Апстракт.'), 'keywords' => ['а', 'б', 'в']],
        ];

        $this->actingAs($this->author)->putJson("/author/manuscripts/{$m->public_id}/draft", [
            'content' => $content,
            'submission' => [
                'suggestedReviewers' => [
                    ['name' => 'R1', 'affiliation' => 'U1', 'email' => 'r1@example.org'],
                    ['name' => 'R2', 'affiliation' => 'U2', 'email' => 'r2@example.org'],
                    ['name' => 'R3', 'affiliation' => 'U3', 'email' => 'r3@example.org'],
                ],
                'declarations' => array_fill_keys(array_keys(config('manuscript.declarations')), true),
            ],
            'type' => $m->type, 'language' => 'en', 'lock' => 1,
        ])->assertOk();

        $this->actingAs($this->author)->post("/author/manuscripts/{$m->public_id}/submit")->assertSessionHasNoErrors();

        return $m->fresh();
    }

    private function invite(Manuscript $m, string $email = 'reviewer@example.org'): ReviewAssignment
    {
        $this->actingAs($this->admin)
            ->post("/admin/manuscripts/{$m->public_id}/reviewers", ['email' => $email, 'name' => 'Dr Reviewer'])
            ->assertSessionHasNoErrors();

        return ReviewAssignment::where('email', $email)->latest('id')->firstOrFail();
    }

    /** The plain token from the invitation e-mail. */
    private function invitationUrl(ReviewAssignment $a): string
    {
        $url = null;
        $notifiable = User::where('email', $a->email)->first() ?? new AnonymousNotifiable;

        Notification::assertSentTo($notifiable, ReviewInvitation::class, function (ReviewInvitation $n) use ($a, &$url) {
            if ($n->assignment->is($a)) {
                $url = URL::temporarySignedRoute('invitations.show', now()->addDays(30), ['assignment' => $a->public_id, 'token' => $n->token]);
            }

            return true;
        });

        $this->assertNotNull($url);

        return (string) $url;
    }

    public function test_inviting_a_reviewer_sends_the_manuscript_to_review(): void
    {
        $m = $this->submitted();
        $a = $this->invite($m);

        $this->assertSame(ManuscriptStatus::UnderReview, $m->fresh()->status);
        $this->assertSame(AssignmentStatus::Invited, $a->status);
        $this->assertSame(1, $a->round);
        $this->assertSame(1, $a->number);
        $this->assertNotNull($a->token_hash);
        $this->assertTrue($a->review_due_at->gt($a->response_due_at));
        Notification::assertSentTo(new AnonymousNotifiable, ReviewInvitation::class);

        $types = $m->events()->orderBy('id')->pluck('type')->all();
        $this->assertSame(['submitted', 'under_review', 'reviewer_invited'], $types);

        // Not an author, not twice, and only by the editorial office.
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/reviewers", ['email' => 'COAUTHOR@example.org'])->assertSessionHasErrors('email');
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/reviewers", ['email' => 'reviewer@example.org'])->assertSessionHasErrors('email');
        $this->actingAs($this->author)->post("/admin/manuscripts/{$m->public_id}/reviewers", ['email' => 'x@example.org'])->assertForbidden();
    }

    public function test_a_new_reviewer_creates_an_account_from_the_link_and_accepts(): void
    {
        $m = $this->submitted();
        $a = $this->invite($m);
        $url = $this->invitationUrl($a);
        auth()->logout();

        // Without the right secret the invitation is closed.
        $this->get(URL::temporarySignedRoute('invitations.show', now()->addDay(), ['assignment' => $a->public_id, 'token' => 'wrong']))
            ->assertInertia(fn (Assert $page) => $page->component('auth/invitation')->where('mode', 'closed'));

        $this->get($url)->assertOk()->assertInertia(fn (Assert $page) => $page
            ->component('auth/invitation')
            ->where('mode', 'create')
            ->where('email', 'reviewer@example.org')
            ->where('manuscript.title', 'Sugars in juices')
            // The invitation never shows who wrote it.
            ->where('manuscript.abstractHtml', fn (string $html) => ! str_contains($html, 'Avtorska') && ! str_contains($html, 'Secret Faculty') && str_contains($html, 'Abstract text.'))
        );

        $this->post($url, [
            'given_name' => 'Rev', 'family_name' => 'Iewer', 'affiliation' => 'Uni', 'country_code' => 'SI',
            'password' => 'correct horse battery staple', 'password_confirmation' => 'correct horse battery staple', 'privacy' => '1',
        ])->assertRedirect(route('reviewer.reviews.show', $a));

        $reviewer = User::where('email', 'reviewer@example.org')->sole();
        $this->assertAuthenticatedAs($reviewer);
        $this->assertNotNull($reviewer->email_verified_at);
        $this->assertSame(['reviewer'], $reviewer->roleNames());

        // Before accepting: title page and abstract only.
        $this->get(route('reviewer.reviews.show', $a))->assertInertia(fn (Assert $page) => $page
            ->component('reviewer/reviews/show')
            ->where('assignment.status', 'invited')
            ->where('manuscript.docxUrl', null)
            ->where('manuscript.html', fn (string $html) => ! str_contains($html, 'Results.'))
        );

        $this->post(route('reviewer.reviews.respond', $a), ['decision' => 'accept', 'competing_interests' => 'none'])
            ->assertRedirect(route('reviewer.reviews.show', $a));

        $this->assertSame(AssignmentStatus::Accepted, $a->fresh()->status);
        Notification::assertSentTo($this->admin, InvitationAnswered::class);

        // After accepting: the whole text, still without the authors.
        $this->get(route('reviewer.reviews.show', $a))->assertInertia(fn (Assert $page) => $page
            ->where('assignment.status', 'accepted')
            ->where('manuscript.html', fn (string $html) => str_contains($html, 'Results.') && ! str_contains($html, 'Avtorska') && ! str_contains($html, 'author@example.org') && ! str_contains($html, 'Secret Faculty'))
        );

        // The reviewer cannot open the authors' pages of the manuscript.
        $this->get("/author/manuscripts/{$m->public_id}")->assertForbidden();
        $this->get("/admin/manuscripts/{$m->public_id}")->assertForbidden();

        // The Word file is anonymised for reviewers.
        $response = $this->get("/manuscripts/{$m->public_id}/docx")->assertOk();
        $zip = new \ZipArchive;
        $zip->open($response->getFile()->getPathname());
        $xml = (string) $zip->getFromName('word/document.xml');
        $this->assertStringNotContainsString('Avtorska', $xml);
        $this->assertStringNotContainsString('Secret Faculty', $xml);
    }

    public function test_an_existing_user_signs_in_and_a_wrong_account_is_refused(): void
    {
        $existing = User::factory()->author()->create(['email' => 'prof@example.org']);
        $m = $this->submitted();
        $a = $this->invite($m, 'prof@example.org');
        $url = $this->invitationUrl($a);

        auth()->logout();
        $this->get($url)->assertInertia(fn (Assert $page) => $page->where('mode', 'sign_in'));
        $this->assertSame(route('reviewer.reviews.show', $a), session('url.intended'));

        $this->actingAs(User::factory()->create(['email' => 'someone@example.org']))->get($url)
            ->assertInertia(fn (Assert $page) => $page->where('mode', 'wrong_account')->where('signedInAs', 'someone@example.org'));
        $this->post(route('reviewer.reviews.respond', $a), ['decision' => 'accept', 'competing_interests' => 'none'])->assertForbidden();

        $this->actingAs($existing)->get($url)->assertRedirect(route('reviewer.reviews.show', $a));
        $this->post(route('reviewer.reviews.respond', $a), ['decision' => 'decline', 'decline_reason' => 'Too busy'])->assertRedirect();
        $this->assertSame(AssignmentStatus::Declined, $a->fresh()->status);
        $this->assertSame('Too busy', $a->fresh()->decline_reason);
    }

    public function test_the_full_cycle_review_decision_revision_and_second_round(): void
    {
        Storage::fake('local');
        $m = $this->submitted();
        $a = $this->invite($m);
        $reviewer = User::factory()->create(['email' => 'reviewer@example.org']);
        $a->forceFill(['reviewer_id' => $reviewer->id])->save();

        $this->actingAs($reviewer)->post(route('reviewer.reviews.respond', $a), ['decision' => 'accept', 'competing_interests' => 'declared', 'competing_interests_note' => 'Former colleague'])->assertRedirect();

        // Draft, files, then submit.
        $this->actingAs($reviewer)->putJson(route('reviewer.reviews.update', $a), ['recommendation' => 'major_revision', 'comments_to_author' => 'Please add controls.', 'comments_to_editor' => 'Weak paper.'])->assertOk();
        $toAuthor = $this->actingAs($reviewer)->post(route('reviewer.reviews.files.store', $a), ['file' => UploadedFile::fake()->create('annotated.pdf', 20, 'application/pdf'), 'visibility' => 'author'], ['Accept' => 'application/json'])->assertCreated();
        $this->actingAs($reviewer)->post(route('reviewer.reviews.files.store', $a), ['file' => UploadedFile::fake()->create('notes.pdf', 20, 'application/pdf'), 'visibility' => 'editor'], ['Accept' => 'application/json'])->assertCreated();
        $this->actingAs($reviewer)->post(route('reviewer.reviews.files.store', $a), ['file' => UploadedFile::fake()->create('virus.exe', 1), 'visibility' => 'editor'], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->actingAs($reviewer)->post(route('reviewer.reviews.submit', $a), ['recommendation' => '', 'comments_to_author' => ''])->assertSessionHasErrors(['recommendation', 'comments_to_author']);
        $this->actingAs($reviewer)->post(route('reviewer.reviews.submit', $a), ['recommendation' => 'major_revision', 'comments_to_author' => 'Please add controls.', 'comments_to_editor' => 'Weak paper.'])->assertRedirect();
        $this->assertSame(AssignmentStatus::Submitted, $a->fresh()->status);
        Notification::assertSentTo($this->admin, ReviewReceived::class);

        // Submitted reviews cannot be changed.
        $this->actingAs($reviewer)->putJson(route('reviewer.reviews.update', $a), ['comments_to_author' => 'changed'])->assertForbidden();

        // The editorial office sees everything, including confidential comments.
        $this->actingAs($this->admin)->get("/admin/manuscripts/{$m->public_id}")->assertInertia(fn (Assert $page) => $page
            ->where('reviews.assignments.0.review.commentsToEditor', 'Weak paper.')
            ->where('reviews.assignments.0.competingInterests', 'Former colleague')
            ->has('reviews.assignments.0.review.files', 2)
            ->where('reviews.decision.canDecide', true)
        );

        // Decision: major revision.
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/decision", ['type' => 'major_revision', 'letter' => "Dear authors,\n\nReviewer 1: Please add controls."])->assertSessionHasNoErrors();
        $m->refresh();
        $this->assertSame(ManuscriptStatus::RevisionRequested, $m->status);
        $this->assertNotNull($m->revision_due_at);
        Notification::assertSentTo($this->author, DecisionLetter::class);

        // The author sees "Reviewer 1", their comments and files for authors — never names or confidential notes.
        $this->actingAs($this->author)->get("/author/manuscripts/{$m->public_id}")->assertInertia(fn (Assert $page) => $page
            ->where('decisions.0.type', 'major_revision')
            ->where('decisions.0.reviews.0.number', 1)
            ->where('decisions.0.reviews.0.commentsToAuthor', 'Please add controls.')
            ->has('decisions.0.reviews.0.files', 1)
            ->missing('decisions.0.reviews.0.commentsToEditor')
            ->missing('decisions.0.reviews.0.name')
            ->whereNot('editUrl', null)
        );
        $this->actingAs($this->author)->get($toAuthor->json('url'))->assertOk();

        // Resubmitting needs a response to the reviewers.
        $this->actingAs($this->author)->post("/author/manuscripts/{$m->public_id}/submit")->assertSessionHasErrors('manuscript');
        $draft = $m->draft->content;
        $this->actingAs($this->author)->putJson("/author/manuscripts/{$m->public_id}/draft", [
            'content' => $draft,
            'submission' => [...(array) $m->submission_data, 'responseToReviewers' => 'We added controls.'],
            'type' => $m->type, 'language' => 'en', 'lock' => $m->draft->lock_version,
        ])->assertOk();
        $this->actingAs($this->author)->post("/author/manuscripts/{$m->public_id}/submit")->assertSessionHasNoErrors();

        $m->refresh();
        $this->assertSame(ManuscriptStatus::Resubmitted, $m->status);
        $this->assertSame(2, $m->versions()->count());
        $this->assertSame('We added controls.', $m->latestVersion()->response_letter);

        // Second round: the same reviewer keeps number 1 and sees the response.
        $this->invite($m);
        $second = ReviewAssignment::where('round', 2)->sole();
        $this->assertSame(1, $second->number);
        $this->assertSame(2, $m->fresh()->current_round);
        $second->forceFill(['reviewer_id' => $reviewer->id])->save();
        $this->actingAs($reviewer)->post(route('reviewer.reviews.respond', $second), ['decision' => 'accept', 'competing_interests' => 'none']);
        $this->actingAs($reviewer)->get(route('reviewer.reviews.show', $second))
            ->assertInertia(fn (Assert $page) => $page->where('manuscript.responseToReviewers', 'We added controls.'));

        // Acceptance closes the round.
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/decision", ['type' => 'accept', 'letter' => 'Accepted.'])->assertSessionHasNoErrors();
        $this->assertSame(ManuscriptStatus::Accepted, $m->fresh()->status);
        $this->assertSame(AssignmentStatus::Cancelled, $second->fresh()->status);
        $this->assertSame(2, ManuscriptDecision::count());
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/decision", ['type' => 'reject', 'letter' => 'x'])->assertSessionHasErrors('type');

        $this->expectException(LogicException::class);
        ManuscriptDecision::first()->update(['letter' => 'changed']);
    }

    public function test_reminders_and_expiry(): void
    {
        $m = $this->submitted();
        $late = $this->invite($m, 'late@example.org');
        $gone = $this->invite($m, 'gone@example.org');
        $late->forceFill(['response_due_at' => now()->subDay()])->save();
        $gone->forceFill(['response_due_at' => now()->subDays(30)])->save();

        $this->artisan('journal:review-reminders')->assertSuccessful();

        $this->assertNotNull($late->fresh()->last_reminded_at);
        $this->assertSame(AssignmentStatus::Expired, $gone->fresh()->status);
        Notification::assertSentTo(new AnonymousNotifiable, ReviewReminder::class);

        // Not again the next day.
        $before = $late->fresh()->last_reminded_at;
        $this->travel(1)->days();
        $this->artisan('journal:review-reminders');
        $this->assertEquals($before, $late->fresh()->last_reminded_at);

        // Withdrawn by the office.
        $this->actingAs($this->admin)->post(route('admin.assignments.cancel', $late))->assertRedirect();
        $this->assertSame(AssignmentStatus::Cancelled, $late->fresh()->status);
    }

    public function test_dashboard_statistics_and_reviewers_page(): void
    {
        $m = $this->submitted();
        $a = $this->invite($m);
        $a->forceFill(['response_due_at' => now()->subDay()])->save();

        $this->actingAs($this->admin)->get('/dashboard')->assertInertia(fn (Assert $page) => $page
            ->where('stats.totals.received', 1)
            ->where('stats.byStatus.under_review', 1)
            ->where('stats.reviews.awaitingAnswer', 1)
            ->where('stats.reviews.overdue', 1)
            ->where('stats.attention.0.kind', 'answer_overdue')
            ->has('stats.months', 12)
        );

        $this->actingAs($this->admin)->withSession(['auth.password_confirmed_at' => time()])->get('/admin/reviewers')->assertInertia(fn (Assert $page) => $page
            ->component('admin/reviewers/index')
            ->where('reviewers.0.email', 'reviewer@example.org')
            ->where('reviewers.0.counts.invited', 1)
            ->where('reviewers.0.assignments.0.overdue', true)
        );

        $this->actingAs($this->author)->get('/dashboard')->assertInertia(fn (Assert $page) => $page->where('stats', null));
        $this->actingAs($this->author)->get('/admin/reviewers')->assertForbidden();
    }

    public function test_every_review_e_mail_renders_in_both_languages(): void
    {
        $m = $this->submitted();
        $a = $this->invite($m);
        $a->forceFill(['decline_reason' => 'Busy'])->save();
        $decision = $m->decisions()->create(['round' => 1, 'type' => 'minor_revision', 'letter' => "Dear authors,\n\nPlease revise.", 'decided_by' => $this->admin->id]);

        $mails = [
            new ReviewInvitation($a, 'token'),
            new ReviewReminder($a, 'token'),
            new InvitationWithdrawn($a),
            new InvitationAnswered($a),
            new ReviewReceived($a),
            new DecisionLetter($m, $decision),
        ];

        foreach (['en', 'mk'] as $locale) {
            app()->setLocale($locale);

            foreach ($mails as $mail) {
                $html = (string) $mail->toMail($this->author)->render();
                $this->assertStringContainsString($m->title, $html, $mail::class.' '.$locale);
            }
        }
    }

    public function test_the_office_returns_a_manuscript_for_corrections_and_keeps_notes(): void
    {
        $m = $this->submitted();

        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/notes", ['body' => 'Check the figures first.'])->assertSessionHasNoErrors();
        $this->actingAs($this->author)->post("/admin/manuscripts/{$m->public_id}/notes", ['body' => 'x'])->assertForbidden();

        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/decision", ['type' => 'return', 'letter' => 'Please fix the references.'])->assertSessionHasNoErrors();
        $this->assertSame(ManuscriptStatus::RevisionRequested, $m->fresh()->status);

        // Internal notes never reach the author.
        $this->actingAs($this->author)->get("/author/manuscripts/{$m->public_id}")
            ->assertInertia(fn (Assert $page) => $page->where('decisions.0.type', 'return')->missing('notes'));

        // Corrections go back without a response letter, and without a new round.
        $this->actingAs($this->author)->post("/author/manuscripts/{$m->public_id}/submit")->assertSessionHasNoErrors();
        $m->refresh();
        $this->assertSame(ManuscriptStatus::Submitted, $m->status);
        $this->assertSame(1, $m->current_round);
        $this->assertSame('correction', $m->latestVersion()->kind);

        $this->actingAs($this->admin)->get("/admin/manuscripts/{$m->public_id}")
            ->assertInertia(fn (Assert $page) => $page->where('notes.items.0.body', 'Check the figures first.'));

        // Desk rejection without review.
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/decision", ['type' => 'reject', 'letter' => 'Out of scope.'])->assertSessionHasNoErrors();
        $this->assertSame(ManuscriptStatus::Rejected, $m->fresh()->status);
    }

    public function test_the_author_sees_the_status_and_messages_but_never_who_reviews(): void
    {
        $m = $this->submitted();
        $a = $this->invite($m);
        $reviewer = User::factory()->create(['email' => 'reviewer@example.org', 'given_name' => 'Zebulon', 'family_name' => 'Quill']);
        $a->forceFill(['reviewer_id' => $reviewer->id])->save();
        $this->actingAs($reviewer)->post(route('reviewer.reviews.respond', $a), ['decision' => 'accept', 'competing_interests' => 'none']);

        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/notes", ['body' => 'Internal: slow reviewer.'])->assertSessionHasNoErrors();
        $this->actingAs($this->admin)->post("/admin/manuscripts/{$m->public_id}/notes", ['body' => 'Your paper is with two reviewers.', 'visible_to_author' => true])->assertSessionHasNoErrors();
        Notification::assertSentTo($this->author, MessageFromEditors::class);

        $page = $this->actingAs($this->author)->get("/author/manuscripts/{$m->public_id}")->assertOk();
        $page->assertInertia(fn (Assert $p) => $p
            ->where('manuscript.status', 'under_review')
            ->has('messages', 1)
            ->where('messages.0.body', 'Your paper is with two reviewers.')
        );

        $props = json_encode($page->viewData('page')['props']);
        $this->assertStringNotContainsString('Zebulon', $props);
        $this->assertStringNotContainsString('reviewer@example.org', $props);
        $this->assertStringNotContainsString('slow reviewer', $props);
        $this->assertStringNotContainsString('invitation_accepted', $props);

        // The editorial office sees both notes and who did what.
        $this->actingAs($this->admin)->get("/admin/manuscripts/{$m->public_id}")->assertInertia(fn (Assert $p) => $p
            ->has('notes.items', 2)
            ->where('notes.items.0.visibleToAuthor', true)
            ->where('notes.items.1.visibleToAuthor', false)
        );
    }
}
