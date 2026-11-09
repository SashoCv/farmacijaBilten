<?php

namespace App\Http\Middleware;

use App\Journal\Journal;
use App\Journal\Seo\SeoMeta;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            // Only what the pages need (`User` in resources/js/types/auth.ts),
            // never the whole model.
            'auth' => [
                'user' => fn () => $request->user() instanceof User ? $request->user()->presentForAuth() : null,
            ],
            'locale' => app()->getLocale(),
            'currentIssueSlug' => Journal::currentIssueSlug(),
            // Facts from config/journal.php (`JournalFacts` in resources/js/types/journal.ts).
            'journal' => fn () => Journal::facts(),
            'canonical' => fn () => SeoMeta::canonical($request),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
        ];
    }
}
