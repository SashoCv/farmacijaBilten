<?php

namespace App\Manuscripts\Rendering;

use App\Manuscripts\Rich;
use App\Manuscripts\Template;
use App\Models\Manuscript;
use App\Models\ManuscriptImage;
use Illuminate\Support\Facades\Storage;
use PhpOffice\PhpWord\Element\AbstractContainer;
use PhpOffice\PhpWord\Element\Section;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory;
use PhpOffice\PhpWord\PhpWord;
use PhpOffice\PhpWord\Settings;
use PhpOffice\PhpWord\SimpleType\Jc;
use PhpOffice\PhpWord\Style\Language;

/**
 * The manuscript as a Word document in the journal's layout: one column,
 * Times, the first page as printed (journal block, title, authors,
 * affiliations, abstract between rules), sections with bold headings and
 * italic subheadings, tables with the journal's rules (three hairlines top
 * and bottom, one under the header), figures with "Fig. N." below, the
 * references and the summary in the other language. For editors who
 * typeset in Word and for authors who want a copy.
 */
final class DocxExporter
{
    private const FONT = 'Times New Roman';

    /** Text block: A4 with 25 mm side margins = 160 mm = 453.5 pt. */
    private const TEXT_WIDTH_PT = 453.5;

    private const TWIP = 20;

    private PhpWord $word;

    private Section $section;

    private int $tables = 0;

    private int $figures = 0;

    /** @var array<string, ManuscriptImage> */
    private array $images = [];

    private string $language = 'en';

    /** For reviewers under double-anonymous review: no names, affiliations, e-mails or acknowledgements. */
    private bool $anonymous = false;

    /**
     * @param  array<string, mixed>  $content  normalised ManuscriptContent
     * @return string path of a temporary .docx file
     */
    public function export(Manuscript $manuscript, array $content, bool $anonymous = false): string
    {
        $this->anonymous = $anonymous;
        $this->language = $manuscript->language === 'mk' ? 'mk' : 'en';
        $this->images = $manuscript->images()->get()->keyBy('public_id')->all();
        $labels = Template::labels($this->language);
        $other = Template::otherLanguage($this->language);
        $otherLabels = Template::labels($other);

        // Text such as "conductivity < 0.1" must be escaped in the XML.
        Settings::setOutputEscapingEnabled(true);

        $this->word = new PhpWord;
        $this->word->setDefaultFontName(self::FONT);
        // Whole points only here; runs set 10.5 pt themselves.
        $this->word->setDefaultFontSize(10);
        $this->word->getSettings()->setThemeFontLang(new Language($this->language === 'mk' ? 'mk-MK' : 'en-GB'));
        $this->word->getDocInfo()->setTitle(Rich::text($content['title'] ?? null))->setCreator('');

        $this->section = $this->word->addSection([
            'paperSize' => 'A4',
            'marginLeft' => 1417,
            'marginRight' => 1417,
            'marginTop' => 1134,
            'marginBottom' => 1134,
        ]);
        $this->section->addFooter()->addPreserveText('{PAGE}', ['size' => 9], ['alignment' => Jc::CENTER]);

        $this->front($manuscript, $content, $labels);

        foreach ((array) ($content['sections'] ?? []) as $section) {
            $this->heading((string) $section['heading']);
            $this->blocks($this->section, $section['body'] ?? null);
        }

        if (! $this->anonymous && ! Rich::isEmpty($content['acknowledgements'] ?? null)) {
            $this->heading($labels['acknowledgements']);
            $this->blocks($this->section, $content['acknowledgements']);
        }

        foreach (['conflictOfInterest' => 'conflict_of_interest', 'funding' => 'funding'] as $field => $label) {
            if (trim((string) ($content[$field] ?? '')) !== '' && ! ($this->anonymous && $field === 'funding')) {
                $this->heading($labels[$label]);
                $this->section->addText(trim((string) $content[$field]), [], $this->paragraph());
            }
        }

        $this->heading($labels['references']);

        foreach ((array) (($content['references'] ?? [])['content'] ?? []) as $block) {
            if (is_array($block) && ($block['type'] ?? null) === 'paragraph' && Rich::text($block) !== '') {
                $run = $this->section->addTextRun(['alignment' => Jc::BOTH, 'indentation' => ['left' => 283, 'hanging' => 283], 'spaceAfter' => 60]);
                $this->inline($run, $block, ['size' => 9]);
            }
        }

        $this->summary($content, $labels['summary'], $otherLabels['keywords'], $other);

        $path = tempnam(sys_get_temp_dir(), 'mpb-docx-');
        IOFactory::createWriter($this->word, 'Word2007')->save($path);
        self::fixIndentation($path);

        return $path;
    }

    /**
     * PHPWord writes both w:firstLine and w:hanging on every indented
     * paragraph; they are exclusive, and LibreOffice then ignores the hanging
     * indent of captions. Keep only the one that is set.
     */
    private static function fixIndentation(string $path): void
    {
        $zip = new \ZipArchive;

        if ($zip->open($path) !== true) {
            return;
        }

        $xml = (string) $zip->getFromName('word/document.xml');
        $xml = (string) preg_replace('/ w:firstLine="0"( w:hanging="[1-9]\d*")/', '$1', $xml);
        $xml = (string) preg_replace('/( w:firstLine="[1-9]\d*") w:hanging="0"/', '$1', $xml);
        $xml = str_replace(' w:firstLine="0" w:hanging="0"', '', $xml);
        $zip->addFromString('word/document.xml', $xml);
        $zip->close();
    }

    /**
     * @param  array<string, mixed>  $c
     * @param  array<string, string>  $labels
     */
    private function front(Manuscript $m, array $c, array $labels): void
    {
        $journal = $this->language === 'mk' ? (string) config('journal.name_mk') : 'Macedonian pharmaceutical bulletin';
        $right = ['alignment' => Jc::END, 'spaceAfter' => 0];
        $line = $this->section->addTextRun($right);
        $line->addText($journal, ['italic' => true, 'size' => 9]);

        if (($citation = $m->citationLine()) !== null) {
            $line->addText(', ', ['size' => 9]);
            $line->addText((string) $m->volume, ['bold' => true, 'size' => 9]);
            $line->addText(mb_substr($citation, mb_strlen((string) $m->volume)), ['size' => 9]);
        }

        $this->section->addText('ISSN: '.config('journal.issn_online'), ['size' => 9], $right);

        if ($m->doi !== null) {
            $this->section->addText('DOI: '.$m->doi, ['size' => 9], $right);
        }
        $this->section->addText($m->typeLabel($this->language), ['italic' => true, 'size' => 9], ['alignment' => Jc::END, 'spaceAfter' => 600]);

        $title = $this->section->addTextRun(['alignment' => Jc::CENTER, 'spaceAfter' => 300]);
        $this->inline($title, $this->firstBlock($c['title'] ?? null), ['bold' => true, 'size' => 16]);

        if ($this->anonymous) {
            $this->section->addText(__('Authors are hidden for anonymous review.'), ['italic' => true, 'size' => 10], ['alignment' => Jc::CENTER, 'spaceAfter' => 200]);
        } else {
            $this->people($c, alt: false);
        }

        $this->rule();
        $this->section->addText($labels['abstract'], ['bold' => true], ['spaceBefore' => 120, 'spaceAfter' => 80]);
        $this->blocks($this->section, $c['abstract'] ?? null, ['size' => 9]);
        $this->keywords($labels['keywords'], (array) ($c['keywords'] ?? []), 9);
        $this->rule();

        $emails = [];

        foreach ((array) ($c['authors'] ?? []) as $a) {
            if ($a['corresponding'] && $a['email'] !== '') {
                $emails[] = $a['email'];
            }
        }

        if ($emails !== [] && ! $this->anonymous) {
            $this->section->addText('*email: '.implode(', ', $emails), ['size' => 9], ['spaceBefore' => 120, 'spaceAfter' => 240]);
        }
    }

    /** @param  array<string, mixed>  $c */
    private function people(array $c, bool $alt): void
    {
        $affiliations = (array) ($c['affiliations'] ?? []);
        $numbers = [];

        foreach ($affiliations as $i => $a) {
            $numbers[$a['id']] = $i + 1;
        }

        $run = $this->section->addTextRun(['alignment' => Jc::CENTER, 'spaceAfter' => 160]);

        foreach (array_values((array) ($c['authors'] ?? [])) as $i => $a) {
            if ($i > 0) {
                $run->addText(', ', ['size' => 12]);
            }

            $run->addText(trim(($alt ? $a['givenNameAlt'] : $a['givenName']).' '.($alt ? $a['familyNameAlt'] : $a['familyName'])), ['size' => 12]);
            $marks = implode(',', array_map(fn (string $id) => $numbers[$id] ?? '?', $a['affiliations'])).($a['corresponding'] ? '*' : '');

            if ($marks !== '') {
                $run->addText($marks, ['size' => 12, 'superScript' => true]);
            }
        }

        foreach ($affiliations as $i => $a) {
            $line = $this->section->addTextRun(['alignment' => Jc::CENTER, 'spaceAfter' => 40]);
            $line->addText((string) ($i + 1), ['italic' => true, 'size' => 9.5, 'superScript' => true]);
            $line->addText($alt ? ($a['textAlt'] ?: $a['text']) : $a['text'], ['italic' => true, 'size' => 9.5]);
        }
    }

    /**
     * @param  array<string, mixed>  $c
     */
    private function summary(array $c, string $heading, string $keywordsLabel, string $language): void
    {
        $summary = (array) ($c['summary'] ?? []);
        $this->section->addPageBreak();
        $this->heading($heading);

        $title = $this->section->addTextRun(['alignment' => Jc::CENTER, 'spaceAfter' => 200]);
        $this->inline($title, $this->firstBlock($summary['title'] ?? null), ['bold' => true]);

        if (! $this->anonymous) {
            $this->people($c, alt: true);
        }

        $this->blocks($this->section, $summary['abstract'] ?? null);
        $this->keywords($keywordsLabel, (array) ($summary['keywords'] ?? []), 10.5);
    }

    private function heading(string $text): void
    {
        $this->section->addText($text, ['bold' => true, 'size' => 11], ['spaceBefore' => 280, 'spaceAfter' => 140, 'keepNext' => true]);
    }

    private function rule(): void
    {
        $this->section->addText('', ['size' => 2], ['borderBottomSize' => 6, 'borderBottomColor' => '000000', 'spaceAfter' => 60]);
    }

    /** @param  array<mixed>  $keywords */
    private function keywords(string $label, array $keywords, float $size): void
    {
        $run = $this->section->addTextRun(['spaceBefore' => 120, 'spaceAfter' => 120]);
        $run->addText($label.': ', ['bold' => true, 'size' => $size]);
        $run->addText(implode(', ', array_filter(array_map(fn ($k) => is_string($k) ? trim($k) : '', $keywords))), ['size' => $size]);
    }

    /** @return array<string, mixed> */
    private function paragraph(): array
    {
        return ['alignment' => Jc::BOTH, 'indentation' => ['firstLine' => 340], 'spaceAfter' => 0, 'lineHeight' => 1.15];
    }

    /** @return array<string, mixed>|null */
    private function firstBlock(mixed $doc): ?array
    {
        $first = is_array($doc) ? (($doc['content'] ?? [])[0] ?? null) : null;

        return is_array($first) ? $first : null;
    }

    /**
     * @param  array<string, mixed>  $font
     */
    private function blocks(AbstractContainer $container, mixed $doc, array $font = []): void
    {
        foreach ((array) (is_array($doc) ? ($doc['content'] ?? []) : []) as $block) {
            if (! is_array($block)) {
                continue;
            }

            match ($block['type'] ?? null) {
                'paragraph' => $this->inline($container->addTextRun($this->paragraph()), $block, $font),
                'heading' => $this->inline($container->addTextRun(['spaceBefore' => 200, 'spaceAfter' => 100, 'keepNext' => true]), $block, [...$font, 'italic' => true]),
                'bulletList', 'orderedList' => $this->listBlock($container, $block, $font),
                'tableBlock' => $this->table($block),
                'figure' => $this->figure($block),
                default => null,
            };
        }
    }

    /**
     * @param  array<string, mixed>  $list
     * @param  array<string, mixed>  $font
     */
    private function listBlock(AbstractContainer $container, array $list, array $font): void
    {
        $n = 0;

        foreach ((array) ($list['content'] ?? []) as $item) {
            $n++;
            $marker = ($list['type'] ?? '') === 'orderedList' ? "{$n}." : '•';

            foreach ((array) ($item['content'] ?? []) as $i => $paragraph) {
                $run = $container->addTextRun(['indentation' => ['left' => 567, 'hanging' => 283], 'spaceAfter' => 40]);

                if ($i === 0) {
                    $run->addText($marker."\t", $font);
                }

                if (is_array($paragraph)) {
                    $this->inline($run, $paragraph, $font);
                }
            }
        }
    }

    /**
     * Text with bold, italic, subscript and superscript.
     *
     * @param  array<string, mixed>|null  $node
     * @param  array<string, mixed>  $font
     */
    private function inline(TextRun $run, ?array $node, array $font = []): void
    {
        $font += ['size' => 10.5];

        foreach ((array) ($node['content'] ?? []) as $child) {
            if (! is_array($child)) {
                continue;
            }

            if (($child['type'] ?? null) === 'hardBreak') {
                $run->addTextBreak();

                continue;
            }

            if (($child['type'] ?? null) !== 'text') {
                continue;
            }

            $style = $font;

            foreach ((array) ($child['marks'] ?? []) as $mark) {
                match ($mark['type'] ?? null) {
                    'bold' => $style['bold'] = true,
                    'italic' => $style['italic'] = true,
                    'subscript' => $style['subScript'] = true,
                    'superscript' => $style['superScript'] = true,
                    default => null,
                };
            }

            $run->addText((string) ($child['text'] ?? ''), $style);
        }
    }

    /**
     * "Table N." above, the journal's rules (three hairlines top and bottom
     * as a double border plus a hairline on the first and last row, one
     * hairline under the header), notes below in 9 pt.
     *
     * @param  array<string, mixed>  $block
     */
    private function table(array $block): void
    {
        $this->tables++;
        $parts = collect((array) ($block['content'] ?? []));
        $label = Template::labels($this->language)['table'];

        $caption = $this->section->addTextRun(['spaceBefore' => 200, 'spaceAfter' => 80, 'indentation' => ['left' => 850, 'hanging' => 850], 'keepNext' => true]);
        $caption->addText("{$label} {$this->tables}.\t", ['size' => 10]);
        $this->inline($caption, $parts->firstWhere('type', 'tableCaption'), ['size' => 10]);

        $rows = array_values(array_filter(
            (array) (($parts->firstWhere('type', 'table') ?? [])['content'] ?? []),
            fn ($row) => is_array($row) && ($row['type'] ?? null) === 'tableRow',
        ));

        $grid = $this->grid($rows);
        $columns = max(1, $grid['columns']);
        $width = (int) round((self::TEXT_WIDTH_PT - 28) * self::TWIP);
        $widths = $this->columnWidths($grid, $columns, $width);
        // Short tables are kept on one page (each row keeps with the next).
        $keepTogether = count($rows) <= 25;

        $table = $this->section->addTable([
            'width' => $width,
            'unit' => 'dxa',
            'alignment' => Jc::CENTER,
            'borderTopSize' => 4,
            'borderTopStyle' => 'double',
            'borderTopColor' => '000000',
            'borderBottomSize' => 4,
            'borderBottomStyle' => 'double',
            'borderBottomColor' => '000000',
            'cellMarginLeft' => 80,
            'cellMarginRight' => 80,
        ]);

        $headerRows = 0;

        foreach ($rows as $row) {
            if (collect((array) ($row['content'] ?? []))->every(fn ($cell) => ($cell['type'] ?? null) === 'tableHeader')) {
                $headerRows++;
            } else {
                break;
            }
        }

        $last = count($rows) - 1;

        foreach ($grid['cells'] as $r => $cells) {
            $wordRow = $table->addRow(null, $r < $headerRows ? ['tblHeader' => true] : []);

            foreach ($cells as $cell) {
                $style = ['valign' => 'top'];

                if ($cell['span'] > 1) {
                    $style['gridSpan'] = $cell['span'];
                }

                if ($cell['merge'] !== null) {
                    $style['vMerge'] = $cell['merge'];
                    $style['valign'] = 'center';
                }

                // Inner hairlines: the close pair of the top and bottom rules, and the header rule.
                if ($r === 0) {
                    $style += ['borderTopSize' => 4, 'borderTopColor' => '000000'];
                }

                if ($r === $last) {
                    $style += ['borderBottomSize' => 4, 'borderBottomColor' => '000000'];
                }

                if ($headerRows > 0 && $r === $headerRows - 1) {
                    $style += ['borderBottomSize' => 4, 'borderBottomColor' => '000000'];
                }

                $wordCell = $wordRow->addCell(array_sum(array_slice($widths, $cell['col'], $cell['span'])), $style);

                if ($cell['node'] === null) {
                    continue;
                }

                $header = ($cell['node']['type'] ?? null) === 'tableHeader';
                $align = match ($cell['node']['attrs']['align'] ?? null) {
                    'center' => Jc::CENTER,
                    'right' => Jc::END,
                    default => Jc::START,
                };

                foreach ((array) ($cell['node']['content'] ?? []) as $paragraph) {
                    if (is_array($paragraph)) {
                        $run = $wordCell->addTextRun([
                            'alignment' => $align,
                            'spaceBefore' => 40,
                            'spaceAfter' => 40,
                            'keepNext' => $keepTogether && $r < $last,
                        ]);
                        $this->inline($run, $paragraph, ['size' => 10, 'bold' => $header]);
                    }
                }
            }
        }

        foreach ((array) (($parts->firstWhere('type', 'tableNotes') ?? [])['content'] ?? []) as $note) {
            $run = $this->section->addTextRun(['spaceAfter' => 0, 'indentation' => ['left' => 280]]);
            $marker = (string) ($note['attrs']['marker'] ?? '');

            if ($marker !== '') {
                $run->addText($marker, ['size' => 9, 'superScript' => true]);
            }

            $this->inline($run, $note, ['size' => 9]);
        }

        $this->section->addTextBreak(1, ['size' => 6]);
    }

    /**
     * Expands colspan/rowspan into a grid: each row lists its cells with the
     * columns they span; cells covered by a rowspan from above become empty
     * "continue" cells, as Word expects.
     *
     * @param  list<array<string, mixed>>  $rows
     * @return array{columns: int, cells: list<list<array{node: array<string, mixed>|null, span: int, merge: string|null, col: int}>>}
     */
    private function grid(array $rows): array
    {
        $covered = [];
        $out = [];
        $columns = 0;

        foreach ($rows as $r => $row) {
            $cells = [];
            $col = 0;
            $queue = array_values(array_filter((array) ($row['content'] ?? []), 'is_array'));

            while ($queue !== [] || isset($covered[$r][$col])) {
                if (isset($covered[$r][$col])) {
                    $span = $covered[$r][$col];
                    $cells[] = ['node' => null, 'span' => $span, 'merge' => 'continue', 'col' => $col];
                    $col += $span;

                    continue;
                }

                $node = array_shift($queue);
                $span = max(1, min(50, (int) ($node['attrs']['colspan'] ?? 1)));
                $rowspan = max(1, min(50, (int) ($node['attrs']['rowspan'] ?? 1)));

                for ($i = 1; $i < $rowspan; $i++) {
                    $covered[$r + $i][$col] = $span;
                }

                $cells[] = ['node' => $node, 'span' => $span, 'merge' => $rowspan > 1 ? 'restart' : null, 'col' => $col];
                $col += $span;
            }

            $columns = max($columns, $col);
            $out[] = $cells;
        }

        return ['columns' => $columns, 'cells' => $out];
    }

    /**
     * Column widths in twips, by the longest text in each column (cells that
     * span several columns do not count), so a column of long labels gets
     * room and short numeric columns stay narrow.
     *
     * @param  array{columns: int, cells: list<list<array{node: array<string, mixed>|null, span: int, merge: string|null, col: int}>>}  $grid
     * @return list<int>
     */
    private function columnWidths(array $grid, int $columns, int $total): array
    {
        $weights = array_fill(0, $columns, 4);

        foreach ($grid['cells'] as $cells) {
            foreach ($cells as $cell) {
                if ($cell['node'] !== null && $cell['span'] === 1 && $cell['col'] < $columns) {
                    $length = mb_strlen(Rich::text($cell['node']));
                    $weights[$cell['col']] = max($weights[$cell['col']], min($length, 40));
                }
            }
        }

        $sum = array_sum($weights);

        return array_values(array_map(fn (int $w) => (int) floor($total * $w / $sum), $weights));
    }

    /** @param  array<string, mixed>  $block */
    private function figure(array $block): void
    {
        $this->figures++;
        $image = $this->images[(string) ($block['attrs']['image'] ?? '')] ?? null;
        $percent = in_array((int) ($block['attrs']['width'] ?? 100), [25, 50, 75, 100], true) ? (int) $block['attrs']['width'] : 100;

        if ($image !== null && Storage::disk('local')->exists($image->path)) {
            $width = self::TEXT_WIDTH_PT * $percent / 100;
            $height = $width * $image->height / max(1, $image->width);

            $this->section->addImage(Storage::disk('local')->path($image->path), [
                'width' => $width,
                'height' => $height,
                'unit' => 'pt',
                'alignment' => Jc::CENTER,
            ]);
        }

        $label = $this->language === 'mk' ? 'Слика' : 'Fig.';
        $caption = $this->section->addTextRun(['alignment' => Jc::BOTH, 'spaceBefore' => 80, 'spaceAfter' => 200, 'indentation' => ['left' => 850, 'hanging' => 850]]);
        $caption->addText("{$label} {$this->figures}.\t", ['size' => 10]);
        $this->inline($caption, collect((array) ($block['content'] ?? []))->firstWhere('type', 'figureCaption'), ['size' => 10]);
    }
}
