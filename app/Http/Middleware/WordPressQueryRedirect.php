<?php

namespace App\Http\Middleware;

use App\Console\Commands\ImportJournal;
use App\Models\Issue;
use App\Models\Page;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Old WordPress query addresses on the home page redirect permanently:
 *
 *  - "/?p=590" (post) and "/?page_id=13" (page), through the wp_id columns
 *    and, for posts that are not issues (volume overviews, early online),
 *    the ID list saved by journal:import;
 *  - "/?s=term" (search) => "/search?q=term";
 *  - "/?feed=rss2" => "/feed".
 *
 * Unknown IDs fall through to the home page.
 */
class WordPressQueryRedirect
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->isMethod('GET') || $request->path() !== '/' || $request->query->count() === 0) {
            return $next($request);
        }

        $target = $this->target($request);

        return $target !== null ? redirect($target, 301) : $next($request);
    }

    private function target(Request $request): ?string
    {
        $query = $request->query;

        if ($id = self::id($query->get('p')) ?? self::id($query->get('post'))) {
            return $this->post($id);
        }

        if ($id = self::id($query->get('page_id'))) {
            return $this->page($id);
        }

        if (is_string($term = $query->get('s')) && trim($term) !== '') {
            return route('search', ['q' => trim($term)], absolute: false);
        }

        if ($query->has('feed')) {
            return route('feed', absolute: false);
        }

        return null;
    }

    private function post(int $id): ?string
    {
        if ($slug = Issue::where('wp_id', $id)->value('slug')) {
            return route('issues.show', $slug, absolute: false);
        }

        $old = self::savedIds()['posts'][$id] ?? null;

        return match (true) {
            $old === null => $this->page($id),
            $old === 'early-online' => route('early-online', absolute: false),
            // Volume overviews and anything else: the legacy post route decides.
            default => '/'.$old,
        };
    }

    private function page(int $id): ?string
    {
        $path = Page::where('wp_id', $id)->value('path') ?? self::savedIds()['pages'][$id] ?? null;

        return $path !== null ? '/'.$path : null;
    }

    private static function id(mixed $value): ?int
    {
        return is_string($value) && ctype_digit($value) && $value !== '0' ? (int) $value : null;
    }

    /**
     * @return array{posts: array<int, string>, pages: array<int, string>}
     */
    private static function savedIds(): array
    {
        try {
            $data = json_decode((string) Storage::disk('journal')->get(ImportJournal::WP_IDS_FILE), true);
        } catch (Throwable) {
            $data = null;
        }

        return [
            'posts' => is_array($data['posts'] ?? null) ? $data['posts'] : [],
            'pages' => is_array($data['pages'] ?? null) ? $data['pages'] : [],
        ];
    }
}
