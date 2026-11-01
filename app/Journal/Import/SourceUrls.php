<?php

namespace App\Journal\Import;

/**
 * Maps URLs on the old site (bulletin.mfd.org.mk) to their place in the new one.
 */
final class SourceUrls
{
    public const BASE = 'https://bulletin.mfd.org.mk';

    private const HOST = 'bulletin.mfd.org.mk';

    private const FILE_EXTENSIONS = 'pdf|docx?|xlsx?|zip|jpe?g|png|gif|webp|svg';

    /**
     * Old-site folder => folder on the "journal" disk.
     */
    private const FILE_ROOTS = [
        'volumes/' => 'volumes/',
        'downloads/' => 'downloads/',
        'wp-content/uploads/' => 'media/uploads/',
        'wp-includes/images/' => 'media/images/',
    ];

    /**
     * Pages that moved under /guidelines (the old menu linked both forms).
     */
    private const PAGE_MOVES = [
        'editorial-policies' => 'guidelines/editorial-policies',
        'instructions-for-authors' => 'guidelines/instructions-for-authors',
    ];

    /**
     * Path on the "journal" disk for a file on the old site, e.g.
     * "http://bulletin.mfd.org.mk/volumes/Volume 71_2/71_2_001.pdf" => "volumes/Volume 71_2/71_2_001.pdf".
     */
    public static function filePath(string $url): ?string
    {
        $path = self::localPath($url);

        if ($path === null || ! preg_match('/\.('.self::FILE_EXTENSIONS.')$/i', $path)) {
            return null;
        }

        foreach (self::FILE_ROOTS as $from => $to) {
            if (str_starts_with($path, $from)) {
                return $to.substr($path, strlen($from));
            }
        }

        return null;
    }

    /**
     * Download URL on the old site for a path on the "journal" disk.
     */
    public static function fileSource(string $diskPath): string
    {
        foreach (self::FILE_ROOTS as $from => $to) {
            if (str_starts_with($diskPath, $to)) {
                $original = $from.substr($diskPath, strlen($to));

                return self::BASE.'/'.implode('/', array_map(rawurlencode(...), explode('/', $original)));
            }
        }

        return self::BASE.'/'.$diskPath;
    }

    /**
     * New-site URL for a link to an old-site page, or null when it isn't one.
     * Keeps the fragment ("#auth_duty").
     */
    public static function pageUrl(string $url): ?string
    {
        $path = self::localPath($url);

        if ($path === null) {
            return null;
        }

        $fragment = parse_url($url, PHP_URL_FRAGMENT);
        $suffix = $fragment ? '#'.$fragment : '';

        $path = trim((string) preg_replace('#^index\.php/?#', '', $path), '/');
        $path = self::PAGE_MOVES[$path] ?? $path;

        if ($path === '') {
            return '/'.$suffix;
        }

        if ($issue = self::issueSlugFromPostSlug($path)) {
            return '/issues/'.$issue.$suffix;
        }

        return '/'.$path.$suffix;
    }

    /**
     * Issue slug on the new site for an old post slug ("volume-71-2" => "71-2").
     */
    public static function issueSlugFromPostSlug(string $slug): ?string
    {
        $map = IssueMap::forPost($slug);

        return $map['slug'] ?? null;
    }

    /**
     * Path relative to the site root, decoded; null for other hosts.
     */
    private static function localPath(string $url): ?string
    {
        $url = trim(html_entity_decode($url));

        if ($url === '' || str_starts_with($url, '#') || str_starts_with($url, 'mailto:')) {
            return null;
        }

        $parts = parse_url($url);

        if ($parts === false) {
            return null;
        }

        $host = isset($parts['host']) ? strtolower($parts['host']) : null;

        if ($host !== null && $host !== self::HOST && $host !== 'www.'.self::HOST) {
            return null;
        }

        return ltrim(rawurldecode($parts['path'] ?? ''), '/');
    }
}
