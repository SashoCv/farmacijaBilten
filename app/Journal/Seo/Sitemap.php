<?php

namespace App\Journal\Seo;

use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use InvalidArgumentException;
use XMLWriter;

/**
 * XML sitemaps (sitemaps.org 0.9): an index at /sitemap.xml pointing to
 * /sitemaps/pages.xml, issues.xml and articles.xml. Each document is cached
 * for an hour; flush() drops them after an import.
 */
final class Sitemap
{
    public const TYPES = ['pages', 'issues', 'articles'];

    public const TTL = 3600;

    /** Pages with their own route (the CMS pages are added from the database). */
    private const ROUTES = ['home', 'archive', 'early-online', 'about', 'indexing', 'contact', 'privacy', 'accessibility'];

    public static function index(): string
    {
        return Cache::remember(self::key('index'), self::TTL, function () {
            $xml = self::open('sitemapindex');

            foreach (self::TYPES as $type) {
                $entries = self::entries($type);
                $xml->startElement('sitemap');
                $xml->writeElement('loc', SeoMeta::absolute(route('sitemaps.show', $type, false)));
                self::lastmod($xml, collect($entries)->max('lastmod'));
                $xml->endElement();
            }

            return self::close($xml);
        });
    }

    public static function document(string $type): string
    {
        return Cache::remember(self::key($type), self::TTL, function () use ($type) {
            $xml = self::open('urlset');

            foreach (self::entries($type) as $entry) {
                $xml->startElement('url');
                $xml->writeElement('loc', $entry['loc']);
                self::lastmod($xml, $entry['lastmod']);
                $xml->endElement();
            }

            return self::close($xml);
        });
    }

    public static function flush(): void
    {
        foreach (['index', ...self::TYPES] as $type) {
            Cache::forget(self::key($type));
        }
    }

    /**
     * @return list<array{loc: string, lastmod: CarbonInterface|null}>
     */
    public static function entries(string $type): array
    {
        return match ($type) {
            'pages' => self::pages(),
            'issues' => self::issues(),
            'articles' => self::articles(),
            default => throw new InvalidArgumentException("Unknown sitemap: {$type}"),
        };
    }

    /** @return list<array{loc: string, lastmod: CarbonInterface|null}> */
    private static function pages(): array
    {
        $newest = self::date(Article::query()->max('updated_at'));
        $entries = [];

        foreach (self::ROUTES as $name) {
            $lastmod = match ($name) {
                'home', 'archive', 'early-online' => $newest,
                'contact' => self::date(Page::where('path', 'contact')->value('updated_at')),
                default => null,
            };
            $entries[] = ['loc' => SeoMeta::absolute(route($name, absolute: false)), 'lastmod' => $lastmod];
        }

        Page::query()
            ->where('path', '!=', 'contact')
            ->orderBy('path')
            ->get(['path', 'updated_at'])
            ->each(function (Page $page) use (&$entries) {
                $entries[] = ['loc' => SeoMeta::absolute($page->url()), 'lastmod' => $page->updated_at];
            });

        return $entries;
    }

    /** @return list<array{loc: string, lastmod: CarbonInterface|null}> */
    private static function issues(): array
    {
        return array_values(Issue::query()
            ->withMax('articles', 'updated_at')
            ->latestFirst()
            ->get()
            ->map(fn (Issue $issue) => [
                'loc' => ScholarlyMeta::issueUrl($issue),
                'lastmod' => collect([$issue->updated_at, self::date($issue->getAttribute('articles_max_updated_at'))])->filter()->max(),
            ])
            ->all());
    }

    /** @return list<array{loc: string, lastmod: CarbonInterface|null}> */
    private static function articles(): array
    {
        $issues = Issue::query()->get(['id', 'slug'])->keyBy('id');

        return array_values(Article::query()
            ->orderBy('issue_id')
            ->orderBy('position')
            ->get(['id', 'issue_id', 'number', 'updated_at'])
            ->map(fn (Article $article) => [
                'loc' => SeoMeta::absolute(route('articles.show', [
                    'issue' => $issues[$article->issue_id]->slug,
                    'article' => $article->number,
                ], false)),
                'lastmod' => $article->updated_at,
            ])
            ->all());
    }

    private static function open(string $root): XMLWriter
    {
        $xml = new XMLWriter;
        $xml->openMemory();
        $xml->setIndent(true);
        $xml->setIndentString('  ');
        $xml->startDocument('1.0', 'UTF-8');
        $xml->startElement($root);
        $xml->writeAttribute('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9');

        return $xml;
    }

    private static function close(XMLWriter $xml): string
    {
        $xml->endElement();
        $xml->endDocument();

        return $xml->outputMemory();
    }

    private static function lastmod(XMLWriter $xml, ?CarbonInterface $date): void
    {
        if ($date) {
            $xml->writeElement('lastmod', $date->utc()->toAtomString());
        }
    }

    private static function date(mixed $value): ?CarbonInterface
    {
        return $value ? Date::parse($value) : null;
    }

    private static function key(string $type): string
    {
        return 'seo.sitemap.'.$type.'.'.md5(SeoMeta::absolute('/'));
    }
}
