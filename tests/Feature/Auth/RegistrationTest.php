<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\RateLimiter;
use Inertia\Testing\AssertableInertia as Assert;
use Laravel\Fortify\Features;
use Tests\TestCase;

/**
 * Authors create their own account; reviewers join by invitation and admins
 * are created with `php artisan journal:editor`.
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, string> */
    private function form(array $overrides = []): array
    {
        return [
            'academic_title' => 'Assoc. Prof.',
            'given_name' => 'Ана',
            'family_name' => 'Петровска',
            'affiliation' => 'Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje',
            'country_code' => 'MK',
            'orcid' => '0000-0002-1825-0097',
            'email' => 'Ana.Petrovska@Example.org',
            'password' => 'correct horse battery staple',
            'password_confirmation' => 'correct horse battery staple',
            'privacy' => '1',
            ...$overrides,
        ];
    }

    public function test_the_sign_up_page_is_shown(): void
    {
        $this->assertTrue(Features::enabled(Features::registration()));

        $this->get('/register')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('auth/register')
                ->has('countries', fn ($countries) => $countries->etc())
                ->where('academicTitles', User::ACADEMIC_TITLES)
            );
    }

    public function test_sign_up_creates_an_author_account(): void
    {
        $this->post('/register', $this->form())->assertRedirect(route('dashboard', absolute: false));

        $this->assertAuthenticated();

        $user = User::sole();
        $this->assertSame('ana.petrovska@example.org', $user->email);
        $this->assertSame('Ана Петровска', $user->name);
        $this->assertSame('Assoc. Prof.', $user->academic_title);
        $this->assertSame('MK', $user->country_code);
        $this->assertNotNull($user->privacy_accepted_at);
        $this->assertNull($user->email_verified_at);
        $this->assertSame(['author'], $user->roleNames());
        $this->assertSame(['registered', 'role_granted'], $user->events()->orderBy('id')->pluck('type')->all());
    }

    public function test_sign_up_never_grants_other_roles(): void
    {
        $this->post('/register', $this->form(['roles' => ['admin'], 'role' => 'admin']));

        $this->assertSame(['author'], User::sole()->roleNames());
    }

    public function test_sign_up_requires_the_profile_and_privacy_consent(): void
    {
        $this->post('/register', $this->form([
            'given_name' => '',
            'affiliation' => '',
            'country_code' => 'XX',
            'orcid' => '1234',
            'privacy' => '',
        ]))->assertSessionHasErrors(['given_name', 'affiliation', 'country_code', 'orcid', 'privacy']);

        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_an_address_can_only_register_once(): void
    {
        User::factory()->create(['email' => 'ana.petrovska@example.org']);

        $this->post('/register', $this->form())->assertSessionHasErrors('email');
        $this->assertDatabaseCount('users', 1);
    }

    public function test_the_spam_trap_blocks_bots(): void
    {
        $this->post('/register', $this->form(['website' => 'https://spam.example']))
            ->assertSessionHasErrors('email');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_sign_up_is_rate_limited_per_address(): void
    {
        config(['journal.security.registrations_per_hour' => 2]);
        RateLimiter::clear('register:127.0.0.1');

        foreach (['a', 'b'] as $i) {
            $this->post('/register', $this->form(['email' => "{$i}@example.org"]));
            $this->post('/logout');
        }

        $this->post('/register', $this->form(['email' => 'c@example.org']))->assertStatus(429);
        $this->assertDatabaseCount('users', 2);
    }

    public function test_login_page_links_to_sign_up(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->where('canRegister', true));
    }
}
