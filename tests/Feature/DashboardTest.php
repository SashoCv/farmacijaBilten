<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_the_dashboard_sends_editors_to_the_submissions_list()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $this->get(route('dashboard'))->assertRedirect('/admin/submissions');
        $this->get(route('admin.submissions.index'))->assertOk();
    }

    public function test_guests_cannot_see_the_submissions_list()
    {
        $this->get(route('admin.submissions.index'))->assertRedirect(route('login'));
    }
}
