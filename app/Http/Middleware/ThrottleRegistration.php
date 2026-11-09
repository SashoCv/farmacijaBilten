<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;

/**
 * Fortify has no limiter for sign-up: allow a few new accounts per IP address
 * per hour. Runs on Fortify's routes and only acts on the registration POST.
 */
class ThrottleRegistration
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->routeIs('register.store')) {
            return $next($request);
        }

        $key = 'register:'.$request->ip();
        $max = max(1, (int) config('journal.security.registrations_per_hour', 5));

        if (RateLimiter::tooManyAttempts($key, $max)) {
            abort(429);
        }

        RateLimiter::hit($key, 3600);

        return $next($request);
    }
}
