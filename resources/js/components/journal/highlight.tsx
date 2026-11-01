import { Fragment } from 'react';
import type { ReactNode } from 'react';

/*
 * Script- and spelling-neutral matching for search highlights. `fold()` is the
 * same transformation as App\Journal\Search\Folder::fold() on the server, so a
 * search for "Мирчевска" marks "Mirchevska" and "Mirčevska" in the results:
 *
 *  1. NFC, lower case;
 *  2. Cyrillic to Latin, and the Latin letters that do not decompose;
 *  3. NFKD, accents dropped (č→c, ¹⁸→18);
 *  4. anything that is not a letter or digit becomes one space;
 *  5. ch/sh/zh → c/s/z and kj/gj/dj → k/g/d.
 *
 * Keep the two in step (tests/Feature/SearchTest.php lists the cases).
 */

const MAP: Record<string, string> = {
    // Macedonian
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'g',
    д: 'd',
    ѓ: 'gj',
    е: 'e',
    ж: 'zh',
    з: 'z',
    ѕ: 'dz',
    и: 'i',
    ј: 'j',
    к: 'k',
    л: 'l',
    љ: 'lj',
    м: 'm',
    н: 'n',
    њ: 'nj',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    ќ: 'kj',
    у: 'u',
    ф: 'f',
    х: 'h',
    ц: 'c',
    ч: 'ch',
    џ: 'dz',
    ш: 'sh',
    ѐ: 'e',
    ѝ: 'i',
    // Serbian, Bulgarian, Russian, Ukrainian
    ђ: 'dj',
    ћ: 'c',
    й: 'j',
    ё: 'e',
    щ: 'sht',
    ъ: '',
    ы: 'y',
    ь: '',
    э: 'e',
    ю: 'ju',
    я: 'ja',
    є: 'je',
    і: 'i',
    ї: 'ji',
    ґ: 'g',
    // Latin letters without a decomposition
    đ: 'dj',
    ß: 'ss',
    æ: 'ae',
    œ: 'oe',
    ø: 'o',
    ł: 'l',
    ı: 'i',
    þ: 'th',
};

const MARK = /\p{M}/u;
const WORD = /[\p{L}\p{N}]/u;

type FoldedText = {
    /** The folded text. */
    text: string;
    /** For each folded character, the [start, end) code-unit range it came from. */
    from: number[];
    to: number[];
};

/** Folds `source` (already NFC) and remembers where each folded character came from. */
function foldWithOffsets(source: string): FoldedText {
    let text = '';
    const from: number[] = [];
    const to: number[] = [];
    // The last letter, while it can still swallow an "h" or "j" (step 5).
    let armed: string | null = null;
    let offset = 0;

    for (const char of source) {
        const start = offset;
        const end = (offset += char.length);
        const mapped = MAP[char.toLowerCase()] ?? char.toLowerCase();

        for (const part of mapped.normalize('NFKD')) {
            if (MARK.test(part)) {
                // Combining marks fold away; they belong to the previous letter.
                if (to.length > 0) {
                    to[to.length - 1] = end;
                }

                continue;
            }

            if (!WORD.test(part)) {
                if (text === '') {
                    continue;
                }

                if (text.endsWith(' ')) {
                    to[to.length - 1] = end;
                } else {
                    text += ' ';
                    from.push(start);
                    to.push(end);
                }

                armed = null;
                continue;
            }

            if (
                (part === 'h' && armed !== null && 'csz'.includes(armed)) ||
                (part === 'j' && armed !== null && 'kgd'.includes(armed))
            ) {
                to[to.length - 1] = end;
                armed = null;
                continue;
            }

            text += part;
            from.push(start);
            to.push(end);
            armed = 'csz kgd'.includes(part) ? part : null;
        }
    }

    if (text.endsWith(' ')) {
        text = text.slice(0, -1);
        from.pop();
        to.pop();
    }

    return { text, from, to };
}

/** The folded form of a text, as stored in the server's search index. */
export function fold(text: string): string {
    return foldWithOffsets(text.normalize('NFC')).text;
}

/** Search terms from a query: whitespace-separated, at least 2 characters. */
export function searchTerms(query: string): string[] {
    return [
        ...new Set(
            query
                .trim()
                .split(/\s+/u)
                .filter((term) => term.length >= 2),
        ),
    ].slice(0, 8);
}

/**
 * Ranges of `source` that match any of the terms, widened to whole words,
 * in source offsets. Ranges
 * that touch, or are separated only by spaces or punctuation, are merged, so
 * "Glavas-Dodov" or "drug delivery" gets one mark.
 */
function matchRanges(source: string, terms: string[]): [number, number][] {
    const needles = [...new Set(terms.map(fold))].filter(
        (term) => term.length >= 2,
    );

    if (needles.length === 0) {
        return [];
    }

    const folded = foldWithOffsets(source);
    const hits: [number, number][] = [];

    for (const needle of needles) {
        let at = folded.text.indexOf(needle);

        while (at !== -1) {
            // Mark whole words: "method" marks all of "methods".
            let start = at;
            let end = at + needle.length;

            while (start > 0 && folded.text[start - 1] !== ' ') {
                start--;
            }

            while (end < folded.text.length && folded.text[end] !== ' ') {
                end++;
            }

            hits.push([start, end]);
            at = folded.text.indexOf(needle, end);
        }
    }

    hits.sort((a, b) => a[0] - b[0] || b[1] - a[1]);

    const merged: [number, number][] = [];

    for (const [start, end] of hits) {
        const last = merged.at(-1);

        // Overlapping, touching, or one folded space (any run of non-letters) apart.
        if (
            last &&
            (start <= last[1] ||
                (start === last[1] + 1 && folded.text[last[1]] === ' '))
        ) {
            last[1] = Math.max(last[1], end);
        } else {
            merged.push([start, end]);
        }
    }

    return merged.map(([start, end]) => [
        folded.from[start],
        folded.to[end - 1],
    ]);
}

/**
 * Marks every occurrence of the search terms in `text`, whatever the script,
 * accents or digraph spelling, with adjacent matches merged into one <mark>.
 */
export function Highlight({ text, terms }: { text: string; terms: string[] }) {
    const source = text.normalize('NFC');
    const ranges = matchRanges(source, terms);

    if (ranges.length === 0) {
        return text;
    }

    const parts: ReactNode[] = [];
    let cursor = 0;

    for (const [start, end] of ranges) {
        if (start > cursor) {
            parts.push(
                <Fragment key={`t${cursor}`}>
                    {source.slice(cursor, start)}
                </Fragment>,
            );
        }

        parts.push(
            <mark
                key={`m${start}`}
                className="rounded-[3px] bg-[#FCEBB6] [box-decoration-break:clone] px-[2px] text-inherit"
            >
                {source.slice(start, end)}
            </mark>,
        );
        cursor = end;
    }

    if (cursor < source.length) {
        parts.push(
            <Fragment key={`t${cursor}`}>{source.slice(cursor)}</Fragment>,
        );
    }

    return parts;
}

/**
 * A short excerpt of `text` around the first matching term, or null when
 * nothing matches. Matching is folded like Highlight.
 */
export function snippet(
    text: string | null,
    terms: string[],
    radius = 110,
): string | null {
    if (!text) {
        return null;
    }

    const source = text.normalize('NFC');
    const first = matchRanges(source, terms)[0];

    if (!first) {
        return null;
    }

    const [matchStart, matchEnd] = first;
    const start = Math.max(0, matchStart - radius);
    const end = Math.min(source.length, matchEnd + radius);
    const from = start === 0 ? 0 : source.indexOf(' ', start) + 1;
    const to = end === source.length ? end : source.lastIndexOf(' ', end);

    return `${from > 0 ? '…' : ''}${source.slice(from, to).replace(/\s+/g, ' ')}${to < source.length ? '…' : ''}`;
}
