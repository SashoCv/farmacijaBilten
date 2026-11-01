<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Global middleware, before routing: one canonical address per page.
 *
 *  - "/index.php/<path>" (old WordPress addresses) → 301 "/<path>", with the
 *    two pages that moved under /guidelines mapped there; "/index.php" and
 *    "/index.php/" → "/".
 *  - A trailing slash ("/archive/") → 301 "/archive" (except "/").
 *
 * The query string is kept. Only GET and HEAD are redirected, since a 301
 * would turn a POST into a GET.
 *
 * Reads the raw request URI because `php -S` and some servers treat
 * "/index.php/x" as the front controller plus PATH_INFO, so the routed path
 * would already be "x". Runs after TrustProxies, so the scheme and host of the
 * redirect are the ones the reader used.
 */
class LegacyPathNormalizer
{
    /** Old top-level pages that now live under /guidelines. */
    private const MOVED = ['editorial-policies', 'instructions-for-authors'];

    public function handle(Request $request, Closure $next): Response
    {
        if (! in_array($request->getMethod(), ['GET', 'HEAD'], true)) {
            return $next($request);
        }

        $target = self::target($request->getRequestUri());

        if ($target === null) {
            return $next($request);
        }

        // Absolute, because the URL generator would keep "/index.php" as the base path here.
        return redirect()->away($request->getSchemeAndHttpHost().$target, 301);
    }

    /**
     * The normalized path and query for a raw request URI, or null when the
     * URI is already canonical.
     */
    public static function target(string $uri): ?string
    {
        $query = '';

        if (($pos = strpos($uri, '?')) !== false) {
            $query = substr($uri, $pos);
            $uri = substr($uri, 0, $pos);
        }

        $path = $uri;

        if (preg_match('#^/index\.php(?:/(.*))?$#', $path, $m)) {
            $rest = trim($m[1] ?? '', '/');
            $path = '/'.(in_array($rest, self::MOVED, true) ? 'guidelines/'.$rest : $rest);
        }

        if ($path !== '/') {
            $path = '/'.trim($path, '/');
        }

        // Collapse "//" runs left inside the path ("/issues//71-2").
        $path = (string) preg_replace('#/{2,}#', '/', $path);

        return $path === $uri ? null : $path.$query;
    }
}
