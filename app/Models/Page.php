<?php

namespace App\Models;

use App\Support\ExternalLinks;
use DOMDocument;
use DOMElement;
use DOMXPath;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/**
 * Editorial content migrated from the old site (guidelines, editorial board, ...).
 *
 * @property int $id
 * @property string $path
 * @property string $title
 * @property string|null $title_mk
 * @property string|null $parent_path
 * @property int $position
 * @property string $body Sanitised HTML.
 * @property string|null $body_mk Sanitised HTML in Macedonian, when translated.
 * @property string|null $summary One line for hub cards and meta descriptions.
 * @property string|null $source_url
 * @property int|null $wp_id
 */
class Page extends Model
{
    /**
     * Titles and one-line summaries of the imported pages, applied by
     * `journal:repair-pages`. English titles are in sentence case and match
     * the navigation; Macedonian titles reuse the menu labels in
     * resources/js/lang/mk.ts. Summaries describe the page, they add no facts.
     */
    public const CATALOGUE = [
        'editorial' => [
            'title' => 'Editorial',
            'title_mk' => 'Збор од уредникот',
            'summary' => 'The editor’s introduction to the Macedonian Pharmaceutical Bulletin: its mission, scope and readership.',
        ],
        'editorial-board' => [
            'title' => 'Editorial board',
            'title_mk' => 'Уредувачки одбор',
            'summary' => 'The editors and the international editorial board of the Macedonian Pharmaceutical Bulletin.',
        ],
        'contact' => [
            'title' => 'Contact',
            'title_mk' => 'Контакт',
            'summary' => 'How to reach the editorial office and the publisher.',
        ],
        'submit-your-paper' => [
            'title' => 'Submit a manuscript',
            'title_mk' => 'Поднесете ракопис',
            'summary' => 'Send your manuscript to the editorial office through the online form.',
        ],
        'guidelines' => [
            'title' => 'For authors',
            'title_mk' => 'За автори',
            'summary' => 'Everything you need from first draft to submission, in one place.',
        ],
        'guidelines/aims-and-scope' => [
            'title' => 'Aims and scope',
            'title_mk' => 'Цели и опфат',
            'summary' => 'The fields the journal covers and the types of paper it publishes.',
        ],
        'guidelines/editorial-policies' => [
            'title' => 'Editorial policies',
            'title_mk' => 'Уредувачка политика',
            'summary' => 'Publication ethics: the duties of authors, editors and reviewers.',
        ],
        'guidelines/review-policies' => [
            'title' => 'Review policies',
            'title_mk' => 'Политика за рецензирање',
            'summary' => 'How manuscripts are handled, from submission to decision.',
        ],
        'guidelines/article-processing-charges' => [
            'title' => 'Article processing charges',
            'title_mk' => 'Трошоци за обработка на трудови',
            'summary' => 'Current fees and how payment works.',
        ],
        'guidelines/open-access-policy' => [
            'title' => 'Open access policy',
            'title_mk' => 'Политика за отворен пристап',
            'summary' => 'How published articles can be read and re-used.',
        ],
        'guidelines/instructions-for-authors' => [
            'title' => 'Instructions for authors',
            'title_mk' => 'Упатство за автори',
            'summary' => 'Manuscript structure, formatting and reference style.',
        ],
        'guidelines/downloads' => [
            'title' => 'Forms and downloads',
            'title_mk' => 'Обрасци за преземање',
            'summary' => 'Author disclosure and ethical responsibility forms.',
        ],
    ];

    /** Pages with at least this many sections get an "On this page" table of contents. */
    public const TOC_MIN_SECTIONS = 3;

    protected $guarded = [];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'wp_id' => 'integer',
        ];
    }

    public function url(): string
    {
        return '/'.$this->path;
    }

    /** Title in the reader's language, falling back to English. */
    public function localizedTitle(?string $locale = null): string
    {
        $locale ??= app()->getLocale();

        return $locale === 'mk' && filled($this->title_mk) ? $this->title_mk : $this->title;
    }

    /**
     * Sections of the page (its h2 headings with an id), in order.
     *
     * @return list<array{id: string, title: string}>
     */
    public function outline(?string $html = null): array
    {
        $xpath = $this->xpath($html ?? $this->body);

        if (! $xpath) {
            return [];
        }

        $items = [];

        foreach ($xpath->query('//h2[@id]') ?: [] as $h2) {
            /** @var DOMElement $h2 */
            $items[] = [
                'id' => $h2->getAttribute('id'),
                'title' => trim((string) preg_replace('/\s+/u', ' ', $h2->textContent)),
            ];
        }

        return $items;
    }

    /** True when the page is long enough to get an "On this page" table of contents. */
    public function hasToc(): bool
    {
        return count($this->outline()) >= self::TOC_MIN_SECTIONS;
    }

    /**
     * Body as rendered on the site. When the page gets a generated table of
     * contents, the old inline one (a list of links to its own sections) is
     * dropped. On the editorial the closing sign-off ("Sincerely," signature,
     * name) is cut, because the page renders it as an editor card.
     */
    public function displayBody(?string $html = null): string
    {
        // Links to other websites open in a new tab.
        return ExternalLinks::mark($this->bodyWithoutExtras($html));
    }

    private function bodyWithoutExtras(?string $html): string
    {
        $html ??= $this->body;

        if ($this->path === 'editorial') {
            $html = (string) preg_replace('#<p>\s*Sincerely,?\s*</p>.*$#isu', '', $html);
        }

        if (! $this->hasToc()) {
            return trim($html);
        }

        // The old inline TOC: a list whose every link points to a section of this page.
        return trim((string) preg_replace_callback('#<ul>(?:(?!</ul>).)*</ul>#isu', function (array $m) {
            preg_match_all('#href="([^"]*)"#', $m[0], $hrefs);
            preg_match_all('#<li\b#', $m[0], $items);

            $own = array_filter($hrefs[1], fn (string $href) => (bool) preg_match('#^(/'.preg_quote($this->path, '#').')?/?\#.+#', $href));

            return $hrefs[1] !== [] && count($own) === count($hrefs[1]) && count($own) === count($items[0]) ? '' : $m[0];
        }, $html, 1));
    }

    /** True when the editorial's sign-off was cut from the display body. */
    public function hasSignOff(): bool
    {
        return $this->path === 'editorial' && (bool) preg_match('#<p>\s*Sincerely,?\s*</p>#iu', $this->body);
    }

    /** Plain-text description for search engines: the summary, else the first 155 characters of the body. */
    public function description(): string
    {
        if (filled($this->summary)) {
            return $this->summary;
        }

        $text = trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags(
            (string) preg_replace('#<(/p|br|/li|/h[1-6])\b[^>]*>#i', '$0 ', $this->displayBody()),
        ), ENT_QUOTES | ENT_HTML5)));

        return Str::limit($text, 155, '…', preserveWords: true);
    }

    /**
     * Files linked from the body (the downloads page): name, URL, extension and size.
     *
     * @return list<array{name: string, url: string, extension: string, bytes: int|null}>
     */
    public function linkedFiles(): array
    {
        $xpath = $this->xpath($this->body);

        if (! $xpath) {
            return [];
        }

        $files = [];

        foreach ($xpath->query('//a[starts-with(@href, "/downloads/")]') ?: [] as $a) {
            /** @var DOMElement $a */
            $url = $a->getAttribute('href');
            $relative = rawurldecode(ltrim($url, '/'));
            $disk = Storage::disk('journal');

            // "Author Disclosure Form [MS Word Document]": the name is the list item's text.
            $name = trim((string) preg_replace(['/\[[^\]]*\]/u', '/\s+/u'], ['', ' '], $a->parentNode->textContent ?? ''));

            $files[] = [
                'name' => $name !== '' ? $name : pathinfo($relative, PATHINFO_FILENAME),
                'url' => $url,
                'extension' => strtolower(pathinfo($relative, PATHINFO_EXTENSION)),
                'bytes' => $disk->exists($relative) ? $disk->size($relative) : null,
            ];
        }

        return $files;
    }

    private function xpath(string $html): ?DOMXPath
    {
        if (trim($html) === '') {
            return null;
        }

        $doc = new DOMDocument;
        $doc->loadHTML('<?xml encoding="utf-8"?><div>'.$html.'</div>', LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET);

        return new DOMXPath($doc);
    }
}
