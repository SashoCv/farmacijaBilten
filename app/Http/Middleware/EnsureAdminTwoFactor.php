<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * The editorial office sees every manuscript, reviewer and payment, so its
 * accounts need a second factor (an authenticator app). Admins
 * without one are sent to Settings → Security first.
 */
class EnsureAdminTwoFactor
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! config('journal.security.admin_requires_2fa') || ! $user instanceof User || $user->hasStrongSignIn()) {
            return $next($request);
        }

        Inertia::flash('toast', [
            'type' => 'error',
            'message' => __('Turn on two-factor authentication to use the editorial office pages.'),
        ]);

        return redirect()->route('security.edit');
    }
}
