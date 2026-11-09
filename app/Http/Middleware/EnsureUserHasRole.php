<?php

namespace App\Http\Middleware;

use App\Enums\Role;
use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * `role:admin`, `role:author,reviewer`: the signed-in user must hold one of the
 * roles and be active. A coarse gate only; policies decide per manuscript.
 */
class EnsureUserHasRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        abort_unless($user instanceof User && $user->isActive(), 403);

        $allowed = collect($roles)->map(fn (string $role) => Role::from($role));

        abort_unless(
            $allowed->isEmpty() || $allowed->contains(fn (Role $role) => $user->hasRole($role)),
            403,
        );

        return $next($request);
    }
}
