import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { ArticleRow, useRowCite } from '@/components/journal/article-row';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import { home } from '@/routes';
import { earlyOnline as earlyOnlineFeed } from '@/routes/feed';
import { show as showIssue } from '@/routes/issues';
import type { ArticleSummary, IssueSummary } from '@/types/journal';
import { useT } from '@/lib/i18n';

type Props = {
    articles: ArticleSummary[];
    /** The issues still being released online first, newest first. */
    issues: IssueSummary[];
};

export default function EarlyOnlinePage({ articles, issues }: Props) {
    const { t } = useT();
    const cite = useRowCite(issues);

    // One group per issue, in the order the server sends the issues (newest first).
    const groups = issues
        .map((issue) => ({
            issue,
            items: articles.filter((a) => a.issueSlug === issue.slug),
        }))
        .filter((group) => group.items.length > 0);

    return (
        <>
            <Head title={t('Early online')} />

            <section className="border-b border-line bg-mist">
                <div className="page-wrap flex flex-col gap-6 pt-6 pb-10 md:pt-8 md:pb-12">
                    <Breadcrumbs
                        items={[
                            { label: t('Home'), href: home.url() },
                            { label: t('Early online') },
                        ]}
                    />
                    <div className="flex flex-col gap-3">
                        <h1 className="m-0 font-serif text-h1 font-medium">
                            {t('Early online')}
                        </h1>
                        <p className="m-0 max-w-[62ch] text-body text-ink-soft">
                            {t(
                                'Accepted articles, published online ahead of the issue they will appear in.',
                            )}
                        </p>
                        {articles.length > 0 && (
                            <p className="m-0 text-ui text-ink-muted tabular-nums">
                                {articles.length === 1
                                    ? t('{count} article', { count: 1 })
                                    : t('{count} articles', {
                                          count: articles.length,
                                      })}
                                {' · '}
                                {groups.length === 1
                                    ? t('{count} issue in progress', {
                                          count: 1,
                                      })
                                    : t('{count} issues in progress', {
                                          count: groups.length,
                                      })}
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <div className="page-wrap grid grid-cols-1 gap-x-6 gap-y-12 section-pb lg:grid-cols-12">
                <div className="min-w-0 lg:col-span-8">
                    {groups.length === 0 && (
                        <p className="mt-10 text-ink-soft">
                            {t(
                                'There are no early-online articles at the moment.',
                            )}
                        </p>
                    )}
                    {groups.map(({ issue, items }) => (
                        <section
                            key={issue.slug}
                            aria-labelledby={`group-${issue.slug}`}
                            className="pt-10 md:pt-12"
                        >
                            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line-strong pb-4">
                                <h2
                                    id={`group-${issue.slug}`}
                                    className="m-0 font-serif text-h3 font-medium md:text-h2"
                                >
                                    {issue.label}
                                </h2>
                                <p className="m-0 flex flex-wrap items-baseline gap-x-3 text-ui text-ink-muted tabular-nums">
                                    <span>
                                        {items.length === 1
                                            ? t('{count} article', { count: 1 })
                                            : t('{count} articles', {
                                                  count: items.length,
                                              })}
                                    </span>
                                    <Link
                                        href={showIssue(issue.slug)}
                                        prefetch
                                        className="font-semibold no-underline hover:underline"
                                    >
                                        {t('Issue contents')}
                                        <span className="sr-only">
                                            {' '}
                                            ({issue.label})
                                        </span>
                                    </Link>
                                </p>
                            </div>
                            {items.map((article) => (
                                <ArticleRow
                                    key={`${article.issueSlug}/${article.number}`}
                                    article={article}
                                    variant="toc"
                                    onCite={cite.onCite}
                                />
                            ))}
                        </section>
                    ))}
                </div>

                <aside
                    aria-label={t('About early online')}
                    className="min-w-0 lg:col-span-4 lg:pt-12 lg:pl-6"
                >
                    <div className="flex flex-col gap-8 lg:sticky lg:top-[88px]">
                        <RailBlock title={t('What “early online” means')}>
                            <p className="m-0">
                                {t(
                                    'These articles have been accepted and are published online before their issue is complete.',
                                )}
                            </p>
                        </RailBlock>
                        <RailBlock title={t('How to cite')}>
                            <p className="m-0">
                                {t(
                                    'Cite an early-online article by its authors, title, journal, year and DOI (where shown). Page numbers are added once they are assigned.',
                                )}
                            </p>
                            <p className="m-0">
                                {t(
                                    'Use “Cite” on any article for ready-made references.',
                                )}
                            </p>
                        </RailBlock>
                        <RailBlock title={t('Follow new articles')}>
                            <p className="m-0">
                                <a
                                    href={earlyOnlineFeed.url()}
                                    className="inline-flex items-center gap-2 font-semibold"
                                >
                                    <FeedIcon />
                                    {t('Early online feed')}
                                </a>
                            </p>
                            <p className="m-0 text-meta text-ink-muted">
                                {t(
                                    'Add the feed address to a feed reader to be notified of new articles.',
                                )}
                            </p>
                        </RailBlock>
                    </div>
                </aside>
            </div>
        </>
    );
}

function RailBlock({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2.5 border-t-2 border-brand pt-4 text-ui leading-relaxed text-ink-soft">
            <h2 className="m-0 font-sans text-ui font-semibold text-ink">
                {title}
            </h2>
            {children}
        </section>
    );
}

function FeedIcon() {
    return (
        <svg
            viewBox="0 0 16 16"
            width="16"
            height="16"
            aria-hidden="true"
            focusable="false"
            className="shrink-0"
        >
            <circle cx="3.5" cy="12.5" r="1.5" fill="currentColor" />
            <path
                d="M2 7.5a6.5 6.5 0 0 1 6.5 6.5M2 2.5A11.5 11.5 0 0 1 13.5 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}
