import { clsx as cn } from 'clsx';
import { Head, Link, usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import { DownloadIcon } from '@/components/journal/icons';
import { IssueCover } from '@/components/journal/issue-cover';
import { archive, earlyOnline, home } from '@/routes';
import { show as showIssue } from '@/routes/issues';
import type { ArchiveVolume, IssueSummary } from '@/types/journal';
import { useT } from '@/lib/i18n';

type Props = {
    volumes: ArchiveVolume[];
};

type View = 'grid' | 'list';
type Translate = ReturnType<typeof useT>['t'];

/** The view comes from the address (?view=list), so it renders the same on the server. */
function useView(): View {
    const { url } = usePage();
    const query = url.includes('?') ? url.slice(url.indexOf('?')) : '';

    return new URLSearchParams(query).get('view') === 'list' ? 'list' : 'grid';
}

/** Short congress codes ("8CPM", "14th CESPT") read as a badge; long names as text. */
function isCode(note: string): boolean {
    return note.length <= 16;
}

/** "49, 50 and 54": built from t('and'), so it reads the same on the server and client. */
function listOf(items: number[], t: Translate): string {
    if (items.length < 2) {
        return items.join('');
    }

    return `${items.slice(0, -1).join(', ')} ${t('and')} ${items.at(-1)}`;
}

function partName(issue: IssueSummary, t: Translate): string {
    switch (issue.kind) {
        case 'issue':
            return t('Issue {number}', { number: issue.number ?? '' });
        case 'supplement':
            return t('Supplement {number}', { number: issue.number ?? '' });
        case 'abstracts':
            return t('Book of Abstracts');
        default:
            return t('Complete volume');
    }
}

function countLabel(issue: IssueSummary, t: Translate): string {
    const count = issue.articleCount ?? 0;

    if (count === 0) {
        return t('Single PDF');
    }

    if (issue.kind === 'supplement') {
        return count === 1
            ? t('{count} contribution', { count })
            : t('{count} contributions', { count });
    }

    return count === 1
        ? t('{count} article', { count })
        : t('{count} articles', { count });
}

export default function ArchivePage({ volumes }: Props) {
    const { t } = useT();
    const view = useView();
    const issueCount = volumes.reduce((n, v) => n + v.issues.length, 0);
    const oldest = volumes.at(-1);
    const newest = volumes.at(0);
    // Volumes in the run that were never put online (49, 50 and 54 at import time).
    const present = new Set(volumes.map((v) => v.volume));
    const missing =
        oldest && newest
            ? Array.from(
                  { length: newest.volume - oldest.volume + 1 },
                  (_, i) => oldest.volume + i,
              ).filter((v) => !present.has(v))
            : [];

    // Jump links grouped by decade of publication: "2020s", "2010s", …
    const decades: { decade: number; volumes: ArchiveVolume[] }[] = [];

    for (const v of volumes) {
        const decade = Math.floor((v.year ?? 0) / 10) * 10;
        const last = decades.at(-1);

        if (last && last.decade === decade) {
            last.volumes.push(v);
        } else {
            decades.push({ decade, volumes: [v] });
        }
    }

    return (
        <>
            <Head title={t('Archive')} />

            <section className="border-b border-line bg-mist">
                <div className="page-wrap flex flex-col gap-6 pt-6 pb-10 md:pt-8 md:pb-12">
                    <Breadcrumbs
                        items={[
                            { label: t('Home'), href: home.url() },
                            { label: t('Archive') },
                        ]}
                    />
                    <div className="flex flex-col gap-3">
                        <h1 className="m-0 font-serif text-h1 font-medium">
                            {t('Archive')}
                        </h1>
                        <p className="m-0 max-w-[62ch] text-ink-soft">
                            {oldest
                                ? t(
                                      '{count} issues, back to Volume {volume} ({year}). Every article is free to read and download.',
                                      {
                                          count: issueCount,
                                          volume: oldest.volume,
                                          year: oldest.year ?? '',
                                      },
                                  )
                                : null}
                        </p>
                        <p className="m-0 flex flex-wrap gap-x-2 text-ui text-ink-muted">
                            {missing.length > 0 && (
                                <span>
                                    {t(
                                        missing.length === 1
                                            ? 'Volume {list} is not available online.'
                                            : 'Volumes {list} are not available online.',
                                        {
                                            list: listOf(missing, t),
                                        },
                                    )}
                                </span>
                            )}
                            <span>
                                {t('Issues in progress')}:{' '}
                                <Link href={earlyOnline()} className="link-u">
                                    {t('Early online')}
                                </Link>
                            </span>
                        </p>
                    </div>

                    <nav
                        aria-label={t('Jump to volume')}
                        className="-mx-4 [scrollbar-width:thin] overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0"
                    >
                        <ol className="m-0 flex w-max list-none gap-x-6 gap-y-3 p-0 md:w-auto md:flex-wrap">
                            {decades.map((group) => (
                                <li
                                    key={group.decade}
                                    className="flex items-center gap-2"
                                >
                                    <span className="w-12 shrink-0 text-meta font-semibold tracking-[0.04em] text-ink-muted tabular-nums">
                                        {t('{decade}s', {
                                            decade: group.decade,
                                        })}
                                    </span>
                                    <span className="flex gap-1.5">
                                        {group.volumes.map((v) => (
                                            <a
                                                key={v.volume}
                                                href={`#volume-${v.volume}`}
                                                title={
                                                    v.year
                                                        ? String(v.year)
                                                        : undefined
                                                }
                                                aria-label={t(
                                                    'Volume {volume} ({year})',
                                                    {
                                                        volume: v.volume,
                                                        year: v.year ?? '',
                                                    },
                                                )}
                                                className="inline-flex h-9 min-w-10 items-center justify-center rounded-md border border-control-soft bg-white px-2 text-ui font-semibold text-ink tabular-nums no-underline hover:border-brand hover:text-brand"
                                            >
                                                {v.volume}
                                            </a>
                                        ))}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </nav>
                </div>
            </section>

            <div className="page-wrap section-pb">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-strong pt-8 pb-3 md:pt-10">
                    <h2 className="m-0 font-sans text-ui font-semibold tracking-[0.06em] text-ink uppercase">
                        {t('All volumes')}
                    </h2>
                    <div
                        role="group"
                        aria-label={t('View')}
                        className="inline-flex rounded-md border border-control p-0.5"
                    >
                        {(['grid', 'list'] as const).map((option) => (
                            <Link
                                key={option}
                                href={
                                    option === 'list'
                                        ? archive.url({
                                              query: { view: 'list' },
                                          })
                                        : archive.url()
                                }
                                preserveScroll
                                replace
                                aria-current={
                                    view === option ? 'true' : undefined
                                }
                                className={cn(
                                    'inline-flex min-h-10 items-center rounded-[5px] px-3.5 text-ui font-semibold no-underline',
                                    view === option
                                        ? 'bg-brand text-white hover:text-white'
                                        : 'text-ink hover:bg-mist hover:text-ink',
                                )}
                            >
                                {option === 'grid' ? t('Covers') : t('List')}
                            </Link>
                        ))}
                    </div>
                </div>

                {view === 'list' ? (
                    <ArchiveTable volumes={volumes} />
                ) : (
                    volumes.map((v) => (
                        <section
                            key={v.volume}
                            id={`volume-${v.volume}`}
                            aria-labelledby={`volume-${v.volume}-title`}
                            className="grid scroll-mt-[var(--anchor-offset)] grid-cols-1 gap-x-6 gap-y-4 border-b border-line py-8 md:grid-cols-12 md:py-10"
                        >
                            <div className="flex items-baseline gap-3 md:col-span-3 md:flex-col md:gap-0.5">
                                <h3
                                    id={`volume-${v.volume}-title`}
                                    className="m-0 font-serif text-h3 font-medium md:text-h2"
                                >
                                    {t('Volume {volume}', { volume: v.volume })}
                                </h3>
                                <span className="text-ui text-ink-muted tabular-nums">
                                    {v.year}
                                </span>
                            </div>
                            <ul className="m-0 grid min-w-0 list-none grid-cols-[repeat(auto-fill,minmax(min(280px,100%),1fr))] gap-4 p-0 md:col-span-9">
                                {v.issues.map((issue) => (
                                    <li key={issue.slug} className="flex">
                                        <IssueCard issue={issue} />
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))
                )}
            </div>
        </>
    );
}

function IssueCard({ issue }: { issue: IssueSummary }) {
    const { t } = useT();
    const supplement =
        issue.kind === 'supplement' || issue.kind === 'abstracts';
    const part = partName(issue, t);
    const code = issue.note && isCode(issue.note) ? issue.note : null;
    const longTitle = issue.fullTitle ?? (code ? null : issue.note);

    return (
        <article className="relative flex w-full gap-4 rounded-lg border border-line-card bg-white p-4 transition-colors hover:border-line-strong">
            <div className="w-[68px] shrink-0">
                <IssueCover
                    volume={issue.volume}
                    // The card names the issue; the thumbnail only carries the volume.
                    caption=""
                    variant={supplement ? 'supplement' : 'regular'}
                    size="xs"
                    image={issue.coverImage}
                />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h4 className="m-0 flex flex-wrap items-center gap-x-2 gap-y-1 font-serif text-[18px] leading-snug font-medium">
                    {/* The whole card is the link target; the PDF link sits above it. */}
                    <Link
                        href={showIssue(issue.slug)}
                        prefetch
                        className="text-ink no-underline after:absolute after:inset-0 after:rounded-lg hover:text-brand"
                    >
                        {part}
                    </Link>
                    {code && (
                        <span className="inline-flex h-5 items-center rounded-sm bg-tint px-1.5 font-sans text-eyebrow font-semibold tracking-[0.04em] text-brand-dark">
                            {code}
                        </span>
                    )}
                </h4>
                {longTitle && (
                    <span className="text-[14px] leading-snug text-ink-soft">
                        {longTitle}
                    </span>
                )}
                {issue.locationDates && (
                    <span className="text-meta text-ink-muted">
                        {issue.locationDates}
                    </span>
                )}
                <span className="text-meta text-ink-muted tabular-nums">
                    {issue.year} · {countLabel(issue, t)}
                    {issue.isCurrent && (
                        <>
                            {' · '}
                            <span className="font-semibold text-brand">
                                {t('Current issue')}
                            </span>
                        </>
                    )}
                </span>
                {issue.pdf && (
                    <a
                        href={issue.pdf}
                        className="relative z-10 mt-auto inline-flex min-h-6 items-center gap-1.5 self-start pt-1 text-[14px] font-semibold no-underline hover:underline"
                    >
                        <DownloadIcon className="size-3.5" />
                        {t('Full PDF')}
                        <span className="sr-only"> ({issue.label})</span>
                    </a>
                )}
            </div>
        </article>
    );
}

/** Compact list: Volume · Year · Issues · PDF. */
function ArchiveTable({ volumes }: { volumes: ArchiveVolume[] }) {
    const { t } = useT();

    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-ui">
                <caption className="sr-only">
                    {t('All volumes of the journal')}
                </caption>
                <thead>
                    <tr className="border-b border-line-strong text-meta tracking-[0.04em] text-ink-muted uppercase">
                        <th scope="col" className="py-3 pr-4 font-semibold">
                            {t('Volume')}
                        </th>
                        <th scope="col" className="py-3 pr-4 font-semibold">
                            {t('Year')}
                        </th>
                        <th scope="col" className="py-3 pr-4 font-semibold">
                            {t('Issues')}
                        </th>
                        <th scope="col" className="py-3 font-semibold">
                            PDF
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {volumes.map((v) => (
                        <tr
                            key={v.volume}
                            id={`volume-${v.volume}`}
                            className="scroll-mt-[var(--anchor-offset)] border-b border-line align-top"
                        >
                            <th
                                scope="row"
                                className="py-3.5 pr-4 font-serif text-[18px] font-medium text-ink tabular-nums"
                            >
                                {v.volume}
                            </th>
                            <td className="py-3.5 pr-4 text-ink-muted tabular-nums">
                                {v.year}
                            </td>
                            <td className="py-3.5 pr-4">
                                <ul className="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0">
                                    {v.issues.map((issue) => (
                                        <li key={issue.slug}>
                                            <Link
                                                href={showIssue(issue.slug)}
                                                className="font-semibold no-underline hover:underline"
                                            >
                                                {partName(issue, t)}
                                            </Link>
                                            {issue.note &&
                                                isCode(issue.note) && (
                                                    <span className="text-ink-muted">
                                                        {' '}
                                                        ({issue.note})
                                                    </span>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            </td>
                            <td className="py-3.5">
                                <ul className="m-0 flex list-none flex-col gap-1 p-0">
                                    {v.issues
                                        .filter((issue) => issue.pdf)
                                        .map((issue) => (
                                            <li key={issue.slug}>
                                                <a
                                                    href={issue.pdf!}
                                                    className="inline-flex items-center gap-1.5 text-[14px] font-semibold no-underline hover:underline"
                                                >
                                                    <DownloadIcon className="size-3.5" />
                                                    {v.issues.length > 1
                                                        ? partName(issue, t)
                                                        : t('Full PDF')}
                                                    <span className="sr-only">
                                                        {' '}
                                                        ({issue.label})
                                                    </span>
                                                </a>
                                            </li>
                                        ))}
                                    {v.issues.every((issue) => !issue.pdf) && (
                                        <li className="text-ink-muted">
                                            {t('Per-article PDFs')}
                                        </li>
                                    )}
                                </ul>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
