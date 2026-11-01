<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Security response headers on every response, including redirects and
 * error pages (registered first in the global stack):
 * X-Content-Type-Options, Referrer-Policy, X-Frame-Options (SAMEORIGIN, so the
 * site's own PDF viewer can frame its PDFs; off in local development, see
 * config/http.php), Permissions-Policy, and HSTS on HTTPS requests. Removes X-Powered-By; production also sets expose_php=Off
 * (deploy/php.ini). Static files served by nginx get the same headers from
 * deploy/nginx.conf.
 */
class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $headers = [
            'X-Content-Type-Options' => 'nosniff',
            'Referrer-Policy' => 'strict-origin-when-cross-origin',
            'X-Frame-Options' => (string) config('http.frame_options', 'SAMEORIGIN'),
            'Permissions-Policy' => (string) config('http.permissions_policy'),
        ];

        $hsts = (int) config('http.hsts_max_age', 31536000);

        if ($request->isSecure() && $hsts > 0) {
            $headers['Strict-Transport-Security'] = "max-age={$hsts}";
        }

        // Only the production site may be indexed; previews (local, tunnels,
        // staging) would otherwise show up in search as duplicate copies.
        if (! app()->environment('production')) {
            $headers['X-Robots-Tag'] = 'noindex, nofollow';
        }

        foreach ($headers as $name => $value) {
            if ($value !== '' && ! $response->headers->has($name)) {
                $response->headers->set($name, $value);
            }
        }

        $response->headers->remove('X-Powered-By');

        if (! headers_sent()) {
            header_remove('X-Powered-By');
        }

        return $response;
    }
}
