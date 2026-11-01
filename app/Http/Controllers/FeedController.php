<?php

namespace App\Http\Controllers;

use App\Journal\Seo\Feed;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;

/**
 * Atom feeds: /feed (newest articles) and /feed/early-online.
 */
class FeedController extends Controller
{
    public function latest(): Response
    {
        return $this->atom(Feed::latest(...));
    }

    public function earlyOnline(): Response
    {
        return $this->atom(Feed::earlyOnline(...));
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
}
