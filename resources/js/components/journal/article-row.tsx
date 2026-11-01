import { clsx as cn } from 'clsx';
import { Link, usePage } from '@inertiajs/react';
import { lazy, Suspense, useState } from 'react';
import type { CiteSource } from '@/components/journal/citation-formats';
import { Highlight, snippet } from '@/components/journal/highlight';
import { DownloadIcon } from '@/components/journal/icons';
import { copyText, listAuthors } from '@/lib/journal';
import { show as showArticle } from '@/routes/articles';
import type {
    ArticleDetail,
    ArticleSummary,
    IssueSummary,
} from '@/types/journal';
import { useT } from '@/lib/i18n';

/** A list row: the summary, plus the abstract and keywords when sent (search excerpts). */
export type RowArticle = ArticleSummary &
    Partial<Pick<ArticleDetail, 'abstract' | 'keywords'>>;

type HeadingLevel = 2 | 3 | 4;

/** Text-link action in a row ("Abstract", "PDF ↓", "Cite"): 24px+ target, no box. */
const ACTION =
    'inline-flex min-h-6 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-sans text-[14px] font-semibold text-brand no-underline underline-offset-4 hover:text-brand-dark hover:underline';

type Props = {
    article: RowArticle;
    /**
     * `toc` (tables of contents, lists, search) offers Cite; `summary`
     * (home page, the default) leaves it out to keep the list short.
     */
    variant?: 'summary' | 'toc';
    /**
     * One-block row for large supplements (about 72px): number, title,
     * authors and the meta line with the actions.
     */
    compact?: boolean;
    /** Heading level of the title; default 3 (under an h2 section). */
    headingLevel?: HeadingLevel;
    /** Show the article type above the title (off under a type subheading). */
    showType?: boolean;
    /** Show which issue the article belongs to (search results, early online). */
    showIssue?: boolean;
    /** Cut the author list after this many names. */
    maxAuthors?: number;
    /** Search terms to mark in the title, authors and an abstract excerpt. */
    highlight?: string[];
    /** Extra classes on the row (e.g. the first row's top border). */
    className?: string;
    /**
     * Opens the citation dialog (from `useRowCite`). Without it, Cite copies
     * the journal's Vancouver reference.
     */
    onCite?: (article: RowArticle) => void;
};

const CiteDialog = lazy(() =>
    import('@/components/journal/cite-dialog').then((m) => ({
        default: m.CiteDialog,
    })),
);

type CiteIssue = Pick<
    IssueSummary,
    'slug' | 'volume' | 'number' | 'kind' | 'year'
>;

/**
 * One shared "Cite" dialog for a list of rows: pass `onCite` to each row and
 * render `dialog` once. The dialog code loads on the first use.
 */
export function useRowCite(issues: CiteIssue[]) {
    const { t } = useT();
    const { journal, canonical } = usePage().props;
    const [source, setSource] = useState<CiteSource | null>(null);
    const [open, setOpen] = useState(false);

    const onCite = (article: RowArticle) => {
        const issue = issues.find((i) => i.slug === article.issueSlug);

        if (!issue) {
            void copyText(article.citation, t('Citation copied'));

            return;
        }

        let pageUrl: string | undefined;

        try {
            pageUrl = new URL(articleHref(article).url, canonical).toString();
        } catch {
            pageUrl = undefined;
        }

        setSource({ article, issue, journal, pageUrl });
        setOpen(true);
    };

    const dialog = source ? (
        <Suspense fallback={null}>
            <CiteDialog source={source} open={open} onOpenChange={setOpen} />
        </Suspense>
    ) : null;

    return { onCite, dialog };
}

export function articleHref(
    article: Pick<ArticleSummary, 'issueSlug' | 'number'>,
) {
    return showArticle({ issue: article.issueSlug, article: article.number });
}

/** Stable element id of a row's title, for aria-describedby and "Go to no.". */
export function articleTitleId(
    article: Pick<ArticleSummary, 'issueSlug' | 'number'>,
): string {
    return `article-${article.issueSlug}-${article.number}`;
}

const TITLE_TAGS = new Set(['i', 'em', 'sup', 'sub']);

/**
 * Keeps only <i>, <em>, <sup> and <sub> (without attributes) from a title.
 * The importer already sanitises; this is the last line of defence and works
 * the same during SSR (no DOM needed).
 */
export function sanitizeTitleHtml(html: string): string {
    return html
        .replace(/<!--[\s\S]*?(?:-->|$)/g, '')
        .replace(
            /<(\/?)([a-z][a-z0-9]*)\b[^>]*>?|<[!?][^>]*>?/gi,
            (_tag, slash: string | undefined, name: string | undefined) => {
                const tag = name?.toLowerCase();

                return tag && TITLE_TAGS.has(tag) ? `<${slash}${tag}>` : '';
            },
        );
}

/** "1.2 MB" / "640 KB" in the reader's language. */
export function formatBytes(bytes: number, locale: string): string {
    const mb = bytes / 1024 / 1024;
    const nf = (value: number, digits: number) =>
        new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(
            value,
        );

    return mb >= 1
        ? `${nf(mb, 1)} MB`
        : `${nf(Math.max(1, Math.round(bytes / 1024)), 0)} KB`;
}

/** Visual weight of the type label: research articles lead, reviews in navy. */
function typeTone(type: string): 'original' | 'review' | 'other' {
    const t = type.toLowerCase();

    if (t.startsWith('original')) {
        return 'original';
    }

    return t.startsWith('review') ? 'review' : 'other';
}

/** The article type as a small uppercase label: "ORIGINAL SCIENTIFIC PAPER". */
export function ArticleType({
    type,
    className,
}: {
    type: string;
    className?: string;
}) {
    const { t } = useT();
    const tone = typeTone(type);

    return (
        <p
            className={cn(
                'eyebrow flex items-center gap-2',
                tone === 'review' && 'text-brand-dark',
                tone === 'other' && 'text-ink-muted',
                className,
            )}
        >
            {tone === 'review' && (
                <span
                    aria-hidden="true"
                    className="size-1.5 shrink-0 rounded-full bg-sky"
                />
            )}
            {t(type)}
        </p>
    );
}

/** A plain text link to an article PDF ("PDF ↓"). */
export function PdfLink({
    href,
    bytes,
    describedBy,
    className,
}: {
    href: string | null;
    bytes?: number | null;
    describedBy?: string;
    className?: string;
}) {
    const { locale } = useT();

    if (!href) {
        return null;
    }

    return (
        <a
            href={href}
            aria-describedby={describedBy}
            className={cn(ACTION, className)}
        >
            PDF
            <DownloadIcon className="size-3.5" />
            {bytes ? (
                <span className="font-normal text-ink-muted">
                    {formatBytes(bytes, locale)}
                </span>
            ) : null}
        </a>
    );
}

export function ArticleRow({
    article,
    variant = 'summary',
    compact = false,
    headingLevel = 3,
    showType = true,
    showIssue,
    maxAuthors,
    highlight = [],
    className,
    onCite,
}: Props) {
    const { t } = useT();
    const href = articleHref(article);
    const titleId = articleTitleId(article);
    const authors = listAuthors(article.authors, maxAuthors);
    const Heading = `h${headingLevel}` as const;

    // Show an abstract excerpt for the words that the title and authors don't explain.
    const visible = `${article.title} ${authors}`.toLocaleLowerCase();
    const unexplained = highlight.filter(
        (term) => !visible.includes(term.toLocaleLowerCase()),
    );
    const excerpt = unexplained.length
        ? (snippet(article.abstract ?? null, unexplained) ??
          snippet((article.keywords ?? []).join(', '), unexplained))
        : null;

    // Marked-up titles keep their sub/superscripts; search highlighting needs plain text.
    const title =
        highlight.length > 0 ? (
            <Highlight text={article.title} terms={highlight} />
        ) : (
            <span
                dangerouslySetInnerHTML={{
                    __html: sanitizeTitleHtml(article.titleHtml),
                }}
            />
        );

    const doi = article.doi ? (
        article.doiRegistered === true && article.doiUrl ? (
            <a
                href={article.doiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="[overflow-wrap:anywhere] text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-brand hover:decoration-brand"
            >
                {article.doiUrl.replace(/^https:\/\//, '')}
            </a>
        ) : (
            <span className="[overflow-wrap:anywhere]">
                {t('DOI {doi}', { doi: article.doi })}
            </span>
        )
    ) : null;

    const facts = [
        showIssue ? article.issueLabel : null,
        article.pages ? t('pp. {pages}', { pages: article.pages }) : null,
        !compact && article.publishedLabel
            ? t('Published {date}', { date: article.publishedLabel })
            : null,
    ].filter((fact): fact is string => fact !== null);

    const actions = (
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1 md:col-start-2 md:flex-nowrap md:justify-end">
            <Link
                href={href}
                prefetch
                aria-describedby={titleId}
                className={ACTION}
            >
                {article.hasAbstract ? t('Abstract') : t('Details')}
            </Link>
            <PdfLink
                href={article.pdf}
                bytes={article.pdfBytes}
                describedBy={titleId}
            />
            {variant === 'toc' && (
                <button
                    type="button"
                    aria-describedby={titleId}
                    className={ACTION}
                    onClick={() =>
                        onCite
                            ? onCite(article)
                            : copyText(article.citation, t('Citation copied'))
                    }
                >
                    {t('Cite')}
                </button>
            )}
        </span>
    );

    const meta = (
        <div className="flex flex-col gap-y-1.5 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-x-6">
            {(facts.length > 0 || (doi && !compact)) && (
                <p className="m-0 flex flex-wrap items-baseline gap-x-2 text-meta text-ink-muted tabular-nums">
                    {facts.map((fact, index) => (
                        <span key={fact} className="flex items-baseline gap-2">
                            {index > 0 && <span aria-hidden="true">·</span>}
                            {fact}
                        </span>
                    ))}
                    {doi && !compact && (
                        // Its own line on phones, so a wrap never starts with "·".
                        <span className="flex min-w-0 basis-full items-baseline gap-2 md:basis-auto">
                            {facts.length > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="max-md:hidden"
                                >
                                    ·
                                </span>
                            )}
                            {doi}
                        </span>
                    )}
                </p>
            )}
            {actions}
        </div>
    );

    if (compact) {
        return (
            <article
                aria-labelledby={titleId}
                className={cn(
                    'grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3 md:grid-cols-[3.25rem_minmax(0,1fr)]',
                    className,
                )}
            >
                <span className="pt-[3px] text-meta font-semibold text-ink-muted tabular-nums">
                    {article.number}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                    <Heading
                        id={titleId}
                        lang={article.titleLang}
                        className="m-0 font-serif text-[17px] leading-snug font-medium text-pretty"
                    >
                        <Link
                            href={href}
                            prefetch
                            className="text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                        >
                            {title}
                        </Link>
                    </Heading>
                    <div className="flex flex-col gap-y-1 md:grid md:grid-cols-[minmax(0,1fr)_auto] md:items-baseline md:gap-x-6">
                        <p className="m-0 min-w-0 text-[14px] leading-snug text-ink-soft">
                            <Highlight text={authors} terms={highlight} />
                            {facts.length > 0 && (
                                <span className="text-meta text-ink-muted tabular-nums">
                                    <span aria-hidden="true"> · </span>
                                    {facts.join(' · ')}
                                </span>
                            )}
                        </p>
                        {actions}
                    </div>
                    {excerpt && (
                        <p className="m-0 mt-1 text-[14px] leading-relaxed text-ink-soft">
                            <Highlight text={excerpt} terms={highlight} />
                        </p>
                    )}
                </div>
            </article>
        );
    }

    return (
        <article
            aria-labelledby={titleId}
            className={cn(
                'flex flex-col gap-1.5 border-b border-line py-5 md:py-6',
                className,
            )}
        >
            {showType && article.type && <ArticleType type={article.type} />}
            <Heading
                id={titleId}
                lang={article.titleLang}
                className="m-0 font-serif text-[19px] leading-[1.38] font-medium text-pretty md:text-h4"
            >
                <Link
                    href={href}
                    prefetch
                    className="text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                >
                    {title}
                </Link>
            </Heading>
            {authors && (
                <p className="m-0 text-ui text-ink-soft">
                    <Highlight text={authors} terms={highlight} />
                </p>
            )}
            {excerpt && (
                <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
                    <Highlight text={excerpt} terms={highlight} />
                </p>
            )}
            <div className="mt-1">{meta}</div>
        </article>
    );
}
