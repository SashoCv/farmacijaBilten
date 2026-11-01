<?php

namespace App\Journal\Import;

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Follows an old-site URL through the application, the way a browser would:
 * redirects are followed (up to five hops) and files under /volumes,
 * /downloads and /media, which the web server serves directly, are looked up
 * on the "journal" disk.
 *
 * Used by journal:verify-data --links (real data) and LegacyRedirectTest.
 */
final class LegacyLinkChecker
{
    private const STATIC_ROOTS = ['volumes/', 'downloads/', 'media/'];

    public function __construct(private readonly Kernel $kernel) {}

    /**
     * Old links from a fixture file (one per line, "#" comments).
     *
     * @return list<string>
     */
    public static function linksFrom(string $file): array
    {
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];

        return array_values(array_filter($lines, fn (string $l) => ! str_starts_with(trim($l), '#')));
    }

    /**
     * Resource URLs of a Crossref fixture (list of {DOI, type, url}).
     *
     * @return list<string>
     */
    public static function crossrefUrls(string $file): array
    {
        $records = json_decode((string) file_get_contents($file), true) ?: [];

        return array_values(array_filter(array_map(fn (array $r) => $r['url'] ?? $r['resource']['primary']['URL'] ?? null, $records)));
    }

    /**
     * @return array{ok: bool, status: int, hops: list<string>}
     */
    public function check(string $url): array
    {
        $uri = self::localUri($url);
        $hops = [];

        if ($uri === null) {
            return ['ok' => false, 'status' => 0, 'hops' => ["not an old-site URL: {$url}"]];
        }

        for ($i = 0; $i < 6; $i++) {
            $hops[] = $uri;
            $path = ltrim((string) parse_url($uri, PHP_URL_PATH), '/');

            foreach (self::STATIC_ROOTS as $root) {
                if (str_starts_with($path, $root)) {
                    $exists = ! str_contains($path, '..') && Storage::disk('journal')->exists(rawurldecode($path));

                    return ['ok' => $exists, 'status' => $exists ? 200 : 404, 'hops' => $hops];
                }
            }

            $response = $this->kernel->handle(Request::create($uri));
            $status = $response->getStatusCode();

            if ($status < 300 || $status >= 400) {
                return ['ok' => $status === 200, 'status' => $status, 'hops' => $hops];
            }

            $location = (string) $response->headers->get('Location');
            $uri = self::localUri($location, sameApp: true);

            if ($uri === null) {
                return ['ok' => false, 'status' => $status, 'hops' => [...$hops, "redirect off site: {$location}"]];
            }
        }

        return ['ok' => false, 'status' => 0, 'hops' => [...$hops, 'too many redirects']];
    }

    /**
     * Path and query on this site for an old-site or same-app URL, with each
     * path segment percent-encoded once ("Volume 47" => "Volume%2047").
     */
    private static function localUri(string $url, bool $sameApp = false): ?string
    {
        // One Crossref deposit reads "http://http://bulletin…".
        $url = (string) preg_replace('#^(https?://)+#i', 'http://', trim($url));
        $parts = parse_url($url);

        if ($parts === false) {
            return null;
        }

        $host = strtolower($parts['host'] ?? '');

        if ($host !== '' && ! $sameApp && ! in_array($host, ['bulletin.mfd.org.mk', 'www.bulletin.mfd.org.mk'], true)) {
            return null;
        }

        $path = implode('/', array_map(
            fn (string $segment) => rawurlencode(rawurldecode($segment)),
            explode('/', $parts['path'] ?? '/'),
        ));

        return $path.(isset($parts['query']) ? '?'.$parts['query'] : '');
    }
}
