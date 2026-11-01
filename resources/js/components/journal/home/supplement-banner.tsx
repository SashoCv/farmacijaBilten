import { Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { articleHref } from '@/components/journal/article-row';
import { DownloadIcon } from '@/components/journal/icons';
import { useT } from '@/lib/i18n';
import { listAuthors } from '@/lib/journal';
import { show as showIssue } from '@/routes/issues';
import type { ArticleSummary, IssueDetail } from '@/types/journal';

/**
 * Newest congress supplement: a banner with a sky rule, the congress, the
 * first three contributions and two actions. Sized for the home rail.
 */
export function SupplementBanner({
    supplement,
    articles,
    className,
}: {
    supplement: IssueDetail;
    articles: ArticleSummary[];
    className?: string;
}) {
    const { t } = useT();
    const count = supplement.articleCount ?? articles.length;
    // Full congress title from the data (WS9); the short code until then.
    const title =
        supplement.fullTitle ??
        (supplement.note
            ? t('{congress} congress contributions', {
                  congress: supplement.note,
              })
            : supplement.label);

    return (
        <section
            aria-labelledby="supp-title"
            className={cn(
                'flex flex-col gap-3 rounded-r-lg border-l-4 border-sky bg-mist p-5',
                className,
            )}
        >
            <p className="eyebrow">
                {t('Supplement')} · {supplement.label}
            </p>
            <h2
                id="supp-title"
                className="m-0 font-serif text-h4 leading-[1.3] font-medium text-balance"
            >
                <Link
                    href={showIssue.url(supplement.slug)}
                    className="text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                >
                    {title}
                </Link>
            </h2>
            <p className="m-0 text-meta text-ink-soft">
                {supplement.locationDates && <>{supplement.locationDates} · </>}
                {supplement.fullTitle && supplement.note && (
                    <>{supplement.note} · </>
                )}
                {t(
                    '{count} contributions, each one available as its own PDF.',
                    {
                        count,
                    },
                )}
            </p>

            <ol className="m-0 flex list-none flex-col p-0">
                {articles.slice(0, 3).map((article) => (
                    <li
                        key={article.number}
                        className="flex flex-col gap-0.5 border-t border-line-card py-2.5"
                    >
                        <Link
                            href={articleHref(article)}
                            lang={article.titleLang}
                            className="font-serif text-[16px] leading-[1.35] font-medium text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                        >
                            <span
                                dangerouslySetInnerHTML={{
                                    __html: article.titleHtml,
                                }}
                            />
                        </Link>
                        <span className="text-meta text-ink-soft">
                            {listAuthors(article.authors, 3)}
                        </span>
                    </li>
                ))}
            </ol>

            {/* Primary and secondary on one row, at equal height. */}
            <div className="flex items-stretch gap-2">
                <Link
                    href={showIssue.url(supplement.slug)}
                    prefetch
                    className="btn-primary h-11 flex-1 px-4 text-ui"
                >
                    {t('Browse all {count}', { count })}
                </Link>
                {supplement.pdf && (
                    <a
                        href={supplement.pdf}
                        aria-label={t('Full supplement (PDF)')}
                        className="btn-outline h-11 px-3.5"
                    >
                        <DownloadIcon className="text-brand" />
                        {t('Full PDF')}
                    </a>
                )}
            </div>
        </section>
    );
}
