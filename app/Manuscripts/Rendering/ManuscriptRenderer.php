<?php

namespace App\Manuscripts\Rendering;

use App\Manuscripts\Rich;
use App\Manuscripts\Template;

/**
 * Renders a manuscript (ManuscriptContent JSON) as the article HTML used by
 * the preview, the read-only pages and, later, the PDF. One column, in the
 * order of the printed article, styled by resources/css/manuscript.css.
 *
 * Safe by construction: only allowlisted nodes, marks and attributes are
 * written, and every text and attribute value is escaped. Unknown nodes are
 * dropped (their text kept where it is inline).
 */
final class ManuscriptRenderer
{
    private const MARKS = ['bold' => 'strong', 'italic' => 'em', 'subscript' => 'sub', 'superscript' => 'sup'];

    private const ALIGN = ['left', 'center', 'right'];

    private const FIGURE_WIDTHS = [25, 50, 75, 100];

    /** @var array<string, string> Image public id => URL, for this manuscript only. */
    private array $images = [];

    /**
     * @param  array<string, mixed>  $content
     * @param  array{type: string, language: string, receivedAt?: ?string, acceptedAt?: ?string, anonymous?: bool, images?: array<string, string>, citation?: ?string, doi?: ?string, frontOnly?: bool}  $meta
     */
    public static function render(array $content, array $meta): string
    {
        $renderer = new self;
        $renderer->images = (array) ($meta['images'] ?? []);

        return $renderer->article($content, $meta);
    }

    /**
     * @param  array<string, mixed>  $c
     * @param  array<string, mixed>  $meta
     */
    private function article(array $c, array $meta): string
    {
        $language = $meta['language'] === 'mk' ? 'mk' : 'en';
        $other = Template::otherLanguage($language);
        $labels = Template::labels($language);
        $otherLabels = Template::labels($other);
        $anonymous = (bool) ($meta['anonymous'] ?? false);
        $typeLabel = (string) (config("manuscript.types.{$meta['type']}.label.{$language}") ?? $meta['type']);

        $html = '<article class="ms-article" lang="'.$language.'">';
        $html .= '<header class="ms-front">';
        // Journal block, top right, as on the printed first page. Volume,
        // pages and DOI are added when the article is published.
        $journal = $language === 'mk' ? (string) config('journal.name_mk') : 'Macedonian pharmaceutical bulletin';
        $html .= '<div class="ms-journal">';
        // "Macedonian pharmaceutical bulletin, 71 (2) 3 – 11 (2025)": the name in italics, the volume bold.
        $citation = ! empty($meta['citation'])
            ? ', '.(string) preg_replace('/^(\d+)/', '<strong>$1</strong>', e((string) $meta['citation']))
            : '';
        $html .= '<p><em>'.e($journal).'</em>'.$citation.'</p>';
        $html .= '<p>ISSN: '.e((string) config('journal.issn_online')).'</p>';

        if (! empty($meta['doi'])) {
            $html .= '<p>DOI: '.e((string) $meta['doi']).'</p>';
        }

        $html .= '<p class="ms-type">'.e($typeLabel).'</p></div>';
        $html .= '<h1 class="ms-title">'.($this->inline($c['title'] ?? null) ?: '<span class="ms-missing">'.e(__('Untitled manuscript')).'</span>').'</h1>';

        if ($anonymous) {
            $html .= '<p class="ms-authors ms-anonymous">'.e(__('Authors are hidden for anonymous review.')).'</p>';
        } else {
            $html .= $this->people($c, alt: false);
        }

        $dates = [];

        if (! empty($meta['receivedAt'])) {
            $dates[] = e($labels['received']).': '.e($meta['receivedAt']);
        }

        if (! empty($meta['acceptedAt'])) {
            $dates[] = e($labels['accepted']).': '.e($meta['acceptedAt']);
        }

        if ($dates !== []) {
            $html .= '<p class="ms-dates">'.implode('; ', $dates).'</p>';
        }

        $html .= '<section class="ms-abstract"><h2>'.e($labels['abstract']).'</h2>'.$this->blocks($c['abstract'] ?? null);
        $html .= $this->keywordsLine($labels['keywords'], (array) ($c['keywords'] ?? []));
        $html .= '</section>';

        if (! $anonymous) {
            $html .= $this->correspondence($c);
        }

        $html .= '</header>';

        // An invitation shows the title page and the abstract only.
        if (! empty($meta['frontOnly'])) {
            return $html.'</article>';
        }

        $html .= '<div class="ms-text">';

        foreach ((array) ($c['sections'] ?? []) as $section) {
            $html .= '<section class="ms-section"><h2>'.e((string) $section['heading']).'</h2>'.$this->blocks($section['body'] ?? null).'</section>';
        }

        if (! $anonymous && ! Rich::isEmpty($c['acknowledgements'] ?? null)) {
            $html .= '<section class="ms-section ms-back"><h2>'.e($labels['acknowledgements']).'</h2>'.$this->blocks($c['acknowledgements']).'</section>';
        }

        foreach (['conflictOfInterest' => 'conflict_of_interest', 'funding' => 'funding'] as $field => $label) {
            $text = trim((string) ($c[$field] ?? ''));

            if ($text !== '' && ! ($anonymous && $field === 'funding')) {
                $html .= '<section class="ms-section ms-back"><h2>'.e($labels[$label]).'</h2><p>'.nl2br(e($text), false).'</p></section>';
            }
        }

        $references = Rich::paragraphs($c['references'] ?? null);
        $html .= '<section class="ms-section ms-references"><h2>'.e($labels['references']).'</h2>';
        $html .= $references === [] ? '' : $this->referenceList($c['references']);
        $html .= '</section>';

        $summary = (array) ($c['summary'] ?? []);
        $html .= '<section class="ms-summary" lang="'.$other.'"><h2>'.e($labels['summary']).'</h2>';
        $html .= '<p class="ms-summary-title">'.$this->inline($summary['title'] ?? null).'</p>';

        if (! $anonymous) {
            $html .= $this->people($c, alt: true);
        }

        $html .= $this->blocks($summary['abstract'] ?? null);
        $html .= $this->keywordsLine($otherLabels['keywords'], (array) ($summary['keywords'] ?? []));
        $html .= '</section>';

        $html .= '</div></article>';

        return $html;
    }

    /** Authors with superscript affiliation numbers and *, then the affiliations. */
    /** @param  array<string, mixed>  $c */
    private function people(array $c, bool $alt): string
    {
        $affiliations = (array) ($c['affiliations'] ?? []);
        $numbers = [];

        foreach ($affiliations as $i => $a) {
            $numbers[$a['id']] = $i + 1;
        }

        $names = [];

        foreach ((array) ($c['authors'] ?? []) as $a) {
            $given = $alt ? $a['givenNameAlt'] : $a['givenName'];
            $family = $alt ? $a['familyNameAlt'] : $a['familyName'];
            $marks = array_map(fn (string $id) => $numbers[$id] ?? '?', $a['affiliations']);
            $sup = implode(',', $marks).($a['corresponding'] ? '*' : '');
            $names[] = e(trim("{$given} {$family}")).($sup !== '' ? '<sup>'.e($sup).'</sup>' : '');
        }

        $html = '<p class="ms-authors">'.implode(', ', $names).'</p>';

        if ($affiliations !== []) {
            $html .= '<div class="ms-affiliations">';

            foreach ($affiliations as $i => $a) {
                $text = $alt ? ($a['textAlt'] ?: $a['text']) : $a['text'];
                $html .= '<p><sup>'.($i + 1).'</sup>'.e($text).'</p>';
            }

            $html .= '</div>';
        }

        return $html;
    }

    /**
     * "*email: …" of the corresponding authors (a first-page footnote in print).
     *
     * @param  array<string, mixed>  $c
     */
    private function correspondence(array $c): string
    {
        $emails = [];

        foreach ((array) ($c['authors'] ?? []) as $a) {
            if ($a['corresponding'] && $a['email'] !== '') {
                $emails[] = $a['email'];
            }
        }

        return $emails === [] ? '' : '<p class="ms-correspondence">*email: '.e(implode(', ', $emails)).'</p>';
    }

    /** @param  array<mixed>  $keywords */
    private function keywordsLine(string $label, array $keywords): string
    {
        $keywords = array_filter(array_map(fn ($k) => is_string($k) ? trim($k) : '', $keywords));

        return '<p class="ms-keywords"><strong>'.e($label).':</strong> '.e(implode(', ', $keywords)).'</p>';
    }

    /** @param  array<string, mixed>  $doc */
    private function referenceList(array $doc): string
    {
        $html = '<ol class="ms-reference-list">';

        foreach ((array) ($doc['content'] ?? []) as $block) {
            if (is_array($block) && ($block['type'] ?? null) === 'paragraph' && Rich::text($block) !== '') {
                $html .= '<li>'.$this->children($block).'</li>';
            }
        }

        return $html.'</ol>';
    }

    /** A title document as safe inline HTML (em, strong, sub, sup), for the article record. */
    public static function inlineHtml(mixed $doc): string
    {
        return (new self)->inline($doc);
    }

    /** Inline content of a one-paragraph document (titles). */
    private function inline(mixed $doc): string
    {
        $out = [];

        foreach ((array) (is_array($doc) ? ($doc['content'] ?? []) : []) as $block) {
            if (is_array($block)) {
                $out[] = $this->children($block);
            }
        }

        return trim(implode(' ', $out));
    }

    /** Block content of a document. */
    private function blocks(mixed $doc): string
    {
        if (! is_array($doc)) {
            return '';
        }

        return $this->children($doc);
    }

    /** @param  array<string, mixed>  $node */
    private function children(array $node): string
    {
        $html = '';

        foreach ((array) ($node['content'] ?? []) as $child) {
            if (is_array($child)) {
                $html .= $this->node($child);
            }
        }

        return $html;
    }

    /** @param  array<string, mixed>  $node */
    private function node(array $node): string
    {
        return match ($node['type'] ?? null) {
            'text' => $this->text($node),
            'hardBreak' => '<br>',
            'paragraph' => '<p>'.$this->children($node).'</p>',
            'heading' => '<h3>'.$this->children($node).'</h3>',
            'bulletList' => '<ul>'.$this->children($node).'</ul>',
            'orderedList' => '<ol>'.$this->children($node).'</ol>',
            'listItem' => '<li>'.$this->children($node).'</li>',
            'tableBlock' => '<figure class="ms-table-block">'.$this->children($node).'</figure>',
            'tableCaption' => '<figcaption class="ms-table-caption">'.$this->children($node).'</figcaption>',
            'tableNotes' => '<div class="ms-table-notes">'.$this->children($node).'</div>',
            'tableNote' => '<p class="ms-table-note" data-marker="'.e($this->marker($node)).'">'.$this->children($node).'</p>',
            'table' => $this->table($node),
            'figure' => $this->figure($node),
            'figureCaption' => '<figcaption class="ms-figure-caption">'.$this->children($node).'</figcaption>',
            default => in_array($node['type'] ?? null, ['doc'], true) ? $this->children($node) : '',
        };
    }

    /**
     * A figure: the image (only this manuscript's own) and "Fig. N." below.
     *
     * @param  array<string, mixed>  $node
     */
    private function figure(array $node): string
    {
        $attrs = (array) ($node['attrs'] ?? []);
        $url = $this->images[(string) ($attrs['image'] ?? '')] ?? null;
        $width = in_array((int) ($attrs['width'] ?? 100), self::FIGURE_WIDTHS, true) ? (int) $attrs['width'] : 100;
        $alt = mb_substr(trim((string) ($attrs['alt'] ?? '')), 0, 500);

        $image = $url !== null
            ? '<img src="'.e($url).'" alt="'.e($alt).'" loading="lazy">'
            : '<span class="ms-figure-missing">'.e(__('Image missing')).'</span>';

        return '<figure class="ms-figure ms-w-'.$width.'">'.$image.$this->children($node).'</figure>';
    }

    /** Header rows (all cells <th>) go into <thead>, so the PDF repeats them on a new page. */
    /** @param  array<string, mixed>  $node */
    private function table(array $node): string
    {
        $head = '';
        $body = '';
        $inHead = true;

        foreach ((array) ($node['content'] ?? []) as $row) {
            if (! is_array($row) || ($row['type'] ?? null) !== 'tableRow') {
                continue;
            }

            $cells = '';
            $allHeader = true;

            foreach ((array) ($row['content'] ?? []) as $cell) {
                $type = $cell['type'] ?? null;

                if (! in_array($type, ['tableHeader', 'tableCell'], true)) {
                    continue;
                }

                $allHeader = $allHeader && $type === 'tableHeader';
                $tag = $type === 'tableHeader' ? 'th' : 'td';
                $attrs = (array) ($cell['attrs'] ?? []);
                $out = '';

                foreach (['colspan', 'rowspan'] as $span) {
                    $value = (int) ($attrs[$span] ?? 1);

                    if ($value > 1 && $value <= 50) {
                        $out .= " {$span}=\"{$value}\"";
                    }
                }

                if (in_array($attrs['align'] ?? null, self::ALIGN, true)) {
                    $out .= ' style="text-align: '.$attrs['align'].'"';
                }

                $cells .= "<{$tag}{$out}>".$this->cellContent($cell)."</{$tag}>";
            }

            $tr = '<tr>'.$cells.'</tr>';

            if ($inHead && $allHeader) {
                $head .= $tr;
            } else {
                $inHead = false;
                $body .= $tr;
            }
        }

        return '<table>'.($head !== '' ? '<thead>'.$head.'</thead>' : '').'<tbody>'.$body.'</tbody></table>';
    }

    /** A cell's paragraphs, joined by line breaks (no <p> margins in tables). */
    /** @param  array<string, mixed>  $cell */
    private function cellContent(array $cell): string
    {
        $parts = [];

        foreach ((array) ($cell['content'] ?? []) as $paragraph) {
            if (is_array($paragraph)) {
                $parts[] = $this->children($paragraph);
            }
        }

        return implode('<br>', $parts);
    }

    /** @param  array<string, mixed>  $node */
    private function marker(array $node): string
    {
        $marker = (string) ($node['attrs']['marker'] ?? '');

        return mb_substr($marker, 0, 3);
    }

    /** @param  array<string, mixed>  $node */
    private function text(array $node): string
    {
        $html = e((string) ($node['text'] ?? ''));
        $marks = [];

        foreach ((array) ($node['marks'] ?? []) as $mark) {
            $tag = self::MARKS[$mark['type'] ?? ''] ?? null;

            if ($tag !== null) {
                $marks[$tag] = true;
            }
        }

        foreach (array_keys($marks) as $tag) {
            $html = "<{$tag}>{$html}</{$tag}>";
        }

        return $html;
    }
}
