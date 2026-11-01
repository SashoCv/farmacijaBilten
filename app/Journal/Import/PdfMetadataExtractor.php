<?php

namespace App\Journal\Import;

use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Reads article metadata from the first pages of a journal PDF.
 *
 * Every article since 2001 opens the same way: a running header
 * ("Macedonian pharmaceutical bulletin, 71 (2) 3 - 11 (2025)"), ISSN and DOI
 * lines, the article type, title, authors, affiliations, a Received/Accepted
 * line, the abstract and a "Key words:" line. Congress short communications
 * skip the abstract and go straight to "Introduction".
 *
 * Requires pdftotext (poppler-utils).
 */
final class PdfMetadataExtractor
{
    private const AFFILIATION_WORDS = '/\b(faculty|universit|institut|department|hospital|clinic|cent(er|re)|laborator|school|academy|company|ltd|d\.o\.o|agency|ministry|college|pharmac(y|ies)\b.*,|research)/iu';

    private const COUNTRIES = 'Macedonia|Makedonija|Serbia|Bulgaria|Kosovo|Albania|Slovenia|Croatia|Greece|Turkey|Türkiye|Romania|Hungary|Poland|Czech Republic|Czechia|Slovakia|Austria|Germany|Switzerland|Italy|France|Belgium|Netherlands|Spain|Portugal|United Kingdom|UK|Ireland|Sweden|Norway|Finland|Denmark|Latvia|Lithuania|Estonia|Ukraine|Russia|Bosnia and Herzegovina|Montenegro|Cyprus|Malta|USA|United States|Canada|Brazil|Mexico|Cuba|India|Pakistan|Bangladesh|Iran|Iraq|Jordan|Lebanon|Egypt|Saudi Arabia|Qatar|Nigeria|China|Japan|Australia|Israel';

    /**
     * Macedonian "MAC C" fonts map Cyrillic letters onto Latin keys and a few
     * punctuation marks ("~" is ч, "{" is ш, "`" is ж, "}" is ќ).
     */
    public const MAC_FONT = [
        'a' => 'а', 'b' => 'б', 'v' => 'в', 'g' => 'г', 'd' => 'д', '|' => 'ѓ', 'e' => 'е', '`' => 'ж',
        'z' => 'з', 'y' => 'ѕ', 'i' => 'и', 'j' => 'ј', 'k' => 'к', 'l' => 'л', 'q' => 'љ', 'm' => 'м',
        'n' => 'н', 'w' => 'њ', 'o' => 'о', 'p' => 'п', 'r' => 'р', 's' => 'с', 't' => 'т', '}' => 'ќ',
        'u' => 'у', 'f' => 'ф', 'h' => 'х', 'c' => 'ц', '~' => 'ч', 'x' => 'џ', '{' => 'ш',
        'A' => 'А', 'B' => 'Б', 'V' => 'В', 'G' => 'Г', 'D' => 'Д', '\\' => 'Ѓ', 'E' => 'Е', '@' => 'Ж',
        'Z' => 'З', 'Y' => 'Ѕ', 'I' => 'И', 'J' => 'Ј', 'K' => 'К', 'L' => 'Л', 'Q' => 'Љ', 'M' => 'М',
        'N' => 'Н', 'W' => 'Њ', 'O' => 'О', 'P' => 'П', 'R' => 'Р', 'S' => 'С', 'T' => 'Т', ']' => 'Ќ',
        'U' => 'У', 'F' => 'Ф', 'H' => 'Х', 'C' => 'Ц', '^' => 'Ч', 'X' => 'Џ', '[' => 'Ш',
    ];

    public function __construct(private readonly string $binary = 'pdftotext') {}

    /**
     * @return array{
     *     pages: string|null, doi: string|null, type: string|null,
     *     abstract: string|null, keywords: list<string>,
     *     affiliations: list<string>, history: string|null,
     *     authors: list<string>
     * }
     */
    public function extract(string $pdfPath, ?string $title = null): array
    {
        $raw = $this->text($pdfPath, layout: false);
        $layout = $this->text($pdfPath, layout: true);

        return [
            ...$this->parse($raw, $layout),
            'authors' => $title !== null ? $this->authors($raw, $title) : [],
        ];
    }

    /**
     * @return array{
     *     pages: string|null, doi: string|null, type: string|null,
     *     abstract: string|null, keywords: list<string>,
     *     affiliations: list<string>, history: string|null
     * }
     */
    public function parse(string $raw, string $layout): array
    {
        $raw = self::normalise($raw);
        $layout = self::normalise($layout);
        $history = null;

        // Accepted manuscripts (early online) open with a disclaimer page and a
        // cover sheet; the article itself starts after "Please cite this article as:".
        if (stripos($raw, 'unedited manuscript') !== false) {
            // Layout mode keeps each label and its value on one line.
            $history = self::manuscriptHistory($layout);
            $raw = self::after($raw, 'Please cite this article as:');
            $layout = self::after($layout, 'Please cite this article as:');
        }

        $lines = array_values(array_map('rtrim', explode("\n", $raw)));

        [$abstract, $keywords] = $this->abstractAndKeywords($layout);

        // Early Macedonian-language papers use a font that draws Cyrillic from
        // Latin codes ("Klu~ni zborovi" is "Клучни зборови").
        // Papers with an English abstract under a Macedonian heading stay as they are.
        if (preg_match('/\bApst(r|ar)a?kt\b|Klu~ni\s+zborovi/u', $layout) && ! self::looksEnglish((string) $abstract)) {
            $abstract = $abstract !== null ? self::macFontToCyrillic($abstract) : null;
            $keywords = array_map(self::macFontToCyrillic(...), $keywords);
        }

        // Old Latin-script papers use a YUSCII font ("Pri{tina"), and the
        // Macedonian "Primen … prifaten …" line runs on from the last affiliation.
        $affiliations = [];
        $tailHistory = null;

        foreach ($this->affiliations($lines) as $affiliation) {
            [$affiliation, $tail] = TextRepair::splitHistoryTail(TextRepair::yuscii($affiliation));
            $tailHistory ??= $tail !== null ? TextRepair::history($tail)['text'] ?? null : null;

            if ($affiliation !== '') {
                $affiliations[] = $affiliation;
            }
        }

        return [
            'pages' => $this->pages($raw),
            'doi' => $this->doi($raw),
            'type' => $this->type($lines),
            'abstract' => $abstract,
            'keywords' => $keywords,
            'affiliations' => $affiliations,
            'history' => $history ?? $this->history($raw) ?? $tailHistory,
        ];
    }

    private function text(string $pdfPath, bool $layout): string
    {
        $args = [$this->binary, '-f', '1', '-l', '4', '-enc', 'UTF-8'];

        if ($layout) {
            $args[] = '-layout';
        }

        $process = new Process([...$args, $pdfPath, '-']);
        $process->setTimeout(30)->run();

        if (! $process->isSuccessful()) {
            throw new RuntimeException("pdftotext failed for {$pdfPath}: ".trim($process->getErrorOutput()));
        }

        return $process->getOutput();
    }

    private static function normalise(string $text): string
    {
        // Ligatures and odd spaces that pdftotext passes through.
        $text = strtr($text, ['ﬁ' => 'fi', 'ﬂ' => 'fl', 'ﬀ' => 'ff', 'ﬃ' => 'ffi', 'ﬄ' => 'ffl', "\u{00A0}" => ' ', "\f" => "\n"]);

        return str_replace("\r\n", "\n", $text);
    }

    private function pages(string $text): ?string
    {
        // "Macedonian pharmaceutical bulletin, 71 (2) 3 - 11 (2025)"; older issues add a comma: "52, (1,2) 25-32".
        if (preg_match('/pharm\w*\.?\s+bull\w*\.?,?\s*\d+,?\s*\([^)]*\)\s*(\d+)\s*[-–]\s*(\d+)\s*\(\d{4}\)/iu', $text, $m)) {
            return $m[1] === $m[2] ? $m[1] : "{$m[1]}–{$m[2]}";
        }

        if (preg_match('/pharm\w*\.?\s+bull\w*\.?,?\s*\d+,?\s*\([^)]*\)\s*(\d+)\s*\(\d{4}\)/iu', $text, $m)) {
            return $m[1];
        }

        return null;
    }

    private function doi(string $text): ?string
    {
        // Only the journal's own DOI: other DOIs on the first pages belong to cited works.
        if (preg_match('#\b(10\.33320/[^\s"<>]+)#u', $text, $m)) {
            return rtrim($m[1], '.,;');
        }

        return null;
    }

    /**
     * @param  list<string>  $lines
     */
    private function type(array $lines): ?string
    {
        foreach (array_slice($lines, 0, 12) as $line) {
            if ($type = TextRepair::normalizeType($line)) {
                return $type;
            }
        }

        return null;
    }

    private function history(string $text): ?string
    {
        if (preg_match('/^\s*((?:Received|Primen)\b:?\s*.+?)\s*$/imu', $text, $m) && mb_strlen($m[1]) < 160) {
            return TextRepair::history($m[1])['text'] ?? null;
        }

        return null;
    }

    /**
     * The abstract is set full width, so the layout text keeps it in reading
     * order and shows paragraph starts as indented lines.
     *
     * @return array{0: string|null, 1: list<string>}
     */
    private function abstractAndKeywords(string $layout): array
    {
        $lines = explode("\n", $layout);

        // Everything we want sits above the body's first heading.
        foreach ($lines as $i => $line) {
            if (preg_match('/^\s*(Introduction|Background|Voved)\b/u', $line)) {
                $lines = array_slice($lines, 0, $i + 1);

                break;
            }
        }

        $start = null;

        foreach ($lines as $i => $line) {
            if (preg_match('/^\s*(Abstract|Summary|Apst(r|ar)a?kt)\s*:?\s*$/iu', $line)) {
                $start = $i + 1;

                break;
            }
        }

        $abstract = null;
        $keywordsLine = null;
        $end = count($lines);

        foreach ($lines as $i => $line) {
            if ($start !== null && $i < $start) {
                continue;
            }

            if (preg_match('/^\s*(?:Key\s*-?\s*words?|Klu~ni\s+zborovi)\s*:?\s*(.*)$/iu', $line, $m)) {
                $keywordsLine = $i;
                $end = $i;

                break;
            }
        }

        if ($start !== null) {
            $paragraphs = [];
            $current = '';

            for ($i = $start; $i < $end; $i++) {
                $line = $lines[$i];
                $trimmed = trim($line);

                if ($keywordsLine === null && preg_match('/^(Introduction|Background|Voved)\b/u', $trimmed)) {
                    break;
                }

                if ($trimmed === '') {
                    if ($current !== '' && count($paragraphs) + 1 > 0 && $i + 1 < $end && trim($lines[$i + 1] ?? '') === '') {
                        // Two blank lines: the abstract has ended.
                        break;
                    }

                    continue;
                }

                $indented = (bool) preg_match('/^\s{3,}\S/u', $line);

                if ($indented && $current !== '') {
                    $paragraphs[] = $current;
                    $current = '';
                }

                $current = self::joinLine($current, $trimmed);
            }

            if ($current !== '') {
                $paragraphs[] = $current;
            }

            $abstract = $paragraphs === [] ? null : implode("\n\n", $paragraphs);

            // A stray running header or a body column means we read too far.
            if ($abstract !== null && (mb_strlen($abstract) < 80 || mb_strlen($abstract) > 6000)) {
                $abstract = null;
            }
        }

        return [$abstract, $keywordsLine !== null ? $this->keywords($lines, $keywordsLine) : []];
    }

    /**
     * @param  list<string>  $lines
     * @return list<string>
     */
    private function keywords(array $lines, int $index): array
    {
        preg_match('/^\s*(?:Key\s*-?\s*words?|Klu~ni\s+zborovi)\s*:?\s*(.*)$/iu', $lines[$index], $m);
        $text = trim($m[1]);

        // Continuation lines until a blank line or the body starts.
        for ($i = $index + 1; $i < min(count($lines), $index + 4); $i++) {
            $next = trim($lines[$i]);

            if ($next === '' || preg_match('/^(Introduction|Background)\b/u', $next) || mb_strlen($lines[$i]) - mb_strlen(ltrim($lines[$i])) > 20) {
                break;
            }

            $text = self::joinLine($text, $next);
        }

        // Two-column body text can trail on the same line: cut at a wide gap.
        $text = (string) preg_split('/\s{4,}/u', $text)[0];

        $words = preg_split('/\s*[,;]\s*/u', rtrim($text, '. ')) ?: [];
        $words = array_map(fn (string $w) => trim($w, " .\t"), $words);

        return array_values(array_filter($words, fn (string $w) => $w !== '' && mb_strlen($w) <= 80));
    }

    /**
     * The block between the author line(s) and "Received"/"Abstract".
     *
     * @param  list<string>  $lines
     * @return list<string>
     */
    private function affiliations(array $lines): array
    {
        $stop = null;

        foreach ($lines as $i => $line) {
            if (preg_match('/^\s*(Received|Primen|Abstract|Summary|Apst(r|ar)a?kt|Апстракт|Introduction|Background|Voved)\b/iu', $line)) {
                $stop = $i;

                break;
            }
        }

        if ($stop === null) {
            return [];
        }

        // Skip the running header: start after the article-type line when there is one.
        $base = 0;

        foreach (array_slice($lines, 0, min($stop, 15), true) as $i => $line) {
            if (TextRepair::isType($line)) {
                $base = $i + 1;

                break;
            }
        }

        // Authors carry affiliation marks ("Ali1*,") or the corresponding-author star.
        $authorsEnd = null;

        for ($i = $base; $i < $stop; $i++) {
            if (preg_match('/\p{L}[\d¹²³⁴⁵⁶⁷⁸⁹]{1,2}\*?(,|\s|$)|\p{L}\*(,|\s|$)/u', $lines[$i])) {
                $authorsEnd = $i;
            }
        }

        $first = $authorsEnd !== null ? $authorsEnd + 1 : null;

        if ($first === null) {
            for ($i = $base + 1; $i < $stop; $i++) {
                if (preg_match(self::AFFILIATION_WORDS, $lines[$i])) {
                    $first = $i;

                    break;
                }
            }
        }

        if ($first === null) {
            return [];
        }

        $items = [];
        $current = '';

        for ($i = $first; $i < $stop; $i++) {
            $line = trim($lines[$i]);

            // Blank lines and bare affiliation marks ("1", "2,3") separate entries.
            if ($line === '' || preg_match('/^[\d¹²³⁴⁵⁶⁷⁸⁹*,\s]{1,6}$/u', $line)) {
                continue;
            }

            if (str_starts_with($line, '*') || str_contains($line, '@')) {
                continue;
            }

            // Leading mark ("²Medicines and ..."), but not a postal code ("1000 Skopje").
            $line = (string) preg_replace('/^[\d¹²³⁴⁵⁶⁷⁸⁹]{1,2}(?=\s*\p{Lu})/u', '', $line);
            $line = trim($line);

            if ($current !== '' && self::startsNewAffiliation($current, $line)) {
                $items[] = $current;
                $current = '';
            }

            $current = self::joinLine($current, $line);
        }

        if ($current !== '') {
            $items[] = $current;
        }

        $items = array_values(array_unique(array_filter(
            $items,
            fn (string $item) => mb_strlen($item) >= 8 && mb_strlen($item) <= 400 && preg_match('/\p{L}{3}/u', $item),
        )));

        return count($items) <= 15 ? $items : [];
    }

    /**
     * Author names as printed under the title. Needs the known title to tell
     * where the title's lines end.
     *
     * @return list<string>
     */
    public function authors(string $raw, string $title): array
    {
        $raw = self::normalise($raw);

        if (stripos($raw, 'unedited manuscript') !== false) {
            $raw = self::after($raw, 'Please cite this article as:');
        }

        $lines = array_values(array_map('trim', explode("\n", $raw)));
        $letters = fn (string $s) => (string) preg_replace('/[^\p{L}\p{N}]+/u', '', mb_strtolower($s));
        $target = $letters($title);

        if ($target === '') {
            return [];
        }

        // Find where the title starts, then consume lines while they still spell it.
        foreach ($lines as $i => $line) {
            $chunk = $letters($line);

            if ($chunk === '' || ! str_starts_with($target, $chunk)) {
                continue;
            }

            $seen = $chunk;
            $j = $i + 1;

            while ($j < count($lines) && strlen($seen) < strlen($target)) {
                $next = $letters($lines[$j]);

                if ($next !== '' && ! str_starts_with($target, $seen.$next)) {
                    break;
                }

                $seen .= $next;
                $j++;
            }

            if (strlen($seen) < strlen($target) * 0.9) {
                continue;
            }

            // Author lines follow until a bare mark, an affiliation or a heading.
            $names = '';

            for ($k = $j; $k < min(count($lines), $j + 8); $k++) {
                $line = $lines[$k];

                if ($line === '' && $names === '') {
                    continue;
                }

                if ($line === '' || preg_match('/^[\d¹²³⁴⁵⁶⁷⁸⁹*,\s]{1,6}$/u', $line) || preg_match('/^[\d¹²³⁴⁵⁶⁷⁸⁹]{1,2}\s*\p{Lu}/u', $line)
                    || preg_match(self::AFFILIATION_WORDS, $line) || preg_match('/^(Received|Abstract|Introduction|Background)\b/iu', $line)) {
                    break;
                }

                // A line not ending in a comma continues the last name ("Ana Poceva" / "Panovska").
                $names = $names === '' ? $line : $names.' '.$line;
            }

            // Affiliation marks also separate names when a comma is missing ("Donev1 Irena").
            $names = (string) preg_replace('/(?<=\p{L})[\d¹²³⁴⁵⁶⁷⁸⁹]{1,2}(?:,[\d¹²³⁴⁵⁶⁷⁸⁹]{1,2})*\*?(?=[\s,]|$)|(?<=\p{L})\*(?=[\s,]|$)/u', ',', $names);
            $parts = preg_split('/\s*,\s*|\s+and\s+/u', $names) ?: [];
            $parts = array_map(fn ($n) => IssueContentParser::fixMixedScript(trim((string) preg_replace('/\s+/u', ' ', $n), " .\t")), $parts);

            return array_values(array_filter($parts, fn ($n) => $n !== ''));
        }

        return [];
    }

    /**
     * Whether a parsed author list looks like people's names only (no
     * companies, streets or body text), so it can be trusted over the website.
     *
     * @param  list<string>  $names
     */
    public static function looksLikeNames(array $names): bool
    {
        if ($names === [] || count($names) > 40) {
            return false;
        }

        foreach ($names as $name) {
            $words = preg_split('/\s+/u', $name) ?: [];

            if (count($words) < 2 || count($words) > 5 || preg_match('/\d|@|[;:()]/u', $name)) {
                return false;
            }

            foreach ($words as $word) {
                // Every word capitalised (initials and particles like "De", "van" aside).
                if (! preg_match('/^(\p{Lu}[\p{L}\'’.-]*|van|von|der|de|da|del|di|la|le)$/u', $word)) {
                    return false;
                }
            }

            if (preg_match('/\b(AD|DOO|DOOEL|Ltd|LLC|Inc|GmbH|Blvd|Str|Street|University|Faculty|Institute|Pharmaceuticals?|Hospital|Clinic|Republic|Macedonia|Skopje|Makedonski)\b/u', $name)) {
                return false;
            }
        }

        return true;
    }

    private static function startsNewAffiliation(string $current, string $next): bool
    {
        if (preg_match('/[,\-–(&]$|\b(and|of|for|in)$/u', $current) || preg_match('/^[\p{Ll}\d]/u', $next)) {
            return false;
        }

        return (bool) preg_match('/(^|\s)('.self::COUNTRIES.')\.?$/iu', $current)
            || (bool) preg_match('/^(Faculty|Universit|Univerzitet|Fakultet|Institut|Department|Dept\.|Hospital|Clinic|Cent(er|re)|Laborator|School|Academy|Division|Unit|Medicines|PHI|PZU|JZU)/u', $next);
    }

    private static function after(string $text, string $marker): string
    {
        $position = stripos($text, $marker);

        return $position === false ? $text : substr($text, $position + strlen($marker));
    }

    private static function manuscriptHistory(string $text): ?string
    {
        $received = preg_match('/Received date:[ \t]*(\S.*)/iu', $text, $r) ? trim($r[1]) : '';
        $accepted = preg_match('/Accepted date:[ \t]*(\S.*)/iu', $text, $a) ? trim($a[1]) : '';

        $parts = array_filter([
            $received !== '' ? "Received: {$received}" : null,
            $accepted !== '' ? "Accepted: {$accepted}" : null,
        ]);

        return $parts === [] ? null : implode('; ', $parts);
    }

    /** Text set in a "MAC C" font, in real Cyrillic letters. */
    public static function macFontToCyrillic(string $text): string
    {
        return strtr($text, self::MAC_FONT);
    }

    /** Whether Latin text reads as English (so it is not a "MAC C" Cyrillic encoding). */
    private static function looksEnglish(string $text): bool
    {
        return preg_match_all('/\b(the|and|of|in|is|with|for|was|were|to)\b/u', $text) >= 3;
    }

    /** Joins a wrapped line, undoing end-of-line hyphenation ("gingi-" + "va"). */
    private static function joinLine(string $current, string $next): string
    {
        if ($current === '') {
            return $next;
        }

        if (preg_match('/\p{Ll}-$/u', $current) && preg_match('/^\p{Ll}/u', $next)) {
            return mb_substr($current, 0, -1).$next;
        }

        return $current.' '.$next;
    }
}
