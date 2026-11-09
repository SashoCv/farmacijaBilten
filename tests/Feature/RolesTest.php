<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use App\Models\UserEvent;
use App\Rules\Orcid;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use LogicException;
use Tests\TestCase;

/**
 * Back-office roles (docs/backoffice, release 1): the role middleware, the
 * second factor for the editorial office, and the people-and-roles page.
 */
class RolesTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->admin()->withTwoFactor()->create();
    }

    public function test_granting_and_revoking_roles_is_idempotent_and_recorded(): void
    {
        $user = User::factory()->create();
        $admin = $this->admin();

        $user->grantRole(Role::Reviewer, $admin);
        $user->grantRole(Role::Reviewer, $admin);
        $this->assertSame(['reviewer'], $user->roleNames());

        $user->revokeRole(Role::Reviewer, $admin);
        $user->revokeRole(Role::Reviewer, $admin);
        $this->assertSame([], $user->roleNames());

        $events = $user->events()->orderBy('id')->get();
        $this->assertSame(['role_granted', 'role_revoked'], $events->pluck('type')->all());
        $this->assertSame($admin->id, $events[0]->actor_id);
        $this->assertSame(['role' => 'reviewer'], $events[0]->payload);
    }

    public function test_account_events_are_append_only(): void
    {
        $event = User::factory()->create()->recordEvent('registered');

        $this->expectException(LogicException::class);
        $event->update(['type' => 'changed']);
    }

    public function test_only_the_editorial_office_reaches_admin_pages(): void
    {
        foreach ([User::factory()->author()->create(), User::factory()->reviewer()->create(), User::factory()->create()] as $user) {
            $this->actingAs($user)->get('/admin/submissions')->assertForbidden();
            $this->actingAs($user)->get('/admin/submissions/export')->assertForbidden();
            $this->actingAs($user)->withSession(['auth.password_confirmed_at' => time()])->get('/admin/users')->assertForbidden();
        }

        $this->actingAs($this->admin())->get('/admin/submissions')->assertOk();
    }

    public function test_admins_need_a_second_factor_when_required(): void
    {
        config(['journal.security.admin_requires_2fa' => true]);

        $this->actingAs(User::factory()->admin()->create())
            ->get('/admin/submissions')
            ->assertRedirect(route('security.edit'));

        $this->actingAs($this->admin())->get('/admin/submissions')->assertOk();

        $this->actingAs(User::factory()->admin()->create())
            ->get('/dashboard')
            ->assertInertia(fn (Assert $page) => $page->where('needsSecondFactor', true));
    }

    public function test_the_people_page_asks_for_the_password_and_lists_people(): void
    {
        $admin = $this->admin();
        User::factory()->author()->create(['given_name' => 'Марија', 'family_name' => 'Стојановска']);
        User::factory()->reviewer()->create(['given_name' => 'John', 'family_name' => 'Smith']);

        $this->actingAs($admin)->get('/admin/users')->assertRedirect(route('password.confirm'));

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->get('/admin/users?q='.rawurlencode('МАРИЈА'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('admin/users/index')
                ->has('users', 1)
                ->where('users.0.name', 'Марија Стојановска')
                ->where('users.0.roles', ['author'])
                ->where('pagination.total', 1)
            );

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->get('/admin/users?role=reviewer')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->has('users', 1)->where('users.0.name', 'John Smith'));
    }

    public function test_an_admin_changes_roles(): void
    {
        $admin = $this->admin();
        $person = User::factory()->author()->create();

        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->put("/admin/users/{$person->id}/roles", ['roles' => ['author', 'reviewer']])
            ->assertSessionHasNoErrors();

        $this->assertSame(['author', 'reviewer'], $person->fresh()->roleNames());

        // Nothing ticked: the form sends an empty value.
        $this->actingAs($admin)
            ->withSession(['auth.password_confirmed_at' => time()])
            ->put("/admin/users/{$person->id}/roles", ['roles' => ''])
            ->assertSessionHasNoErrors();

        $this->assertSame([], $person->fresh()->roleNames());
        $this->assertSame(3, UserEvent::where('user_id', $person->id)->where('actor_id', $admin->id)->count());
    }

    public function test_the_editorial_office_cannot_lock_itself_out(): void
    {
        $admin = $this->admin();
        $session = ['auth.password_confirmed_at' => time()];

        $this->actingAs($admin)->withSession($session)
            ->put("/admin/users/{$admin->id}/roles", ['roles' => ['author']])
            ->assertSessionHasErrors('roles');

        $this->actingAs($admin)->withSession($session)
            ->put("/admin/users/{$admin->id}/status", ['active' => '0'])
            ->assertSessionHasErrors('active');

        $this->assertTrue($admin->fresh()->isAdmin());
        $this->assertTrue($admin->fresh()->isActive());
    }

    public function test_an_admin_deactivates_and_reactivates_an_account(): void
    {
        $admin = $this->admin();
        $person = User::factory()->author()->create();
        $session = ['auth.password_confirmed_at' => time()];

        $this->actingAs($admin)->withSession($session)
            ->put("/admin/users/{$person->id}/status", ['active' => '0'])
            ->assertSessionHasNoErrors();
        $this->assertFalse($person->fresh()->isActive());

        // A deactivated account cannot sign in.
        auth()->logout();
        $this->post('/login', ['email' => $person->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->actingAs($admin)->withSession($session)
            ->put("/admin/users/{$person->id}/status", ['active' => '1'])
            ->assertSessionHasNoErrors();
        $this->assertTrue($person->fresh()->isActive());

        $this->assertSame(['deactivated', 'reactivated'], $person->events()->orderBy('id')->pluck('type')->all());
    }

    public function test_orcid_check_digit(): void
    {
        $this->assertTrue(Orcid::isValid('0000-0002-1825-0097'));
        $this->assertTrue(Orcid::isValid('0000-0002-1694-233X'));
        $this->assertFalse(Orcid::isValid('0000-0002-1825-0098'));
        $this->assertFalse(Orcid::isValid('0000000218250097'));
    }
}
