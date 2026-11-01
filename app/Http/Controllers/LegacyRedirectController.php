<?php

namespace App\Http\Controllers;

use App\Journal\Import\IssueMap;
use App\Models\Issue;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Storage;

/**
 * Old WordPress addresses ("/volume-71-2/", "/wp-content/uploads/...") redirect
 * permanently to their new home, so links and search results keep working.
 *
 * "/index.php/..." addresses are handled before routing by
 * App\Http\Middleware\LegacyPathNormalizer, and "/?p=ID" by WordPressQueryRedirect.
 */
class LegacyRedirectController extends Controller
{
    /**
     * "/volume-71-2/" → "/issues/71-2". Volume-only posts and issues that do
     * not exist (yet) lead to the volume in the archive instead of a 404.
     */
    public function post(string $post): RedirectResponse
    {
        $post = strtolower($post);

        if ($volume = IssueMap::containerVolume($post)) {
            return $this->toArchive($volume);
        }

        $map = IssueMap::forPost($post);

        if ($map === null) {
            $volume = IssueMap::volumeOf($post);

            abort_if($volume === null, 404);

            return $this->toArchive($volume);
        }

        if (! Issue::where('slug', $map['slug'])->exists()) {
            return $this->toArchive($map['volume']);
        }

        return redirect()->route('issues.show', $map['slug'], 301);
    }

    private function toArchive(int $volume): RedirectResponse
    {
        return redirect(route('archive', absolute: false).'#volume-'.$volume, 301);
    }

    /** "/wp-content/uploads/2025/09/x.png" → "/media/uploads/2025/09/x.png" when mirrored. */
    public function upload(string $path): RedirectResponse
    {
        return $this->toMirrored('media/uploads/'.$path);
    }

    /** "/wp-includes/images/doaj_logo.jpg" → "/media/images/doaj_logo.jpg" when mirrored. */
    public function includesImage(string $file): RedirectResponse
    {
        return $this->toMirrored('media/images/'.$file);
    }

    public function sitemap(): RedirectResponse
    {
        return redirect()->route('sitemap', status: 301);
    }

    public function commentsFeed(): RedirectResponse
    {
        return redirect()->route('feed', status: 301);
    }

    private function toMirrored(string $diskPath): RedirectResponse
    {
        abort_if(str_contains($diskPath, '..') || ! Storage::disk('journal')->exists($diskPath), 404);

        return redirect('/'.implode('/', array_map(rawurlencode(...), explode('/', $diskPath))), 301);
    }
}
