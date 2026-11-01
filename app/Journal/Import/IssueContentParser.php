<?php

namespace App\Journal\Import;

use DOMDocument;
use DOMElement;
use DOMNode;
use DOMText;
use Illuminate\Support\Carbon;
use Throwable;

/**
 * Turns the HTML of an issue post on the old WordPress site into structured data.
 *
 * Every article on the old site is a run of lines (split by <br> and paragraphs):
 * the author list, the title with a "[PDF]" link, and sometimes an
 * "Early on-line <date>" line. Depending on the issue, the authors come either
 * before or after the title; that is decided once per post from the first article.
 */
final class IssueContentParser
{
    /** @var list<array{text: string, html: string, links: list<string>, segments: list<array{0: string, 1: string}>}> */
    private array $lines = [];

    private string $buffer = '';

    /** The current line as HTML with only i/sup/sub kept (for rich titles). */
    private string $html = '';

    /**
     * Inline tags open at the current position (i, sup, sub).
     *
     * @var list<string>
     */
    private array $open = [];

    private int $sup = 0;

    /**
     * Text runs of the current line with their style ("", "b", "i" or "bi").
     *
     * @var list<array{0: string, 1: string}>
     */
    private array $segments = [];

    private int $bold = 0;

    private int $italic = 0;

    /** @var list<string> */
    private array $bufferLinks = [];

    /**
     * @return array{
     *     full_pdf: string|null,
     *     toc_pdf: string|null,
     *     cover_pdf: string|null,
     *     online_at: string|null,
     *     articles: list<array{number: string, title: string, title_html: string|null, authors: list<string>, pdf: string|null, online_at: string|null}>,
     *     warnings: list<string>
     * }
     */
    public function parse(string $html): array
    {
        $fullPdf = null;
        $tocPdf = null;
        $coverPdf = null;
        $issueOnline = null;
        $warnings = [];
        $raw = [];
        $pending = [];
        $current = null;

        foreach ($this->lines($html) as $line) {
            $files = array_values(array_filter(
                array_map(SourceUrls::filePath(...), $line['links']),
            ));
            $text = self::clean($line['text']);

            // Header lines repeating the issue name ("Volume 64 (2)").
            if ($files === [] && preg_match('/^volume\s+\d+(\s*\([^)]*\))?$/iu', $text)) {
                continue;
            }

            if ($files !== []) {
                // "Full Issue [PDF] [Cover Page]".
                foreach ($files as $i => $file) {
                    if (preg_match('/cover/i', basename($file))) {
                        $coverPdf ??= $file;
                        unset($files[$i]);
                    }
                }

                $files = array_values($files);

                if ($files === []) {
                    continue;
                }

                if (self::isFullIssue($text)) {
                    $fullPdf ??= $files[0];
                    [$pending, $current] = [[], null];

                    continue;
                }

                if (self::isTableOfContents($text)) {
                    $tocPdf ??= $files[0];
                    [$pending, $current] = [[], null];

                    continue;
                }

                $raw[] = [
                    'label' => $text,
                    'html' => $line['html'],
                    'segments' => $line['segments'],
                    'style' => self::styleOf($line['segments'], firstOnly: true),
                    'pdf' => $files[0],
                    'pre' => $pending,
                    'post' => [],
                    'date' => null,
                ];
                $current = array_key_last($raw);
                $pending = [];

                continue;
            }

            if ($text === '') {
                continue;
            }

            if (preg_match('/^(?:early|available)\s*on[\s-]*line\s*:?\s*(.+)$/iu', $text, $m)) {
                if ($current !== null) {
                    $raw[$current]['date'] = self::date($m[1]);
                } elseif ($raw === []) {
                    // "Available on-line 03 November 2017" above the first article: the whole issue.
                    $issueOnline ??= self::date($m[1]);
                }

                continue;
            }

            $pending[] = ['text' => $text, 'html' => $line['html'], 'style' => self::styleOf($line['segments'])];

            if ($current !== null) {
                $raw[$current]['post'][] = $text;
            }
        }

        $authorsBefore = $raw !== [] && $raw[0]['pre'] !== [];
        $articles = [];
        $seen = [];

        foreach ($raw as $index => $item) {
            $title = self::stripNumbering($item['label']);
            $titleHtml = $item['html'];
            $pre = $item['pre'];

            // A title wrapped with <br>: earlier lines in the title's own style belong to it.
            while ($authorsBefore && $item['style'] !== '' && count($pre) > 1 && end($pre)['style'] === $item['style']) {
                $line = array_pop($pre);
                $title = $line['text'].' '.$title;
                $titleHtml = $line['html'].' '.$titleHtml;
            }

            $authorLines = $authorsBefore ? array_column($pre, 'text') : $item['post'];

            // Link on its own line: the title is the last line before it.
            if ($title === '' && $authorsBefore && $authorLines !== []) {
                $title = self::stripNumbering(array_pop($authorLines));
                $titleHtml = end($pre)['html'] ?? '';
            }

            $authors = self::authors($authorLines);

            // Authors and title on one line: plain text, then the bold/italic title.
            if ($authors === [] && ($split = self::splitStyledLine($item['segments']))) {
                [$authors, $title] = [self::authors([$split[0]]), self::stripNumbering($split[1])];
                $titleHtml = '';
            }

            [$title, $titleHtml] = self::richTitle(self::fixMixedScript($title), $titleHtml);

            $number = self::numberFromFile($item['pdf']) ?? str_pad((string) ($index + 1), 3, '0', STR_PAD_LEFT);
            // Early online mixes issues, so numbers are only unique per folder.
            $key = dirname($item['pdf']).'/'.$number;

            if (isset($seen[$key])) {
                $warnings[] = "Duplicate article {$item['pdf']}; kept the first.";

                continue;
            }

            $seen[$key] = true;

            if ($title === '') {
                $warnings[] = "Article {$number} has no title ({$item['pdf']}).";
            }

            $articles[] = [
                'number' => $number,
                'title' => $title,
                'title_html' => $titleHtml,
                'authors' => array_map(self::fixMixedScript(...), $authors),
                'pdf' => $item['pdf'],
                'online_at' => $item['date'],
            ];
        }

        return [
            'full_pdf' => $fullPdf,
            'toc_pdf' => $tocPdf,
            'cover_pdf' => $coverPdf,
            'online_at' => $issueOnline,
            'articles' => $articles,
            'warnings' => $warnings,
        ];
    }

    /**
     * Plain title and its rich form (i/sup/sub kept), from the title line's
     * HTML. Italics covering the whole title are the post's styling, not
     * markup. The rich form is dropped unless it spells the same title.
     *
     * @return array{0: string, 1: string|null}
     */
    private static function richTitle(string $title, string $html): array
    {
        $html = (string) preg_replace('/\[\s*(PDF|MS Word Document)\s*\]/iu', '', strip_tags($html, '<i><sup><sub>'));
        $html = (string) preg_replace('#<(i|sup|sub)>(\s*)</\1>#u', '$2', $html);

        // Italics over most of the title are how the post styles titles; real
        // italics (species, "in vitro", gene names) are short runs in upright text.
        $letters = fn (string $s) => mb_strlen((string) preg_replace('/[^\p{L}]+/u', '', strip_tags($s)));
        preg_match_all('#<i>(.*?)</i>#su', $html, $runs);
        $italic = array_sum(array_map($letters, $runs[1]));

        if ($italic > 0.5 * max(1, $letters($html))) {
            $html = str_replace(['<i>', '</i>'], '', $html);
        } else {
            $html = (string) preg_replace_callback(
                '#<i>(.*?)</i>#su',
                fn (array $m) => str_word_count(strip_tags($m[1])) > 4 ? $m[1] : $m[0],
                $html,
            );
        }

        $html = trim((string) preg_replace('/^[\s:–-]+|[\s:–-]+$/u', '', $html));
        $html = self::fixMixedScript((string) preg_replace('/^(?:<[^>]+>)*\d{1,3}\.\s+/u', '', $html));
        $rich = $html === '' ? null : TextRepair::richTitle($html);

        $spell = fn (string $s) => (string) preg_replace('/[^\p{L}]+/u', '', $s);

        if ($rich === null || $spell(TextRepair::plainTitle($rich)) !== $spell($title)) {
            return [$title, null];
        }

        return [TextRepair::plainTitle($rich), $rich];
    }

    /**
     * @return list<array{text: string, html: string, links: list<string>, segments: list<array{0: string, 1: string}>}>
     */
    private function lines(string $html): array
    {
        $this->lines = [];
        $this->buffer = '';
        $this->html = '';
        $this->open = [];
        $this->sup = 0;
        $this->bufferLinks = [];
        $this->segments = [];
        $this->bold = 0;
        $this->italic = 0;

        $doc = new DOMDocument;
        $doc->loadHTML(
            '<?xml encoding="utf-8"?><div>'.$html.'</div>',
            LIBXML_NOERROR | LIBXML_NOWARNING | LIBXML_NONET,
        );

        $body = $doc->getElementsByTagName('body')->item(0);

        if ($body) {
            $this->walk($body);
        }

        $this->flush();

        return $this->lines;
    }

    private function walk(DOMNode $node): void
    {
        foreach ($node->childNodes as $child) {
            if ($child instanceof DOMText) {
                $this->html .= htmlspecialchars((string) $child->nodeValue, ENT_NOQUOTES);

                // Superscripts are affiliation marks next to names ("Qazimi<sup>1</sup>"),
                // so they stay out of the plain text; the rich title keeps them.
                if ($this->sup === 0) {
                    $this->buffer .= $child->nodeValue;
                    $this->segments[] = [(string) $child->nodeValue, ($this->bold > 0 ? 'b' : '').($this->italic > 0 ? 'i' : '')];
                }

                continue;
            }

            if (! $child instanceof DOMElement) {
                continue;
            }

            $tag = strtolower($child->tagName);

            if (in_array($tag, ['script', 'style', 'form'], true)) {
                continue;
            }

            if ($tag === 'br') {
                $this->flush();

                continue;
            }

            $block = in_array($tag, ['p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'blockquote'], true);

            if ($block) {
                $this->flush();
            }

            if ($tag === 'a' && $child->getAttribute('href') !== '') {
                $this->bufferLinks[] = $child->getAttribute('href');
            }

            $bold = in_array($tag, ['strong', 'b'], true) ? 1 : 0;
            $italic = in_array($tag, ['em', 'i'], true) ? 1 : 0;
            $sup = $tag === 'sup' ? 1 : 0;
            $inline = match ($tag) {
                'em', 'i' => 'i',
                'sup', 'sub' => $tag,
                default => null,
            };

            if ($inline !== null) {
                $this->html .= "<{$inline}>";
                $this->open[] = $inline;
            }

            [$this->bold, $this->italic, $this->sup] = [$this->bold + $bold, $this->italic + $italic, $this->sup + $sup];
            $this->walk($child);
            [$this->bold, $this->italic, $this->sup] = [$this->bold - $bold, $this->italic - $italic, $this->sup - $sup];

            if ($inline !== null) {
                $this->html .= "</{$inline}>";
                array_pop($this->open);
            }

            if ($block) {
                $this->flush();
            }
        }
    }

    private function flush(): void
    {
        $text = trim((string) preg_replace('/\s+/u', ' ', str_replace("\u{00A0}", ' ', $this->buffer)));

        // Close inline tags at the line break and reopen them on the next line.
        $html = $this->html.implode('', array_map(fn (string $t) => "</{$t}>", array_reverse($this->open)));

        if ($text !== '' || $this->bufferLinks !== []) {
            $this->lines[] = ['text' => $text, 'html' => $html, 'links' => $this->bufferLinks, 'segments' => $this->segments];
        }

        $this->html = implode('', array_map(fn (string $t) => "<{$t}>", $this->open));
        $this->buffer = '';
        $this->bufferLinks = [];
        $this->segments = [];
    }

    private static function clean(string $text): string
    {
        $text = (string) preg_replace('/\[\s*(PDF|MS Word Document)\s*\]/iu', '', $text);
        $text = (string) preg_replace('/\s+/u', ' ', $text);

        // Unicode-aware trim (plain trim() is byte-based and would cut “quotes”).
        return (string) preg_replace('/^[\s:–-]+|[\s:–-]+$/u', '', $text);
    }

    /**
     * Leading plain text and the styled text after it, when a line has both.
     *
     * @param  list<array{0: string, 1: string}>  $segments
     * @return array{0: string, 1: string}|null
     */
    private static function splitStyledLine(array $segments): ?array
    {
        $plain = '';
        $styled = '';

        foreach ($segments as [$text, $style]) {
            $isStyled = $style !== '';

            if (! $isStyled && $styled === '') {
                $plain .= $text;
            } elseif ($isStyled) {
                $styled .= $text;
            }
        }

        [$plain, $styled] = [self::clean($plain), self::clean($styled)];

        return $plain !== '' && $styled !== '' && str_contains($plain, ',') ? [$plain, $styled] : null;
    }

    /**
     * The style shared by every visible run of a line ("" when mixed or plain).
     * With $firstOnly, the style of the first visible run.
     *
     * @param  list<array{0: string, 1: string}>  $segments
     */
    private static function styleOf(array $segments, bool $firstOnly = false): string
    {
        $styles = [];

        foreach ($segments as [$text, $style]) {
            if (self::clean($text) === '' || preg_match('/^\[?\s*PDF\s*\]?$/i', trim($text))) {
                continue;
            }

            if ($firstOnly) {
                return $style;
            }

            $styles[$style] = true;
        }

        return count($styles) === 1 ? (string) array_key_first($styles) : '';
    }

    /**
     * Latin words typed with look-alike Cyrillic letters ("Таtјаnа") break
     * search; convert those letters in words that mix both scripts.
     */
    public static function fixMixedScript(string $text): string
    {
        return TextRepair::homoglyphs($text);
    }

    private static function isFullIssue(string $text): bool
    {
        return (bool) preg_match('/\bfull issue\b|\bbook of abstracts\b|^macedonian pharmaceutical bulletin,\s*\d+/iu', $text);
    }

    private static function isTableOfContents(string $text): bool
    {
        return (bool) preg_match('/^table of contents$/iu', $text);
    }

    private static function stripNumbering(string $text): string
    {
        return trim((string) preg_replace('/^\d{1,3}\.\s+/u', '', $text));
    }

    private static function numberFromFile(string $path): ?string
    {
        if (preg_match('/_(\d{1,4})\.[a-z]+$/i', $path, $m)) {
            return str_pad(ltrim($m[1], '0') ?: '0', 3, '0', STR_PAD_LEFT);
        }

        return null;
    }

    /**
     * @param  list<string>  $lines
     * @return list<string>
     */
    private static function authors(array $lines): array
    {
        $joined = implode(', ', array_map(self::stripNumbering(...), $lines));
        $names = preg_split('/\s*[,;]\s*|\s+and\s+/u', $joined) ?: [];

        $names = array_map(
            fn (string $name) => trim((string) preg_replace(
                ['/\s*[¹²³⁴⁵⁶⁷⁸⁹⁰].*$/u', '/[\d*†‡§]+$/u'],
                '',
                trim($name),
            ), " .\t"),
            $names,
        );

        return array_values(array_filter($names, fn (string $name) => mb_strlen($name) > 1));
    }

    private static function date(string $value): ?string
    {
        try {
            return Carbon::parse(trim($value, ' .'))->toDateString();
        } catch (Throwable) {
            return null;
        }
    }
}
