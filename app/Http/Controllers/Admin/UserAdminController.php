<?php

namespace App\Http\Controllers\Admin;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Countries;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * People and their roles, for the editorial office. Authors sign up
 * themselves and reviewers arrive by invitation; here an admin adds or removes
 * roles and deactivates accounts (history is kept, so accounts are not deleted).
 */
class UserAdminController extends Controller
{
    private const PER_PAGE = 25;

    public function index(Request $request): Response
    {
        $q = trim((string) $request->query('q', ''));
        $role = Role::tryFrom((string) $request->query('role', ''));
        $status = in_array($request->query('status'), ['active', 'deactivated'], true) ? (string) $request->query('status') : null;

        $query = User::query()
            ->with('roles')
            ->when($role, fn ($query) => $query->withRole($role))
            ->when($status === 'active', fn ($query) => $query->active())
            ->when($status === 'deactivated', fn ($query) => $query->whereNotNull('deactivated_at'))
            ->orderBy('family_name')
            ->orderBy('given_name')
            ->orderBy('id');

        // Few hundred people at most: search in PHP, so Cyrillic matches
        // regardless of case (SQLite's LIKE folds ASCII only).
        $users = $query->get();

        if ($q !== '') {
            $needle = mb_strtolower($q);
            $users = $users->filter(fn (User $u) => str_contains(
                mb_strtolower(implode(' ', [$u->name, $u->email, $u->affiliation, $u->orcid])),
                $needle,
            ));
        }

        $page = max(1, (int) $request->query('page', 1));
        $total = $users->count();
        $lastPage = max(1, (int) ceil($total / self::PER_PAGE));
        $page = min($page, $lastPage);

        return Inertia::render('admin/users/index', [
            'users' => $users->forPage($page, self::PER_PAGE)->values()->map(fn (User $u) => $this->present($u))->all(),
            'pagination' => ['currentPage' => $page, 'lastPage' => $lastPage, 'total' => $total],
            'filters' => ['q' => $q, 'role' => $role?->value, 'status' => $status],
            'roles' => Role::values(),
            'currentUserId' => $request->user()?->id,
        ]);
    }

    public function updateRoles(Request $request, User $user): RedirectResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        // The form always sends `roles` (an empty value when nothing is ticked).
        $request->merge(['roles' => array_values(array_filter((array) $request->input('roles', [])))]);

        $data = $request->validate([
            'roles' => ['present', 'array'],
            'roles.*' => ['string', Rule::in(Role::values())],
        ]);

        /** @var list<string> $values */
        $values = $data['roles'];
        $wanted = collect($values)->map(fn (string $r) => Role::from($r))->unique();

        if ($user->is($admin) && ! $wanted->contains(Role::Admin)) {
            throw ValidationException::withMessages(['roles' => __('You cannot remove your own editorial office role.')]);
        }

        DB::transaction(function () use ($user, $admin, $wanted) {
            foreach (Role::cases() as $role) {
                if ($wanted->contains($role)) {
                    $user->grantRole($role, $admin);
                } elseif ($user->hasRole($role)) {
                    if ($role === Role::Admin && User::withRole(Role::Admin)->active()->whereKeyNot($user->id)->doesntExist()) {
                        throw ValidationException::withMessages(['roles' => __('The last editorial office account cannot lose its role.')]);
                    }

                    $user->revokeRole($role, $admin);
                }

                $user->load('roles');
            }
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Roles updated for :name.', ['name' => $user->name])]);

        return back();
    }

    public function updateStatus(Request $request, User $user): RedirectResponse
    {
        /** @var User $admin */
        $admin = $request->user();

        $active = $request->validate(['active' => ['required', 'boolean']])['active'];

        if ($user->is($admin)) {
            throw ValidationException::withMessages(['active' => __('You cannot deactivate your own account.')]);
        }

        if (! $active && $user->isAdmin() && User::withRole(Role::Admin)->active()->whereKeyNot($user->id)->doesntExist()) {
            throw ValidationException::withMessages(['active' => __('The last editorial office account cannot be deactivated.')]);
        }

        if ($active !== $user->isActive()) {
            DB::transaction(function () use ($user, $admin, $active) {
                $user->forceFill(['deactivated_at' => $active ? null : now()])->save();
                $user->recordEvent($active ? 'reactivated' : 'deactivated', $admin);
            });
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => $active
            ? __(':name can sign in again.', ['name' => $user->name])
            : __(':name can no longer sign in.', ['name' => $user->name]),
        ]);

        return back();
    }

    /** @return array<string, mixed> */
    private function present(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->name,
            'title' => $user->academic_title,
            'email' => $user->email,
            'affiliation' => $user->affiliation,
            'country' => in_array($user->country_code, Countries::CODES, true) ? $user->country_code : null,
            'orcid' => $user->orcid,
            'roles' => $user->roleNames(),
            'active' => $user->isActive(),
            'verified' => $user->email_verified_at !== null,
            'secondFactor' => $user->two_factor_confirmed_at !== null,
            'createdAt' => $user->created_at?->toIso8601String(),
        ];
    }
}
