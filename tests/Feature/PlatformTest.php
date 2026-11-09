<?php

namespace Tests\Feature;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LegacyPathNormalizer;
use App\Journal\Journal;
use App\Models\Issue;
use App\Models\Page;
use App\Models\User;
use Illuminate\Contracts\Http\Kernel;
use Illuminate\Foundation\Http\Middleware\PreventRequestForgery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Middleware\ValidatePostSize;
use Illuminate\Http\Request;
use Illuminate\Routing\Router;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Route;
use Illuminate\Testing\TestResponse;
use Inertia\Testing\AssertableInertia as Assert;
use RuntimeException;
use Tests\TestCase;

/**
 * WS10 platform behaviour: branded error pages, security headers, legacy
 * path normalization, sessionless public pages and public caching, locale
 * switching, upload limits and the operations commands.
 */
class PlatformTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $issue = Issue::create([
            'slug' => '71-2', 'volume' => 71, 'kind' => Issue::KIND_ISSUE, 'number' => 2, 'year' => 2025, 'is_published' => true,
        ]);

        $issue->articles()->create([
            'number' => '001',
            'position' => 1,
            'title' => 'Sugars in fruit juices',
            'authors' => ['Redzep Ali'],
            'pdf' => 'volumes/Volume 71_2/71_2_001.pdf',
            'online_at' => '2025-04-30',
        ]);

        Page::create(['path' => 'submit-your-paper', 'title' => 'Submit your paper', 'body' => '<p>Form</p>']);

        Journal::flush();

        Route::middleware('web')->group(function () {
            Route::get('_test/status/{status}', fn (int $status) => abort($status));
            Route::get('_test/boom', fn () => throw new RuntimeException('Boom'));
            Route::post('_test/expired', fn () => throw new TokenMismatchException);
            Route::get('_test/xml', fn () => response('<x/>', 200, ['Content-Type' => 'application/xml']));
        });
    }

    /* Error pages ------------------------------------------------------- */

    public function test_unknown_address_renders_the_journal_404_page(): void
    {
        $this->get('/no/such/page')
            ->assertNotFound()
            ->assertHeader('Cache-Control', 'no-store, private')
            ->assertViewHas('meta', fn (array $meta) => $meta['robots'] === 'noindex,follow' && $meta['title'] === 'Page not found')
            ->assertInertia(fn (Assert $page) => $page
                ->component('journal/error')
                ->where('status', 404)
                ->where('context', null)
                // Shared props from the web middleware: the journal layout can render.
                ->where('journal.nameEn', config('journal.name_en'))
                ->where('currentIssueSlug', '71-2')
                ->where('locale', 'en'));
    }

    public function test_missing_issue_and_article_say_so(): void
    {
        $this->get('/issues/99-9')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page->component('journal/error')->where('context', 'issue'));

        $this->get('/articles/71-2/999')
            ->assertNotFound()
            ->assertInertia(fn (Assert $page) => $page->component('journal/error')->where('context', 'article'));
    }

    public function test_error_page_follows_the_reader_language(): void
    {
        $this->withUnencryptedCookie('locale', 'mk')
            ->get('/no/such/page')
            ->assertNotFound()
            ->assertSee('lang="mk"', false)
            ->assertInertia(fn (Assert $page) => $page->where('locale', 'mk'));
    }

    public function test_branded_pages_keep_their_status_codes(): void
    {
        // Server errors keep the debug page while APP_DEBUG is on.
        config(['app.debug' => false]);

        foreach ([403, 404, 410, 429, 503] as $status) {
            $response = $this->get("/_test/status/{$status}")->assertStatus($status);

            $this->assertSame('journal/error', $response->viewData('page')['component'] ?? null, "status {$status}");
            $this->assertSame($status, $response->viewData('page')['props']['status'] ?? null, "status {$status}");
        }

        // Other statuses keep Laravel's response.
        $this->get('/_test/status/418')->assertStatus(418)->assertDontSee('journal/error');
    }

    public function test_server_errors_are_branded_only_without_debug(): void
    {
        config(['app.debug' => false]);

        $this->get('/_test/boom')
            ->assertStatus(500)
            ->assertInertia(fn (Assert $page) => $page->component('journal/error')->where('status', 500));

        config(['app.debug' => true]);

        $this->get('/_test/boom')->assertStatus(500)->assertDontSee('"component":"journal\/error"', false);
    }

    public function test_inertia_visits_get_the_error_page_as_an_inertia_response(): void
    {
        $version = (string) app(HandleInertiaRequests::class)->version(Request::create('/'));

        $this->get('/no/such/page', ['X-Inertia' => 'true', 'X-Inertia-Version' => $version, 'X-Requested-With' => 'XMLHttpRequest'])
            ->assertNotFound()
            ->assertHeader('X-Inertia', 'true')
            ->assertJsonPath('component', 'journal/error')
            ->assertJsonPath('props.status', 404);
    }

    public function test_json_requests_keep_json_errors(): void
    {
        $this->getJson('/no/such/page')
            ->assertNotFound()
            ->assertJsonStructure(['message']);
    }

    public function test_expired_inertia_form_goes_back_with_a_notice(): void
    {
        $this->from('/contact')
            ->post('/_test/expired', [], ['X-Inertia' => 'true'])
            ->assertRedirect('/contact')
            ->assertSessionHas('inertia.flash_data.toast.type', 'error');
    }

    public function test_expired_plain_form_gets_the_419_page(): void
    {
        $this->post('/_test/expired')
            ->assertStatus(419)
            ->assertInertia(fn (Assert $page) => $page->component('journal/error')->where('status', 419));
    }

    public function test_oversized_upload_goes_back_to_the_form_with_a_manuscript_error(): void
    {
        $this->from('/submit-your-paper')
            ->call('POST', '/submit-your-paper', server: ['CONTENT_LENGTH' => 512 * 1024 * 1024])
            ->assertRedirect('/submit-your-paper')
            ->assertSessionHasErrors(['manuscript' => 'The file is larger than 20 MB.']);
    }

    public function test_post_size_is_checked_after_the_session_starts_and_before_csrf(): void
    {
        $route = app(Router::class)->getRoutes()->getByName('submissions.store');
        $this->assertNotNull($route);
        app(Kernel::class); // syncs the middleware groups to the router
        $router = app(Router::class);
        $middleware = $router->resolveMiddleware($router->gatherRouteMiddleware($route), $route->excludedMiddleware());

        $postSize = array_search(ValidatePostSize::class, $middleware, true);
        $csrf = array_search(PreventRequestForgery::class, $middleware, true);

        $this->assertNotFalse($postSize);
        $this->assertNotFalse($csrf);
        $this->assertLessThan($csrf, $postSize);
    }

    /* Security headers --------------------------------------------------- */

    public function test_security_headers_on_pages_redirects_and_errors(): void
    {
        foreach (['/', '/archive/', '/no/such/page'] as $url) {
            $response = $this->raw('GET', $url);

            $response->assertHeader('X-Content-Type-Options', 'nosniff')
                ->assertHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
                ->assertHeader('X-Frame-Options', 'SAMEORIGIN')
                ->assertHeaderMissing('X-Powered-By')
                ->assertHeaderMissing('Strict-Transport-Security');

            $this->assertStringContainsString('camera=()', (string) $response->headers->get('Permissions-Policy'));
        }
    }

    public function test_hsts_only_over_https(): void
    {
        $this->get('https://localhost/')
            ->assertHeader('Strict-Transport-Security', 'max-age=31536000');
    }

    /* Legacy paths ------------------------------------------------------- */

    public function test_trailing_slashes_and_index_php_redirect_permanently(): void
    {
        $this->raw('GET', '/archive/')->assertStatus(301)->assertRedirect('http://localhost/archive');
        $this->raw('GET', '/archive/?page=2')->assertStatus(301)->assertRedirect('http://localhost/archive?page=2');
        $this->raw('GET', '/index.php/editorial-policies/')->assertStatus(301)->assertRedirect('http://localhost/guidelines/editorial-policies');
        $this->raw('GET', '/')->assertOk();

        // A redirect would turn a POST into a GET: the form post reaches the app.
        $this->assertNotSame(301, $this->raw('POST', '/submit-your-paper/')->getStatusCode());
    }

    public function test_normalized_targets(): void
    {
        $cases = [
            '/' => null,
            '/archive' => null,
            '/archive/' => '/archive',
            '/issues/71-2//' => '/issues/71-2',
            '/issues//71-2' => '/issues/71-2',
            '/search/?q=a%2Fb' => '/search?q=a%2Fb',
            '/index.php' => '/',
            '/index.php/' => '/',
            '/index.php?p=12' => '/?p=12',
            '/index.php/instructions-for-authors' => '/guidelines/instructions-for-authors',
            '/index.php/editorial-board/' => '/editorial-board',
            '/volumes/Volume%2071_2/' => '/volumes/Volume%2071_2',
        ];

        foreach ($cases as $uri => $target) {
            $this->assertSame($target, LegacyPathNormalizer::target($uri), $uri);
        }
    }

    /* Sessions and caching ----------------------------------------------- */

    public function test_anonymous_public_pages_set_no_cookie_and_are_publicly_cacheable(): void
    {
        foreach (['/', '/archive', '/issues/71-2', '/articles/71-2/001'] as $url) {
            $response = $this->get($url)->assertOk();

            $this->assertSame([], $response->headers->getCookies(), $url);
            $this->assertPublicCache($response);
        }
    }

    public function test_readers_with_a_session_keep_it_and_get_private_pages(): void
    {
        $response = $this->withCookie(config('session.cookie'), 'abc')->get('/archive')->assertOk();

        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
        $this->assertCookieNames(['XSRF-TOKEN', config('session.cookie')], $response);
    }

    public function test_signed_in_editors_never_get_public_pages(): void
    {
        $response = $this->actingAs(User::factory()->create())->get('/archive')->assertOk();

        $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'));
    }

    public function test_pages_with_forms_start_a_session(): void
    {
        foreach (['/login', '/submit-your-paper'] as $url) {
            $response = $this->get($url)->assertOk();

            $this->assertCookieNames(['XSRF-TOKEN', config('session.cookie')], $response);
            $this->assertStringNotContainsString('public', (string) $response->headers->get('Cache-Control'), $url);
        }
    }

    public function test_html_varies_by_cookie_but_xml_does_not(): void
    {
        $this->assertStringContainsString('Cookie', (string) $this->get('/archive')->headers->get('Vary'));
        $this->assertStringNotContainsString('Cookie', (string) $this->get('/_test/xml')->headers->get('Vary'));
    }

    public function test_public_cache_can_be_switched_off(): void
    {
        config(['http.public_cache.enabled' => false]);

        $this->assertStringNotContainsString('public', (string) $this->get('/archive')->headers->get('Cache-Control'));
    }

    public function test_sqlite_runs_in_wal_mode_with_a_busy_timeout(): void
    {
        $this->assertSame('wal', config('database.connections.sqlite.journal_mode'));
        $this->assertSame(5000, config('database.connections.sqlite.busy_timeout'));
        $this->assertSame('normal', config('database.connections.sqlite.synchronous'));
        // Tests run on the array driver; the deployed default is "file".
        $this->assertStringContainsString("env('SESSION_DRIVER', 'file')", (string) file_get_contents(config_path('session.php')));
    }

    /* Locale --------------------------------------------------------------- */

    public function test_language_switch_returns_to_the_same_site_page_only(): void
    {
        $this->get('/locale/mk', ['Referer' => 'http://localhost:8000/archive?page=2'])
            ->assertRedirect('http://localhost:8000/archive?page=2')
            ->assertPlainCookie('locale', 'mk')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow')
            ->assertHeader('Cache-Control', 'no-store, private');

        $this->get('/locale/en', ['Referer' => 'https://evil.example/phish'])
            ->assertRedirect('http://localhost:8000');

        $this->get('/locale/en')->assertRedirect('http://localhost:8000');
    }

    /* Auth surface ------------------------------------------------------- */

    public function test_auth_surface_is_restricted(): void
    {
        $this->get('/register')->assertOk()->assertInertia(fn (Assert $page) => $page->component('auth/register'));
        $this->get('/dashboard')->assertRedirect('/login');
        $this->get('/admin/submissions')->assertRedirect('/login');
        $this->get('/admin/users')->assertRedirect('/login');
        $this->get('/login')->assertOk()->assertInertia(fn (Assert $page) => $page->component('auth/login'));

        $this->assertSame('/dashboard', config('fortify.home'));
    }

    /* Operations commands ------------------------------------------------ */

    public function test_editor_accounts_are_created_from_the_console(): void
    {
        $this->artisan('journal:editor', ['email' => 'Editor@Example.org', '--name' => 'Editor'])
            ->expectsQuestion('Password (at least 12 characters)', 'correct horse battery')
            ->assertSuccessful();

        $user = User::where('email', 'editor@example.org')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue($user->isAdmin());
        $this->assertSame('Editor', $user->given_name);

        // An existing account (an author) is promoted without a new password.
        $author = User::factory()->author()->create(['email' => 'author@example.org']);
        $hash = $author->password;
        $this->artisan('journal:editor', ['email' => 'author@example.org'])->assertSuccessful();
        $author->refresh();
        $this->assertSame(['admin', 'author'], $author->roleNames());
        $this->assertSame($hash, $author->password);

        $this->artisan('journal:editor', ['email' => 'x@example.org', '--name' => 'X'])
            ->expectsQuestion('Password (at least 12 characters)', 'short')
            ->assertFailed();
    }

    public function test_smoke_check_passes_on_a_complete_article_page(): void
    {
        $html = '<html><head><link rel="stylesheet" href="https://bulletin.mfd.org.mk/build/assets/app-1.css">'
            .'<meta name="citation_title" content="Sugars"></head><body><div id="app" data-server-rendered="true"><div class="journal">'
            .'<a href="https://nexsollabs.com">Nexsol Labs</a></div></div></body></html>';

        Http::fake(['https://bulletin.mfd.org.mk/articles/71-2/001' => Http::response($html, 200, ['X-Content-Type-Options' => 'nosniff'])]);

        $this->artisan('journal:smoke', ['--url' => 'https://bulletin.mfd.org.mk'])->assertSuccessful();
    }

    public function test_smoke_check_fails_without_ssr_and_citation_tags(): void
    {
        Http::fake(['*' => Http::response('<html><head><script src="http://[::1]:5173/@vite/client"></script></head><body><div id="app"></div></body></html>')]);

        $this->artisan('journal:smoke', ['--url' => 'https://bulletin.mfd.org.mk'])->assertFailed();
    }

    /* Helpers ------------------------------------------------------------ */

    /**
     * Sends the URI as is: the test client's get() trims trailing slashes
     * before the request is built.
     */
    private function raw(string $method, string $uri): TestResponse
    {
        $request = Request::create('http://localhost'.$uri, $method);

        return TestResponse::fromBaseResponse(app(Kernel::class)->handle($request), $request);
    }

    private function assertPublicCache(TestResponse $response): void
    {
        $this->assertTrue($response->headers->hasCacheControlDirective('public'));
        $this->assertSame('300', (string) $response->headers->getCacheControlDirective('max-age'));
        $this->assertSame('600', (string) $response->headers->getCacheControlDirective('stale-while-revalidate'));
    }

    /** @param  list<string>  $names */
    private function assertCookieNames(array $names, TestResponse $response): void
    {
        $set = array_map(fn ($cookie) => $cookie->getName(), $response->headers->getCookies());

        foreach ($names as $name) {
            $this->assertContains($name, $set);
        }
    }
}
