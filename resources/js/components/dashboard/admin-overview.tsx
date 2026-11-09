import { Link } from '@inertiajs/react';
import { CircleAlert, CircleCheck, Inbox } from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { statusLabel } from '@/lib/manuscript-status';
import { cn } from '@/lib/utils';
import { index as adminManuscripts } from '@/routes/admin/manuscripts';
import { index as reviewersIndex } from '@/routes/admin/reviewers';
import type { AdminDashboardStats, AttentionKind } from '@/types/review';

/*
 * The editorial office's morning overview. Colours (validated with the
 * dataviz palette checks): received = blue, decided = amber; one blue for
 * single-series bars. Every number is also written out.
 */
const RECEIVED = 'bg-[#3b63b8] dark:bg-[#4f7bd6]';
const DECIDED = 'bg-[#d97706] dark:bg-[#c07a12]';

const OVERDUE: AttentionKind[] = ['review_overdue', 'answer_overdue'];

const ORDER = [
    'submitted',
    'under_review',
    'revision_requested',
    'resubmitted',
    'accepted',
    'in_production',
    'published',
    'rejected',
    'withdrawn',
];

function Tile({
    label,
    value,
    detail,
}: {
    label: string;
    value: string;
    detail?: string;
}) {
    return (
        <div className="rounded-xl border bg-card p-4">
            <p className="m-0 text-sm text-muted-foreground">{label}</p>
            <p className="m-0 mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                {value}
            </p>
            {detail && (
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                    {detail}
                </p>
            )}
        </div>
    );
}

function Card({
    id,
    title,
    action,
    children,
    className,
}: {
    id: string;
    title: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            aria-labelledby={id}
            className={cn(
                'flex flex-col gap-3 rounded-xl border bg-card p-5',
                className,
            )}
        >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 id={id} className="m-0 text-base font-semibold">
                    {title}
                </h2>
                {action}
            </div>
            {children}
        </section>
    );
}

/** Horizontal bars, label left, number right; each row may link. */
function Bars({
    rows,
}: {
    rows: { key: string; label: string; count: number; href?: string }[];
}) {
    const { t } = useT();
    const max = Math.max(1, ...rows.map((r) => r.count));

    if (rows.every((r) => r.count === 0)) {
        return (
            <p className="m-0 text-sm text-muted-foreground">
                {t('No manuscripts yet.')}
            </p>
        );
    }

    return (
        <ul className="m-0 grid list-none gap-2 p-0">
            {rows.map((row) => {
                const body = (
                    <>
                        <span className="w-40 shrink-0 truncate text-sm">
                            {row.label}
                        </span>
                        <span
                            className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted"
                            aria-hidden="true"
                        >
                            <span
                                className={cn(
                                    'absolute inset-y-0 left-0 rounded-full',
                                    RECEIVED,
                                )}
                                style={{ width: `${(row.count / max) * 100}%` }}
                            />
                        </span>
                        <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
                            {row.count}
                        </span>
                    </>
                );

                return (
                    <li key={row.key}>
                        {row.href ? (
                            <Link
                                href={row.href}
                                className="flex items-center gap-3 rounded-md px-1 py-0.5 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                {body}
                            </Link>
                        ) : (
                            <div className="flex items-center gap-3 px-1 py-0.5">
                                {body}
                            </div>
                        )}
                    </li>
                );
            })}
        </ul>
    );
}

/** Received vs decided per month: grouped bars, a hover/focus readout and a table. */
function MonthsChart({ months }: { months: AdminDashboardStats['months'] }) {
    const { t, locale } = useT();
    const [active, setActive] = useState<number | null>(null);
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC',
        },
    );
    const short = new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
        month: 'short',
        timeZone: 'UTC',
    });
    const label = (month: string, full = true) => {
        const date = new Date(`${month.slice(0, 7)}-01T00:00:00Z`);

        return Number.isNaN(date.getTime())
            ? month
            : (full ? format : short).format(date);
    };
    const max = Math.max(1, ...months.flatMap((m) => [m.received, m.decided]));
    const shown = active ?? months.length - 1;
    const current = months[shown];
    const totalReceived = months.reduce((sum, m) => sum + m.received, 0);
    const totalDecided = months.reduce((sum, m) => sum + m.decided, 0);

    return (
        <div className="grid gap-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="inline-flex items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className={cn('size-2.5 rounded-sm', RECEIVED)}
                    />
                    {t('Received')}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span
                        aria-hidden="true"
                        className={cn('size-2.5 rounded-sm', DECIDED)}
                    />
                    {t('Decided')}
                </span>
                {current && (
                    <span
                        aria-live="polite"
                        className="ml-auto text-muted-foreground tabular-nums"
                    >
                        {t('{month}: {received} received, {decided} decided', {
                            month: label(current.month),
                            received: current.received,
                            decided: current.decided,
                        })}
                    </span>
                )}
            </div>

            <div
                role="img"
                aria-label={t(
                    'Last 12 months: {received} manuscripts received and {decided} decisions made. The table below has the numbers per month.',
                    { received: totalReceived, decided: totalDecided },
                )}
                className="relative grid grid-cols-12 gap-0.5 sm:gap-1"
                onMouseLeave={() => setActive(null)}
            >
                {months.map((m, index) => (
                    <div
                        key={m.month}
                        onMouseEnter={() => setActive(index)}
                        className={cn(
                            'flex min-w-0 flex-col rounded-sm',
                            index === shown &&
                                totalReceived + totalDecided > 0 &&
                                'bg-muted/60',
                        )}
                    >
                        <div className="flex h-36 items-end justify-center gap-px border-b border-border px-px">
                            {[
                                { value: m.received, tone: RECEIVED },
                                { value: m.decided, tone: DECIDED },
                            ].map((bar, i) => (
                                <div
                                    key={i}
                                    className="flex h-full w-1/2 max-w-3.5 flex-col items-center justify-end"
                                >
                                    {bar.value > 0 && (
                                        <span className="mb-0.5 text-[9px] leading-none text-foreground tabular-nums sm:text-[10px]">
                                            {bar.value}
                                        </span>
                                    )}
                                    <span
                                        className={cn(
                                            'w-full rounded-t-sm',
                                            bar.tone,
                                        )}
                                        style={{
                                            height: `calc(${(bar.value / max) * 100}% - ${bar.value > 0 ? 12 : 0}px)`,
                                            minHeight: bar.value > 0 ? 3 : 0,
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                        <span className="mt-1 block text-center text-[10px] whitespace-nowrap text-muted-foreground sm:hidden">
                            {m.month.slice(5, 7)}
                        </span>
                        <span className="mt-1 hidden text-center text-[11px] whitespace-nowrap text-muted-foreground sm:block">
                            {label(m.month, false)}
                        </span>
                    </div>
                ))}
                {totalReceived + totalDecided === 0 && (
                    <p className="absolute inset-x-0 top-12 m-0 text-center text-sm text-muted-foreground">
                        {t('No manuscripts in this period yet.')}
                    </p>
                )}
            </div>

            <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">
                    {t('Show as a table')}
                </summary>
                <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-left text-sm tabular-nums">
                        <thead className="text-xs text-muted-foreground">
                            <tr>
                                <th
                                    scope="col"
                                    className="py-1 pr-4 font-medium"
                                >
                                    {t('Month')}
                                </th>
                                <th
                                    scope="col"
                                    className="py-1 pr-4 text-right font-medium"
                                >
                                    {t('Received')}
                                </th>
                                <th
                                    scope="col"
                                    className="py-1 text-right font-medium"
                                >
                                    {t('Decided')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {months.map((m) => (
                                <tr key={m.month} className="border-t">
                                    <th
                                        scope="row"
                                        className="py-1 pr-4 font-normal"
                                    >
                                        {label(m.month)}
                                    </th>
                                    <td className="py-1 pr-4 text-right">
                                        {m.received}
                                    </td>
                                    <td className="py-1 text-right">
                                        {m.decided}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </details>
        </div>
    );
}

export function AdminOverview({ stats }: { stats: AdminDashboardStats }) {
    const { t } = useT();
    const { date } = useDates();
    const { totals, reviews } = stats;

    const kindLabel: Record<AttentionKind, string> = {
        review_overdue: t('Review overdue'),
        answer_overdue: t('Invitation not answered in time'),
        ready_for_decision: t('Reviews are in: ready for a decision'),
        revision_received: t('Revision received'),
        new: t('New submission to check'),
        needs_reviewers: t('Needs reviewers'),
    };

    const attention = [...stats.attention].sort(
        (a, b) =>
            Number(OVERDUE.includes(b.kind)) - Number(OVERDUE.includes(a.kind)),
    );

    const statusRows = ORDER.filter((status) => status in stats.byStatus).map(
        (status) => ({
            key: status,
            label: t(statusLabel(status)),
            count: stats.byStatus[status] ?? 0,
            href: adminManuscripts({ query: { status } }).url,
        }),
    );

    const days = (value: number | null) =>
        value === null ? '—' : t('{count} days', { count: Math.round(value) });

    return (
        <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                <Tile
                    label={t('Manuscripts received')}
                    value={String(totals.received)}
                />
                <Tile label={t('This year')} value={String(totals.thisYear)} />
                <Tile
                    label={t('In progress')}
                    value={String(totals.inProgress)}
                />
                <Tile
                    label={t('Acceptance rate')}
                    value={
                        totals.acceptanceRate === null
                            ? '—'
                            : `${Math.round(totals.acceptanceRate)} %`
                    }
                    detail={t('{accepted} accepted · {rejected} rejected', {
                        accepted: totals.accepted,
                        rejected: totals.rejected,
                    })}
                />
                <Tile
                    label={t('To the first decision')}
                    value={days(totals.daysToFirstDecision)}
                    detail={t('on average, from receipt')}
                />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <Card
                    id="attention"
                    title={t('Needs your attention')}
                    action={
                        <span className="text-sm text-muted-foreground">
                            {attention.length}
                        </span>
                    }
                >
                    {attention.length === 0 ? (
                        <p className="m-0 flex items-center gap-2 text-sm text-muted-foreground">
                            <CircleCheck
                                aria-hidden="true"
                                className="size-4 text-emerald-600"
                            />
                            {t('Nothing is waiting for the editorial office.')}
                        </p>
                    ) : (
                        <ul className="m-0 grid min-w-0 list-none grid-cols-1 gap-1 p-0">
                            {attention.map((item, index) => {
                                const overdue = OVERDUE.includes(item.kind);

                                return (
                                    <li
                                        key={`${item.url}-${item.kind}-${index}`}
                                    >
                                        <Link
                                            href={item.url}
                                            className="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            {overdue ? (
                                                <CircleAlert
                                                    aria-hidden="true"
                                                    className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
                                                />
                                            ) : (
                                                <Inbox
                                                    aria-hidden="true"
                                                    className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                                                />
                                            )}
                                            <span className="min-w-0 flex-1 text-sm">
                                                <span
                                                    className={cn(
                                                        'block font-medium',
                                                        overdue &&
                                                            'text-red-700 dark:text-red-400',
                                                    )}
                                                >
                                                    {overdue &&
                                                        `${t('Overdue')}: `}
                                                    {kindLabel[item.kind] ??
                                                        item.kind}
                                                </span>
                                                <span className="line-clamp-2 block break-words">
                                                    {item.reference && (
                                                        <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                                                            {item.reference}
                                                        </span>
                                                    )}
                                                    {item.title ||
                                                        t(
                                                            'Untitled manuscript',
                                                        )}
                                                </span>
                                                <span className="block text-xs text-muted-foreground">
                                                    {[
                                                        item.reviewer,
                                                        item.dueAt
                                                            ? t('due {date}', {
                                                                  date: date(
                                                                      item.dueAt,
                                                                  ),
                                                              })
                                                            : null,
                                                        !item.dueAt &&
                                                        item.since
                                                            ? t(
                                                                  'since {date}',
                                                                  {
                                                                      date: date(
                                                                          item.since,
                                                                      ),
                                                                  },
                                                              )
                                                            : null,
                                                        item.author,
                                                    ]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </Card>

                <Card
                    id="months"
                    title={t('Received and decided, last 12 months')}
                >
                    <MonthsChart months={stats.months} />
                </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card id="by-status" title={t('Manuscripts by status')}>
                    <Bars rows={statusRows} />
                </Card>
                <Card id="by-type" title={t('Manuscripts by type')}>
                    <Bars
                        rows={stats.byType.map((row) => ({
                            key: row.type,
                            label: row.label,
                            count: row.count,
                        }))}
                    />
                </Card>
                <Card
                    id="review-stats"
                    title={t('Reviews')}
                    action={
                        <Link
                            href={reviewersIndex()}
                            className="text-sm underline-offset-4 hover:underline"
                        >
                            {t('All reviewers')}
                        </Link>
                    }
                >
                    <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 text-sm">
                        <dt className="text-muted-foreground">
                            {t('Invitations awaiting an answer')}
                        </dt>
                        <dd className="m-0 text-right font-medium tabular-nums">
                            {reviews.awaitingAnswer}
                        </dd>
                        <dt className="text-muted-foreground">
                            {t('Reviews in progress')}
                        </dt>
                        <dd className="m-0 text-right font-medium tabular-nums">
                            {reviews.inProgress}
                        </dd>
                        <dt
                            className={cn(
                                reviews.overdue > 0
                                    ? 'font-medium text-red-700 dark:text-red-400'
                                    : 'text-muted-foreground',
                            )}
                        >
                            {t('Overdue')}
                        </dt>
                        <dd
                            className={cn(
                                'm-0 text-right font-medium tabular-nums',
                                reviews.overdue > 0 &&
                                    'text-red-700 dark:text-red-400',
                            )}
                        >
                            {reviews.overdue}
                        </dd>
                        <dt className="text-muted-foreground">
                            {t('Reviews received')}
                        </dt>
                        <dd className="m-0 text-right font-medium tabular-nums">
                            {reviews.submitted}
                        </dd>
                        <dt className="text-muted-foreground">
                            {t('Invitations declined')}
                        </dt>
                        <dd className="m-0 text-right font-medium tabular-nums">
                            {reviews.declined}
                        </dd>
                        <dt className="text-muted-foreground">
                            {t('Average time to review')}
                        </dt>
                        <dd className="m-0 text-right font-medium tabular-nums">
                            {days(reviews.averageDays)}
                        </dd>
                    </dl>
                </Card>
            </div>
        </div>
    );
}
