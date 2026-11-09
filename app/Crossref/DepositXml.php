<?php

namespace App\Crossref;

use App\Manuscripts\ManuscriptPresenter;
use App\Models\Article;
use App\Models\Issue;
use App\Models\Manuscript;
use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use InvalidArgumentException;
use XMLWriter;

/**
 * A Crossref metadata deposit (schema 5.3.1) for the articles of one issue:
 * the file the editorial office uploads at Crossref, or that is sent
 * automatically (CrossrefClient). Every DOI in it is registered (or its
 * metadata updated) in one go. The journal and issue metadata match what
 * the journal has deposited before (title, abbreviation, both ISSNs, the
 * issue as two digits, as in the DOI).
 *
 * Each article: title (italics, sub- and superscripts kept), authors (given
 * and family names; affiliations and ORCID iDs for articles published from
 * the manuscript system), abstract, online date, pages, the DOI's target
 * (the PDF, or the article page: config crossref.target), the PDF for
 * Similarity Check, and the references.
 *
 * Checked against the official schema before it leaves the system
 * (Crossref::validate, resources/crossref/schema).
 */
final class DepositXml
{
    public const SCHEMA_VERSION = '5.3.1';

    public function __construct(
        private string $depositorName,
        private string $depositorEmail,
    ) {
        if (trim($depositorName) === '' || ! filter_var($depositorEmail, FILTER_VALIDATE_EMAIL)) {
            throw new InvalidArgumentException('The depositor name and e-mail are needed (Crossref settings).');
        }
    }

    /**
     * @param  Collection<int, Article>  $articles  articles of $issue that have a DOI
     */
    public function build(Issue $issue, Collection $articles, string $batchId): string
    {
        $articles = $articles->filter(fn (Article $a) => self::isOurs($a->doi))->values();

        if ($articles->isEmpty()) {
            throw new InvalidArgumentException('No article with a DOI of the journal to deposit.');
        }

        $x = new XMLWriter;
        $x->openMemory();
        $x->setIndent(true);
        $x->setIndentString('  ');
        $x->startDocument('1.0', 'UTF-8');

        $x->startElement('doi_batch');
        $x->writeAttribute('version', self::SCHEMA_VERSION);
        $x->writeAttribute('xmlns', 'http://www.crossref.org/schema/'.self::SCHEMA_VERSION);
        $x->writeAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $x->writeAttribute('xmlns:jats', 'http://www.ncbi.nlm.nih.gov/JATS1');
        $x->writeAttribute('xsi:schemaLocation', 'http://www.crossref.org/schema/'.self::SCHEMA_VERSION.' https://www.crossref.org/schemas/crossref'.self::SCHEMA_VERSION.'.xsd');

        $x->startElement('head');
        $x->writeElement('doi_batch_id', $batchId);
        // Must grow with every deposit of the same DOI: milliseconds.
        $x->writeElement('timestamp', now()->format('YmdHisv'));
        $x->startElement('depositor');
        $x->writeElement('depositor_name', trim($this->depositorName));
        $x->writeElement('email_address', trim($this->depositorEmail));
        $x->endElement();
        $x->writeElement('registrant', (string) config('journal.publisher.name_en'));
        $x->endElement(); // head

        $x->startElement('body');
        $x->startElement('journal');

        $x->startElement('journal_metadata');
        $x->writeAttribute('language', 'en');
        $x->writeElement('full_title', (string) config('journal.name_en'));
        $x->writeElement('abbrev_title', (string) config('journal.abbrev'));
        $this->issn($x, 'print', (string) config('journal.issn_print'));
        $this->issn($x, 'electronic', (string) config('journal.issn_online'));
        $x->endElement();

        $x->startElement('journal_issue');
        $this->date($x, $issue->online_at?->toDateString() ?? $articles->min(fn (Article $a) => $a->online_at?->toDateString()), $issue->year);
        $x->startElement('journal_volume');
        $x->writeElement('volume', (string) $issue->volume);
        $x->endElement();
        $x->writeElement('issue', self::issueNumber($issue, $articles));
        $x->endElement();

        foreach ($articles as $article) {
            $this->article($x, $issue, $article);
        }

        $x->endElement(); // journal
        $x->endElement(); // body
        $x->endElement(); // doi_batch
        $x->endDocument();

        return $x->outputMemory();
    }

    /** The journal's own DOIs only (not a cited work's DOI read from a PDF by mistake). */
    public static function isOurs(?string $doi): bool
    {
        return $doi !== null && str_starts_with(strtolower($doi), strtolower(config('journal.doi_prefix').'/'));
    }

    /**
     * The issue as in the DOIs ("01", "02"; the congress supplements were
     * deposited as issue "03"), read from the articles' DOIs.
     *
     * @param  Collection<int, Article>  $articles
     */
    public static function issueNumber(Issue $issue, Collection $articles): string
    {
        foreach ($articles as $article) {
            if (preg_match('/\.'.preg_quote((string) $issue->volume, '/').'\.(\d{1,2})\.\d+$/', (string) $article->doi, $m)) {
                return str_pad($m[1], 2, '0', STR_PAD_LEFT);
            }
        }

        return str_pad((string) $issue->number, 2, '0', STR_PAD_LEFT);
    }

    private function issn(XMLWriter $x, string $type, string $issn): void
    {
        if ($issn === '') {
            return;
        }

        $x->startElement('issn');
        $x->writeAttribute('media_type', $type);
        $x->text($issn);
        $x->endElement();
    }

    private function date(XMLWriter $x, ?string $date, ?int $year): void
    {
        $x->startElement('publication_date');
        $x->writeAttribute('media_type', 'online');

        if ($date !== null && preg_match('/^(\d{4})-(\d{2})-(\d{2})/', $date, $m)) {
            $x->writeElement('month', $m[2]);
            $x->writeElement('day', $m[3]);
            $x->writeElement('year', $m[1]);
        } else {
            $x->writeElement('year', (string) ($year ?? now()->year));
        }

        $x->endElement();
    }

    private function article(XMLWriter $x, Issue $issue, Article $article): void
    {
        $manuscript = Manuscript::where('article_id', $article->id)->first();
        $content = $manuscript ? ManuscriptPresenter::content($manuscript) : null;

        $x->startElement('journal_article');
        $x->writeAttribute('publication_type', 'full_text');

        if (in_array($article->title_lang, ['en', 'mk'], true)) {
            $x->writeAttribute('language', $article->title_lang);
        }

        $x->startElement('titles');
        $x->startElement('title');
        $x->writeRaw(self::faceMarkup($article->title_html ?: e($article->title)));
        $x->endElement();
        $x->endElement();

        $this->contributors($x, $article, $content);

        $paragraphs = array_values(array_filter(array_map('trim', preg_split('/\n\s*\n/', (string) $article->abstract) ?: [])));

        if ($paragraphs !== []) {
            $x->startElement('jats:abstract');

            foreach ($paragraphs as $paragraph) {
                $x->writeElement('jats:p', $paragraph);
            }

            $x->endElement();
        }

        $this->date($x, $article->online_at?->toDateString() ?? $issue->online_at?->toDateString(), $issue->year);

        if (preg_match('/^\s*(\d+)\s*(?:[-–—]\s*(\d+))?/u', (string) $article->pages, $m)) {
            $x->startElement('pages');
            $x->writeElement('first_page', $m[1]);

            if (! empty($m[2]) && $m[2] !== $m[1]) {
                $x->writeElement('last_page', $m[2]);
            }

            $x->endElement();
        }

        $x->startElement('doi_data');
        $x->writeElement('doi', (string) $article->doi);
        $x->writeElement('resource', config('crossref.target') === 'page' || ! $article->pdf
            ? self::siteUrl().route('articles.show', [$issue, $article->number], false)
            : self::pdfUrl($article->pdf));

        if ($article->pdf) {
            // The full text for Similarity Check, as in the earlier deposits.
            $x->startElement('collection');
            $x->writeAttribute('property', 'crawler-based');
            $x->startElement('item');
            $x->writeAttribute('crawler', 'iParadigms');
            $x->writeElement('resource', self::pdfUrl($article->pdf));
            $x->endElement();
            $x->endElement();
        }

        $x->endElement(); // doi_data

        $references = array_values(array_filter(array_map('trim', preg_split('/\R/u', (string) $article->references) ?: [])));

        if ($references !== []) {
            $x->startElement('citation_list');

            foreach ($references as $i => $reference) {
                $x->startElement('citation');
                $x->writeAttribute('key', 'ref'.($i + 1));
                $x->writeElement('unstructured_citation', Str::limit($reference, 3900, ''));
                $x->endElement();
            }

            $x->endElement();
        }

        $x->endElement(); // journal_article
    }

    /** @param  array<string, mixed>|null  $content */
    private function contributors(XMLWriter $x, Article $article, ?array $content): void
    {
        $people = [];

        if ($content !== null) {
            $affiliations = collect((array) ($content['affiliations'] ?? []))->keyBy('id');

            foreach ((array) ($content['authors'] ?? []) as $a) {
                $people[] = [
                    'given' => trim((string) ($a['givenName'] ?? '')),
                    'family' => trim((string) ($a['familyName'] ?? '')),
                    'affiliations' => collect((array) ($a['affiliations'] ?? []))
                        ->map(fn ($id) => trim((string) ($affiliations[$id]['text'] ?? '')))
                        ->filter()->values()->all(),
                    'orcid' => trim((string) ($a['orcid'] ?? '')),
                ];
            }
        } else {
            // Archived articles keep each author as one string: the first word
            // is the given name ("Tatjana Kadifkova Panovska").
            foreach ((array) $article->authors as $name) {
                $parts = preg_split('/\s+/u', trim((string) $name)) ?: [];
                $people[] = [
                    'given' => count($parts) > 1 ? (string) array_shift($parts) : '',
                    'family' => implode(' ', $parts),
                    'affiliations' => [],
                    'orcid' => '',
                ];
            }
        }

        $people = array_values(array_filter($people, fn (array $p) => $p['family'] !== ''));

        if ($people === []) {
            return;
        }

        $x->startElement('contributors');

        foreach ($people as $i => $p) {
            $x->startElement('person_name');
            $x->writeAttribute('sequence', $i === 0 ? 'first' : 'additional');
            $x->writeAttribute('contributor_role', 'author');

            if ($p['given'] !== '') {
                $x->writeElement('given_name', Str::limit($p['given'], 60, ''));
            }

            $x->writeElement('surname', Str::limit($p['family'], 60, ''));

            if ($p['affiliations'] !== []) {
                $x->startElement('affiliations');

                foreach ($p['affiliations'] as $affiliation) {
                    $x->startElement('institution');
                    $x->writeElement('institution_name', Str::limit($affiliation, 1024, ''));
                    $x->endElement();
                }

                $x->endElement();
            }

            if (preg_match('/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/', $p['orcid'])) {
                $x->writeElement('ORCID', 'https://orcid.org/'.$p['orcid']);
            }

            $x->endElement();
        }

        $x->endElement();
    }

    private static function pdfUrl(string $path): string
    {
        return self::siteUrl().'/'.implode('/', array_map('rawurlencode', explode('/', $path)));
    }

    /** The public website (config crossref.site_url), never this computer's address. */
    private static function siteUrl(): string
    {
        return rtrim((string) config('crossref.site_url'), '/');
    }

    /**
     * Title HTML as Crossref face markup: italics, bold, sub- and
     * superscripts kept, every other tag dropped, text escaped.
     */
    public static function faceMarkup(string $html): string
    {
        $doc = new DOMDocument;
        $previous = libxml_use_internal_errors(true);
        $doc->loadHTML('<?xml encoding="UTF-8"?><div>'.$html.'</div>', LIBXML_NONET | LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $doc->getElementsByTagName('div')->item(0);

        return $root ? trim((string) preg_replace('/\s+/u', ' ', self::walk($root))) : e(strip_tags($html));
    }

    private static function walk(DOMNode $node): string
    {
        $out = '';
        $map = ['i' => 'i', 'em' => 'i', 'b' => 'b', 'strong' => 'b', 'sub' => 'sub', 'sup' => 'sup'];

        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMText) {
                $out .= htmlspecialchars($child->data, ENT_XML1 | ENT_QUOTES, 'UTF-8');
            } elseif ($child instanceof DOMElement) {
                $inner = self::walk($child);
                $tag = $map[strtolower($child->tagName)] ?? null;
                $out .= $tag !== null && trim($inner) !== '' ? "<{$tag}>{$inner}</{$tag}>" : $inner;
            }
        }

        return $out;
    }
}
