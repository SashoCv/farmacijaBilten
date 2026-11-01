<?php

use App\Http\ErrorPage;
use App\Http\Middleware\HandleAppearance;
use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\LegacyPathNormalizer;
use App\Http\Middleware\PublicCache;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use App\Http\Middleware\StatelessPublicRequests;
use App\Http\Middleware\WordPressQueryRedirect;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Middleware\ValidatePostSize;
use Illuminate\Http\Request;
use Illuminate\Session\Middleware\StartSession;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
        then: function () {
            // Unknown addresses run through the web middleware (language, shared
            // props), so the 404 page renders inside the journal layout.
            Route::fallback(fn () => abort(404))->middleware('web');
        },
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Outermost, so redirects and error pages get the headers too.
        $middleware->prepend(SecurityHeaders::class);

        // Before routing, after TrustProxies: "/index.php/..." and trailing slashes.
        $middleware->append(LegacyPathNormalizer::class);

        // Production only (skipped in local and testing): reject Host headers
        // other than APP_URL's, so absolute redirects can't be poisoned.
        $middleware->trustHosts();

        // A proxy on the same machine (nginx, or a tunnel such as cloudflared)
        // terminates HTTPS: trust its X-Forwarded-* headers so URLs stay https.
        $middleware->trustProxies(at: ['127.0.0.1', '::1']);

        $middleware->encryptCookies(except: ['appearance', 'sidebar_state', 'locale']);

        // OAI-PMH harvesters POST without a session or token.
        $middleware->validateCsrfTokens(except: ['oai']);

        // Checked after the session starts (not globally), so an oversized
        // manuscript can go back to the form with an error message.
        $middleware->remove(ValidatePostSize::class);
        $middleware->appendToPriorityList(after: StartSession::class, append: ValidatePostSize::class);

        $middleware->web(prepend: [
            StatelessPublicRequests::class,
        ], append: [
            ValidatePostSize::class,
            WordPressQueryRedirect::class,
            PublicCache::class,
            SetLocale::class,
            HandleAppearance::class,
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        $exceptions->render(fn (PostTooLargeException $e, Request $request) => ErrorPage::postTooLarge($e, $request));

        // Branded journal pages for 403, 404, 410, 419, 429, 500 and 503.
        $exceptions->respond(fn (Response $response, Throwable $e, Request $request) => ErrorPage::respond($response, $e, $request));
    })->create();
