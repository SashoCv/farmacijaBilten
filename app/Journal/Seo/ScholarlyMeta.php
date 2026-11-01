<?php

namespace App\Journal\Seo;

use App\Models\Article;
use App\Models\Issue;
use App\Support\JournalFiles;

/**
 * Bibliographic metadata of an article, shared by the Highwire/Google Scholar
 * citation_* tags, Dublin Core, JSON-LD, the Atom feed and OAI-PMH, so every
 * channel says the same thing.
 */
final class ScholarlyMeta
{
    /**
     * DOI that may be published: only one Crossref confirmed as registered
     * (in the form that resolves; some were deposited with a doubled prefix).
     */
    public static function registeredDoi(Article $article): ?string
    {
        if (! $article->doi || $article->doi_registered !== true) {
            return null;
        }

        return $article->doi_resolvable ?: $article->doi;
    }

    public static function doiUrl(Article $article): ?string
    {
        $doi = self::registeredDoi($article);

        return $doi ? 'https://doi.org/'.$doi : null;
    }

    public static function url(Article $article): string
    {
        return SeoMeta::absolute(route('articles.show', ['issue' => $article->issue->slug, 'article' => $article->number], false));
    }

    public static function issueUrl(Issue $issue): string
    {
        return SeoMeta::absolute(route('issues.show', $issue->slug, false));
    }

    public static function pdfUrl(Article $article): ?string
    {
        $path = JournalFiles::url($article->pdf);

        return $path ? SeoMeta::absolute($path) : null;
    }

    /**
     * First and last page from "3–11" (en dash, hyphen or em dash);
     * a single page "145" gives [145, null].
     *
     * @return array{0: string|null, 1: string|null}
     */
    public static function pageRange(?string $pages): array
    {
        if (! $pages || trim($pages) === '') {
            return [null, null];
        }

        $parts = array_values(array_filter(array_map('trim', preg_split('/\s*[–—-]\s*/u', $pages) ?: []), fn (string $p) => $p !== ''));

        return [$parts[0] ?? null, $parts[1] ?? null];
    }

    /** "2" for a regular issue, "Suppl. 1" for a supplement, null for a whole volume. */
    public static function issueNumber(Issue $issue): ?string
    {
        return match ($issue->kind) {
            Issue::KIND_ISSUE => $issue->number !== null ? (string) $issue->number : null,
            Issue::KIND_SUPPLEMENT => 'Suppl. '.$issue->number,
            default => null,
        };
    }

    /** "en" or "mk", from the stored title language or the script of the title. */
    public static function language(Article $article): string
    {
        return $article->title_lang ?: Article::detectLang($article->title);
    }

    public static function licenceUrl(Article $article): string
    {
        $own = $article->licence;

        return $own && str_starts_with($own, 'http') ? $own : config('journal.licence.url');
    }

    /**
     * The one affiliation every author shares, when the article lists exactly
     * one. With several, the author-to-affiliation mapping is not known (it is
     * printed as superscripts in the PDF), so none is attributed per author.
     */
    public static function sharedAffiliation(Article $article): ?string
    {
        $affiliations = array_values(array_filter($article->affiliations ?? [], 'filled'));

        return count($affiliations) === 1 ? Text::plain($affiliations[0]) : null;
    }

    /**
     * "Macedonian Pharmaceutical Bulletin; Vol 71 No 2 (2025); 3–11; ISSN 1857-8969".
     */
    public static function source(Article $article): string
    {
        $issue = $article->issue;
        $number = self::issueNumber($issue);
        $parts = array_filter([
            config('journal.name_en'),
            'Vol '.$issue->volume.($number ? ' No '.$number : '').($issue->year ? " ({$issue->year})" : ''),
            $article->pages,
            'ISSN '.config('journal.issn_online'),
        ]);

        return implode('; ', $parts);
    }

    /**
     * Highwire Press tags read by Google Scholar, Zotero and Mendeley.
     *
     * @return list<array{name: string, content: string}>
     */
    public static function citation(Article $article): array
    {
        $issue = $article->issue;
        [$first, $last] = self::pageRange($article->pages);
        $affiliation = self::sharedAffiliation($article);

        $tags = [['citation_title', Text::plain($article->title)]];

        foreach ($article->authors ?? [] as $author) {
            $tags[] = ['citation_author', $author];

            if ($affiliation) {
                $tags[] = ['citation_author_institution', $affiliation];
            }
        }

        $tags[] = ['citation_publication_date', self::scholarDate($article)];
        $tags[] = ['citation_online_date', $article->online_at?->format('Y/m/d')];
        $tags[] = ['citation_journal_title', config('journal.name_en')];
        $tags[] = ['citation_journal_abbrev', config('journal.abbrev')];
        $tags[] = ['citation_publisher', config('journal.publisher.name_en')];
        $tags[] = ['citation_issn', config('journal.issn_print')];
        $tags[] = ['citation_issn', config('journal.issn_online')];
        $tags[] = ['citation_volume', (string) $issue->volume];
        $tags[] = ['citation_issue', self::issueNumber($issue)];
        $tags[] = ['citation_firstpage', $first];
        $tags[] = ['citation_lastpage', $last];
        $tags[] = ['citation_doi', self::registeredDoi($article)];
        $tags[] = ['citation_pdf_url', self::pdfUrl($article)];
        $tags[] = ['citation_abstract_html_url', self::url($article)];
        $tags[] = ['citation_abstract', filled($article->abstract) ? Text::plain($article->abstract) : null];
        $tags[] = ['citation_keywords', $article->keywords ? implode('; ', $article->keywords) : null];
        $tags[] = ['citation_language', self::language($article)];

        return self::named($tags);
    }

    /**
     * Dublin Core, read by BASE, library discovery systems and Zotero's fallback.
     *
     * @return list<array{name: string, content: string}>
     */
    public static function dublinCore(Article $article): array
    {
        $issue = $article->issue;
        $number = self::issueNumber($issue);
        $doi = self::registeredDoi($article);

        $tags = [['DC.title', Text::plain($article->title)]];

        foreach ($article->authors ?? [] as $author) {
            $tags[] = ['DC.creator', $author];
        }

        foreach ($article->keywords ?? [] as $keyword) {
            $tags[] = ['DC.subject', $keyword];
        }

        $tags[] = ['DC.date', $article->publicationDate()];
        $tags[] = ['DC.type', 'Text.Serial.Journal'];
        $tags[] = ['DC.format', $article->pdf ? 'application/pdf' : null];
        $tags[] = ['DC.identifier', self::url($article)];
        $tags[] = ['DC.identifier', $doi ? 'doi:'.$doi : null];
        $tags[] = ['DC.source', config('journal.name_en').', Vol. '.$issue->volume
            .($number ? ', No. '.$number : '')
            .($article->pages ? ', pp. '.$article->pages : '')];
        $tags[] = ['DC.source.ISSN', config('journal.issn_online')];
        $tags[] = ['DC.publisher', config('journal.publisher.name_en')];
        $tags[] = ['DC.language', self::language($article)];
        $tags[] = ['DC.rights', self::licenceUrl($article)];

        return self::named($tags);
    }

    /** "2025/04/30", or the issue year "2025" (every article has one or the other). */
    public static function scholarDate(Article $article): ?string
    {
        return $article->online_at?->format('Y/m/d') ?? ($article->issue->year ? (string) $article->issue->year : null);
    }

    /**
     * @param  list<array{0: string, 1: string|null}>  $pairs
     * @return list<array{name: string, content: string}>
     */
    private static function named(array $pairs): array
    {
        $tags = [];

        foreach ($pairs as [$name, $content]) {
            if ($content !== null && trim($content) !== '') {
                $tags[] = ['name' => $name, 'content' => $content];
            }
        }

        return $tags;
    }
}
