import { toast } from 'sonner';
import type { ArticleDetail, ArticleSummary } from '@/types/journal';

/** "A, B, C, D, et al." — full names, cut after `max`. */
export function listAuthors(authors: string[], max = Infinity): string {
    if (authors.length <= max) {
        return authors.join(', ');
    }

    return `${authors.slice(0, max).join(', ')}, et al.`;
}

/** Surnames only: "Dimkovski, Mihajloska, Poceva Panovska" (3 max, then "et al."). */
export function listSurnames(authors: string[], max = 3): string {
    const surnames = authors.map((name) =>
        name.split(/\s+/).slice(1).join(' '),
    );

    return surnames.length > max
        ? `${surnames.slice(0, max).join(', ')}, et al.`
        : surnames.join(', ');
}

export async function copyText(
    text: string,
    message = 'Copied',
): Promise<void> {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(message);
    } catch {
        toast.error('Could not copy. Select the text and copy it manually.');
    }
}

export function downloadText(
    filename: string,
    text: string,
    type: string,
): void {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const link = Object.assign(document.createElement('a'), {
        href: url,
        download: filename,
    });

    link.click();
    URL.revokeObjectURL(url);
}

function splitName(name: string): { given: string; family: string } {
    const [given, ...rest] = name.trim().split(/\s+/);

    return { given, family: rest.join(' ') };
}

function citeKey(article: ArticleSummary): string {
    return `mpb${article.issueSlug.replace('-', '_')}_${article.number}`;
}

function year(article: ArticleSummary): string {
    return article.publishedAt?.slice(0, 4) ?? '';
}

export function toBibTeX(article: ArticleSummary): string {
    const authors = article.authors
        .map((name) => {
            const { given, family } = splitName(name);

            return `${family}, ${given}`;
        })
        .join(' and ');

    return [
        `@article{${citeKey(article)},`,
        `  author  = {${authors}},`,
        `  title   = {${article.title}},`,
        `  journal = {Macedonian Pharmaceutical Bulletin},`,
        `  year    = {${year(article)}},`,
        `  note    = {${article.issueLabel}},`,
        ...(article.pages
            ? [`  pages   = {${article.pages.replace('–', '--')}},`]
            : []),
        ...(article.doi ? [`  doi     = {${article.doi}},`] : []),
        `  url     = {${article.doi ? `https://doi.org/${article.doi}` : (article.pdf ?? '')}}`,
        '}',
        '',
    ].join('\n');
}

export function toRIS(article: ArticleDetail): string {
    const authors = article.authors.map((name) => {
        const { given, family } = splitName(name);

        return `AU  - ${family}, ${given}`;
    });

    return [
        'TY  - JOUR',
        ...authors,
        `TI  - ${article.title}`,
        'JO  - Macedonian Pharmaceutical Bulletin',
        'JA  - Maced. Pharm. Bull.',
        `PY  - ${year(article)}`,
        ...(article.pages
            ? [
                  `SP  - ${article.pages.split('–')[0]}`,
                  `EP  - ${article.pages.split('–').at(-1)}`,
              ]
            : []),
        ...(article.doi ? [`DO  - ${article.doi}`] : []),
        `UR  - ${article.doi ? `https://doi.org/${article.doi}` : (article.pdf ?? '')}`,
        ...article.keywords.map((keyword) => `KW  - ${keyword}`),
        'ER  - ',
        '',
    ].join('\r\n');
}

export function citeFilename(article: ArticleSummary, ext: string): string {
    return `${citeKey(article)}.${ext}`;
}
