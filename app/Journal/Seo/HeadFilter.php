<?php

namespace App\Journal\Seo;

/**
 * The SEO tags are printed once, by resources/views/partials/meta.blade.php.
 * When the SSR process also renders <Head> tags of the same kind (a page that
 * still sets its own description or citation_* tags), they are dropped from
 * the SSR head here so crawlers never see two competing sets.
 */
final class HeadFilter
{
    private const PATTERNS = [
        // <meta name|property="description|robots|citation_*|DC.*|og:*|twitter:*|article:*">
        '#<meta\b[^>]*\b(?:name|property)\s*=\s*["\'](?:description|robots|citation_[^"\']*|DC\.[^"\']*|DCTERMS\.[^"\']*|og:[^"\']*|twitter:[^"\']*|article:[^"\']*)["\'][^>]*>\s*#i',
        '#<link\b[^>]*\brel\s*=\s*["\'](?:canonical|schema\.DC)["\'][^>]*>\s*#i',
        '#<script\b[^>]*\btype\s*=\s*["\']application/ld\+json["\'][^>]*>.*?</script>\s*#is',
    ];

    public static function strip(string $head): string
    {
        return (string) preg_replace(self::PATTERNS, '', $head);
    }
}
