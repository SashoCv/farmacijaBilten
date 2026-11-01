/*
 * Reference styles and reference-manager exports for one article.
 *
 * DOI rule (shared with App\Models\Article::citation()): a DOI known to be
 * unregistered (`doiRegistered === false`) never appears in a citation string
 * or an export, because it would not resolve.
 */
import type {
    ArticleDetail,
    ArticleSummary,
    IssueSummary,
    JournalFacts,
} from '@/types/journal';

export type CiteStyle = 'vancouver' | 'apa' | 'harvard' | 'chicago';

export const CITE_STYLES: { id: CiteStyle; label: string }[] = [
    { id: 'vancouver', label: 'Vancouver' },
    { id: 'apa', label: 'APA 7' },
    { id: 'harvard', label: 'Harvard' },
    { id: 'chicago', label: 'Chicago' },
];

export type CiteSource = {
    article: ArticleSummary & Partial<ArticleDetail>;
    issue: Pick<IssueSummary, 'slug' | 'volume' | 'number' | 'kind' | 'year'>;
    journal: Pick<JournalFacts, 'nameEn' | 'abbrev' | 'issnOnline'>;
    /** Absolute address of the article page (fallback link when there is no DOI). */
    pageUrl?: string;
};

/** A run of citation text; `italic` runs are journal names and volumes. */
export type Segment = { text: string; italic?: boolean };

/** The DOI that may be cited: null when absent or known to be unregistered. */
export function citableDoi(article: ArticleSummary): string | null {
    return article.doi && article.doiRegistered !== false ? article.doi : null;
}

/** https://doi.org/… for the citable DOI (the form that resolves). */
export function citableDoiUrl(article: ArticleSummary): string | null {
    if (!citableDoi(article)) {
        return null;
    }

    return article.doiUrl ?? `https://doi.org/${article.doi}`;
}

/* ------------------------------------------------------------------ */
/* Names                                                               */
/* ------------------------------------------------------------------ */

type Name = { given: string; family: string };

/** "Tanja Petreska Ivanovska" → given "Tanja", family "Petreska Ivanovska". */
export function splitName(name: string): Name {
    const [given = '', ...rest] = name.trim().split(/\s+/);

    return rest.length
        ? { given, family: rest.join(' ') }
        : { given: '', family: given };
}

/** "Ana-Marija" → "A.-M."; "K." → "K." */
function initials(given: string, withDots = true): string {
    return given
        .split(/\s+/)
        .filter(Boolean)
        .map((part) =>
            part
                .split('-')
                .filter(Boolean)
                .map((p) => p.charAt(0).toUpperCase() + (withDots ? '.' : ''))
                .join(withDots ? '-' : ''),
        )
        .join(withDots ? ' ' : '');
}

function inverted(name: string): string {
    const { given, family } = splitName(name);

    return given ? `${family}, ${initials(given)}` : family;
}

/** "A", "A & B", "A, B, & C" (APA 7: up to 20, then the first 19 … last). */
function apaAuthors(authors: string[]): string {
    const names = authors.map(inverted);

    if (names.length <= 1) {
        return names.join('');
    }

    if (names.length > 20) {
        return `${names.slice(0, 19).join(', ')}, … ${names.at(-1)}`;
    }

    return `${names.slice(0, -1).join(', ')}, & ${names.at(-1)}`;
}

/** "A", "A and B", "A, B and C" (Harvard, Cite Them Right). */
function harvardAuthors(authors: string[]): string {
    const names = authors.map(inverted);

    if (names.length <= 1) {
        return names.join('');
    }

    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/** "Ali, Redzep, Oliver Majstorov, and Liljana Anastasova" (Chicago 17, up to 10, else 7 et al.). */
function chicagoAuthors(authors: string[]): string {
    const list = authors.length > 10 ? authors.slice(0, 7) : authors;
    const [first, ...rest] = list;

    if (!first) {
        return '';
    }

    const { given, family } = splitName(first);
    const lead = given ? `${family}, ${given}` : family;

    if (authors.length > 10) {
        return `${[lead, ...rest].join(', ')}, et al`;
    }

    if (rest.length === 0) {
        return lead;
    }

    return `${[lead, ...rest.slice(0, -1)].join(', ')}, and ${rest.at(-1)}`;
}

/* ------------------------------------------------------------------ */
/* Parts                                                               */
/* ------------------------------------------------------------------ */

/** Ends with a full stop unless it already ends with . ? or ! */
function closed(text: string): string {
    const trimmed = text.trim();

    return /[.?!]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function title(source: CiteSource): string {
    return source.article.title.trim().replace(/\.+$/, '');
}

function hasNumber(issue: CiteSource['issue']): issue is CiteSource['issue'] & {
    number: number;
} {
    return (
        (issue.kind === 'issue' || issue.kind === 'supplement') &&
        issue.number !== null
    );
}

/** "(2)", "(Suppl. 1)" or "" */
function issuePart(issue: CiteSource['issue']): string {
    if (!hasNumber(issue)) {
        return '';
    }

    return issue.kind === 'supplement'
        ? `(Suppl. ${issue.number})`
        : `(${issue.number})`;
}

function pages(article: CiteSource['article']): string | null {
    return article.pages?.trim() || null;
}

function isRange(value: string): boolean {
    return /[–-]/.test(value);
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

function vancouver(source: CiteSource): Segment[] {
    const { article, issue, journal } = source;
    const authors = article.authors
        .map((name) => {
            const { given, family } = splitName(name);

            return given ? `${family} ${initials(given, false)}` : family;
        })
        .join(', ');
    const vol = hasNumber(issue)
        ? issue.kind === 'supplement'
            ? `${issue.volume}(Suppl ${issue.number})`
            : `${issue.volume}(${issue.number})`
        : String(issue.volume);
    const pp = pages(article);
    const doi = citableDoi(article);

    return [
        {
            text: `${authors ? `${authors}. ` : ''}${closed(title(source))} ${journal.abbrev} ${issue.year};${vol}${pp ? `:${pp}` : ''}.${doi ? ` doi: ${doi}` : ''}`,
        },
    ];
}

function apa(source: CiteSource): Segment[] {
    const { article, issue, journal } = source;
    const pp = pages(article);
    const doiUrl = citableDoiUrl(article);
    const authors = apaAuthors(article.authors);

    return [
        {
            text: `${authors ? `${closed(authors)} ` : ''}(${issue.year}). ${closed(title(source))} `,
        },
        { text: journal.nameEn, italic: true },
        { text: ', ' },
        { text: String(issue.volume), italic: true },
        {
            text: `${issuePart(issue)}${pp ? `, ${pp}` : ''}.${doiUrl ? ` ${doiUrl}` : ''}`,
        },
    ];
}

function harvard(source: CiteSource): Segment[] {
    const { article, issue, journal } = source;
    const pp = pages(article);
    const doiUrl = citableDoiUrl(article);
    const authors = harvardAuthors(article.authors);

    return [
        {
            text: `${authors ? `${authors} ` : ''}(${issue.year}) ‘${title(source)}’, `,
        },
        { text: journal.nameEn, italic: true },
        {
            text: `, ${issue.volume}${issuePart(issue)}${pp ? `, ${isRange(pp) ? 'pp.' : 'p.'} ${pp}` : ''}.${doiUrl ? ` Available at: ${doiUrl}.` : ''}`,
        },
    ];
}

function chicago(source: CiteSource): Segment[] {
    const { article, issue, journal } = source;
    const pp = pages(article);
    const doiUrl = citableDoiUrl(article);
    const authors = chicagoAuthors(article.authors);
    const number = hasNumber(issue)
        ? issue.kind === 'supplement'
            ? `, suppl. ${issue.number}`
            : `, no. ${issue.number}`
        : '';

    return [
        {
            text: `${authors ? `${closed(authors)} ` : ''}“${closed(title(source))}” `,
        },
        { text: journal.nameEn, italic: true },
        {
            text: ` ${issue.volume}${number} (${issue.year})${pp ? `: ${pp}` : ''}.${doiUrl ? ` ${doiUrl}.` : ''}`,
        },
    ];
}

const formatters: Record<CiteStyle, (source: CiteSource) => Segment[]> = {
    vancouver,
    apa,
    harvard,
    chicago,
};

export function formatCitation(
    style: CiteStyle,
    source: CiteSource,
): Segment[] {
    return formatters[style](source);
}

export function segmentsToText(segments: Segment[]): string {
    return segments.map((s) => s.text).join('');
}

function escapeHtml(text: string): string {
    return text
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

export function segmentsToHtml(segments: Segment[]): string {
    return segments
        .map((s) =>
            s.italic ? `<i>${escapeHtml(s.text)}</i>` : escapeHtml(s.text),
        )
        .join('');
}

/* ------------------------------------------------------------------ */
/* Reference-manager exports                                           */
/* ------------------------------------------------------------------ */

function citeKey(source: CiteSource): string {
    return `mpb_${source.issue.slug}_${source.article.number}`.replace(
        /[^A-Za-z0-9_]/g,
        '_',
    );
}

export function citeFile(source: CiteSource, ext: 'bib' | 'ris'): string {
    return `maced-pharm-bull-${source.issue.slug}-${source.article.number}.${ext}`;
}

function bibEscape(text: string): string {
    return text.replace(/([&%$#_])/g, '\\$1').replace(/[{}]/g, '');
}

function linkFor(source: CiteSource): string | null {
    return citableDoiUrl(source.article) ?? source.pageUrl ?? null;
}

export function toBibTeX(source: CiteSource): string {
    const { article, issue, journal } = source;
    const authors = article.authors
        .map((name) => {
            const { given, family } = splitName(name);

            return given ? `${family}, ${given}` : family;
        })
        .join(' and ');
    const pp = pages(article);
    const doi = citableDoi(article);
    const url = linkFor(source);
    const number = hasNumber(issue)
        ? issue.kind === 'supplement'
            ? `Suppl. ${issue.number}`
            : String(issue.number)
        : null;

    const fields: [string, string | null][] = [
        ['author', authors ? bibEscape(authors) : null],
        ['title', `{${bibEscape(title(source))}}`],
        ['journal', journal.nameEn],
        ['year', String(issue.year)],
        ['volume', String(issue.volume)],
        ['number', number],
        ['pages', pp ? pp.replace(/[–-]/, '--') : null],
        ['issn', journal.issnOnline],
        ['doi', doi],
        ['url', url],
        [
            'keywords',
            article.keywords?.length
                ? bibEscape(article.keywords.join(', '))
                : null,
        ],
    ];

    return [
        `@article{${citeKey(source)},`,
        fields
            .filter((field): field is [string, string] => Boolean(field[1]))
            .map(([key, value]) => `  ${key.padEnd(8)} = {${value}}`)
            .join(',\n'),
        '}',
        '',
    ].join('\n');
}

export function toRIS(source: CiteSource): string {
    const { article, issue, journal } = source;
    const pp = pages(article);
    const [start, end] = pp ? pp.split(/[–-]/) : [];
    const doi = citableDoi(article);
    const url = linkFor(source);
    const number = hasNumber(issue)
        ? issue.kind === 'supplement'
            ? `Suppl. ${issue.number}`
            : String(issue.number)
        : null;
    const line = (tag: string, value: string | null | undefined) =>
        value ? [`${tag}  - ${value}`] : [];

    return [
        'TY  - JOUR',
        ...article.authors.flatMap((name) => {
            const { given, family } = splitName(name);

            return line('AU', given ? `${family}, ${given}` : family);
        }),
        ...line('TI', title(source)),
        ...line('T2', journal.nameEn),
        ...line('J2', journal.abbrev),
        ...line('PY', String(issue.year)),
        ...line('DA', article.publishedAt?.replaceAll('-', '/')),
        ...line('VL', String(issue.volume)),
        ...line('IS', number),
        ...line('SP', start?.trim()),
        ...line('EP', (end ?? start)?.trim()),
        ...line('SN', journal.issnOnline),
        ...line('DO', doi),
        ...line('UR', url),
        ...line('LA', article.titleLang),
        ...(article.keywords ?? []).flatMap((keyword) => line('KW', keyword)),
        ...line('AB', article.abstract?.replace(/\s*\n+\s*/g, ' ')),
        'ER  - ',
        '',
    ].join('\r\n');
}
