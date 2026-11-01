<?php

namespace App\Http;

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SetLocale;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Branded error pages: renders the Inertia page "journal/error" inside the
 * journal layout for the statuses readers can meet, keeping the status code.
 *
 * Registered in bootstrap/app.php through withExceptions()->respond(), so it
 * sees every rendered exception response. JSON requests, and server errors
 * while APP_DEBUG is on, keep Laravel's own response.
 */
final class ErrorPage
{
    /** Statuses that get the journal's error page. */
    public const STATUSES = [403, 404, 410, 419, 429, 500, 503];

    public static function respond(Response $response, Throwable $e, Request $request): Response
    {
        $status = $response->getStatusCode();

        if (! in_array($status, self::STATUSES, true)) {
            return $response;
        }

        if ($request->expectsJson() && ! $request->header('X-Inertia')) {
            return $response;
        }

        // Keep the stack-trace page while developing.
        if ($status >= 500 && config('app.debug')) {
            return $response;
        }

        // An expired form token on an Inertia form: return to the form with a notice
        // instead of replacing the page the reader was filling in.
        if ($status === 419 && $request->header('X-Inertia') && ! $request->isMethod('GET')) {
            Inertia::flash('toast', ['type' => 'error', 'message' => __('The page expired. Please try again.')]);

            return back(fallback: '/');
        }

        try {
            return self::render($status, $request, $response);
        } catch (Throwable $renderError) {
            // The error page itself failed (for example the database is down):
            // fall back to Laravel's plain page rather than a blank response.
            report($renderError);

            return $response;
        }
    }

    /**
     * A manuscript larger than post_max_size: PHP drops the whole body, so send
     * the author back to the form with an error on the file field.
     */
    public static function postTooLarge(PostTooLargeException $e, Request $request): RedirectResponse
    {
        $maxMb = (int) round(((int) config('journal.submission_max_kb', 20480)) / 1024);

        return back(fallback: '/')->withErrors([
            'manuscript' => __('The file is larger than :size MB.', ['size' => $maxMb]),
        ]);
    }

    private static function render(int $status, Request $request, Response $original): Response
    {
        self::applyLocale($request);

        // Not shared yet when the request failed before the web middleware ran.
        if (Inertia::getShared('journal') === null) {
            Inertia::share(app(HandleInertiaRequests::class)->share($request));
        }

        $context = match ($request->route()?->getName()) {
            'issues.show' => 'issue',
            'articles.show' => 'article',
            default => null,
        };

        $response = Inertia::render('journal/error', [
            'status' => $status,
            'context' => $status === 404 ? $context : null,
        ])
            ->withViewData(['meta' => ['title' => self::title($status, $context), 'robots' => 'noindex,follow']])
            ->toResponse($request)
            ->setStatusCode($status);

        // Keep headers that tell clients what to do next (Retry-After on 429/503).
        foreach (['Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'] as $header) {
            if ($original->headers->has($header)) {
                $response->headers->set($header, $original->headers->get($header));
            }
        }

        $response->headers->set('Cache-Control', 'no-store, private');

        return $response;
    }

    /** Server-side <title> before the client takes over (also used by indexers). */
    private static function title(int $status, ?string $context): string
    {
        return match (true) {
            $context === 'issue' => __('This issue does not exist'),
            $context === 'article' => __('This article does not exist'),
            $status === 404, $status === 410 => __('Page not found'),
            $status === 403 => __('Access denied'),
            $status === 419 => __('Page expired'),
            $status === 429 => __('Too many requests'),
            $status === 503 => __('Service unavailable'),
            default => __('Something went wrong'),
        };
    }

    /**
     * Requests that fail before routing (no matching route, maintenance mode)
     * skip the web middleware, so apply the reader's language here too.
     */
    private static function applyLocale(Request $request): void
    {
        $locale = $request->cookie('locale');

        if (in_array($locale, SetLocale::SUPPORTED, true)) {
            app()->setLocale($locale);
        }
    }
}
