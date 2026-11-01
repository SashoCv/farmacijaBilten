<?php

namespace App\Journal\Seo;

use App\Models\Article;
use App\Models\Issue;
use App\Support\JournalFiles;

/**
 * schema.org structured data (JSON-LD). Nodes share stable @ids so the
 * article → issue → volume → periodical chain is one graph on every page.
 */
final class JsonLd
{
    /** @return array<string, mixed> */
    public static function home(): array
    {
        return self::graph([self::periodical(), self::publisher(), self::faculty()]);
    }

    /** @return array<string, mixed> */
    public static function issue(Issue $issue): array
    {
        $url = ScholarlyMeta::issueUrl($issue);

        return self::graph([
            self::issueNode($issue, withUrl: true),
            self::periodical(),
            self::publisher(),
            self::faculty(),
            self::breadcrumbs([
                [Text::t('Home'), self::homeUrl()],
                [Text::t('Archive'), SeoMeta::absolute(route('archive', absolute: false))],
                [$issue->label(), $url],
            ]),
        ]);
    }

    /** @return array<string, mixed> */
    public static function article(Article $article): array
    {
        $issue = $article->issue;
        $url = ScholarlyMeta::url($article);
        [$first, $last] = ScholarlyMeta::pageRange($article->pages);
        $doi = ScholarlyMeta::registeredDoi($article);
        $affiliation = ScholarlyMeta::sharedAffiliation($article);
        $pdf = ScholarlyMeta::pdfUrl($article);
        $title = Text::plain($article->title);

        $node = self::filter([
            '@type' => 'ScholarlyArticle',
            '@id' => $url.'#article',
            'url' => $url,
            'mainEntityOfPage' => $url,
            'name' => $title,
            'headline' => mb_strlen($title) > 110 ? Text::excerpt($title, 110) : $title,
            'author' => array_map(fn (string $name) => self::filter([
                '@type' => 'Person',
                'name' => $name,
                'affiliation' => $affiliation ? ['@type' => 'Organization', 'name' => $affiliation] : null,
            ]), $article->authors ?? []),
            'datePublished' => $article->publicationDate(),
            'articleSection' => $article->type,
            'pageStart' => $first,
            'pageEnd' => $last,
            'pagination' => $article->pages,
            'keywords' => $article->keywords ? implode(', ', $article->keywords) : null,
            'abstract' => filled($article->abstract) ? Text::plain($article->abstract) : null,
            'inLanguage' => ScholarlyMeta::language($article),
            'identifier' => $doi ? ['@type' => 'PropertyValue', 'propertyID' => 'DOI', 'value' => $doi] : null,
            'sameAs' => $doi ? 'https://doi.org/'.$doi : null,
            'encoding' => $pdf ? self::filter([
                '@type' => 'MediaObject',
                'contentUrl' => $pdf,
                'encodingFormat' => 'application/pdf',
                'contentSize' => $article->pdf_bytes ? $article->pdf_bytes.' B' : null,
            ]) : null,
            'license' => ScholarlyMeta::licenceUrl($article),
            'isAccessibleForFree' => (bool) config('journal.open_access'),
            'publisher' => ['@id' => self::homeUrl().'#publisher'],
            'isPartOf' => self::issueNode($issue, withUrl: true),
        ]);

        return self::graph([
            $node,
            self::periodical(),
            self::publisher(),
            self::faculty(),
            self::breadcrumbs([
                [Text::t('Home'), self::homeUrl()],
                [Text::t('Archive'), SeoMeta::absolute(route('archive', absolute: false))],
                [$issue->label(), ScholarlyMeta::issueUrl($issue)],
                [$title, $url],
            ]),
        ]);
    }

    /**
     * Contact page: the editorial office's organisation and postal address
     * (config('journal.address')) with the editorial e-mail as a contact point.
     *
     * @return array<string, mixed>
     */
    public static function contact(string $url, string $title): array
    {
        $address = config('journal.address');

        return self::graph([
            [
                '@type' => 'ContactPage',
                '@id' => $url.'#webpage',
                'url' => $url,
                'name' => $title,
                'about' => ['@id' => self::homeUrl().'#periodical'],
                'mainEntity' => self::filter([
                    '@type' => 'Organization',
                    '@id' => self::homeUrl().'#editorial-office',
                    'name' => $address['organisation'],
                    'address' => self::filter([
                        '@type' => 'PostalAddress',
                        'streetAddress' => $address['street'],
                        'postalCode' => $address['postal_code'],
                        'addressLocality' => $address['city'],
                        'addressCountry' => $address['country_code'],
                    ]),
                    'contactPoint' => self::filter([
                        '@type' => 'ContactPoint',
                        'contactType' => 'editorial office',
                        'email' => config('journal.editorial_email'),
                        'telephone' => config('journal.phone'),
                        'availableLanguage' => ['en', 'mk'],
                    ]),
                ]),
            ],
            self::periodical(),
            self::publisher(),
            self::faculty(),
        ]);
    }

    /**
     * JSON for a <script type="application/ld+json"> block; "<" is escaped so
     * the text can never close the script element.
     *
     * @param  array<string, mixed>  $data
     */
    public static function encode(array $data): string
    {
        return (string) json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    /** @return array<string, mixed> */
    private static function periodical(): array
    {
        $home = self::homeUrl();

        return self::filter([
            '@type' => 'Periodical',
            '@id' => $home.'#periodical',
            'name' => config('journal.name_en'),
            'alternateName' => [config('journal.name_mk'), config('journal.abbrev')],
            'issn' => [config('journal.issn_print'), config('journal.issn_online')],
            'url' => $home,
            'inLanguage' => config('journal.languages'),
            'isAccessibleForFree' => (bool) config('journal.open_access'),
            'license' => config('journal.licence.url'),
            'publisher' => ['@id' => $home.'#publisher'],
            'sourceOrganization' => ['@id' => $home.'#faculty'],
        ]);
    }

    /** @return array<string, mixed> */
    private static function publisher(): array
    {
        return self::filter([
            '@type' => 'Organization',
            '@id' => self::homeUrl().'#publisher',
            'name' => config('journal.publisher.name_en'),
            'alternateName' => [config('journal.publisher.name_mk'), config('journal.publisher.abbrev')],
            'url' => config('journal.publisher.url'),
            'email' => config('journal.publisher.email'),
        ]);
    }

    /** @return array<string, mixed> */
    private static function faculty(): array
    {
        return self::filter([
            '@type' => 'CollegeOrUniversity',
            '@id' => self::homeUrl().'#faculty',
            'name' => config('journal.co_publisher.name_en'),
            'alternateName' => config('journal.co_publisher.name_mk'),
            'url' => config('journal.co_publisher.url'),
        ]);
    }

    /**
     * PublicationIssue → PublicationVolume → Periodical. A whole volume
     * published as one book is a PublicationVolume on its own.
     *
     * @return array<string, mixed>
     */
    private static function issueNode(Issue $issue, bool $withUrl): array
    {
        $home = self::homeUrl();
        $url = ScholarlyMeta::issueUrl($issue);

        $volume = [
            '@type' => 'PublicationVolume',
            '@id' => $home.'#volume-'.$issue->volume,
            'volumeNumber' => (string) $issue->volume,
            'isPartOf' => ['@id' => $home.'#periodical'],
        ];

        if ($issue->kind === Issue::KIND_VOLUME) {
            return self::filter([
                ...$volume,
                'url' => $withUrl ? $url : null,
                'name' => $issue->label(),
                'datePublished' => $issue->year ? (string) $issue->year : null,
            ]);
        }

        return self::filter([
            '@type' => 'PublicationIssue',
            '@id' => $url.'#issue',
            'url' => $withUrl ? $url : null,
            'name' => $issue->label(),
            'issueNumber' => ScholarlyMeta::issueNumber($issue) ?? $issue->part(),
            'alternativeHeadline' => $issue->full_title,
            'datePublished' => $issue->online_at?->toDateString() ?? ($issue->year ? (string) $issue->year : null),
            'identifier' => $issue->doi ? ['@type' => 'PropertyValue', 'propertyID' => 'DOI', 'value' => $issue->doi] : null,
            'sameAs' => $issue->doi ? 'https://doi.org/'.$issue->doi : null,
            'isAccessibleForFree' => (bool) config('journal.open_access'),
            'image' => $issue->cover_image ? SeoMeta::absolute((string) JournalFiles::url(ltrim($issue->cover_image, '/'))) : null,
            'isPartOf' => $volume,
        ]);
    }

    /**
     * @param  list<array{0: string, 1: string}>  $items
     * @return array<string, mixed>
     */
    private static function breadcrumbs(array $items): array
    {
        return [
            '@type' => 'BreadcrumbList',
            'itemListElement' => array_map(fn (array $item, int $i) => [
                '@type' => 'ListItem',
                'position' => $i + 1,
                'name' => $item[0],
                'item' => $item[1],
            ], $items, array_keys($items)),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $nodes
     * @return array<string, mixed>
     */
    private static function graph(array $nodes): array
    {
        return ['@context' => 'https://schema.org', '@graph' => $nodes];
    }

    private static function homeUrl(): string
    {
        return SeoMeta::absolute('/');
    }

    /**
     * Drops null, empty-string and empty-array values.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function filter(array $data): array
    {
        return array_filter($data, fn ($v) => $v !== null && $v !== '' && $v !== []);
    }
}
