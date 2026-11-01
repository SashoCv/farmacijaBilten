<?php

namespace App\Journal\Import;

use Illuminate\Support\Carbon;

/**
 * Repairs for text damaged by legacy fonts, encodings and typing habits in the
 * journal's PDFs and old website. Used by the importer (so new imports come in
 * clean) and by `journal:repair-text` (for data already in the database).
 *
 * Every function is pure and idempotent: running it on repaired text returns
 * the text unchanged.
 */
final class TextRepair
{
    /**
     * Article types as printed in the PDFs (lower case, after YUSCII repair)
     * => the journal's own name for the type.
     */
    private const TYPES = [
        'original scientific paper' => 'Original scientific paper',
        'original paper' => 'Original scientific paper',
        'original research paper' => 'Original scientific paper',
        'original article' => 'Original scientific paper',
        'research article' => 'Original scientific paper',
        'review paper' => 'Review paper',
        'review article' => 'Review paper',
        'review' => 'Review paper',
        'mini review' => 'Review paper',
        'mini-review' => 'Review paper',
        'short communication' => 'Short communication',
        'short paper' => 'Short communication',
        'professional paper' => 'Professional paper',
        'proffesional paper' => 'Professional paper',
        // "Stručen trud" / "Стручен труд" is Macedonian for "professional paper".
        'stručen trud' => 'Professional paper',
        'стручен труд' => 'Professional paper',
        'case report' => 'Case study',
        'case study' => 'Case study',
        'editorial' => 'Editorial',
        'letter to the editor' => 'Letter to the editor',
        'technical note' => 'Technical note',
        'commentary' => 'Commentary',
    ];

    /**
     * Croatian/Macedonian YUSCII (7-bit) codes for Latin letters with diacritics.
     */
    private const YUSCII_LOWER = ['~' => 'č', '}' => 'ć', '{' => 'š', '`' => 'ž', '|' => 'đ'];

    private const YUSCII_UPPER = ['^' => 'Č', ']' => 'Ć', '[' => 'Š', '@' => 'Ž', '\\' => 'Đ'];

    /** Cyrillic letters that look like Latin ones. */
    private const HOMOGLYPHS = [
        'А' => 'A', 'В' => 'B', 'Е' => 'E', 'К' => 'K', 'М' => 'M', 'Н' => 'H', 'О' => 'O',
        'Р' => 'P', 'С' => 'C', 'Т' => 'T', 'Х' => 'X', 'Ј' => 'J', 'Ѕ' => 'S', 'І' => 'I',
        'а' => 'a', 'е' => 'e', 'о' => 'o', 'р' => 'p', 'с' => 'c', 'у' => 'y', 'х' => 'x',
        'ј' => 'j', 'ѕ' => 's', 'і' => 'i', 'к' => 'k',
    ];

    /** English months, plus the Macedonian ones in Latin and Cyrillic script. */
    private const MONTHS = [
        'january' => 1, 'february' => 2, 'march' => 3, 'april' => 4, 'may' => 5, 'june' => 6,
        'july' => 7, 'august' => 8, 'september' => 9, 'october' => 10, 'november' => 11, 'december' => 12,
        'januari' => 1, 'fevruari' => 2, 'mart' => 3, 'maj' => 5, 'juni' => 6, 'juli' => 7,
        'avgust' => 8, 'septemvri' => 9, 'oktomvri' => 10, 'noemvri' => 11, 'dekemvri' => 12,
        'јануари' => 1, 'февруари' => 2, 'март' => 3, 'април' => 4, 'мај' => 5, 'јуни' => 6,
        'јули' => 7, 'август' => 8, 'септември' => 9, 'октомври' => 10, 'ноември' => 11, 'декември' => 12,
        'jan' => 1, 'feb' => 2, 'mar' => 3, 'apr' => 4, 'jun' => 6, 'jul' => 7, 'aug' => 8,
        'sep' => 9, 'sept' => 9, 'oct' => 10, 'nov' => 11, 'dec' => 12,
    ];

    /** Frequent English words as they look after a Latin-to-Cyrillic font mapping. */
    private const ENGLISH_IN_CYRILLIC = [
        'тхе', 'анд', 'оф', 'ин', 'ис', 'фор', 'њитх', 'то', 'ас', 'бѕ', 'ан', 'аре', 'њас', 'њере',
        'тхат', 'тхис', 'фром', 'он', 'ат', 'беен', 'хас', 'њхицх', 'тхеир', 'бе', 'нот',
    ];

    /** Frequent Macedonian words (which never occur in the mapped English). */
    private const MACEDONIAN_WORDS = [
        'и', 'на', 'во', 'за', 'со', 'од', 'се', 'што', 'да', 'кај', 'како', 'или', 'при', 'по', 'кои', 'беше', 'се', 'ги', 'не',
    ];

    /**
     * The journal's name for an article type ("Review" => "Review paper"),
     * or null when the text is not a known type.
     */
    public static function normalizeType(?string $type): ?string
    {
        if ($type === null) {
            return null;
        }

        $key = mb_strtolower(trim((string) preg_replace('/\s+/u', ' ', self::yuscii($type))));

        return self::TYPES[$key] ?? null;
    }

    /** Whether the line is an article-type label ("Stru~en trud", "Original paper"). */
    public static function isType(string $line): bool
    {
        return self::normalizeType($line) !== null;
    }

    /**
     * Restores č ć š ž đ in Latin text set in a 7-bit YUSCII font
     * ("Pri{tina" => "Priština", "^lenovi" => "Članovi"). Only touches the
     * codes next to letters, so brackets, e-mail addresses and "~20%" survive;
     * a lone "^" after a word is a footnote mark and is dropped.
     */
    public static function yuscii(string $text): string
    {
        // Footnote mark after a name ("Gegovska^,").
        $text = (string) preg_replace('/(?<=\p{L})\^(?=[\s,;.]|$)/u', '', $text);

        // Only text that clearly uses the font ("klini~ka", "Labudovi}"): a lowercase
        // code inside or at the end of a word. Brackets in modern text stay brackets.
        if (! preg_match('/\p{Ll}[~{}`|](?:\p{Ll}|[\s,.;:)"“”]|$)/u', $text)) {
            return $text;
        }

        return (string) preg_replace_callback(
            '/\S+/u',
            function (array $m): string {
                $word = $m[0];

                // E-mail addresses and URLs keep their characters.
                if (preg_match('/@[\w-]+\.|:\/\/|^www\./u', $word)) {
                    return $word;
                }

                $word = (string) preg_replace_callback(
                    '/(?<=\p{L})[~}{`|]|[~}{`|](?=\p{Ll})/u',
                    fn (array $c) => self::YUSCII_LOWER[$c[0]],
                    $word,
                );

                return (string) preg_replace_callback(
                    '/[\^\]\[@\\\\](?=\p{L})|(?<=\p{Lu})[\^\]\[@\\\\](?=\p{Lu}|\b)/u',
                    fn (array $c) => self::YUSCII_UPPER[$c[0]],
                    $word,
                );
            },
            $text,
        );
    }

    /**
     * Converts Cyrillic look-alike letters inside Latin words ("Таtјаnа",
     * "ТG+GG") and single look-alike letters standing alone in Latin text.
     */
    public static function homoglyphs(string $text): string
    {
        $text = (string) preg_replace_callback(
            '/[\p{L}\p{N}+\-]+/u',
            fn (array $m) => preg_match('/\p{Latin}/u', $m[0]) && preg_match('/\p{Cyrillic}/u', $m[0])
                ? strtr($m[0], self::HOMOGLYPHS)
                : $m[0],
            $text,
        );

        if (self::cyrillicShare($text) > 0.05) {
            return $text;
        }

        // A lone "а", "С" or "ТТ" in English text (stray key presses on a Cyrillic layout).
        return (string) preg_replace_callback(
            '/(?<![\p{L}])[АВЕКМНОРСТХЈЅІаеорсухјѕік]{1,3}(?![\p{L}])/u',
            fn (array $m) => strtr($m[0], self::HOMOGLYPHS),
            $text,
        );
    }

    /**
     * Whether Cyrillic text is really English typed through a Macedonian
     * font that maps Latin keys to Cyrillic ("Тхе интродуцтион оф ...").
     */
    public static function isTransliteratedEnglish(string $text): bool
    {
        if (self::cyrillicShare($text) <= 0.5) {
            return false;
        }

        $words = preg_split('/[^\p{L}]+/u', mb_strtolower($text), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $counts = array_count_values($words);
        $english = array_sum(array_intersect_key($counts, array_flip(self::ENGLISH_IN_CYRILLIC)));
        $macedonian = array_sum(array_intersect_key($counts, array_flip(self::MACEDONIAN_WORDS)));

        return $english >= 3 && $macedonian * 10 <= $english;
    }

    /**
     * Undoes the Macedonian "MAC C" font mapping (the reverse of
     * PdfMetadataExtractor::macFontToCyrillic): "Тхе ХПЛЦ" => "The HPLC".
     */
    public static function cyrillicToLatinKeys(string $text): string
    {
        static $map = null;
        $map ??= array_filter(
            array_flip(PdfMetadataExtractor::MAC_FONT),
            // Only letters; the punctuation codes (~ { } ...) never appear in English abstracts.
            fn (string $latin) => (bool) preg_match('/^[A-Za-z]$/', $latin),
        );

        return strtr($text, $map);
    }

    /**
     * Typing habits in English text: a backtick for an apostrophe ("patients`",
     * "EMA`s"), for a prime ("4`-chloro") and "~" for "approximately".
     */
    public static function typography(string $text): string
    {
        $text = (string) preg_replace('/(?<=\p{L})`(?=\p{L}|\s|[.,;:)]|$)/u', '’', $text);
        $text = (string) preg_replace('/(?<=\d)`/u', '′', $text);

        // "~21%": U+223C TILDE OPERATOR is the typographic form of the same sign.
        return (string) preg_replace('/~(?=\s?[\d.])/u', '∼', $text);
    }

    /**
     * Page furniture caught in an abstract that runs over a page break: the
     * corresponding-author footnote, the page number and layout spacing.
     */
    public static function cleanAbstract(string $text): string
    {
        $text = (string) preg_replace('/\s*\*?\s*Corresponding\s+author\b[^\n]*?\S+@\S+(?:\s+\d{1,3}(?=\s|$))?/iu', ' ', $text);
        $text = (string) preg_replace('/[ \t\x{00A0}]{2,}/u', ' ', $text);

        return trim((string) preg_replace('/ *\n */u', "\n", $text));
    }

    /** "en" or "mk": "mk" when more than half of the letters are Cyrillic. */
    public static function lang(string $text): string
    {
        return self::cyrillicShare($text) > 0.5 ? 'mk' : 'en';
    }

    public static function cyrillicShare(string $text): float
    {
        $letters = preg_match_all('/\p{L}/u', $text);

        return $letters > 0 ? preg_match_all('/\p{Cyrillic}/u', $text) / $letters : 0.0;
    }

    /**
     * Rich title: keeps i/sup/sub only, and writes isotope labels as
     * superscripts ("[18F]NaF", "[ 18 F]NaF" => "[<sup>18</sup>F]NaF").
     * Returns null when the title has no markup worth keeping.
     */
    public static function richTitle(string $html): ?string
    {
        $html = (string) preg_replace('#<(/?)em\b[^>]*>#i', '<$1i>', $html);
        $html = strip_tags($html, '<i><sup><sub>');
        $html = (string) preg_replace('#<(i|sup|sub)\b[^>]*>#i', '<$1>', $html);
        // Empty or whitespace-only tags.
        $html = (string) preg_replace('#<(i|sup|sub)>(\s*)</\1>#u', '$2', $html);
        $html = (string) preg_replace('#</(i|sup|sub)>(\s*)<\1>#u', '$2', $html);

        // Spaces belong outside the tags; italic punctuation ("L<i>.</i>") is not italic.
        do {
            $before = $html;
            $html = (string) preg_replace(['#(\s+)</(i|sup|sub)>#u', '#<(i|sup|sub)>(\s+)#u'], ['</$2>$1', '$2<$1>'], $html);
        } while ($html !== $before);

        $html = (string) preg_replace('#<i>([\s\p{P}]*)</i>#u', '$1', $html);

        $html = (string) preg_replace(
            '/\[\s*(?:<sup>)?\s*(\d{1,3})\s*(?:<\/sup>)?\s*([A-Z][a-z]?)\s*\]/u',
            '[<sup>$1</sup>$2]',
            $html,
        );

        $html = trim((string) preg_replace('/\s+/u', ' ', $html));

        return preg_match('#<(i|sup|sub)>#', $html) ? $html : null;
    }

    /** Plain text of a rich title ("[<sup>18</sup>F]NaF" => "[18F]NaF"). */
    public static function plainTitle(string $html): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5)));
    }

    /**
     * A "Received … accepted …" (or Macedonian "Primen … prifaten …") line
     * in a canonical English form, with its dates.
     *
     * @return array{text: string, received: array{date: string, precision: string}|null, accepted: array{date: string, precision: string}|null}|null
     */
    public static function history(?string $text): ?array
    {
        if ($text === null || trim($text) === '') {
            return null;
        }

        $text = trim((string) preg_replace('/\s+/u', ' ', self::yuscii($text)));

        $received = preg_match('/\b(?:received|primen|примен)\b\s*(?:date)?\s*:?\s*(.+?)\s*(?=[,;.]?\s*\b(?:accepted|prifaten|прифатен|revised)\b|$)/iu', $text, $r)
            ? self::historyDate($r[1]) : null;
        $accepted = preg_match('/\b(?:accepted|prifaten|прифатен)\b\s*(?:date)?\s*:?\s*(.+?)\s*[,;.]?\s*$/iu', $text, $a)
            ? self::historyDate($a[1]) : null;

        if ($received === null && $accepted === null) {
            return null;
        }

        $parts = array_filter([
            $received ? 'Received: '.$received['label'] : null,
            $accepted ? 'Accepted: '.$accepted['label'] : null,
        ]);

        $strip = fn (?array $d) => $d ? ['date' => $d['date'], 'precision' => $d['precision']] : null;

        return ['text' => implode('; ', $parts), 'received' => $strip($received), 'accepted' => $strip($accepted)];
    }

    /**
     * Strips a trailing "Primen … prifaten …" / "Received … accepted …" from
     * an affiliation. Returns [affiliation, history line or null].
     *
     * @return array{0: string, 1: string|null}
     */
    public static function splitHistoryTail(string $affiliation): array
    {
        if (preg_match('/^(.*?)[\s,.;]*\b((?:Primen|Received|Примен)\b.*)$/su', $affiliation, $m) && self::history($m[2]) !== null) {
            return [rtrim($m[1], " ,;\t"), $m[2]];
        }

        return [$affiliation, null];
    }

    /**
     * "April 2006", "6 December 2015", "June2016", "2006", "05.03.2024".
     *
     * @return array{date: string, precision: string, label: string}|null
     */
    private static function historyDate(string $value): ?array
    {
        $value = trim($value, " \t,;.");

        if (preg_match('/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})$/', $value, $m) && checkdate((int) $m[2], (int) $m[1], (int) $m[3])) {
            $date = Carbon::create((int) $m[3], (int) $m[2], (int) $m[1]);

            return ['date' => $date->toDateString(), 'precision' => 'day', 'label' => $date->format('j F Y')];
        }

        if (preg_match('/^(?:(\d{1,2})\s*)?(\p{L}+)\.?\s*(?:(\d{1,2}),?\s*)?(\d{4})$/u', $value, $m)) {
            $month = self::MONTHS[mb_strtolower($m[2])] ?? null;
            $day = (int) ($m[1] !== '' ? $m[1] : $m[3]);
            $year = (int) $m[4];

            if ($month === null) {
                return null;
            }

            if ($day > 0 && checkdate($month, $day, $year)) {
                $date = Carbon::create($year, $month, $day);

                return ['date' => $date->toDateString(), 'precision' => 'day', 'label' => $date->format('j F Y')];
            }

            $date = Carbon::create($year, $month, 1);

            return ['date' => $date->toDateString(), 'precision' => 'month', 'label' => $date->format('F Y')];
        }

        if (preg_match('/^(\d{4})$/', $value, $m)) {
            return ['date' => "{$m[1]}-01-01", 'precision' => 'year', 'label' => $m[1]];
        }

        return null;
    }
}
