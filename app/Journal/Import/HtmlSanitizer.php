<?php

namespace App\Journal\Import;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use DOMXPath;
use Illuminate\Support\Str;

/**
 * Cleans WordPress page HTML down to plain, styleable markup and rewrites
 * links to the new site. Collects the files it references so they can be
 * mirrored.
 *
 * Besides stripping, it restores the document structure the old theme
 * expressed with visual markup only:
 *
 *  - `<div id="x"><strong>Title</strong></div>` becomes `<h2 id="x">Title</h2>`,
 *    so the in-page links of the author guides ("#types_paper") resolve again.
 *    Other `div` ids survive as an empty `<a id>` anchor.
 *  - In sectioned documents (at least one `h2[id]`), a paragraph that opens
 *    with `<em>Label</em><br>` or `<strong>Label</strong><br>` gets the label
 *    as an `<h3>` with a slug id; a paragraph holding nothing but a bold label
 *    becomes an `<h2>`, an italic one an `<h3>`. Address-style pages (board,
 *    contact) have no sections and keep their line structure.
 *  - Runs of "<br>– item" lines become `<ul class="checklist">`.
 *  - Bare URLs and e-mail addresses become links labelled with the host name
 *    (or the address); links whose text is their own URL are relabelled.
 *
 * Running it again on its own output changes nothing.
 */
final class HtmlSanitizer
{
    /** Tag => allowed attributes. */
    private const ALLOWED = [
        'p' => [], 'br' => [], 'strong' => [], 'b' => [], 'em' => [], 'i' => [], 'u' => [],
        'sup' => [], 'sub' => [], 'ul' => ['class'], 'ol' => [], 'li' => [], 'blockquote' => [],
        'h2' => ['id'], 'h3' => ['id'], 'h4' => ['id'],
        'table' => [], 'thead' => [], 'tbody' => [], 'tr' => [], 'th' => [], 'td' => [],
        'a' => ['href', 'id', 'name'], 'img' => ['src', 'alt'],
    ];

    /** Allowed values of `class`, per tag. */
    private const CLASSES = ['ul' => ['checklist']];

    /** Dropped together with their content. */
    private const REMOVE = ['script', 'style', 'form', 'iframe', 'object', 'noscript', 'input', 'button', 'select', 'textarea'];

    /** Elements that make a `div` a container rather than a heading. */
    private const BLOCKS = ['p', 'ul', 'ol', 'table', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'img'];

    /** "1. ", "2." at the start of an old numbered section title (the TOC numbers sections). */
    private const NUMBERING = '/^\d+\.\s*/u';

    /** A checklist line: "– item", "— item" or "- item". */
    private const DASH_LINE = '/^[\x{2013}\x{2014}-]\s+/u';

    /** Bare web address or e-mail address in running text. */
    private const AUTOLINK = '~(?<url>\bhttps?://[^\s<>"\x{201C}\x{201D}]+|\bwww\.[a-z0-9-]+\.[^\s<>"\x{201C}\x{201D}]+)|(?<email>\b[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\b)~iu';

    /** @var array<string, true> */
    private array $files = [];

    /** @var array<string, true> */
    private array $ids = [];

    /**
     * @return array{html: string, files: list<string>}
     */
    public function clean(string $html): array
    {
        $this->files = [];
        $this->ids = [];

        $html = (string) preg_replace('/<!--.*?-->/s', '', $html);

        $doc = new DOMDocument;
        $doc->loadHTML(
            '<?xml encoding="utf-8"?><div id="__root">'.$html.'</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET,
        );

        $root = $doc->getElementById('__root');

        if (! $root) {
            return ['html' => '', 'files' => []];
        }

        $root->removeAttribute('id');

        $this->promoteSectionDivs($doc, $root);
        $this->cleanChildren($root);
        $this->collectIds($root);

        if ($this->hasSections($doc)) {
            $this->addSubheadings($doc, $root);
            $this->joinBrokenLines($root);
        }

        $this->buildChecklists($doc, $root);
        $this->autolink($doc, $root);
        $this->relabelUrlLinks($root);

        // Nothing left to read (a page that only held a plugin form).
        if ($this->text($root) === '' && $root->getElementsByTagName('img')->length === 0) {
            return ['html' => '', 'files' => array_keys($this->files)];
        }

        $out = '';

        foreach ($root->childNodes as $child) {
            $out .= $doc->saveHTML($child);
        }

        // Drop empty paragraphs left behind by WordPress spacing.
        $out = (string) preg_replace('#<p>(\s|&nbsp;|\x{00A0}|<br>)*</p>#u', '', $out);
        // Collapse the blank lines that removed nodes leave behind.
        $out = (string) preg_replace("/\n{2,}/", "\n", $out);

        return ['html' => trim($out), 'files' => array_keys($this->files)];
    }

    /** Lower-case, ASCII slug used for generated heading ids. */
    public static function slug(string $text): string
    {
        $slug = Str::slug(Str::ascii($text));

        return $slug === '' ? 'section' : $slug;
    }

    /**
     * `<div id="x"><strong>Title</strong></div>` → `<h2 id="x">Title</h2>`.
     * Any other `div[id]` keeps its id as an empty anchor at its start.
     */
    private function promoteSectionDivs(DOMDocument $doc, DOMElement $root): void
    {
        foreach (iterator_to_array($root->getElementsByTagName('div')) as $div) {
            /** @var DOMElement $div */
            $id = trim($div->getAttribute('id'));

            if ($id === '' || ! $div->parentNode) {
                continue;
            }

            $text = $this->text($div);

            if ($text !== '' && mb_strlen($text) <= 120 && ! $this->containsBlock($div)) {
                $heading = $doc->createElement('h2');
                $heading->setAttribute('id', $id);
                $heading->appendChild($doc->createTextNode($this->headingText($text)));
                $div->parentNode->replaceChild($heading, $div);

                continue;
            }

            $anchor = $doc->createElement('a');
            $anchor->setAttribute('id', $id);
            $div->insertBefore($anchor, $div->firstChild);
            $div->removeAttribute('id');
        }
    }

    private function cleanChildren(DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);

            if (in_array($tag, self::REMOVE, true)) {
                $node->removeChild($child);

                continue;
            }

            $this->cleanChildren($child);

            if (! array_key_exists($tag, self::ALLOWED)) {
                // Unwrap: keep the content, lose the element (span, div, font...).
                while ($child->firstChild) {
                    $node->insertBefore($child->firstChild, $child);
                }

                $node->removeChild($child);

                continue;
            }

            foreach (iterator_to_array($child->attributes) as $attribute) {
                if (! in_array($attribute->name, self::ALLOWED[$tag], true)) {
                    $child->removeAttribute($attribute->name);
                }
            }

            if ($child->hasAttribute('class')) {
                $classes = array_values(array_intersect(
                    preg_split('/\s+/', trim($child->getAttribute('class'))) ?: [],
                    self::CLASSES[$tag] ?? [],
                ));

                $classes === []
                    ? $child->removeAttribute('class')
                    : $child->setAttribute('class', implode(' ', $classes));
            }

            if ($tag === 'a' && $child->hasAttribute('href')) {
                $child->setAttribute('href', $this->rewrite($child->getAttribute('href')));
            }

            if ($tag === 'img' && $child->hasAttribute('src')) {
                $child->setAttribute('src', $this->rewrite($child->getAttribute('src')));
                $child->setAttribute('loading', 'lazy');
            }
        }
    }

    private function hasSections(DOMDocument $doc): bool
    {
        $headings = (new DOMXPath($doc))->query('//h2[@id]');

        return $headings !== false && $headings->length > 0;
    }

    /**
     * In sectioned documents: label paragraphs become headings.
     */
    private function addSubheadings(DOMDocument $doc, DOMElement $root): void
    {
        foreach (iterator_to_array($root->childNodes) as $p) {
            if (! $p instanceof DOMElement || $p->tagName !== 'p') {
                continue;
            }

            $children = $this->meaningfulChildren($p);
            $first = $children[0] ?? null;

            if (! $first instanceof DOMElement || ! in_array($first->tagName, ['strong', 'b', 'em', 'i'], true)) {
                continue;
            }

            $bold = in_array($first->tagName, ['strong', 'b'], true);
            $label = $this->text($first);

            if ($label === '' || mb_strlen($label) > 90) {
                continue;
            }

            // <p><strong>DISCLAIMER</strong></p> or <p><em>References</em></p>
            if (count($children) === 1) {
                $heading = $this->heading($doc, $bold ? 'h2' : 'h3', $label);
                $p->parentNode?->replaceChild($heading, $p);

                continue;
            }

            // <p><em>Units</em><br>Follow internationally accepted rules…</p>
            $next = $children[1];

            if (! $next instanceof DOMElement || $next->tagName !== 'br') {
                continue;
            }

            $p->parentNode?->insertBefore($this->heading($doc, 'h3', $label), $p);

            // Remove everything up to and including the <br>.
            while ($p->firstChild && $p->firstChild !== $next) {
                $p->removeChild($p->firstChild);
            }

            $p->removeChild($next);
            $this->trimLeading($p);
        }
    }

    /**
     * A <br> in the middle of a sentence ("defined at<br>their first mention")
     * is a hard wrap copied from a word processor: it becomes a space.
     */
    private function joinBrokenLines(DOMElement $root): void
    {
        foreach (iterator_to_array($root->getElementsByTagName('br')) as $br) {
            /** @var DOMElement $br */
            $prev = $br->previousSibling;
            $next = $br->nextSibling;

            if ($prev instanceof DOMText && $next instanceof DOMText
                && preg_match('/[\p{Ll},]$/u', rtrim($prev->data))
                && preg_match('/^\s*[\p{Ll}\d]/u', $next->data)) {
                $prev->data = rtrim($prev->data).' ';
                $next->data = ltrim($next->data);
                $br->parentNode?->removeChild($br);
            }
        }
    }

    /**
     * "<br>– item" runs inside a paragraph become a checklist between two
     * paragraphs.
     */
    private function buildChecklists(DOMDocument $doc, DOMElement $root): void
    {
        foreach (iterator_to_array($root->getElementsByTagName('p')) as $p) {
            /** @var DOMElement $p */
            $lines = $this->lines($p);
            $dashes = array_map(fn (array $line) => (bool) preg_match(self::DASH_LINE, $this->linesText($line)), $lines);

            if (! $this->hasRun($dashes)) {
                continue;
            }

            /** @var list<array{list: bool, lines: list<list<DOMNode>>}> $groups */
            $groups = [];

            foreach ($lines as $i => $line) {
                $isItem = $dashes[$i];
                $last = array_key_last($groups);

                if ($last !== null && $groups[$last]['list'] === $isItem) {
                    $groups[$last]['lines'][] = $line;
                } else {
                    $groups[] = ['list' => $isItem, 'lines' => [$line]];
                }
            }

            $parent = $p->parentNode;

            if (! $parent) {
                continue;
            }

            foreach ($groups as $group) {
                if ($group['list'] && count($group['lines']) >= 2) {
                    $ul = $doc->createElement('ul');
                    $ul->setAttribute('class', 'checklist');

                    foreach ($group['lines'] as $line) {
                        $li = $doc->createElement('li');

                        foreach ($line as $node) {
                            $li->appendChild($node);
                        }

                        $this->trimLeading($li, self::DASH_LINE);
                        $ul->appendChild($li);
                    }

                    $parent->insertBefore($ul, $p);

                    continue;
                }

                $para = $doc->createElement('p');

                foreach ($group['lines'] as $n => $line) {
                    if ($n > 0) {
                        $para->appendChild($doc->createElement('br'));
                    }

                    foreach ($line as $node) {
                        $para->appendChild($node);
                    }
                }

                $this->trimLeading($para);

                if ($this->text($para) !== '' || $para->getElementsByTagName('img')->length > 0) {
                    $parent->insertBefore($para, $p);
                }
            }

            $parent->removeChild($p);
        }
    }

    /**
     * Turns bare URLs and e-mail addresses in text into links.
     */
    private function autolink(DOMDocument $doc, DOMNode $node): void
    {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child instanceof DOMElement) {
                if (! in_array($child->tagName, ['a', 'h2', 'h3', 'h4'], true)) {
                    $this->autolink($doc, $child);
                }

                continue;
            }

            if (! $child instanceof DOMText) {
                continue;
            }

            $text = $child->data;

            if (! preg_match_all(self::AUTOLINK, $text, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER)) {
                continue;
            }

            $fragment = $doc->createDocumentFragment();
            $cursor = 0;

            foreach ($matches as $match) {
                [$raw, $offset] = $match[0];
                $isEmail = isset($match['email']) && $match['email'][1] >= 0;

                // Trailing punctuation belongs to the sentence, not the address.
                $value = $isEmail ? $raw : (string) preg_replace('/[.,;:!?)\]]+$/u', '', $raw);

                $fragment->appendChild($doc->createTextNode(substr($text, $cursor, $offset - $cursor)));

                $a = $doc->createElement('a');

                if ($isEmail) {
                    $a->setAttribute('href', 'mailto:'.$value);
                    $a->appendChild($doc->createTextNode($value));
                } else {
                    $href = str_starts_with(strtolower($value), 'www.') ? 'http://'.$value : $value;
                    $a->setAttribute('href', $this->rewrite($href));
                    $a->appendChild($doc->createTextNode($this->urlLabel($href)));
                }

                $fragment->appendChild($a);
                $cursor = $offset + strlen($value);
            }

            $fragment->appendChild($doc->createTextNode(substr($text, $cursor)));
            $node->replaceChild($fragment, $child);
        }
    }

    /** `<a href="http://x.org/y">http://x.org/y</a>` → `<a href="…">x.org</a>`. */
    private function relabelUrlLinks(DOMElement $root): void
    {
        foreach (iterator_to_array($root->getElementsByTagName('a')) as $a) {
            /** @var DOMElement $a */
            $text = $this->text($a);

            if (preg_match('~^(https?://|www\.)\S+$~i', $text) && $a->getElementsByTagName('img')->length === 0) {
                $href = str_starts_with(strtolower($text), 'www.') ? 'http://'.$text : $text;

                while ($a->firstChild) {
                    $a->removeChild($a->firstChild);
                }

                $a->appendChild($a->ownerDocument->createTextNode($this->urlLabel($href)));
            }
        }
    }

    /** "http://www.icmje.org/..." → "icmje.org". */
    private function urlLabel(string $url): string
    {
        $host = (string) parse_url($url, PHP_URL_HOST);

        return $host === '' ? $url : (string) preg_replace('/^www\./i', '', $host);
    }

    private function heading(DOMDocument $doc, string $tag, string $text): DOMElement
    {
        $text = $this->headingText($text);
        $heading = $doc->createElement($tag);
        $heading->setAttribute('id', $this->uniqueId(self::slug($text)));
        $heading->appendChild($doc->createTextNode($text));

        return $heading;
    }

    /** Strips old numbering and a trailing colon; "DISCLAIMER" → "Disclaimer". */
    private function headingText(string $text): string
    {
        $text = trim((string) preg_replace(self::NUMBERING, '', $text));
        $text = rtrim($text, ': ');

        if (mb_strlen($text) > 3 && mb_strtoupper($text) === $text && preg_match('/\p{L}/u', $text)) {
            $text = Str::ucfirst(mb_strtolower($text));
        }

        return $text;
    }

    private function collectIds(DOMElement $root): void
    {
        foreach ((new DOMXPath($root->ownerDocument))->query('.//*[@id]', $root) ?: [] as $el) {
            /** @var DOMElement $el */
            $this->ids[$el->getAttribute('id')] = true;
        }
    }

    private function uniqueId(string $base): string
    {
        $id = $base;
        $n = 2;

        while (isset($this->ids[$id])) {
            $id = "{$base}-{$n}";
            $n++;
        }

        $this->ids[$id] = true;

        return $id;
    }

    /**
     * Child nodes of a paragraph split at its top-level <br>s.
     *
     * @return list<list<DOMNode>>
     */
    private function lines(DOMElement $p): array
    {
        $lines = [[]];

        foreach (iterator_to_array($p->childNodes) as $node) {
            if ($node instanceof DOMElement && $node->tagName === 'br') {
                $lines[] = [];

                continue;
            }

            $lines[array_key_last($lines)][] = $node;
        }

        return $lines;
    }

    /**
     * @param  list<DOMNode>  $line
     */
    private function linesText(array $line): string
    {
        return trim(implode('', array_map(fn (DOMNode $n) => $n->textContent, $line)), " \t\n\r\0\x0B\u{00A0}");
    }

    /**
     * @param  list<bool>  $flags
     */
    private function hasRun(array $flags): bool
    {
        foreach ($flags as $i => $flag) {
            if ($flag && ($flags[$i + 1] ?? false)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<DOMNode>
     */
    private function meaningfulChildren(DOMElement $el): array
    {
        $out = [];

        foreach ($el->childNodes as $node) {
            if ($node instanceof DOMText && trim($node->data, " \t\n\r\0\x0B\u{00A0}") === '') {
                continue;
            }

            $out[] = $node;
        }

        return $out;
    }

    /** Removes leading whitespace (and an optional prefix pattern) from an element's first text. */
    private function trimLeading(DOMElement $el, ?string $prefix = null): void
    {
        while ($el->firstChild instanceof DOMText && trim($el->firstChild->data, " \t\n\r\0\x0B\u{00A0}") === '') {
            $el->removeChild($el->firstChild);
        }

        $first = $el->firstChild;

        if ($first instanceof DOMText) {
            $data = ltrim($first->data, " \t\n\r\0\x0B\u{00A0}");
            $first->data = $prefix ? (string) preg_replace($prefix, '', $data) : $data;
        }
    }

    private function containsBlock(DOMElement $el): bool
    {
        foreach (self::BLOCKS as $tag) {
            if ($el->getElementsByTagName($tag)->length > 0) {
                return true;
            }
        }

        return false;
    }

    private function text(DOMNode $node): string
    {
        return trim((string) preg_replace('/[\s\x{00A0}]+/u', ' ', $node->textContent));
    }

    private function rewrite(string $url): string
    {
        if ($file = SourceUrls::filePath($url)) {
            $this->files[$file] = true;

            return '/'.implode('/', array_map(rawurlencode(...), explode('/', $file)));
        }

        return SourceUrls::pageUrl($url) ?? $url;
    }
}
