import { clsx as cn } from 'clsx';
import { Head, InfiniteScroll, Link, router, usePage } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
    ArticleRow,
    articleHref,
    articleTitleId,
    formatBytes,
    useRowCite,
} from '@/components/journal/article-row';
import type { RowArticle } from '@/components/journal/article-row';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import type { Crumb } from '@/components/journal/breadcrumbs';
import { searchTerms } from '@/components/journal/highlight';
import { DownloadIcon, SearchIcon } from '@/components/journal/icons';
import { IssueCover } from '@/components/journal/issue-cover';
import { PdfViewer } from '@/components/journal/pdf-viewer';
import { copyText } from '@/lib/journal';
import { archive, earlyOnline, home } from '@/routes';
import { show as showIssue } from '@/routes/issues';
import type { IssueDetail, IssueSummary, JournalFacts } from '@/types/journal';
import { useT } from '@/lib/i18n';

type Sort = 'toc' | 'newest';

/** One page of the contents (Laravel paginator, merged as more pages load). */
type ArticlePage = {
    data: RowArticle[];
    current_page: number;
    per_page: number;
    total: number;
};

type Props = {
    issue: IssueDetail;
    articles: ArticlePage;
    /** Articles matching the current search (all of them without one). */
    matchCount: number;
    filters: { q: string; sort: Sort };
    /** "Browse issues": early-online issues first, then the newest published. */
    issues: IssueSummary[];
};

type Translate = ReturnType<typeof useT>['t'];

const COVER_SHADOW =
    'w-full shadow-[0_1px_2px_rgba(30,42,68,0.06),0_16px_32px_-18px_rgba(30,42,68,0.28)]';

/** Plural headings for the type groups of a regular issue. */
const GROUP_HEADINGS: Record<string, string> = {
    'Original scientific paper': 'Original scientific papers',
    'Review paper': 'Review papers',
    Review: 'Review papers',
    'Professional paper': 'Professional papers',
    'Short communication': 'Short communications',
    'Case report': 'Case reports',
    'Case study': 'Case studies',
};

export default function IssuePage(props: Props) {
    // Keyed so search and sort reset when moving between issues.
    return <IssueView key={props.issue.slug} {...props} />;
}

/** "Issue 2" / "Supplement 1" / "Book of Abstracts"; null for a whole volume. */
function partLabel(
    issue: Pick<IssueSummary, 'kind' | 'number'>,
    t: Translate,
): string | null {
    switch (issue.kind) {
        case 'issue':
            return t('Issue {number}', { number: issue.number ?? '' });
        case 'supplement':
            return t('Supplement {number}', { number: issue.number ?? '' });
        case 'abstracts':
            return t('Book of Abstracts');
        default:
            return null;
    }
}

function countLabel(count: number, supplement: boolean, t: Translate) {
    if (supplement) {
        return count === 1
            ? t('{count} contribution', { count })
            : t('{count} contributions', { count });
    }

    return count === 1
        ? t('{count} article', { count })
        : t('{count} articles', { count });
}

/**
 * Citation of the whole issue in the journal's English form, e.g.
 * "Macedonian Pharmaceutical Bulletin. 2025;71(2). ISSN 1857-8969."
 */
function issueCitation(issue: IssueDetail, journal: JournalFacts): string {
    const ref =
        issue.kind === 'supplement'
            ? `${issue.volume}(Suppl ${issue.number})`
            : issue.kind === 'issue'
              ? `${issue.volume}(${issue.number})`
              : String(issue.volume);
    const doi = issue.doi ? ` doi: ${issue.doi}` : '';

    return `${journal.nameEn}. ${issue.year};${ref}. ISSN ${journal.issnOnline}.${doi}`;
}

/**
 * Consecutive runs of one article type, when the printed order already
 * groups the issue by type (so subheadings never reorder the contents).
 */
function typeGroups(
    rows: RowArticle[],
): { type: string; rows: RowArticle[] }[] | null {
    if (rows.length < 2 || rows.some((row) => !row.type)) {
        return null;
    }

    const groups: { type: string; rows: RowArticle[] }[] = [];

    for (const row of rows) {
        const last = groups.at(-1);

        if (last && last.type === row.type) {
            last.rows.push(row);
        } else {
            groups.push({ type: row.type!, rows: [row] });
        }
    }

    const distinct = new Set(groups.map((g) => g.type));

    return distinct.size > 1 && distinct.size === groups.length ? groups : null;
}

function IssueView({ issue, articles, matchCount, filters, issues }: Props) {
    const { t } = useT();
    const { journal } = usePage().props;
    const [query, setQuery] = useState(filters.q);
    const [sort, setSort] = useState<Sort>(filters.sort);
    const cite = useRowCite([issue]);

    // Search and sort run on the server so they cover every page of a large
    // issue. The wait also debounces the live result count.
    useEffect(() => {
        if (query.trim() === filters.q && sort === filters.sort) {
            return;
        }

        const timer = setTimeout(() => {
            router.reload({
                data: {
                    q: query.trim() || undefined,
                    sort: sort === 'toc' ? undefined : sort,
                    page: undefined,
                },
                only: ['articles', 'matchCount', 'filters'],
                reset: ['articles'],
            });
        }, 350);

        return () => clearTimeout(timer);
    }, [query, sort, filters.q, filters.sort]);

    const highlightTerms = searchTerms(filters.q);
    const supplement = issue.kind === 'supplement';
    const count = issue.articleCount ?? 0;
    const empty = count === 0;
    const loaded = articles.data.length;
    // Large supplements: one-block rows, a "Go to no." box and manual loading.
    const compact = supplement || count > articles.per_page;
    const part = partLabel(issue, t);
    const groups =
        !compact && !filters.q && filters.sort === 'toc' && loaded === count
            ? typeGroups(articles.data)
            : null;

    const status = filters.q
        ? supplement
            ? t('{matches} of {count} contributions match “{query}”', {
                  matches: matchCount,
                  count,
                  query: filters.q,
              })
            : t('{matches} of {count} articles match “{query}”', {
                  matches: matchCount,
                  count,
                  query: filters.q,
              })
        : loaded < count
          ? supplement
              ? t('Showing {shown} of {total} contributions', {
                    shown: loaded,
                    total: count,
                })
              : t('Showing {shown} of {total} articles', {
                    shown: loaded,
                    total: count,
                })
          : countLabel(count, supplement, t);

    const crumbs: Crumb[] = issue.isPublished
        ? [
              { label: t('Home'), href: home.url() },
              { label: t('Archive'), href: archive.url() },
              ...(part
                  ? [
                        {
                            label: t('Volume {volume}', {
                                volume: issue.volume,
                            }),
                            href: `${archive.url()}#volume-${issue.volume}`,
                        },
                        { label: part },
                    ]
                  : [
                        {
                            label: t('Volume {volume}', {
                                volume: issue.volume,
                            }),
                        },
                    ]),
          ]
        : [
              { label: t('Home'), href: home.url() },
              { label: t('Early online'), href: earlyOnline.url() },
              { label: issue.label },
          ];

    // Focus the first newly loaded row after "Load more", so keyboard users
    // carry on where the list grew.
    const focusFrom = useRef<number | null>(null);

    useEffect(() => {
        const from = focusFrom.current;

        if (from === null || loaded <= from) {
            return;
        }

        focusFrom.current = null;
        document
            .getElementById(articleTitleId(articles.data[from]))
            ?.querySelector('a')
            ?.focus();
    }, [loaded, articles.data]);

    const nextHref = (() => {
        const params = new URLSearchParams();

        if (filters.q) {
            params.set('q', filters.q);
        }

        if (filters.sort !== 'toc') {
            params.set('sort', filters.sort);
        }

        // The last page loaded so far: the server's page on a ?page=N visit,
        // or the count of rows merged in since.
        params.set(
            'page',
            String(
                Math.max(
                    articles.current_page,
                    Math.ceil(loaded / articles.per_page),
                ) + 1,
            ),
        );

        return `?${params.toString()}`;
    })();

    const rows = groups
        ? groups.map((group) => (
              <section
                  key={`${group.type}-${group.rows[0].number}`}
                  aria-labelledby={`group-${group.rows[0].number}`}
                  className="pt-8 first:pt-6"
              >
                  <h3
                      id={`group-${group.rows[0].number}`}
                      className="eyebrow flex items-baseline gap-2 border-b border-line-strong pb-2.5 text-ink"
                  >
                      {t(GROUP_HEADINGS[group.type] ?? group.type)}
                      <span className="font-normal tracking-normal text-ink-muted tabular-nums">
                          {group.rows.length}
                      </span>
                  </h3>
                  {group.rows.map((article) => (
                      <ArticleRow
                          key={article.number}
                          article={article}
                          variant="toc"
                          headingLevel={4}
                          showType={false}
                          onCite={cite.onCite}
                      />
                  ))}
              </section>
          ))
        : articles.data.map((article) => (
              <ArticleRow
                  key={article.number}
                  article={article}
                  variant="toc"
                  compact={compact}
                  highlight={highlightTerms}
                  onCite={cite.onCite}
              />
          ));

    return (
        <>
            <Head title={issue.label} />

            <IssueHero
                issue={issue}
                crumbs={crumbs}
                part={part}
                count={count}
                citation={issueCitation(issue, journal)}
                journal={journal}
            />

            <section
                aria-labelledby={empty ? 'issue-pdf-title' : 'toc-title'}
                className="bg-white"
            >
                <div className="page-wrap grid grid-cols-1 gap-x-6 gap-y-14 section-pt section-pb lg:grid-cols-12">
                    <div className="min-w-0 lg:col-span-8">
                        {empty ? (
                            <EmptyIssue issue={issue} />
                        ) : (
                            <>
                                <div className="flex flex-col gap-5 border-b border-line-strong pb-5">
                                    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                                        <h2
                                            id="toc-title"
                                            className="m-0 font-serif text-h2 font-medium"
                                        >
                                            {t('Table of contents')}
                                        </h2>
                                        <p
                                            role="status"
                                            aria-live="polite"
                                            className="m-0 text-ui text-ink-muted tabular-nums"
                                        >
                                            {status}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                                        <div className="flex min-w-[min(100%,260px)] flex-[1_1_260px] flex-col gap-1.5">
                                            <label
                                                htmlFor="issue-search"
                                                className="text-ui font-semibold text-ink"
                                            >
                                                {supplement
                                                    ? t(
                                                          'Search this supplement',
                                                      )
                                                    : t('Search this issue')}
                                            </label>
                                            <div className="relative">
                                                <SearchIcon className="pointer-events-none absolute top-3.5 left-3.5 text-ink-muted" />
                                                <input
                                                    id="issue-search"
                                                    type="search"
                                                    value={query}
                                                    onChange={(e) =>
                                                        setQuery(e.target.value)
                                                    }
                                                    placeholder={t(
                                                        'Title, author or keyword',
                                                    )}
                                                    className="field h-11 pr-3.5 pl-11"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label
                                                htmlFor="toc-sort"
                                                className="text-ui font-semibold text-ink"
                                            >
                                                {t('Sort')}
                                            </label>
                                            <select
                                                id="toc-sort"
                                                value={sort}
                                                onChange={(e) =>
                                                    setSort(
                                                        e.target.value as Sort,
                                                    )
                                                }
                                                className="field h-11 w-auto pr-8 pl-3 text-ui"
                                            >
                                                <option value="toc">
                                                    {t(
                                                        'Table of contents order',
                                                    )}
                                                </option>
                                                <option value="newest">
                                                    {t('Newest online first')}
                                                </option>
                                            </select>
                                        </div>
                                        {compact && (
                                            <GoToNumber
                                                issue={issue}
                                                count={count}
                                                rows={articles.data}
                                            />
                                        )}
                                    </div>
                                </div>

                                <InfiniteScroll
                                    data="articles"
                                    buffer={400}
                                    // Two pages arrive on their own; after that
                                    // the reader asks, so the footer stays reachable.
                                    manualAfter={1}
                                    className="flex flex-col"
                                    next={({ loading, fetch, hasMore }) =>
                                        hasMore ? (
                                            <div className="flex flex-col items-center gap-3 pt-8">
                                                <p className="m-0 text-ui text-ink-muted tabular-nums">
                                                    {supplement
                                                        ? t(
                                                              'Showing {shown} of {total} contributions',
                                                              {
                                                                  shown: loaded,
                                                                  total: matchCount,
                                                              },
                                                          )
                                                        : t(
                                                              'Showing {shown} of {total} articles',
                                                              {
                                                                  shown: loaded,
                                                                  total: matchCount,
                                                              },
                                                          )}
                                                </p>
                                                <a
                                                    href={nextHref}
                                                    rel="next"
                                                    aria-busy={
                                                        loading || undefined
                                                    }
                                                    className={cn(
                                                        'btn-outline min-w-[240px]',
                                                        loading &&
                                                            'pointer-events-none opacity-70',
                                                    )}
                                                    onClick={(e) => {
                                                        e.preventDefault();

                                                        if (!loading) {
                                                            focusFrom.current =
                                                                loaded;
                                                            fetch();
                                                        }
                                                    }}
                                                >
                                                    {loading
                                                        ? t('Loading…')
                                                        : t(
                                                              'Load more ({count} remaining)',
                                                              {
                                                                  count:
                                                                      matchCount -
                                                                      loaded,
                                                              },
                                                          )}
                                                </a>
                                            </div>
                                        ) : null
                                    }
                                >
                                    {rows}
                                </InfiniteScroll>

                                {matchCount === 0 && (
                                    <p className="mt-6 text-ink-soft">
                                        {supplement
                                            ? t(
                                                  'No contributions in this supplement match “{query}”.',
                                                  { query: filters.q },
                                              )
                                            : t(
                                                  'No articles in this issue match “{query}”.',
                                                  { query: filters.q },
                                              )}
                                    </p>
                                )}

                                {loaded > 12 && (
                                    <p className="m-0 mt-8 text-center">
                                        <a
                                            href="#issue-title"
                                            className="link-u text-ui"
                                        >
                                            {t('Back to top')}
                                        </a>
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    <aside
                        aria-labelledby="browse-issues"
                        className="min-w-0 lg:col-span-4 lg:pl-6"
                    >
                        <div className="lg:sticky lg:top-[88px]">
                            <BrowseIssues
                                issues={issues}
                                active={issue.slug}
                                t={t}
                            />
                        </div>
                    </aside>
                </div>
            </section>

            {cite.dialog}
        </>
    );
}

function IssueHero({
    issue,
    crumbs,
    part,
    count,
    citation,
    journal,
}: {
    issue: IssueDetail;
    crumbs: Crumb[];
    part: string | null;
    count: number;
    citation: string;
    journal: JournalFacts;
}) {
    const { t, locale } = useT();
    const supplement = issue.kind === 'supplement';
    const inProgress = !issue.isPublished;
    const empty = count === 0;
    const pdfSize = issue.pdfBytes ? formatBytes(issue.pdfBytes, locale) : null;

    const eyebrow = inProgress
        ? t('Early online')
        : issue.isCurrent
          ? t('Current issue')
          : supplement
            ? t('Supplement')
            : null;

    const coverCaption =
        supplement && issue.note
            ? `${part}, ${issue.note}`
            : (part ?? t('Volume {volume}', { volume: issue.volume }));
    const coverVariant =
        supplement || issue.kind === 'abstracts' ? 'supplement' : 'regular';

    const published = issue.publishedRange ?? String(issue.year);
    const wide = published.length > 14;

    const meta: { label: string; value: ReactNode; wide?: boolean }[] = [
        ...(!empty
            ? [
                  {
                      label: supplement ? t('Contributions') : t('Articles'),
                      value: count,
                  },
              ]
            : []),
        ...(issue.firstPage !== null && issue.lastPage !== null
            ? [
                  {
                      label: t('Pages'),
                      value: `${issue.firstPage}–${issue.lastPage}`,
                  },
              ]
            : empty && issue.pdfPages
              ? [{ label: t('Pages'), value: issue.pdfPages }]
              : []),
        ...(empty && pdfSize
            ? [{ label: t('File size'), value: pdfSize }]
            : []),
        {
            label: issue.publishedRange
                ? t('Published online')
                : inProgress
                  ? t('Volume year')
                  : t('Published'),
            value: published,
            wide,
        },
    ];

    return (
        <section
            aria-labelledby="issue-title"
            className="border-b border-line bg-mist"
        >
            <div className="page-wrap pt-6 pb-10 md:pt-8 md:pb-14">
                <Breadcrumbs items={crumbs} className="mb-7 md:mb-10" />

                <div className="grid grid-cols-[104px_minmax(0,1fr)] gap-x-5 gap-y-6 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-x-8 lg:grid-cols-12 lg:gap-x-6">
                    <div className="sm:row-span-2 lg:col-span-3 lg:pr-6">
                        {/* Phones get the small cover typography; the full cover from sm up. */}
                        <div className="sm:hidden">
                            <IssueCover
                                volume={issue.volume}
                                caption={coverCaption}
                                variant={coverVariant}
                                size="sm"
                                image={issue.coverImage}
                                alt={t('Cover of {issue}', {
                                    issue: issue.label,
                                })}
                                className={COVER_SHADOW}
                            />
                        </div>
                        <div className="hidden max-w-[220px] sm:block">
                            <IssueCover
                                volume={issue.volume}
                                caption={coverCaption}
                                year={
                                    inProgress ? t('In progress') : issue.year
                                }
                                variant={coverVariant}
                                size="md"
                                image={issue.coverImage}
                                alt={t('Cover of {issue}', {
                                    issue: issue.label,
                                })}
                                priority
                                className={COVER_SHADOW}
                            />
                        </div>
                    </div>

                    <div className="flex min-w-0 flex-col gap-2 self-center sm:self-end lg:col-span-9 lg:pt-2">
                        {(eyebrow || inProgress) && (
                            <div className="flex flex-wrap items-center gap-2.5">
                                {inProgress && (
                                    <span className="inline-flex h-6 items-center rounded-full border border-brand/25 bg-white px-2.5 text-eyebrow font-semibold tracking-[0.06em] text-brand-dark uppercase">
                                        {t('In progress')}
                                    </span>
                                )}
                                {eyebrow && (
                                    <p className="eyebrow">{eyebrow}</p>
                                )}
                            </div>
                        )}
                        <h1
                            id="issue-title"
                            tabIndex={-1}
                            className="m-0 scroll-mt-[var(--anchor-offset)] font-serif text-h1 font-medium text-ink focus:outline-none"
                        >
                            {issue.label}
                        </h1>
                        {supplement && (issue.fullTitle || issue.note) && (
                            <p className="m-0 max-w-[60ch] text-body text-ink-soft">
                                {issue.fullTitle ?? issue.note}
                                {issue.locationDates && (
                                    <span className="block text-ui text-ink-muted">
                                        {issue.locationDates}
                                    </span>
                                )}
                            </p>
                        )}
                        {issue.kind === 'abstracts' && issue.note && (
                            <p className="m-0 max-w-[60ch] text-body text-ink-soft">
                                {issue.note}
                            </p>
                        )}
                        {issue.doi && (
                            <p className="m-0 text-ui text-ink-muted">
                                <span className="font-semibold text-ink-soft">
                                    DOI
                                </span>{' '}
                                {issue.doiUrl ? (
                                    <a
                                        href={issue.doiUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="[overflow-wrap:anywhere]"
                                    >
                                        {issue.doiUrl.replace(
                                            /^https:\/\//,
                                            '',
                                        )}
                                    </a>
                                ) : (
                                    issue.doi
                                )}
                            </p>
                        )}
                    </div>

                    <div className="col-span-2 flex flex-col gap-6 sm:col-span-1 sm:col-start-2 sm:self-start lg:col-span-9 lg:col-start-4">
                        <dl className="m-0 grid max-w-[720px] grid-cols-2 gap-x-6 gap-y-4 border-t border-line-strong pt-5 sm:grid-cols-4">
                            {meta.map((item) => (
                                <div
                                    key={item.label}
                                    className={cn(
                                        'flex min-w-0 flex-col gap-0.5',
                                        item.wide && 'col-span-2',
                                    )}
                                >
                                    <dt className="text-meta font-semibold tracking-[0.04em] text-ink-muted uppercase">
                                        {item.label}
                                    </dt>
                                    <dd className="m-0 text-[17px] font-semibold text-ink tabular-nums">
                                        {item.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5">
                            {issue.pdf && (
                                <a href={issue.pdf} className="btn-primary">
                                    <DownloadIcon />
                                    {issue.kind === 'abstracts'
                                        ? t('Book of Abstracts (PDF)')
                                        : supplement
                                          ? t('Download supplement (PDF)')
                                          : t('Download issue (PDF)')}
                                    {pdfSize && (
                                        <span className="font-normal text-white/80 tabular-nums">
                                            {pdfSize}
                                        </span>
                                    )}
                                </a>
                            )}
                            {issue.coverPdf && (
                                <a
                                    href={issue.coverPdf}
                                    className="btn-outline"
                                >
                                    <DownloadIcon className="text-brand" />
                                    {t('Cover page (PDF)')}
                                </a>
                            )}
                            {issue.tocPdf && (
                                <a href={issue.tocPdf} className="btn-outline">
                                    <DownloadIcon className="text-brand" />
                                    {t('Contents (PDF)')}
                                </a>
                            )}
                            <button
                                type="button"
                                className="btn-outline"
                                onClick={() =>
                                    copyText(
                                        citation,
                                        t('Issue citation copied'),
                                    )
                                }
                            >
                                {locale === 'en'
                                    ? t('Cite this issue')
                                    : t('Copy citation (English)')}
                            </button>
                        </div>

                        <p className="m-0 flex flex-wrap gap-x-2 text-meta text-ink-muted tabular-nums">
                            <span>
                                {t('Print ISSN {issn}', {
                                    issn: journal.issnPrint,
                                })}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>
                                {t('Online ISSN {issn}', {
                                    issn: journal.issnOnline,
                                })}
                            </span>
                            {journal.openAccess && (
                                <>
                                    <span aria-hidden="true">·</span>
                                    <span>{t('Open access')}</span>
                                </>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

/** Issues that exist only as one PDF (a Book of Abstracts, an old supplement). */
function EmptyIssue({ issue }: { issue: IssueDetail }) {
    const { t } = useT();
    const heading =
        issue.kind === 'abstracts' ? t('Book of Abstracts') : t('Full text');

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-2 border-b border-line-strong pb-5">
                <h2
                    id="issue-pdf-title"
                    className="m-0 font-serif text-h2 font-medium"
                >
                    {heading}
                </h2>
                <p className="m-0 max-w-[62ch] text-ink-soft">
                    {issue.pdf
                        ? t(
                              'This issue is published as a single PDF; its contributions are not listed separately.',
                          )
                        : t(
                              'The contents of this issue are not available online.',
                          )}
                </p>
            </div>
            {issue.pdf && (
                <PdfViewer
                    src={issue.pdf}
                    title={issue.label}
                    pages={issue.pdfPages}
                    bytes={issue.pdfBytes}
                    thumb={issue.coverImage}
                />
            )}
        </div>
    );
}

/** "Go to no. [ 125 ] Go": jumps to a contribution in a large supplement. */
function GoToNumber({
    issue,
    count,
    rows,
}: {
    issue: IssueDetail;
    count: number;
    rows: RowArticle[];
}) {
    const { t } = useT();
    const [value, setValue] = useState('');
    const [error, setError] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const n = Number.parseInt(value, 10);

        if (!Number.isInteger(n) || n < 1 || n > count) {
            setError(t('Enter a number from 1 to {count}.', { count }));

            return;
        }

        setError(null);
        const number = String(n).padStart(3, '0');
        const loadedRow = rows.find((row) => row.number === number);

        if (loadedRow) {
            const heading = document.getElementById(articleTitleId(loadedRow));
            heading?.scrollIntoView({ block: 'center' });
            heading?.querySelector('a')?.focus({ preventScroll: true });

            return;
        }

        // Not loaded yet: open the contribution itself.
        router.visit(articleHref({ issueSlug: issue.slug, number }));
    };

    return (
        <form
            onSubmit={submit}
            noValidate
            role="search"
            aria-label={t('Go to a contribution by number')}
            className="flex flex-col gap-1.5"
        >
            <label
                htmlFor="goto-number"
                className="text-ui font-semibold text-ink"
            >
                {t('Go to no.')}
            </label>
            <div className="flex gap-2">
                <input
                    id="goto-number"
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    pattern="[0-9]*"
                    maxLength={4}
                    value={value}
                    onChange={(e) => {
                        setValue(e.target.value.replace(/\D/g, ''));
                        setError(null);
                    }}
                    placeholder="001"
                    aria-invalid={error ? true : undefined}
                    aria-describedby={error ? 'goto-error' : undefined}
                    className="field h-11 w-[4.5rem] px-3 text-ui tabular-nums"
                />
                <button type="submit" className="btn-outline px-4">
                    {t('Go')}
                </button>
            </div>
            {error && (
                <p
                    id="goto-error"
                    role="alert"
                    className="m-0 text-meta text-danger"
                >
                    {error}
                </p>
            )}
        </form>
    );
}

function BrowseIssues({
    issues,
    active,
    t,
}: {
    issues: IssueSummary[];
    active: string;
    t: Translate;
}) {
    return (
        <nav aria-labelledby="browse-issues" className="flex flex-col">
            <h2
                id="browse-issues"
                className="m-0 mb-3 border-b border-line-strong pb-3 font-sans text-ui font-semibold tracking-[0.06em] text-ink uppercase"
            >
                {t('Browse issues')}
            </h2>
            <ul className="m-0 flex list-none flex-col p-0">
                {issues.map((item) => {
                    const current = item.slug === active;
                    const sub = !item.isPublished
                        ? t('Early online')
                        : item.isCurrent
                          ? t('Current issue')
                          : item.kind === 'supplement' && item.note
                            ? `${item.note} · ${item.year}`
                            : String(item.year);

                    return (
                        <li key={item.slug}>
                            <Link
                                href={showIssue(item.slug)}
                                prefetch
                                aria-current={current ? 'page' : undefined}
                                className={cn(
                                    'flex flex-col border-l-2 py-2 pr-2 pl-3.5 text-ink no-underline hover:border-brand hover:bg-mist hover:text-ink',
                                    current
                                        ? 'border-brand bg-tint hover:bg-tint'
                                        : 'border-line',
                                )}
                            >
                                <span
                                    className={cn(
                                        'text-ui',
                                        current &&
                                            'font-semibold text-brand-dark',
                                    )}
                                >
                                    {item.label}
                                </span>
                                <span
                                    className={cn(
                                        'text-meta tabular-nums',
                                        !item.isPublished
                                            ? 'font-semibold text-brand'
                                            : 'text-ink-muted',
                                    )}
                                >
                                    {sub}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
            <Link href={archive()} className="link-u mt-4 self-start text-ui">
                {t('All issues in the archive')}
            </Link>
        </nav>
    );
}
