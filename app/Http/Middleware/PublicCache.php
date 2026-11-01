<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Lets browsers and a reverse proxy keep anonymous journal pages for a few
 * minutes: "Cache-Control: public, max-age=300, stale-while-revalidate=600".
 *
 * Only for successful GET/HEAD responses to requests that ran without a
 * session (see StatelessPublicRequests) and that set no cookie. Responses that
 * chose their own caching (max-age, no-store, ...) are left alone. The pages
 * also vary by the "locale" cookie, which SetLocale declares with Vary: Cookie.
 *
 * Settings live in config/http.php (off by default in the local environment,
 * so developers never see stale pages).
 */
class PublicCache
{
    private const OWN_DIRECTIVES = ['public', 'max-age', 's-maxage', 'no-store', 'immutable'];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if (! $this->cacheable($request, $response)) {
            return $response;
        }

        $maxAge = (int) config('http.public_cache.max_age', 300);
        $stale = (int) config('http.public_cache.stale_while_revalidate', 600);

        $response->headers->set('Cache-Control', "public, max-age={$maxAge}, stale-while-revalidate={$stale}");

        return $response;
    }

    private function cacheable(Request $request, Response $response): bool
    {
        if (! config('http.public_cache.enabled', true)) {
            return false;
        }

        if (! $request->isMethod('GET') && ! $request->isMethod('HEAD')) {
            return false;
        }

        if ($response->getStatusCode() !== 200
            || ! $request->attributes->get(StatelessPublicRequests::ATTRIBUTE)
            || $request->user() !== null
            || $response->headers->getCookies() !== []) {
            return false;
        }

        foreach (self::OWN_DIRECTIVES as $directive) {
            if ($response->headers->hasCacheControlDirective($directive)) {
                return false;
            }
        }

        return true;
    }
}
