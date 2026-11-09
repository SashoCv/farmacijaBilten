<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Routing\RouteCollection;
use Illuminate\Support\Facades\Route;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

/**
 * Release 0 spikes (/lab). routes/web.php loads routes/lab.php only in the
 * local environment, so each test re-registers the web routes under the
 * environment it checks.
 */
class LabTest extends TestCase
{
    use RefreshDatabase;

    private function registerWebRoutesAs(string $environment): void
    {
        $this->app['env'] = $environment;

        $router = $this->app['router'];
        $router->setRoutes(new RouteCollection);
        Route::middleware('web')->group(base_path('routes/web.php'));
        $router->getRoutes()->refreshNameLookups();
        $router->getRoutes()->refreshActionLookups();
    }

    public function test_the_editor_lab_renders_in_the_local_environment(): void
    {
        $this->registerWebRoutesAs('local');

        $this->get('/lab/editor')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('lab/editor'));

        $this->assertSame(url('/lab/editor'), route('lab.editor'));
    }

    public function test_the_lab_does_not_exist_in_production(): void
    {
        $this->registerWebRoutesAs('production');

        $this->get('/lab/editor')->assertNotFound();
        $this->assertFalse(Route::has('lab.editor'));
    }
}
