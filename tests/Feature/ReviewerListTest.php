<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\ReviewerInvite;
use App\Models\User;
use App\Notifications\Reviews\ReviewerAdded;
use App\Notifications\Reviews\ReviewerListInvitation;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Notifications\AnonymousNotifiable;
use Illuminate\Support\Facades\Notification;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * The editorial office adds people to its list of reviewers from the
 * Reviewers page; without an account they get an e-mail to create one.
 */
class ReviewerListTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Notification::fake();
        $this->admin = User::factory()->admin()->create();
    }

    private function add(string $email = 'new.reviewer@example.org'): void
    {
        $this->actingAs($this->admin)->post('/admin/reviewers', [
            'email' => $email,
            'given_name' => 'Nina',
            'family_name' => 'Nova',
            'affiliation' => 'Faculty of Pharmacy',
            'expertise' => 'Pharmacokinetics',
            'message' => 'We would value your help.',
        ])->assertSessionHasNoErrors()->assertRedirect();
    }

    /** The link from the last e-mail sent for the invite. */
    private function link(ReviewerInvite $invite): string
    {
        $url = null;

        Notification::assertSentTo(new AnonymousNotifiable, ReviewerListInvitation::class, function (ReviewerListInvitation $n) use ($invite, &$url) {
            if ($n->invite->is($invite)) {
                $url = ReviewerListInvitation::url($invite, $n->token);
            }

            return true;
        });

        $this->assertNotNull($url);

        return (string) $url;
    }

    public function test_adding_someone_without_an_account_sends_the_e_mail_and_creates_a_reviewer_account(): void
    {
        $this->add('New.Reviewer@example.org');

        $invite = ReviewerInvite::sole();
        $this->assertSame('new.reviewer@example.org', $invite->email);
        $this->assertNull($invite->accepted_at);
        $url = $this->link($invite);

        // Listed on the Reviewers page and offered when inviting to a manuscript.
        $this->actingAs($this->admin)->get('/admin/reviewers')->assertInertia(fn (Assert $page) => $page
            ->component('admin/reviewers/index')
            ->has('invites', 1)
            ->where('invites.0.email', 'new.reviewer@example.org')
            ->where('invites.0.name', 'Nina Nova'));

        auth()->logout();

        // A wrong secret: closed.
        $this->get(ReviewerListInvitation::url($invite, 'wrong'))
            ->assertInertia(fn (Assert $page) => $page->component('auth/reviewer-signup')->where('mode', 'closed'));

        $this->get($url)->assertInertia(fn (Assert $page) => $page
            ->component('auth/reviewer-signup')
            ->where('mode', 'create')
            ->where('givenName', 'Nina')
            ->where('affiliation', 'Faculty of Pharmacy')
            ->where('message', 'We would value your help.'));

        $this->post($url, [
            'given_name' => 'Nina',
            'family_name' => 'Nova',
            'affiliation' => 'Faculty of Pharmacy',
            'country_code' => 'MK',
            'password' => 'a-long-password-2026',
            'password_confirmation' => 'a-long-password-2026',
            'privacy' => '1',
        ])->assertRedirect(route('reviewer.reviews.index'));

        $user = User::where('email', 'new.reviewer@example.org')->sole();
        $this->assertAuthenticatedAs($user);
        $this->assertTrue($user->hasRole(Role::Reviewer));
        $this->assertFalse($user->hasRole(Role::Admin));
        $this->assertNotNull($user->email_verified_at);
        $this->assertSame('Pharmacokinetics', $user->expertise);
        $this->assertNotNull($invite->fresh()->accepted_at);

        // The link works once.
        auth()->logout();
        $this->get($url)->assertInertia(fn (Assert $page) => $page->where('mode', 'sign_in'));
        $this->post($url, [])->assertForbidden();

        // No longer pending.
        $this->actingAs($this->admin)->get('/admin/reviewers')
            ->assertInertia(fn (Assert $page) => $page->has('invites', 0));
    }

    public function test_someone_with_an_account_becomes_a_reviewer_and_is_told_by_e_mail(): void
    {
        $author = User::factory()->author()->create(['email' => 'author@example.org']);

        $this->add('author@example.org');

        $this->assertTrue($author->fresh()->hasRole(Role::Reviewer));
        $this->assertSame(0, ReviewerInvite::count());
        Notification::assertSentTo($author, ReviewerAdded::class, function (ReviewerAdded $n) use ($author) {
            $mail = $n->toMail($author);
            $this->assertStringContainsString('We would value your help.', implode("\n", $mail->introLines));

            return true;
        });

        // Added again: no second e-mail.
        $this->add('author@example.org');
        Notification::assertSentToTimes($author, ReviewerAdded::class, 1);
        Notification::assertNotSentTo(new AnonymousNotifiable, ReviewerListInvitation::class);
    }

    public function test_sending_again_replaces_the_link_and_withdrawing_closes_it(): void
    {
        $this->add();
        $invite = ReviewerInvite::sole();
        $first = $this->link($invite);

        $this->actingAs($this->admin)->post(route('admin.reviewer-invites.resend', $invite))->assertRedirect();
        Notification::assertSentTimes(ReviewerListInvitation::class, 2);
        auth()->logout();
        $this->get($first)->assertInertia(fn (Assert $page) => $page->where('mode', 'closed'));

        $this->actingAs($this->admin)->delete(route('admin.reviewer-invites.destroy', $invite))->assertRedirect();
        $this->assertSame(0, ReviewerInvite::count());
    }

    public function test_only_the_editorial_office_adds_reviewers(): void
    {
        $author = User::factory()->author()->create();

        $this->actingAs($author)->post('/admin/reviewers', [
            'email' => 'x@example.org', 'given_name' => 'X', 'family_name' => 'Y',
        ])->assertForbidden();

        $this->assertSame(0, ReviewerInvite::count());
    }

    public function test_the_e_mail_is_one_of_the_editable_templates(): void
    {
        $this->add();
        $invite = ReviewerInvite::sole();

        Notification::assertSentTo(new AnonymousNotifiable, ReviewerListInvitation::class, function (ReviewerListInvitation $n) {
            $mail = $n->toMail(new AnonymousNotifiable);
            $this->assertStringContainsString('reviewer-signup', (string) $mail->actionUrl);
            $this->assertNotEmpty($mail->subject);

            return true;
        });

        $this->assertSame('Nina Nova', $invite->name());
    }
}
