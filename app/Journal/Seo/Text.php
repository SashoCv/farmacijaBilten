<?php

namespace App\Journal\Seo;

/**
 * Small text helpers for metadata: plain text from sanitised HTML, excerpts
 * cut on a word boundary, and strings made safe for XML 1.0.
 */
final class Text
{
    /**
     * Translated string (the key itself when the translation is not a string).
     *
     * @param  array<string, mixed>  $replace
     */
    public static function t(string $key, array $replace = []): string
    {
        $value = __($key, $replace);

        return is_string($value) ? $value : $key;
    }

    /**
     * Pluralised translated string.
     *
     * @param  array<string, mixed>  $replace
     */
    public static function choice(string $key, int $count, array $replace = []): string
    {
        return trans_choice($key, $count, $replace);
    }

    /** Plain text from HTML, with entities decoded and whitespace collapsed. */
    public static function plain(?string $html): string
    {
        if ($html === null || $html === '') {
            return '';
        }

        // Keep words in adjacent block elements apart ("<p>a</p><p>b</p>" => "a b").
        $html = preg_replace('#<(br|/p|/div|/li|/h[1-6]|/td|/tr)\b[^>]*>#i', '$0 ', $html) ?? $html;
        $text = html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');

        return trim(preg_replace('/\s+/u', ' ', $text) ?? $text);
    }

    /**
     * At most $limit characters, cut at the last word boundary and ended with
     * an ellipsis when shortened.
     */
    public static function excerpt(?string $text, int $limit = 155): string
    {
        $text = self::plain($text);

        if (mb_strlen($text) <= $limit) {
            return $text;
        }

        $cut = mb_substr($text, 0, $limit);
        $space = mb_strrpos($cut, ' ');

        if ($space !== false && $space > $limit * 0.6) {
            $cut = mb_substr($cut, 0, $space);
        }

        return rtrim($cut, " \t\n\r\0\x0B,;:.–-").'…';
    }

    /**
     * Removes characters that XML 1.0 forbids (C0 controls other than tab,
     * newline and carriage return; lone surrogates; U+FFFE/U+FFFF), which some
     * imported PDF text contains and which would make a feed unparsable.
     */
    public static function xml(?string $text): string
    {
        if ($text === null || $text === '') {
            return '';
        }

        if (! mb_check_encoding($text, 'UTF-8')) {
            $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        }

        return preg_replace('/[^\x{9}\x{A}\x{D}\x{20}-\x{D7FF}\x{E000}-\x{FFFD}\x{10000}-\x{10FFFF}]/u', '', $text) ?? '';
    }
}
