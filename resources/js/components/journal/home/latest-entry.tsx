import { Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { articleHref } from '@/components/journal/article-row';
import { useT } from '@/lib/i18n';
import { copyText, listAuthors } from '@/lib/journal';
import type { ArticleSummary } from '@/types/journal';

type Props = {
    article: ArticleSummary;
    /** Unique per list, so the action links can point at the title (aria-describedby). */
    idPrefix: string;
    /** Congress contributions: one compact line each (about 72px). */
    compact?: boolean;
    /** Name the issue in the meta line (early online lists span issues). */
    showIssue?: boolean;
};

/** Colour of the type eyebrow, by article type. */
function typeTone(type: string): { className: string; dot: boolean } {
    const lower = type.toLowerCase();

    if (lower.startsWith('original')) {
        return { className: 'text-brand', dot: false };
    }

    if (lower.startsWith('review')) {
        return { className: 'text-brand-dark', dot: true };
    }

    return { className: 'text-ink-muted', dot: false };
}

export function formatBytes(bytes: number | null): string | null {
    if (!bytes) {
        return null;
    }

    return bytes >= 1048576
        ? `${(bytes / 1048576).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

const action =
    'inline-flex min-h-6 cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-sans text-[14px] font-semibold text-brand underline decoration-underline underline-offset-4 hover:text-brand-dark hover:decoration-brand';

/**
 * A table-of-contents entry for the home page lists: type eyebrow, title,
 * authors, then one meta line (pages, date, DOI) with text actions.
 */
export function LatestEntry({ article, idPrefix, compact, showIssue }: Props) {
    const { t } = useT();
    const href = articleHref(article);
    const titleId = `${idPrefix}-${article.issueSlug}-${article.number}`;
    const size = formatBytes(article.pdfBytes);
    const tone = article.type ? typeTone(article.type) : null;

    const actions = (
        <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link
                href={href}
                prefetch
                className={action}
                aria-describedby={titleId}
            >
                {article.hasAbstract ? t('Abstract') : t('Details')}
            </Link>
            {article.pdf && (
                <span className="inline-flex items-baseline gap-1">
                    <a
                        href={article.pdf}
                        className={action}
                        aria-describedby={titleId}
                    >
                        PDF
                        <span aria-hidden="true">↓</span>
                    </a>
                    {size && (
                        <span className="text-meta text-ink-muted tabular-nums">
                            {size}
                        </span>
                    )}
                </span>
            )}
            {!compact && (
                <button
                    type="button"
                    className={action}
                    aria-describedby={titleId}
                    onClick={() =>
                        void copyText(article.citation, t('Citation copied'))
                    }
                >
                    {t('Cite')}
                </button>
            )}
        </span>
    );

    if (compact) {
        return (
            <li className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-b border-line py-3.5">
                <span className="pt-0.5 text-meta font-semibold text-ink-muted tabular-nums">
                    {article.number}
                </span>
                <div className="flex min-w-0 flex-col gap-1">
                    <h3
                        id={titleId}
                        lang={article.titleLang}
                        className="m-0 font-serif text-[17px] leading-[1.35] font-medium text-pretty"
                    >
                        <Link
                            href={href}
                            prefetch
                            className="text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                        >
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: article.titleHtml,
                                }}
                            />
                        </Link>
                    </h3>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                        <p className="m-0 min-w-0 text-meta text-ink-soft">
                            {listAuthors(article.authors, 4)}
                        </p>
                        {actions}
                    </div>
                </div>
            </li>
        );
    }

    const meta = [
        showIssue ? article.issueLabel : null,
        article.pages ? t('pp. {pages}', { pages: article.pages }) : null,
        article.publishedLabel
            ? t('Published {date}', { date: article.publishedLabel })
            : null,
    ].filter(Boolean);

    return (
        <li className="flex flex-col gap-0.5 border-b border-line py-3">
            {tone && (
                <p
                    className={cn(
                        'eyebrow flex items-center gap-2',
                        tone.className,
                    )}
                >
                    {tone.dot && (
                        <span
                            aria-hidden="true"
                            className="size-1.5 rounded-full bg-sky"
                        />
                    )}
                    {t(article.type ?? '')}
                </p>
            )}
            <h3
                id={titleId}
                lang={article.titleLang}
                className="m-0 mt-0.5 font-serif text-[19px] leading-[1.28] font-medium text-pretty md:text-h4 md:leading-[1.28]"
            >
                <Link
                    href={href}
                    prefetch
                    className="text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                >
                    <span
                        dangerouslySetInnerHTML={{ __html: article.titleHtml }}
                    />
                </Link>
            </h3>
            {article.authors.length > 0 && (
                <p className="m-0 text-ui text-ink-soft">
                    {listAuthors(article.authors, 4)}
                </p>
            )}
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-6 gap-y-1.5">
                <p className="m-0 flex flex-wrap items-center gap-x-2 text-meta text-ink-muted tabular-nums">
                    {meta.map((part, index) => (
                        <span key={index} className="flex items-center gap-2">
                            {index > 0 && <span aria-hidden="true">·</span>}
                            {part}
                        </span>
                    ))}
                    {article.doi && (
                        <span className="flex min-w-0 items-center gap-2 max-sm:basis-full">
                            {meta.length > 0 && (
                                <span
                                    aria-hidden="true"
                                    className="max-sm:hidden"
                                >
                                    ·
                                </span>
                            )}
                            {article.doiRegistered === true &&
                            article.doiUrl ? (
                                <a
                                    href={article.doiUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-all text-ink-muted underline decoration-line-strong underline-offset-2 hover:text-brand"
                                >
                                    doi.org/{article.doi}
                                </a>
                            ) : (
                                <span className="break-all">
                                    DOI {article.doi}
                                </span>
                            )}
                        </span>
                    )}
                </p>
                {actions}
            </div>
        </li>
    );
}
