import { Head, Link } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    Download,
    FileText,
    Inbox,
    Search,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { index as adminManuscripts } from '@/routes/admin/manuscripts';

/** One row, from App\Models\Submission::presentForAdmin(). */
export type AdminSubmission = {
    id: number;
    reference: string | null;
    submittedAt: string | null;
    title: string;
    type: string;
    name: string;
    email: string;
    affiliation: string | null;
    message: string | null;
    reviewers: string | null;
    status: string;
    files: {
        key: string;
        kind: 'manuscript' | 'form';
        name: string;
        size: number;
        /** Signed link, valid for `linkMinutes`; null if the file route is missing. */
        url: string | null;
    }[];
};

type Props = {
    submissions: AdminSubmission[];
    pagination: {
        currentPage: number;
        lastPage: number;
        total: number;
        from: number | null;
        to: number | null;
        prevUrl: string | null;
        nextUrl: string | null;
    };
    filters: { q: string };
    /** All submissions, ignoring the search. */
    totalAll: number;
    exportUrl: string;
    linkMinutes: number;
};

function fileSize(bytes: number): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function useDate() {
    const { locale } = useT();
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Skopje',
        },
    );

    return (iso: string | null) => (iso ? format.format(new Date(iso)) : '—');
}

function Row({ submission: s }: { submission: AdminSubmission }) {
    const { t } = useT();
    const date = useDate();
    const hasDetails = s.affiliation || s.reviewers || s.message;

    return (
        <li className="grid gap-x-8 gap-y-4 border-b border-line px-5 py-5 last:border-b-0 lg:grid-cols-[11rem_minmax(0,1fr)_15rem] lg:px-6">
            <div className="flex flex-col gap-1">
                <span className="font-mono text-[14px] font-semibold text-brand-dark tabular-nums">
                    {s.reference ?? `#${s.id}`}
                </span>
                <time
                    dateTime={s.submittedAt ?? undefined}
                    className="text-[13px] text-ink-muted tabular-nums"
                >
                    {date(s.submittedAt)}
                </time>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
                <p className="m-0 text-[12px] font-semibold tracking-[0.08em] text-brand uppercase">
                    {t(s.type)}
                </p>
                <h2 className="m-0 font-serif text-[18px] leading-snug font-medium text-ink">
                    {s.title}
                </h2>
                <p className="m-0 text-[15px] text-ink-soft">
                    {s.name}
                    {' · '}
                    <a
                        href={`mailto:${s.email}?subject=${encodeURIComponent(`${s.reference ?? ''} ${s.title}`.trim())}`}
                        className="text-brand underline decoration-underline underline-offset-4 hover:decoration-brand"
                    >
                        {s.email}
                    </a>
                </p>

                {hasDetails && (
                    <details className="group mt-1 text-[15px]">
                        <summary className="w-fit cursor-pointer text-[14px] font-semibold text-brand marker:text-ink-muted">
                            {t('Details')}
                        </summary>
                        <dl className="m-0 mt-3 grid gap-3 rounded-md bg-mist p-4 sm:grid-cols-[10rem_minmax(0,1fr)]">
                            {s.affiliation && (
                                <>
                                    <dt className="font-semibold text-ink">
                                        {t('Affiliation')}
                                    </dt>
                                    <dd className="m-0 text-ink-soft">
                                        {s.affiliation}
                                    </dd>
                                </>
                            )}
                            {s.reviewers && (
                                <>
                                    <dt className="font-semibold text-ink">
                                        {t('Suggested reviewers')}
                                    </dt>
                                    <dd className="m-0 whitespace-pre-line text-ink-soft">
                                        {s.reviewers}
                                    </dd>
                                </>
                            )}
                            {s.message && (
                                <>
                                    <dt className="font-semibold text-ink">
                                        {t('Message to the editor')}
                                    </dt>
                                    <dd className="m-0 whitespace-pre-line text-ink-soft">
                                        {s.message}
                                    </dd>
                                </>
                            )}
                        </dl>
                    </details>
                )}
            </div>

            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {s.files.map((file) => (
                    <li key={file.key}>
                        <a
                            href={file.url ?? undefined}
                            className="group flex items-start gap-2.5 rounded-md border border-line-card bg-white px-3 py-2 no-underline transition-colors hover:border-brand"
                        >
                            <FileText
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-brand"
                            />
                            <span className="flex min-w-0 flex-col">
                                <span className="truncate text-[14px] font-semibold text-ink group-hover:text-brand-dark">
                                    {file.name}
                                </span>
                                <span className="text-[12px] text-ink-muted tabular-nums">
                                    {file.kind === 'manuscript'
                                        ? t('Manuscript')
                                        : t('Signed form')}
                                    {' · '}
                                    {fileSize(file.size)}
                                </span>
                            </span>
                        </a>
                    </li>
                ))}
            </ul>
        </li>
    );
}

/** Editors' list of manuscripts sent through the website. */
export default function SubmissionsIndex({
    submissions,
    pagination,
    filters,
    totalAll,
    exportUrl,
    linkMinutes,
}: Props) {
    const { t } = useT();
    const searching = filters.q !== '';

    return (
        <>
            <Head title={t('Old website form')} />

            {/* The journal palette is light-only, so the page keeps its own surface in dark mode. */}
            <div className="flex-1 bg-white text-ink">
                <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-4 py-6 font-sans md:px-8 md:py-10">
                    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
                        <div className="flex flex-col gap-1.5">
                            <p className="m-0 text-[12px] font-semibold tracking-[0.08em] text-brand uppercase">
                                {t('Editorial office')}
                            </p>
                            <h1 className="m-0 font-serif text-[30px] leading-tight font-medium md:text-[36px]">
                                {t('Old website form')}
                            </h1>
                            <p className="m-0 text-[15px] text-ink-muted">
                                {totalAll === 0
                                    ? t('No submissions to show yet.')
                                    : totalAll === 1
                                      ? t(
                                            '1 manuscript received through the website',
                                        )
                                      : t(
                                            '{count} manuscripts received through the website',
                                            { count: totalAll },
                                        )}
                            </p>
                        </div>

                        {totalAll > 0 && (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                                <form
                                    method="get"
                                    role="search"
                                    className="relative flex"
                                >
                                    <label
                                        htmlFor="sub-search"
                                        className="sr-only"
                                    >
                                        {t('Search submissions')}
                                    </label>
                                    <Search
                                        aria-hidden="true"
                                        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted"
                                    />
                                    <input
                                        id="sub-search"
                                        name="q"
                                        type="search"
                                        defaultValue={filters.q}
                                        placeholder={t(
                                            'Reference, title, author',
                                        )}
                                        className="h-11 w-full rounded-md border border-field bg-white pr-3 pl-9 text-[15px] text-ink placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-72"
                                    />
                                </form>
                                <a
                                    href={exportUrl}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-control bg-white px-4 text-[15px] font-semibold text-ink no-underline transition-colors hover:border-brand hover:bg-mist"
                                >
                                    <Download
                                        aria-hidden="true"
                                        className="size-4"
                                    />
                                    {t('Export CSV')}
                                </a>
                            </div>
                        )}
                    </header>

                    <div
                        role="note"
                        className="rounded-lg border border-line-card bg-tint px-4 py-3 text-[15px] leading-relaxed text-ink"
                    >
                        <p className="m-0 font-semibold">
                            {t('What is this page?')}
                        </p>
                        <p className="m-0 mt-1 text-ink-soft">
                            {t(
                                'Before the manuscript system, authors sent a file through a simple form on the website, without an account. Those manuscripts are kept here, with their files, for the record. The form is now closed: new manuscripts are written and sent in the system, under Manuscripts.',
                            )}{' '}
                            <Link
                                href={adminManuscripts()}
                                className="font-semibold underline underline-offset-4"
                            >
                                {t('Go to Manuscripts')}
                            </Link>
                        </p>
                    </div>

                    {totalAll === 0 ? (
                        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-control bg-mist px-6 py-16 text-center">
                            <Inbox
                                aria-hidden="true"
                                className="size-8 text-ink-muted"
                            />
                            <p className="m-0 max-w-[48ch] text-[15px] text-ink-soft">
                                {t(
                                    'Manuscripts sent through the submission form appear here, newest first, with links to their files.',
                                )}
                            </p>
                            <a
                                href="/submit-your-paper"
                                className="text-[15px] font-semibold text-brand underline decoration-underline underline-offset-4"
                            >
                                {t('Open the submission form')}
                            </a>
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-wrap items-baseline justify-between gap-2 text-[13px] text-ink-muted">
                                <p className="m-0" aria-live="polite">
                                    {searching
                                        ? t('{count} results for “{query}”', {
                                              count: pagination.total,
                                              query: filters.q,
                                          })
                                        : t('Showing {from}–{to} of {total}', {
                                              from: pagination.from ?? 0,
                                              to: pagination.to ?? 0,
                                              total: pagination.total,
                                          })}
                                    {searching && (
                                        <>
                                            {' · '}
                                            <Link
                                                href="/admin/submissions"
                                                className="font-semibold text-brand underline underline-offset-4"
                                            >
                                                {t('Clear search')}
                                            </Link>
                                        </>
                                    )}
                                </p>
                                <p className="m-0">
                                    {t(
                                        'File links expire after {minutes} minutes; reload the page for new ones.',
                                        { minutes: linkMinutes },
                                    )}
                                </p>
                            </div>

                            {submissions.length > 0 ? (
                                <ul className="m-0 list-none overflow-hidden rounded-lg border border-line-card bg-white p-0">
                                    {submissions.map((submission) => (
                                        <Row
                                            key={submission.id}
                                            submission={submission}
                                        />
                                    ))}
                                </ul>
                            ) : (
                                <p className="m-0 rounded-lg border border-line-card bg-white px-6 py-10 text-center text-[15px] text-ink-soft">
                                    {t('No submissions match your search.')}
                                </p>
                            )}

                            {pagination.lastPage > 1 && (
                                <nav
                                    aria-label={t('Pagination')}
                                    className="flex items-center justify-between gap-4 text-[15px]"
                                >
                                    {pagination.prevUrl ? (
                                        <Link
                                            href={pagination.prevUrl}
                                            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-control px-4 font-semibold text-ink hover:border-brand"
                                        >
                                            <ChevronLeft
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                            {t('Newer')}
                                        </Link>
                                    ) : (
                                        <span />
                                    )}
                                    <span className="text-ink-muted tabular-nums">
                                        {t('Page {page} of {pages}', {
                                            page: pagination.currentPage,
                                            pages: pagination.lastPage,
                                        })}
                                    </span>
                                    {pagination.nextUrl ? (
                                        <Link
                                            href={pagination.nextUrl}
                                            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-control px-4 font-semibold text-ink hover:border-brand"
                                        >
                                            {t('Older')}
                                            <ChevronRight
                                                aria-hidden="true"
                                                className="size-4"
                                            />
                                        </Link>
                                    ) : (
                                        <span />
                                    )}
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
