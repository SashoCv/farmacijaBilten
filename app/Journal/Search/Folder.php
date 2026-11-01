<?php

namespace App\Journal\Search;

use Normalizer;

/**
 * Folds text to a script- and spelling-neutral "skeleton" so that one search
 * matches every way a name or word is written in this journal:
 *
 *   Мирчевска, Mirčevska, Mircevska, Mirchevska  =>  mircevska
 *   Фуштиќ, Fustik, Fushtikj                      =>  fustik
 *   АМИФОСТИН, амифостин, Amifostine              =>  amifostin…
 *
 * Steps (mirrored exactly by `fold()` in resources/js/components/journal/highlight.tsx,
 * which needs the same result to place <mark>s):
 *  1. NFC, lower case;
 *  2. Cyrillic to Latin (ш→sh, ж→zh, ч→ch, ќ→kj, ѓ→gj, џ→dz, љ→lj, њ→nj, ј→j, …)
 *     and the Latin letters that do not decompose (đ→dj, ß→ss, ł→l, …);
 *  3. compatibility decomposition (NFKD: ¹⁸→18, ﬁ→fi) and accents dropped
 *     (č→c, š→s, ž→z, é→e, ü→u);
 *  4. anything that is not a letter or digit becomes one space;
 *  5. the digraphs collapse: ch/sh/zh → c/s/z and kj/gj/dj → k/g/d, so the
 *     Macedonian, Serbo-Croatian and English spellings meet.
 */
final class Folder
{
    /** Characters mapped before accents are stripped (step 2). */
    private const MAP = [
        // Macedonian
        'а' => 'a', 'б' => 'b', 'в' => 'v', 'г' => 'g', 'д' => 'd', 'ѓ' => 'gj', 'е' => 'e',
        'ж' => 'zh', 'з' => 'z', 'ѕ' => 'dz', 'и' => 'i', 'ј' => 'j', 'к' => 'k', 'л' => 'l',
        'љ' => 'lj', 'м' => 'm', 'н' => 'n', 'њ' => 'nj', 'о' => 'o', 'п' => 'p', 'р' => 'r',
        'с' => 's', 'т' => 't', 'ќ' => 'kj', 'у' => 'u', 'ф' => 'f', 'х' => 'h', 'ц' => 'c',
        'ч' => 'ch', 'џ' => 'dz', 'ш' => 'sh', 'ѐ' => 'e', 'ѝ' => 'i',
        // Serbian, Bulgarian, Russian, Ukrainian
        'ђ' => 'dj', 'ћ' => 'c', 'й' => 'j', 'ё' => 'e', 'щ' => 'sht', 'ъ' => '', 'ы' => 'y',
        'ь' => '', 'э' => 'e', 'ю' => 'ju', 'я' => 'ja', 'є' => 'je', 'і' => 'i', 'ї' => 'ji', 'ґ' => 'g',
        // Latin letters without a decomposition
        'đ' => 'dj', 'ß' => 'ss', 'æ' => 'ae', 'œ' => 'oe', 'ø' => 'o', 'ł' => 'l', 'ı' => 'i', 'þ' => 'th',
    ];

    public static function fold(string $text): string
    {
        if ($text === '') {
            return '';
        }

        if (class_exists(Normalizer::class)) {
            $text = Normalizer::normalize($text, Normalizer::FORM_C) ?: $text;
        }

        $text = strtr(mb_strtolower($text, 'UTF-8'), self::MAP);

        if (class_exists(Normalizer::class)) {
            $text = Normalizer::normalize($text, Normalizer::FORM_KD) ?: $text;
        }

        $text = (string) preg_replace('/\p{M}+/u', '', $text);
        $text = (string) preg_replace('/[^\p{L}\p{N}]+/u', ' ', $text);
        $text = (string) preg_replace(['/([csz])h/', '/([kgd])j/'], '$1', $text);

        return trim($text);
    }

    /**
     * Drops a plural or silent ending from the last word of a folded term
     * (-ies, -es, -s, -e) so that a substring search for "amifostine" also
     * finds "amifostin", and "tablets" finds "tablet". Words shorter than 5
     * letters are left alone ("gas", "dose").
     */
    public static function stem(string $term): string
    {
        $space = strrpos($term, ' ');
        $head = $space === false ? '' : substr($term, 0, $space + 1);
        $word = $space === false ? $term : substr($term, $space + 1);

        if (strlen($word) < 5 || ! preg_match('/^[a-z]+$/', $word)) {
            return $term;
        }

        $stem = (string) preg_replace('/(?:ies|es|s|e)$/', '', $word);

        return $head.(strlen($stem) >= 4 ? $stem : $word);
    }

    /**
     * Search terms from a query, folded and stemmed: words split on whitespace, or a
     * "quoted phrase" kept whole. Terms shorter than 2 characters are dropped
     * (they would match nearly everything); at most 8 terms.
     *
     * @return list<string>
     */
    public static function terms(string $query): array
    {
        preg_match_all('/"([^"]+)"|(\S+)/u', $query, $matches, PREG_SET_ORDER);

        $terms = [];

        foreach ($matches as $match) {
            $term = self::stem(self::fold(($match[1] ?? '') !== '' ? $match[1] : ($match[2] ?? '')));

            if (mb_strlen($term) >= 2 && ! in_array($term, $terms, true)) {
                $terms[] = $term;
            }
        }

        return array_slice($terms, 0, 8);
    }
}
