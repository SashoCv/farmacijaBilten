<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Fortify\Features;
use Tests\TestCase;

/**
 * Public registration is off: only the editorial office has accounts
 * (created with `php artisan journal:editor`).
 */
class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_is_disabled(): void
    {
        $this->assertFalse(Features::enabled(Features::registration()));

        $this->get('/register')->assertNotFound();
        $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(405);

        $this->assertGuest();
        $this->assertDatabaseCount('users', 0);
    }

    public function test_login_page_has_no_sign_up_link(): void
    {
        $this->get('/login')
            ->assertOk()
            ->assertDontSee('Sign up')
            ->assertDontSee('href="/register"', false);
    }
}
