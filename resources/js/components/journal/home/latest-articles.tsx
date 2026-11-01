import { Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { LatestEntry } from '@/components/journal/home/latest-entry';
import { useT } from '@/lib/i18n';
import { earlyOnline } from '@/routes';
import { show as showIssue } from '@/routes/issues';
import type { ArticleSummary, IssueDetail } from '@/types/journal';

type Props = {
    currentIssue: IssueDetail;
    currentArticles: ArticleSummary[];
    earlyOnlineCount: number;
    earlyOnlineArticles: ArticleSummary[];
    supplement: IssueDetail | null;
    supplementArticles: ArticleSummary[];
    className?: string;
};

type Tab = {
    key: string;
    label: ReactNode;
    /** One line above the list: what this list is. */
    intro: ReactNode;
    list: ReactNode;
    more: { href: string; label: string };
};

/**
 * "Latest articles": the current issue's full contents, early online
 * articles and the newest supplement, as tabs (WAI-ARIA tabs pattern;
 * arrow keys, Home and End move between tabs).
 */
export function LatestArticles({
    currentIssue,
    currentArticles,
    earlyOnlineCount,
    earlyOnlineArticles,
    supplement,
    supplementArticles,
    className,
}: Props) {
    const { t } = useT();
    const [active, setActive] = useState(0);
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

    const tabs: Tab[] = [
        {
            key: 'current',
            label: t('Current issue'),
            intro: (
                <>
                    <span className="font-semibold text-ink">
                        {currentIssue.label}
                    </span>
                    {currentIssue.publishedSpan && (
                        <> · {currentIssue.publishedSpan}</>
                    )}
                    {' · '}
                    {t('{count} articles', {
                        count:
                            currentIssue.articleCount ?? currentArticles.length,
                    })}
                </>
            ),
            list: currentArticles.map((article) => (
                <LatestEntry
                    key={article.number}
                    article={article}
                    idPrefix="cur"
                />
            )),
            more: {
                href: showIssue.url(currentIssue.slug),
                label: t('Full table of contents'),
            },
        },
    ];

    if (earlyOnlineCount > 0) {
        tabs.push({
            key: 'early',
            label: (
                <>
                    {t('Early online')}
                    <span className="rounded-full bg-tint px-2 py-px text-meta font-semibold text-brand-dark tabular-nums">
                        {earlyOnlineCount}
                    </span>
                </>
            ),
            intro: t(
                'Accepted articles, published online before their issue is complete.',
            ),
            list: earlyOnlineArticles.map((article) => (
                <LatestEntry
                    key={`${article.issueSlug}-${article.number}`}
                    article={article}
                    idPrefix="early"
                    showIssue
                />
            )),
            more: {
                href: earlyOnline.url(),
                label:
                    earlyOnlineCount > earlyOnlineArticles.length
                        ? t('All {count} early online articles', {
                              count: earlyOnlineCount,
                          })
                        : t('Early online'),
            },
        });
    }

    if (supplement && supplementArticles.length > 0) {
        const count = supplement.articleCount ?? supplementArticles.length;

        tabs.push({
            key: 'supplement',
            label: supplement.note ?? supplement.part ?? t('Supplement'),
            intro: (
                <>
                    <span className="font-semibold text-ink">
                        {supplement.label}
                    </span>
                    {supplement.fullTitle && <> · {supplement.fullTitle}</>}
                    {' · '}
                    {t('{count} contributions', { count })}
                </>
            ),
            list: (
                <ol className="m-0 list-none p-0">
                    {supplementArticles.map((article) => (
                        <LatestEntry
                            key={article.number}
                            article={article}
                            idPrefix="supp"
                            compact
                        />
                    ))}
                </ol>
            ),
            more: {
                href: showIssue.url(supplement.slug),
                label: t('Browse all {count} contributions', { count }),
            },
        });
    }

    const select = (index: number) => {
        setActive(index);
        tabRefs.current[index]?.focus();
    };

    const onKeyDown = (event: KeyboardEvent) => {
        const last = tabs.length - 1;
        const next = {
            ArrowRight: active === last ? 0 : active + 1,
            ArrowLeft: active === 0 ? last : active - 1,
            Home: 0,
            End: last,
        }[event.key];

        if (next !== undefined) {
            event.preventDefault();
            select(next);
        }
    };

    return (
        <section
            aria-labelledby="latest-title"
            className={cn('flex min-w-0 flex-col', className)}
        >
            <h2
                id="latest-title"
                className="m-0 font-serif text-[26px] leading-[1.2] font-medium md:text-h2"
            >
                {t('Latest articles')}
            </h2>

            <div
                role="tablist"
                aria-labelledby="latest-title"
                onKeyDown={onKeyDown}
                className="mt-4 flex [scrollbar-width:none] gap-6 overflow-x-auto border-b border-line-strong"
            >
                {tabs.map((tab, index) => (
                    <button
                        key={tab.key}
                        ref={(el) => {
                            tabRefs.current[index] = el;
                        }}
                        id={`latest-tab-${tab.key}`}
                        type="button"
                        role="tab"
                        aria-selected={index === active}
                        aria-controls={`latest-panel-${tab.key}`}
                        tabIndex={index === active ? 0 : -1}
                        onClick={() => setActive(index)}
                        className={cn(
                            '-mb-px flex min-h-11 shrink-0 cursor-pointer items-center gap-2 border-0 border-b-[3px] bg-transparent px-0 font-sans text-ui font-semibold whitespace-nowrap transition-colors focus-visible:outline-offset-[-2px]',
                            index === active
                                ? 'border-brand-dark text-ink'
                                : 'border-transparent text-ink-muted hover:border-line-strong hover:text-ink',
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {tabs.map((tab, index) => (
                <div
                    key={tab.key}
                    id={`latest-panel-${tab.key}`}
                    role="tabpanel"
                    aria-labelledby={`latest-tab-${tab.key}`}
                    hidden={index !== active}
                    tabIndex={0}
                    className="focus-visible:outline-offset-4"
                >
                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-b border-line py-3">
                        <p className="m-0 text-meta text-ink-muted">
                            {tab.intro}
                        </p>
                        <Link
                            href={tab.more.href}
                            className="text-ui font-semibold underline decoration-underline underline-offset-4 hover:decoration-brand"
                        >
                            {tab.more.label}
                            <span aria-hidden="true"> →</span>
                        </Link>
                    </div>
                    {tab.key === 'supplement' ? (
                        tab.list
                    ) : (
                        <ol className="m-0 list-none p-0">{tab.list}</ol>
                    )}
                </div>
            ))}
        </section>
    );
}
