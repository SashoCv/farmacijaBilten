<?php

namespace App\Support;

/**
 * Makes links to other websites open in a new tab: adds target="_blank" and
 * rel="noopener noreferrer" to every <a href="http(s)://..."> pointing off
 * this site. Links within the site, anchors and mailto: are left alone.
 */
final class ExternalLinks
{
    public static function mark(string $html): string
    {
        $host = parse_url((string) config('app.url'), PHP_URL_HOST);

        return (string) preg_replace_callback('#<a\b([^>]*)>#iu', function (array $m) use ($host) {
            $attributes = $m[1];

            if (! preg_match('#\bhref\s*=\s*"(https?://[^"]+)"#iu', $attributes, $href)) {
                return $m[0];
            }

            $linkHost = parse_url(html_entity_decode($href[1]), PHP_URL_HOST);

            if ($linkHost === null || $linkHost === $host || in_array($linkHost, ['bulletin.mfd.org.mk', 'www.bulletin.mfd.org.mk'], true)) {
                return $m[0];
            }

            $attributes = (string) preg_replace('#\s(target|rel)\s*=\s*"[^"]*"#iu', '', $attributes);

            return '<a'.$attributes.' target="_blank" rel="noopener noreferrer">';
        }, $html);
    }
}
