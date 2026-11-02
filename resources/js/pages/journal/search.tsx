import { Head, Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import type { ReactNode } from 'react';
import { ArticleRow, useRowCite } from '@/components/journal/article-row';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import { SearchForm } from '@/components/journal/search-form';
import { archive, home, search } from '@/routes';
import { show as showPage } from '@/routes/pages';
import type { ArticleSummary, ContentLang, IssueKind } from '@/types/journal';
import { useT } from '@/lib/i18n';

type Kind = 'regular' | 'supplement' | 'abstracts';
type Sort = 'relevance' | 'newest' | 'oldest';

type Filters = {
    type: string | null;
    kind: Kind | null;
    from: number | null;
    to: number | null;
    volume: number | null;
    sort: Sort;
};

/** A result row (App\Journal\Search\ArticleSearch::present()). */
type SearchResult = ArticleSummary & {
    volume: number;
    year: number | null;
    issueKind: IssueKind;
    issueNumber: number | null;
    issuePublished: boolean;
    /** About 300 characters of the abstract around the first match. */
    excerpt: string | null;
    excerptMatch: boolean;
    excerptLang: ContentLang | null;
    /** Keywords that contain a search term. */
    matchedKeywords: string[];
    keywordsLang: ContentLang | null;
};

type Facet<T> = { value: T; count: number };

type Facets = {
    kinds: Facet<Kind>[];
    types: Facet<string>[];
    years: Facet<number>[];
    volumes: (Facet<number> & { year: number | null })[];
};

type Props = {
    query: string;
    /** Folded search terms, for highlighting. */
    terms: string[];
    filters: Filters;
    results: SearchResult[];
    pagination: {
        page: number;
        lastPage: number;
        perPage: number;
        total: number;
    };
    facets: Facets;
    /** Aims & scope subjects that have articles (only when nothing was found). */
    topics: { label: string; count: number }[];
    scopePath: string | null;
};

type Overrides = Partial<Filters> & { page?: number };

const KIND_LABELS: Record<Kind, string> = {
    regular: 'Regular issues',
    supplement: 'Supplements',
    abstracts: 'Books of abstracts',
};

const SORT_LABELS: Record<Sort, string> = {
    relevance: 'Relevance',
    newest: 'Newest',
    oldest: 'Oldest',
};

/** Builds a search URL from the current state with some values changed (page resets). */
function useSearchHref(query: string, filters: Filters) {
    const defaultSort: Sort = query.trim() ? 'relevance' : 'newest';

    return (overrides: Overrides = {}) => {
        const next = { ...filters, ...overrides };
        const params: Record<string, string | number> = {};

        if (query) {
            params.q = query;
        }

        if (next.type) {
            params.type = next.type;
        }

        if (next.kind) {
            params.kind = next.kind;
        }

        if (next.from) {
            params.from = next.from;
        }

        if (next.to) {
            params.to = next.to;
        }

        if (next.volume) {
            params.volume = next.volume;
        }

        if (next.sort !== defaultSort) {
            params.sort = next.sort;
        }

        if (overrides.page && overrides.page > 1) {
            params.page = overrides.page;
        }

        return search.url({ query: params });
    };
}

export default function SearchPage({
    query,
    terms,
    filters,
    results,
    pagination,
    facets,
    topics,
    scopePath,
}: Props) {
    const { t, locale } = useT();
    const href = useSearchHref(query, filters);
    const filtered =
        filters.type !== null ||
        filters.kind !== null ||
        filters.from !== null ||
        filters.to !== null ||
        filters.volume !== null;
    const active = query.trim() !== '' || filtered;
    const cite = useRowCite(
        results.map((r) => ({
            slug: r.issueSlug,
            volume: r.volume,
            number: r.issueNumber,
            kind: r.issueKind,
            year: r.year ?? 0,
        })),
    );
    const number = (n: number) => n.toLocaleString(locale);

    return (
        <>
            <Head
                title={
                    query
                        ? t('Search results for “{query}”', { query })
                        : t('Search')
                }
            />

            <section className="border-b border-line bg-mist">
                <div className="page-wrap flex flex-col gap-6 pt-6 pb-8 md:pt-8 md:pb-10">
                    <Breadcrumbs
                        items={[
                            { label: t('Home'), href: home.url() },
                            { label: t('Search') },
                        ]}
                    />
                    <div className="flex flex-col gap-2">
                        <h1 className="m-0 font-serif text-h1 font-medium text-ink">
                            {t('Search the Bulletin')}
                        </h1>
                        <p className="m-0 max-w-[62ch] text-body text-ink-soft">
                            {t(
                                'Titles, authors, keywords and abstracts of every article in the archive. Latin and Cyrillic both work, with or without diacritics.',
                            )}
                        </p>
                    </div>
                    <SearchForm
                        key={query}
                        id="search-page"
                        label={t('Search articles, authors and keywords')}
                        placeholder={t('e.g. HPLC, pharmacokinetics, Dimovski')}
                        defaultValue={query}
                        className="max-w-[760px]"
                    />
                </div>
            </section>

            <div className="page-wrap pt-8 section-pb md:pt-10">
                <div className="grid gap-x-6 gap-y-8 lg:grid-cols-12 lg:gap-x-12">
                    <FilterRail
                        className="lg:col-span-3"
                        active={active}
                        facets={facets}
                        filters={filters}
                        query={query}
                        filtered={filtered}
                        href={href}
                    />

                    <div className="min-w-0 lg:col-span-9">
                        {!active ? (
                            <Landing />
                        ) : (
                            <>
                                <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line-strong pb-4">
                                    <div className="flex min-w-0 flex-col gap-1">
                                        <h2
                                            id="results-heading"
                                            className="m-0 font-serif text-h3 font-medium text-pretty text-ink"
                                        >
                                            <ResultCount
                                                total={pagination.total}
                                                query={query}
                                            />
                                        </h2>
                                        {pagination.total >
                                            pagination.perPage && (
                                            <p className="m-0 text-meta text-ink-muted tabular-nums">
                                                {t(
                                                    'Showing {from}–{to} of {total}',
                                                    {
                                                        from: number(
                                                            (pagination.page -
                                                                1) *
                                                                pagination.perPage +
                                                                1,
                                                        ),
                                                        to: number(
                                                            (pagination.page -
                                                                1) *
                                                                pagination.perPage +
                                                                results.length,
                                                        ),
                                                        total: number(
                                                            pagination.total,
                                                        ),
                                                    },
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    {pagination.total > 1 && (
                                        <SortControl
                                            current={filters.sort}
                                            hasQuery={query.trim() !== ''}
                                            href={href}
                                        />
                                    )}
                                </div>

                                {filtered && (
                                    <ActiveFilters
                                        filters={filters}
                                        href={href}
                                    />
                                )}

                                {results.length > 0 ? (
                                    <>
                                        <ol
                                            className="m-0 list-none p-0"
                                            aria-labelledby="results-heading"
                                        >
                                            {results.map((result) => (
                                                <li
                                                    key={`${result.issueSlug}/${result.number}`}
                                                    className="m-0"
                                                >
                                                    <Result
                                                        result={result}
                                                        terms={terms}
                                                        onCite={cite.onCite}
                                                    />
                                                </li>
                                            ))}
                                        </ol>
                                        <Pagination
                                            page={pagination.page}
                                            lastPage={pagination.lastPage}
                                            href={href}
                                        />
                                    </>
                                ) : (
                                    <NoResults
                                        query={query}
                                        filtered={filtered}
                                        clearHref={href({
                                            type: null,
                                            kind: null,
                                            from: null,
                                            to: null,
                                            volume: null,
                                        })}
                                        topics={topics}
                                        scopePath={scopePath}
                                    />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {cite.dialog}
        </>
    );
}

function ResultCount({ total, query }: { total: number; query: string }) {
    const { t, locale } = useT();
    const count = total.toLocaleString(locale);

    if (!query.trim()) {
        return total === 1 ? t('1 article') : t('{count} articles', { count });
    }

    if (total === 0) {
        return t('No results for “{query}”', { query });
    }

    return total === 1
        ? t('1 result for “{query}”', { query })
        : t('{count} results for “{query}”', { count, query });
}

/** "Vol. 72 (2026), Suppl. 1": where the article appeared, in one short form. */
function useIssueShort() {
    const { t } = useT();

    return (r: SearchResult) => {
        const volume =
            r.year !== null
                ? t('Vol. {volume} ({year})', {
                      volume: r.volume,
                      year: r.year,
                  })
                : t('Vol. {volume}', { volume: r.volume });

        switch (r.issueKind) {
            case 'issue':
                return `${volume}, ${t('No. {number}', { number: r.issueNumber ?? '' })}`;
            case 'supplement':
                return `${volume}, ${t('Suppl. {number}', { number: r.issueNumber ?? '' })}`;
            case 'abstracts':
                return `${volume}, ${t('Book of Abstracts')}`;
            default:
                return volume;
        }
    };
}

function Result({
    result,
    terms,
    onCite,
}: {
    result: SearchResult;
    terms: string[];
    onCite: (article: SearchResult) => void;
}) {
    const { t } = useT();
    const issueShort = useIssueShort();
    const badge = result.issuePublished
        ? t('Vol. {volume} · {year}', {
              volume: result.volume,
              year: result.year ?? '',
          })
        : t('Early online');

    return (
        <div className="relative">
            {/* Scanning aid only: the same facts are in the row's meta line. */}
            <span
                aria-hidden="true"
                className={cn(
                    'absolute top-[17px] right-0 hidden h-[22px] items-center rounded-full px-2.5 text-eyebrow font-semibold tracking-[0.02em] whitespace-nowrap tabular-nums sm:inline-flex md:top-[21px]',
                    result.issuePublished
                        ? 'bg-mist text-ink-soft ring-1 ring-line-card ring-inset'
                        : 'bg-tint text-brand-dark',
                )}
            >
                {badge}
            </span>
            <ArticleRow
                article={{
                    ...result,
                    issueLabel: result.issuePublished
                        ? issueShort(result)
                        : `${issueShort(result)} · ${t('Early online')}`,
                    // The server sends an excerpt around the match, not the abstract.
                    abstract: result.excerpt,
                    keywords: result.matchedKeywords,
                }}
                variant="toc"
                headingLevel={3}
                showIssue
                highlight={terms}
                // The clean result: the excerpt must not end up in RIS/BibTeX as the abstract.
                onCite={() => onCite(result)}
                className={cn(
                    // No type line: keep its height, so the badge never sits beside the title.
                    !result.type && 'sm:pt-[42px] md:pt-[46px]',
                )}
            />
        </div>
    );
}

function SortControl({
    current,
    hasQuery,
    href,
}: {
    current: Sort;
    hasQuery: boolean;
    href: (o?: Overrides) => string;
}) {
    const { t } = useT();
    const sorts: Sort[] = hasQuery
        ? ['relevance', 'newest', 'oldest']
        : ['newest', 'oldest'];

    return (
        <nav aria-label={t('Sort results')} className="flex items-center gap-3">
            <span
                className="text-meta font-semibold text-ink-muted"
                aria-hidden="true"
            >
                {t('Sort by')}
            </span>
            <ul className="m-0 flex list-none rounded-md border border-control p-0.5">
                {sorts.map((sort) => (
                    <li key={sort} className="m-0">
                        <Link
                            href={href({ sort })}
                            preserveScroll
                            aria-current={sort === current ? 'true' : undefined}
                            className={cn(
                                'flex min-h-10 items-center rounded-[5px] px-3 text-ui font-semibold no-underline transition-colors',
                                sort === current
                                    ? 'bg-brand text-white hover:bg-brand-dark hover:text-white'
                                    : 'text-ink-soft hover:bg-mist hover:text-ink',
                            )}
                        >
                            {t(SORT_LABELS[sort])}
                        </Link>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function ActiveFilters({
    filters,
    href,
}: {
    filters: Filters;
    href: (o?: Overrides) => string;
}) {
    const { t } = useT();
    const chips: { label: string; remove: Overrides }[] = [];

    if (filters.kind) {
        chips.push({
            label: t(KIND_LABELS[filters.kind]),
            remove: { kind: null },
        });
    }

    if (filters.type) {
        chips.push({ label: t(filters.type), remove: { type: null } });
    }

    if (filters.from || filters.to) {
        chips.push({
            label:
                filters.from && filters.to
                    ? filters.from === filters.to
                        ? String(filters.from)
                        : `${filters.from}–${filters.to}`
                    : filters.from
                      ? t('From {year}', { year: filters.from })
                      : t('Until {year}', { year: filters.to ?? '' }),
            remove: { from: null, to: null },
        });
    }

    if (filters.volume) {
        chips.push({
            label: t('Volume {volume}', { volume: filters.volume }),
            remove: { volume: null },
        });
    }

    return (
        <div className="flex flex-wrap items-center gap-2 pt-4">
            <span className="text-meta font-semibold text-ink-muted">
                {t('Filtered by')}
            </span>
            {chips.map((chip) => (
                <Link
                    key={chip.label}
                    href={href(chip.remove)}
                    preserveScroll
                    aria-label={t('Remove filter: {filter}', {
                        filter: chip.label,
                    })}
                    className="chip min-h-8 border-control bg-white font-semibold text-ink no-underline hover:border-brand hover:text-brand-dark"
                >
                    {chip.label}
                    <span
                        aria-hidden="true"
                        className="text-base leading-none text-ink-muted"
                    >
                        ×
                    </span>
                </Link>
            ))}
            {chips.length > 1 && (
                <Link
                    href={href({
                        type: null,
                        kind: null,
                        from: null,
                        to: null,
                        volume: null,
                    })}
                    preserveScroll
                    className="text-meta font-semibold underline decoration-underline underline-offset-4"
                >
                    {t('Clear all')}
                </Link>
            )}
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

function FilterRail({
    className,
    active,
    facets,
    filters,
    query,
    filtered,
    href,
}: {
    className?: string;
    active: boolean;
    facets: Facets;
    filters: Filters;
    query: string;
    filtered: boolean;
    href: (o?: Overrides) => string;
}) {
    const { t } = useT();
    const activeCount = [
        filters.kind,
        filters.type,
        filters.from ?? filters.to,
        filters.volume,
    ].filter((v) => v !== null).length;
    const kindTotal = facets.kinds.reduce((sum, k) => sum + k.count, 0);
    const typeTotal = kindTotal;

    return (
        <aside aria-labelledby="filters-heading" className={className}>
            {/*
              One set of controls for every width: a disclosure on small
              screens, always open from lg (CSS shows the content even before
              hydration; the ref opens it for assistive technology).
            */}
            <details
                ref={(el) => {
                    if (
                        el &&
                        typeof window !== 'undefined' &&
                        window.matchMedia('(min-width: 64rem)').matches
                    ) {
                        el.open = true;
                    }
                }}
                className="group lg:sticky lg:top-[88px] lg:[&::details-content]:[content-visibility:visible]"
            >
                <summary className="btn-outline w-full cursor-pointer list-none justify-between lg:hidden [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2">
                        <FilterIcon />
                        {active ? t('Filter results') : t('Browse by')}
                        {activeCount > 0 && (
                            <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand text-meta text-white tabular-nums">
                                {activeCount}
                            </span>
                        )}
                    </span>
                    <span
                        aria-hidden="true"
                        className="text-ink-muted transition-transform group-open:rotate-180"
                    >
                        ▾
                    </span>
                </summary>

                <div className="mt-4 flex flex-col gap-7 lg:mt-0">
                    <div className="flex items-baseline justify-between gap-3 border-b border-line-strong pb-3 max-lg:sr-only">
                        <h2
                            id="filters-heading"
                            className="m-0 font-sans text-ui font-semibold text-ink"
                        >
                            {active ? t('Refine results') : t('Browse by')}
                        </h2>
                        {filtered && (
                            <Link
                                href={href({
                                    type: null,
                                    kind: null,
                                    from: null,
                                    to: null,
                                    volume: null,
                                })}
                                preserveScroll
                                className="text-meta font-semibold"
                            >
                                {t('Clear filters')}
                            </Link>
                        )}
                    </div>

                    {(facets.kinds.length > 0 || filters.kind !== null) && (
                        <FacetGroup title={t('Issue type')}>
                            <FacetLink
                                href={href({ kind: null })}
                                current={filters.kind === null}
                                label={t('All issues')}
                                count={kindTotal}
                            />
                            {facets.kinds.map((kind) => (
                                <FacetLink
                                    key={kind.value}
                                    href={href({ kind: kind.value })}
                                    current={filters.kind === kind.value}
                                    label={t(KIND_LABELS[kind.value])}
                                    count={kind.count}
                                />
                            ))}
                        </FacetGroup>
                    )}

                    {facets.types.length > 0 && (
                        <FacetGroup title={t('Article type')}>
                            <FacetLink
                                href={href({ type: null })}
                                current={filters.type === null}
                                label={t('All types')}
                                count={filters.type === null ? typeTotal : null}
                            />
                            {facets.types.map((type) => (
                                <FacetLink
                                    key={type.value}
                                    href={href({ type: type.value })}
                                    current={filters.type === type.value}
                                    label={t(type.value)}
                                    count={type.count}
                                />
                            ))}
                            {filters.type !== null &&
                                !facets.types.some(
                                    (type) => type.value === filters.type,
                                ) && (
                                    <FacetLink
                                        href={href({ type: filters.type })}
                                        current
                                        label={t(filters.type)}
                                        count={0}
                                    />
                                )}
                        </FacetGroup>
                    )}

                    <DateFilters
                        facets={facets}
                        filters={filters}
                        query={query}
                    />
                </div>
            </details>
        </aside>
    );
}

function FacetGroup({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col gap-2">
            <h3 className="eyebrow text-ink-muted">{title}</h3>
            <ul className="m-0 flex list-none flex-col p-0">{children}</ul>
        </section>
    );
}

function FacetLink({
    href,
    current,
    label,
    count,
}: {
    href: string;
    current: boolean;
    label: string;
    count: number | null;
}) {
    const { locale } = useT();

    return (
        <li className="m-0">
            <Link
                href={href}
                preserveScroll
                aria-current={current ? 'true' : undefined}
                className={cn(
                    '-ml-px flex min-h-10 items-center justify-between gap-3 border-l-2 py-1.5 pr-1 pl-3 text-ui no-underline transition-colors',
                    current
                        ? 'border-brand font-semibold text-brand-dark'
                        : 'border-line text-ink-soft hover:border-brand hover:text-brand-dark',
                )}
            >
                <span className="min-w-0">{label}</span>
                {count !== null && (
                    <span
                        className={cn(
                            'shrink-0 text-meta tabular-nums',
                            current ? 'text-brand-dark' : 'text-ink-muted',
                        )}
                    >
                        {count.toLocaleString(locale)}
                    </span>
                )}
            </Link>
        </li>
    );
}

/**
 * Year range and volume: a plain GET form, so it works before (or without)
 * JavaScript. Applied with the button rather than on change (WCAG 3.2.2).
 */
function DateFilters({
    facets,
    filters,
    query,
}: {
    facets: Facets;
    filters: Filters;
    query: string;
}) {
    const { t } = useT();
    const years = facets.years.map((y) => y.value);

    for (const year of [filters.from, filters.to]) {
        if (year !== null && !years.includes(year)) {
            years.push(year);
        }
    }

    years.sort((a, b) => b - a);

    const count = (year: number) =>
        facets.years.find((y) => y.value === year)?.count ?? 0;
    const volumes = [...facets.volumes];

    if (
        filters.volume !== null &&
        !volumes.some((v) => v.value === filters.volume)
    ) {
        volumes.unshift({ value: filters.volume, year: null, count: 0 });
    }

    const select =
        'field h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%278%27%3E%3Cpath d=%27M1 1l5 5 5-5%27 fill=%27none%27 stroke=%27%235B667A%27 stroke-width=%271.6%27/%3E%3C/svg%3E")] bg-[position:right_12px_center] bg-no-repeat pr-8 pl-3 text-ui tabular-nums';

    return (
        <form
            method="get"
            action={search.url()}
            className="flex flex-col gap-7"
        >
            {query && <input type="hidden" name="q" value={query} />}
            {filters.type && (
                <input type="hidden" name="type" value={filters.type} />
            )}
            {filters.kind && (
                <input type="hidden" name="kind" value={filters.kind} />
            )}
            {filters.sort !== (query.trim() ? 'relevance' : 'newest') && (
                <input type="hidden" name="sort" value={filters.sort} />
            )}

            <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
                <legend className="eyebrow mb-2 p-0 text-ink-muted">
                    {t('Publication year')}
                </legend>
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex min-w-0 flex-col gap-1 text-meta font-semibold text-ink-soft">
                        {t('From')}
                        <select
                            name="from"
                            defaultValue={filters.from ?? ''}
                            className={select}
                        >
                            <option value="">{t('Any')}</option>
                            {years.toReversed().map((year) => (
                                <option key={year} value={year}>
                                    {year} ({count(year)})
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex min-w-0 flex-col gap-1 text-meta font-semibold text-ink-soft">
                        {t('To')}
                        <select
                            name="to"
                            defaultValue={filters.to ?? ''}
                            className={select}
                        >
                            <option value="">{t('Any')}</option>
                            {years.map((year) => (
                                <option key={year} value={year}>
                                    {year} ({count(year)})
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
            </fieldset>

            <div className="flex flex-col gap-1">
                <label
                    htmlFor="search-volume"
                    className="eyebrow mb-2 text-ink-muted"
                >
                    {t('Volume')}
                </label>
                <select
                    id="search-volume"
                    name="volume"
                    defaultValue={filters.volume ?? ''}
                    className={select}
                >
                    <option value="">{t('All volumes')}</option>
                    {volumes.map((volume) => (
                        <option key={volume.value} value={volume.value}>
                            {volume.year !== null
                                ? t('Vol. {volume} · {year}', {
                                      volume: volume.value,
                                      year: volume.year,
                                  })
                                : t('Vol. {volume}', {
                                      volume: volume.value,
                                  })}{' '}
                            ({volume.count})
                        </option>
                    ))}
                </select>
            </div>

            <button type="submit" className="btn-outline w-full">
                {t('Apply')}
            </button>
        </form>
    );
}

/* ------------------------------------------------------------------ */
/* Pagination, empty states                                            */
/* ------------------------------------------------------------------ */

/** Page numbers to show: first, last, and two either side of the current one. */
function pageList(page: number, last: number): (number | 'gap')[] {
    const pages = new Set(
        [1, last, page - 2, page - 1, page, page + 1, page + 2].filter(
            (p) => p >= 1 && p <= last,
        ),
    );
    const sorted = [...pages].sort((a, b) => a - b);
    const out: (number | 'gap')[] = [];

    sorted.forEach((p, index) => {
        const previous = sorted[index - 1];

        if (previous !== undefined && p - previous > 1) {
            out.push(p - previous === 2 ? p - 1 : 'gap');
        }

        out.push(p);
    });

    return out;
}

function Pagination({
    page,
    lastPage,
    href,
}: {
    page: number;
    lastPage: number;
    href: (o?: Overrides) => string;
}) {
    const { t } = useT();

    if (lastPage <= 1) {
        return null;
    }

    const box =
        'flex min-h-11 min-w-11 items-center justify-center rounded-md px-3 text-ui font-semibold tabular-nums no-underline transition-colors';

    return (
        <nav
            aria-label={t('Pagination')}
            className="mt-10 flex flex-wrap items-center justify-between gap-4"
        >
            <p className="m-0 text-meta text-ink-muted tabular-nums">
                {t('Page {page} of {pages}', { page, pages: lastPage })}
            </p>
            <ul className="m-0 flex list-none flex-wrap items-center gap-1 p-0">
                <li className="m-0">
                    {page > 1 ? (
                        <Link
                            href={href({ page: page - 1 })}
                            rel="prev"
                            className={cn(
                                box,
                                'border border-control text-ink hover:border-brand hover:bg-mist',
                            )}
                        >
                            <span aria-hidden="true">←&nbsp;</span>
                            {t('Previous')}
                        </Link>
                    ) : null}
                </li>
                {pageList(page, lastPage).map((p, index) =>
                    p === 'gap' ? (
                        <li
                            key={`gap-${index}`}
                            aria-hidden="true"
                            className="m-0 px-1 text-ink-muted max-sm:hidden"
                        >
                            …
                        </li>
                    ) : (
                        <li key={p} className="m-0 max-sm:hidden">
                            <Link
                                href={href({ page: p })}
                                aria-current={p === page ? 'page' : undefined}
                                aria-label={t('Page {page}', { page: p })}
                                className={cn(
                                    box,
                                    p === page
                                        ? 'bg-brand text-white hover:bg-brand-dark hover:text-white'
                                        : 'text-ink-soft hover:bg-mist hover:text-ink',
                                )}
                            >
                                {p}
                            </Link>
                        </li>
                    ),
                )}
                <li className="m-0">
                    {page < lastPage ? (
                        <Link
                            href={href({ page: page + 1 })}
                            rel="next"
                            className={cn(
                                box,
                                'border border-control text-ink hover:border-brand hover:bg-mist',
                            )}
                        >
                            {t('Next')}
                            <span aria-hidden="true">&nbsp;→</span>
                        </Link>
                    ) : null}
                </li>
            </ul>
        </nav>
    );
}

function NoResults({
    query,
    filtered,
    clearHref,
    topics,
    scopePath,
}: {
    query: string;
    filtered: boolean;
    clearHref: string;
    topics: { label: string; count: number }[];
    scopePath: string | null;
}) {
    const { t } = useT();

    return (
        <div className="mt-8 flex flex-col gap-8">
            <div className="flex max-w-[70ch] flex-col gap-3">
                <p className="m-0 text-body text-ink-soft">
                    {query.trim()
                        ? t('No article matched your search. Some suggestions:')
                        : t('No article matches these filters.')}
                </p>
                <ul className="checklist">
                    {query.trim() && (
                        <li>
                            {t(
                                'Check the spelling, or try fewer or more general words: a single keyword or an author’s surname.',
                            )}
                        </li>
                    )}
                    <li>
                        {t(
                            'Latin and Cyrillic both work, with or without diacritics: “č”, “ch” and “ч” find the same words.',
                        )}
                    </li>
                    <li>
                        {t(
                            'Put a phrase in quotation marks to find the words together, e.g. “drug delivery”.',
                        )}
                    </li>
                    {filtered && (
                        <li>
                            <Link href={clearHref} className="link-u">
                                {t('Search again without filters')}
                            </Link>
                        </li>
                    )}
                </ul>
            </div>

            {topics.length > 0 && (
                <section
                    aria-labelledby="topics-heading"
                    className="flex flex-col gap-3"
                >
                    <h3
                        id="topics-heading"
                        className="m-0 font-serif text-h4 font-medium"
                    >
                        {t('Explore subjects from our aims and scope')}
                    </h3>
                    <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                        {topics.map((topic) => (
                            <li key={topic.label} className="m-0">
                                <Link
                                    href={search.url({
                                        query: { q: topic.label },
                                    })}
                                    lang="en"
                                    className="chip min-h-9 border-control bg-white text-ink no-underline hover:border-brand hover:text-brand-dark"
                                >
                                    {topic.label}
                                    <span className="text-meta text-ink-muted tabular-nums">
                                        {topic.count}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <p className="m-0 flex flex-wrap gap-x-6 gap-y-2 text-ui">
                <Link href={archive.url()} className="link-u">
                    {t('Browse the archive')}
                </Link>
                {scopePath && (
                    <Link href={showPage.url(scopePath)} className="link-u">
                        {t('Aims and scope')}
                    </Link>
                )}
            </p>
        </div>
    );
}

/** Before a search: what can be searched, and how. */
function Landing() {
    const { t } = useT();

    return (
        <div className="flex max-w-[70ch] flex-col gap-6">
            <h2 className="m-0 border-b border-line-strong pb-4 font-serif text-h3 font-medium">
                {t('Search tips')}
            </h2>
            <ul className="checklist text-ink-soft">
                <li>
                    {t(
                        'Every word must appear in the title, author names, keywords or abstract, in any order.',
                    )}
                </li>
                <li>
                    {t(
                        'Latin and Cyrillic both work, with or without diacritics: “č”, “ch” and “ч” find the same words.',
                    )}
                </li>
                <li>
                    {t(
                        'Put a phrase in quotation marks to find the words together, e.g. “drug delivery”.',
                    )}
                </li>
                <li>
                    {t(
                        'Or browse without a search: choose an issue type, article type or year on this page.',
                    )}
                </li>
            </ul>
            <p className="m-0 text-ui">
                <Link href={archive.url()} className="link-u">
                    {t('Browse the archive')}
                </Link>
            </p>
        </div>
    );
}

function FilterIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
            className="text-brand"
        >
            <path d="M4 6h16M7 12h10M10 18h4" />
        </svg>
    );
}
