<?php

namespace App\Http\Controllers;

use App\Http\Middleware\SetLocale;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class LocaleController extends Controller
{
    /**
     * Switches the interface language and returns to the same page.
     *
     * Only same-site pages are returned to (the Referer header is set by the
     * browser and could point anywhere). The switch itself is never indexed
     * or cached; English stays the canonical version of every page.
     */
    public function __invoke(Request $request, string $locale): RedirectResponse
    {
        abort_unless(in_array($locale, SetLocale::SUPPORTED, true), 404);

        return redirect()->to($this->returnPath($request))
            ->withCookie(cookie()->forever('locale', $locale))
            ->header('Cache-Control', 'no-store, private')
            ->header('X-Robots-Tag', 'noindex, nofollow');
    }

    private function returnPath(Request $request): string
    {
        $referer = (string) $request->headers->get('referer');
        $parts = parse_url($referer);

        if ($referer === '' || $parts === false || ($parts['host'] ?? null) !== $request->getHost()) {
            return '/';
        }

        $path = '/'.ltrim($parts['path'] ?? '/', '/');

        // Never bounce back to the switch itself.
        if (str_starts_with($path, '/locale/')) {
            return '/';
        }

        return $path.(isset($parts['query']) ? '?'.$parts['query'] : '').(isset($parts['fragment']) ? '#'.$parts['fragment'] : '');
    }
}
