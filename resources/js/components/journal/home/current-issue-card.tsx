import { Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { DownloadIcon } from '@/components/journal/icons';
import { IssueCover } from '@/components/journal/issue-cover';
import { formatBytes } from '@/components/journal/home/latest-entry';
import { useT } from '@/lib/i18n';
import { show as showIssue } from '@/routes/issues';
import type { IssueDetail } from '@/types/journal';

/** The current issue: printed cover beside its label, dates and links. */
export function CurrentIssueCard({
    issue,
    className,
}: {
    issue: IssueDetail;
    className?: string;
}) {
    const { t } = useT();
    const href = showIssue.url(issue.slug);
    const size = formatBytes(issue.pdfBytes);

    return (
        <section
            aria-labelledby="current-issue-title"
            className={cn(
                'flex items-start gap-5 max-lg:rounded-lg max-lg:border max-lg:border-line-card max-lg:bg-white max-lg:p-4',
                className,
            )}
        >
            <div className="w-[104px] shrink-0 sm:w-[140px] lg:w-[200px]">
                <IssueCover
                    image={issue.coverImage}
                    alt={t('Cover of {issue}', { issue: issue.label })}
                    volume={issue.volume}
                    caption={issue.part ?? issue.label}
                    year={issue.year}
                    size="md"
                    priority
                    className="shadow-[0_1px_2px_rgba(30,42,68,0.08),0_14px_32px_-18px_rgba(30,42,68,0.35)]"
                />
            </div>

            <div className="flex min-w-0 flex-col gap-1 lg:pt-1">
                <p className="eyebrow">{t('Current issue')}</p>
                <h2
                    id="current-issue-title"
                    className="m-0 font-serif text-h4 leading-[1.25] font-medium text-ink"
                >
                    <Link
                        href={href}
                        prefetch
                        className="text-ink no-underline hover:text-brand hover:underline hover:decoration-underline hover:underline-offset-4"
                    >
                        {issue.label}
                    </Link>
                </h2>
                <p className="m-0 text-meta text-ink-muted tabular-nums">
                    {issue.publishedSpan ?? issue.year}
                    {issue.articleCount !== null && (
                        <>
                            <br />
                            {t('{count} articles', {
                                count: issue.articleCount,
                            })}
                        </>
                    )}
                </p>
                <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-ui">
                    <li>
                        <Link href={href} prefetch className="link-u">
                            {t('Table of contents')}
                        </Link>
                    </li>
                    {issue.pdf && (
                        <li>
                            <a
                                href={issue.pdf}
                                className="inline-flex items-center gap-1.5 font-semibold underline decoration-underline underline-offset-4 hover:decoration-brand"
                            >
                                <DownloadIcon className="shrink-0" />
                                {t('Full issue (PDF)')}
                                {size && (
                                    <span className="font-normal text-ink-muted">
                                        {size}
                                    </span>
                                )}
                            </a>
                        </li>
                    )}
                </ul>
            </div>
        </section>
    );
}
