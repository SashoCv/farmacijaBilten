<?php

namespace App\Http\Controllers;

use App\Journal\Seo\Feed;
use App\Journal\Seo\SeoMeta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/**
 * Atom feeds: /feed (newest articles) and /feed/early-online.
 *
 * Feed readers get the Atom XML. A person who opens the address in a browser
 * gets a page explaining what a feed is, with the address to copy and the
 * newest articles (instead of raw XML). Browsers ask for text/html first;
 * readers ask for Atom/RSS/XML or anything. `?format=xml|html` overrides.
 */
class FeedController extends Controller
{
    public function latest(Request $request): Response
    {
        return $this->respond($request, Feed::latest(...), 'latest');
    }

    public function earlyOnline(Request $request): Response
    {
        return $this->respond($request, Feed::earlyOnline(...), 'early-online');
    }

    /** @param  callable(): array<string, mixed>  $build */
    private function respond(Request $request, callable $build, string $which): Response
    {
        $response = $this->wantsPage($request)
            ? $this->page($request, $build, $which)
            : $this->atom($build);

        // The same address serves two formats.
        $response->headers->set('Vary', 'Accept');

        return $response;
    }

    private function wantsPage(Request $request): bool
    {
        $format = $request->query('format');

        if ($format === 'xml' || $format === 'html') {
            return $format === 'html';
        }

        $accept = strtolower((string) $request->header('Accept', ''));

        return str_contains($accept, 'text/html')
            && ! str_contains($accept, 'atom')
            && ! str_contains($accept, 'rss');
    }

    /**
     * Feeds are public and cached by readers, so they are always in English
     * whatever the visitor's language cookie.
     *
     * @param  callable(): array<string, mixed>  $build
     */
    private function atom(callable $build): Response
    {
        $locale = App::getLocale();
        App::setLocale('en');

        try {
            $body = view('feeds.atom', $build())->render();
        } finally {
            App::setLocale($locale);
        }

        return response($body, 200, [
            'Content-Type' => 'application/atom+xml; charset=UTF-8',
            'Cache-Control' => 'public, max-age=900',
            'X-Robots-Tag' => 'noindex',
        ]);
    }

    /** @param  callable(): array<string, mixed>  $build */
    private function page(Request $request, callable $build, string $which): Response
    {
        $feed = $build();
        $title = $which === 'early-online' ? __('Early online feed') : __('Latest articles feed');

        return Inertia::render('journal/feed', [
            'feed' => [
                'kind' => $which,
                'url' => $feed['self'],
                'alternate' => $feed['alternate'],
                'updated' => $feed['updated'],
                'entries' => array_map(fn (array $e) => [
                    'title' => $e['title'],
                    'link' => $e['link'],
                    'authors' => $e['authors'],
                    'type' => $e['category'],
                    'published' => $e['published'],
                    'lang' => $e['lang'],
                ], array_slice($feed['entries'], 0, 20)),
            ],
        ])
            ->withViewData(['meta' => SeoMeta::forError($title)])
            ->toResponse($request);
    }
}
