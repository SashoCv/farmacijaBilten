<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Session\SessionManager;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\Response;

/**
 * Anonymous readers do not get a session.
 *
 * A GET to a public journal page from a browser that has no session yet runs
 * on the in-memory "array" session driver, and the session and XSRF-TOKEN
 * cookies are dropped from the response. Nothing is written to the session
 * store, no cookie is set, and PublicCache can mark the page as cacheable.
 *
 * Runs first in the web group (before StartSession). Requests keep a real
 * session when they:
 *  - are not GET/HEAD (form posts, logout);
 *  - already carry a session or remember-me cookie (editors, an author who
 *    has just submitted a manuscript and needs the flash message);
 *  - hit a route behind auth/guest/verified/password.confirm (the sign-in
 *    pages need the CSRF token and the "intended" URL);
 *  - open a page with a form (STATEFUL_PAGES), so the form gets its token.
 */
class StatelessPublicRequests
{
    /** Request attribute read by PublicCache. */
    public const ATTRIBUTE = 'journal.stateless';

    /** CMS paths (pages.show) whose page carries a form. */
    public const STATEFUL_PAGES = ['submit-your-paper'];

    /** Route middleware that implies a signed-in or signing-in visitor. */
    private const SESSION_MIDDLEWARE = ['auth', 'guest', 'verified', 'password.confirm', 'signed'];

    public function __construct(private SessionManager $sessions) {}

    public function handle(Request $request, Closure $next): Response
    {
        if (! $this->isAnonymousPublicRead($request)) {
            return $next($request);
        }

        $request->attributes->set(self::ATTRIBUTE, true);

        $driver = $this->sessions->getDefaultDriver();
        $this->sessions->setDefaultDriver('array');

        try {
            $response = $next($request);
        } finally {
            $this->sessions->setDefaultDriver($driver);
        }

        // StartSession and the CSRF middleware still attach their cookies.
        $drop = [config('session.cookie'), 'XSRF-TOKEN'];

        foreach ($response->headers->getCookies() as $cookie) {
            if (in_array($cookie->getName(), $drop, true)) {
                $response->headers->removeCookie($cookie->getName(), $cookie->getPath(), $cookie->getDomain());
            }
        }

        return $response;
    }

    private function isAnonymousPublicRead(Request $request): bool
    {
        if (! $request->isMethod('GET') && ! $request->isMethod('HEAD')) {
            return false;
        }

        if ($request->cookies->has(config('session.cookie'))) {
            return false;
        }

        foreach (array_keys($request->cookies->all()) as $name) {
            if (str_starts_with((string) $name, 'remember_')) {
                return false;
            }
        }

        $route = $request->route();

        return $route instanceof Route && ! $this->routeNeedsSession($route);
    }

    private function routeNeedsSession(Route $route): bool
    {
        if ($route->getName() === 'pages.show'
            && in_array($route->parameter('path'), self::STATEFUL_PAGES, true)) {
            return true;
        }

        foreach ($route->gatherMiddleware() as $middleware) {
            if (! is_string($middleware)) {
                continue;
            }

            $name = Str::before($middleware, ':');

            if (in_array($name, self::SESSION_MIDDLEWARE, true)
                || str_contains($name, 'Authenticate')
                || str_contains($name, 'RequirePassword')
                || str_contains($name, 'EnsureEmailIsVerified')) {
                return true;
            }
        }

        return false;
    }
}
