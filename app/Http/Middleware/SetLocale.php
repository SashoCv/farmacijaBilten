<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\Response as IlluminateResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Applies the reader's language choice (English or Macedonian) from the
 * "locale" cookie, so server-rendered labels and dates match the interface.
 *
 * English is the canonical, indexable version: crawlers send no cookie, and
 * the switcher links (/locale/{locale}) are nofollow. Only responses that
 * actually change with the language (HTML pages and Inertia page JSON) say
 * "Vary: Cookie"; feeds, sitemaps, OAI-PMH and files stay shareable.
 */
class SetLocale
{
    public const SUPPORTED = ['en', 'mk'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->cookie('locale');

        if (in_array($locale, self::SUPPORTED, true)) {
            app()->setLocale($locale);
        }

        $response = $next($request);

        if (self::variesByLocale($response)) {
            $vary = array_filter(array_map('trim', explode(',', (string) $response->headers->get('Vary'))));

            if (! in_array('cookie', array_map('strtolower', $vary), true)) {
                $vary[] = 'Cookie';
            }

            $response->headers->set('Vary', implode(', ', $vary));
        }

        return $response;
    }

    private static function variesByLocale(Response $response): bool
    {
        if ($response->headers->has('X-Inertia')) {
            return true;
        }

        $type = $response->headers->get('Content-Type');

        // Responses built by the exception handler are not prepared yet;
        // Symfony defaults those to text/html when sending.
        if ($type === null) {
            return $response instanceof IlluminateResponse;
        }

        return str_starts_with(strtolower($type), 'text/html');
    }
}
