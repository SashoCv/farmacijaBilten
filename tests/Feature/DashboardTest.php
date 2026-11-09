<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page(): void
    {
        $this->get(route('dashboard'))->assertRedirect(route('login'));
    }

    public function test_an_author_sees_their_tasks_but_not_the_editorial_office(): void
    {
        $this->actingAs(User::factory()->author()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('dashboard')
                ->where('roles', ['author'])
                ->where('admin', null)
                ->where('needsSecondFactor', false)
                ->where('auth.user.roles', ['author'])
                ->missing('auth.user.password')
                ->missing('auth.user.phone')
            );
    }

    public function test_the_editorial_office_sees_people_counts(): void
    {
        User::factory()->author()->count(2)->create();
        User::factory()->reviewer()->create();
        User::factory()->withRoles(Role::Author, Role::Reviewer)->create();

        $this->actingAs(User::factory()->admin()->create())
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('roles', ['admin'])
                ->where('admin.people.author', 3)
                ->where('admin.people.reviewer', 2)
                ->where('admin.people.admin', 1)
            );
    }

    public function test_a_person_with_several_roles_sees_each_group(): void
    {
        $this->actingAs(User::factory()->withRoles(Role::Reviewer, Role::Author)->create())
            ->get(route('dashboard'))
            ->assertInertia(fn (Assert $page) => $page->where('roles', ['author', 'reviewer']));
    }

    public function test_deactivated_users_are_refused(): void
    {
        $this->actingAs(User::factory()->author()->deactivated()->create())
            ->get(route('dashboard'))
            ->assertForbidden();
    }

    public function test_guests_cannot_see_the_submissions_list(): void
    {
        $this->get(route('admin.submissions.index'))->assertRedirect(route('login'));
    }
}
