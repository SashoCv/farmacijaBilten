<?php

namespace App\Journal\Seo;

use App\Models\Article;
use App\Models\Issue;
use App\Models\Page;
use Illuminate\Http\Request;

/**
 * Server-rendered <head> metadata, passed by every journal controller as the
 * `meta` view data (->withViewData(['meta' => SeoMeta::for...()])) and printed
 * by resources/views/partials/meta.blade.php, so indexers get it whether or not
 * the SSR process is running.
 *
 * Each method returns the same shape:
 *
 *   title          page title without the site name ("Volume 71, Issue 2")
 *   documentTitle  <title> used when SSR is unavailable ("… – Macedonian Pharmaceutical Bulletin")
 *   description    meta/og description (plain text, about 155 characters)
 *   canonical      absolute https URL, no query except ?page=N
 *   robots         null (indexable) or e.g. "noindex,follow"
 *   og             ['type' => 'website'|'article', 'image' => url, 'imageWidth', 'imageHeight', 'imageAlt']
 *   tags           list of ['name' => …, 'content' => …] or ['property' => …, 'content' => …]
 *                  (citation_*, DC.*, article:*), already ordered
 *   links          list of ['rel' => …, 'href' => …] (schema.DC)
 *   jsonLd         schema.org graph (array) or null
 */
final class SeoMeta
{
    /** Branded 1200×630 sharing card (public/og/journal-card.png). */
    public const CARD = '/og/journal-card.png';

    /**
     * Canonical address of the current page: https outside local development,
     * no query string except "?page=N" (N > 1) on paginated lists.
     */
    public static function canonical(Request $request): string
    {
        $url = url()->current();

        if (! app()->isLocal()) {
            $url = preg_replace('#^http://#', 'https://', $url);
        }

        $page = is_numeric($request->query('page')) ? (int) $request->query('page') : 1;

        return $page > 1 ? "{$url}?page={$page}" : $url;
    }

    /**
     * Absolute URL for a path or URL, forced to https outside local
     * development (the same rule as the canonical URL).
     */
    public static function absolute(string $path): string
    {
        $url = url($path);

        return app()->isLocal() ? $url : (string) preg_replace('#^http://#', 'https://', $url);
    }

    /** @return array<string, mixed> */
    public static function forHome(): array
    {
        return self::build(
            title: self::name(),
            description: Text::t(':name (ISSN :print print, :online online) is the open-access, peer-reviewed journal of the :publisher and the :faculty.', [
                'name' => self::name(),
                'print' => config('journal.issn_print'),
                'online' => config('journal.issn_online'),
                'publisher' => self::name('publisher.'),
                'faculty' => self::name('co_publisher.'),
            ]),
            jsonLd: JsonLd::home(),
        );
    }

    /** @return array<string, mixed> */
    public static function forListing(string $title): array
    {
        $route = request()->route()?->getName();

        return self::build(
            title: $title,
            description: self::listingDescription($route),
            jsonLd: $route === 'contact' ? JsonLd::contact(self::canonical(request()), $title) : null,
        );
    }

    /** @return array<string, mixed> */
    public static function forIssue(Issue $issue): array
    {
        $count = $issue->articles_count ?? $issue->articles()->count();

        return self::build(
            title: $issue->label(),
            description: self::issueDescription($issue, (int) $count),
            jsonLd: JsonLd::issue($issue),
        );
    }

    /** @return array<string, mixed> */
    public static function forArticle(Article $article): array
    {
        $meta = self::build(
            title: Text::plain($article->title),
            description: self::articleDescription($article),
            type: 'article',
            jsonLd: JsonLd::article($article),
        );

        $meta['tags'] = [
            ...ScholarlyMeta::citation($article),
            ...ScholarlyMeta::dublinCore($article),
            ...array_values(array_filter([
                $article->online_at ? ['property' => 'article:published_time', 'content' => $article->online_at->toDateString()] : null,
                $article->type ? ['property' => 'article:section', 'content' => $article->type] : null,
            ])),
        ];
        $meta['links'] = [['rel' => 'schema.DC', 'href' => 'http://purl.org/dc/elements/1.1/']];

        return $meta;
    }

    /** @return array<string, mixed> */
    public static function forPage(Page $page): array
    {
        $canonical = self::canonical(request());

        return self::build(
            title: $page->title,
            description: $page->summary ? Text::excerpt($page->summary) : (Text::excerpt($page->body) ?: null),
            jsonLd: $page->path === 'contact' ? JsonLd::contact($canonical, $page->title) : null,
        );
    }

    /** @return array<string, mixed> */
    public static function forSearch(string $q): array
    {
        return self::build(
            title: $q === '' ? Text::t('Search') : Text::t('Search results for “:query”', ['query' => $q]),
            description: null,
            robots: 'noindex,follow',
        );
    }

    /**
     * Metadata for pages whose controller passes none: the signed-in app,
     * sign-in and settings pages, and error pages. None of them is indexed.
     *
     * @param  array<string, mixed>  $page  Inertia page object
     * @return array<string, mixed>
     */
    public static function fallback(array $page): array
    {
        $title = is_string($page['props']['title'] ?? null) ? $page['props']['title'] : null;

        return [
            'title' => $title ?? self::name(),
            'documentTitle' => self::documentTitle($title ?? ''),
            'description' => null,
            'canonical' => null,
            'robots' => 'noindex,follow',
            'og' => null,
            'tags' => [],
            'links' => [],
            'jsonLd' => null,
        ];
    }

    /**
     * "Volume 71, Issue 2 – Macedonian Pharmaceutical Bulletin", the journal
     * name in the reader's language (as app.tsx titles pages).
     */
    public static function documentTitle(string $title): string
    {
        $name = self::name();

        return $title === '' || $title === $name || $title === config('journal.name_en') ? $name : "{$title} – {$name}";
    }

    /**
     * Name of the journal (or, with a prefix such as "publisher.", of an
     * organisation) in the reader's language.
     */
    public static function name(string $prefix = ''): string
    {
        $mk = app()->getLocale() === 'mk' ? config("journal.{$prefix}name_mk") : null;

        return $mk ?: config("journal.{$prefix}name_en");
    }

    /**
     * @param  array<string, mixed>|null  $jsonLd
     * @return array<string, mixed>
     */
    private static function build(
        string $title,
        ?string $description,
        string $type = 'website',
        ?string $robots = null,
        ?array $jsonLd = null,
    ): array {
        return [
            'title' => $title,
            'documentTitle' => self::documentTitle($title),
            'description' => $description,
            'canonical' => self::canonical(request()),
            'robots' => $robots,
            'og' => [
                'type' => $type,
                'image' => self::absolute(self::CARD),
                'imageWidth' => 1200,
                'imageHeight' => 630,
                'imageAlt' => self::name(),
            ],
            'tags' => [],
            'links' => [],
            'jsonLd' => $jsonLd,
        ];
    }

    private static function listingDescription(?string $route): ?string
    {
        $name = self::name();

        return match ($route) {
            'archive' => Text::t('Every volume and issue of the :name, with tables of contents and full-text PDFs, free to read.', ['name' => $name]),
            'early-online' => Text::t('Articles of the :name published online ahead of their issue, free to read and download as PDF.', ['name' => $name]),
            'about' => Text::t('About the :name, the open-access, peer-reviewed journal of the :publisher and the :faculty.', [
                'name' => $name,
                'publisher' => self::name('publisher.'),
                'faculty' => self::name('co_publisher.'),
            ]),
            'indexing' => Text::t('Databases and services that index the :name: :services.', [
                'name' => $name,
                'services' => implode(', ', array_column(config('journal.indexing'), 'name')),
            ]),
            'contact' => Text::t('Contact the editorial office of the :name.', ['name' => $name]),
            'privacy' => Text::t('Privacy notice of the :name website.', ['name' => $name]),
            'accessibility' => Text::t('Accessibility statement of the :name website.', ['name' => $name]),
            default => null,
        };
    }

    /**
     * "Volume 71, Issue 2 (2025) of the Macedonian Pharmaceutical Bulletin:
     * 10 peer-reviewed articles, free to read and download as PDF."
     */
    private static function issueDescription(Issue $issue, int $count): string
    {
        $values = [
            'issue' => $issue->label().($issue->year ? " ({$issue->year})" : ''),
            'name' => self::name(),
        ];

        if ($count === 0) {
            return Text::t(':issue of the :name, free to read and download as PDF.', $values);
        }

        $contents = in_array($issue->kind, [Issue::KIND_SUPPLEMENT, Issue::KIND_ABSTRACTS], true)
            ? Text::choice(':count contribution|:count contributions', $count)
            : Text::choice(':count peer-reviewed article|:count peer-reviewed articles', $count);

        return $issue->is_published
            ? Text::t(':issue of the :name: :contents, free to read and download as PDF.', [...$values, 'contents' => $contents])
            : Text::t(':issue of the :name, in progress: :contents published online so far, free to read and download as PDF.', [...$values, 'contents' => $contents]);
    }

    /**
     * The abstract cut to 155 characters, or "Review paper by Redzep Ali et al.,
     * Volume 71, Issue 2 (2025), pp. 3–11." when there is none.
     */
    private static function articleDescription(Article $article): string
    {
        if (filled($article->abstract)) {
            return Text::excerpt($article->abstract);
        }

        $issue = $article->issue;
        $authors = $article->authors ?? [];
        $label = $issue->label().($issue->year ? " ({$issue->year})" : '');
        $type = $article->type ?: Text::t('Article');

        $text = match (true) {
            count($authors) > 1 => Text::t(':type by :author et al., :issue', ['type' => $type, 'author' => $authors[0], 'issue' => $label]),
            count($authors) === 1 => Text::t(':type by :author, :issue', ['type' => $type, 'author' => $authors[0], 'issue' => $label]),
            default => "{$type}, {$label}",
        };

        return $text.($article->pages ? ', '.Text::t('pp. :pages', ['pages' => $article->pages]) : '').'.';
    }
}
