import { Head, Link } from '@inertiajs/react';
import { ChevronDown, CircleAlert, Search } from 'lucide-react';
import { Fragment, useState } from 'react';
import { AssignmentStatusBadge } from '@/components/review/assignment-status-badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { recommendationLabel } from '@/lib/manuscript-status';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index as reviewersIndex } from '@/routes/admin/reviewers';
import type { ReviewersIndexProps } from '@/types/review';

type Reviewer = ReviewersIndexProps['reviewers'][number];

const OPEN = ['invited', 'accepted'];

function isOpen(r: Reviewer): boolean {
    return r.assignments.some((a) => OPEN.includes(a.status));
}

function isOverdue(r: Reviewer): boolean {
    return r.assignments.some((a) => a.overdue);
}

function Assignments({ reviewer }: { reviewer: Reviewer }) {
    const { t } = useT();
    const { date } = useDates();

    if (reviewer.assignments.length === 0) {
        return (
            <p className="m-0 text-sm text-muted-foreground">
                {t('No invitations yet.')}
            </p>
        );
    }

    return (
        <ul className="m-0 grid list-none gap-2 p-0">
            {reviewer.assignments.map((a) => (
                <li
                    key={a.id}
                    className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border bg-background px-3 py-2 text-sm"
                >
                    <AssignmentStatusBadge status={a.status} />
                    <Link
                        href={a.url}
                        className="min-w-0 flex-1 underline-offset-4 hover:underline"
                    >
                        {a.reference && (
                            <span className="mr-1.5 font-mono text-xs text-muted-foreground">
                                {a.reference}
                            </span>
                        )}
                        {a.title || t('Untitled manuscript')}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                        {t('Round {n}', { n: a.round })}
                    </span>
                    {a.status === 'submitted' ? (
                        <span className="text-xs">
                            {t('Sent {date}', { date: date(a.submittedAt) })}
                            {a.recommendation &&
                                ` · ${t(recommendationLabel(a.recommendation))}`}
                        </span>
                    ) : (
                        a.dueAt && (
                            <span
                                className={cn(
                                    'inline-flex items-center gap-1 text-xs',
                                    a.overdue &&
                                        'font-semibold text-red-700 dark:text-red-400',
                                )}
                            >
                                {a.overdue && (
                                    <CircleAlert
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                )}
                                {a.overdue
                                    ? t('OVERDUE since {date}', {
                                          date: date(a.dueAt),
                                      })
                                    : t('due {date}', { date: date(a.dueAt) })}
                            </span>
                        )
                    )}
                </li>
            ))}
        </ul>
    );
}

export default function ReviewersIndex({ reviewers }: ReviewersIndexProps) {
    const { t } = useT();
    const { date } = useDates();
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'open' | 'overdue'>('all');
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const q = query.trim().toLowerCase();
    const shown = reviewers.filter((r) => {
        if (filter === 'open' && !isOpen(r)) {
            return false;
        }

        if (filter === 'overdue' && !isOverdue(r)) {
            return false;
        }

        return (
            q === '' ||
            [r.name, r.email, r.affiliation ?? '', r.expertise ?? '']
                .join(' ')
                .toLowerCase()
                .includes(q)
        );
    });

    const toggle = (email: string) =>
        setExpanded((current) => {
            const next = new Set(current);

            if (next.has(email)) {
                next.delete(email);
            } else {
                next.add(email);
            }

            return next;
        });

    const overdueCount = reviewers.filter(isOverdue).length;

    return (
        <>
            <Head title={t('Reviewers')} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('Reviewers')}
                    </h1>
                    <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                        {t(
                            'Everyone invited to review, with their invitations: who is reviewing what, what is overdue and how quickly they answer.',
                        )}
                    </p>
                </header>

                <div role="search" className="flex flex-wrap items-end gap-3">
                    <div className="grid min-w-[16rem] flex-1 gap-1.5">
                        <Label htmlFor="reviewer-search">{t('Search')}</Label>
                        <div className="relative">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="reviewer-search"
                                type="search"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder={t(
                                    'Name, e-mail, institution or expertise',
                                )}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="reviewer-filter">{t('Show')}</Label>
                        <select
                            id="reviewer-filter"
                            value={filter}
                            onChange={(e) =>
                                setFilter(e.target.value as typeof filter)
                            }
                            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                        >
                            <option value="all">{t('All reviewers')}</option>
                            <option value="open">
                                {t('With an open invitation or review')}
                            </option>
                            <option value="overdue">
                                {t('With something overdue ({count})', {
                                    count: overdueCount,
                                })}
                            </option>
                        </select>
                    </div>
                </div>

                <p className="m-0 text-sm text-muted-foreground" role="status">
                    {shown.length === 1
                        ? t('1 reviewer')
                        : t('{count} reviewers', { count: shown.length })}
                </p>

                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[880px] text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Reviewer')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Institution and expertise')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    {t('Invited')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    {t('Accepted')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    {t('Declined')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    {t('Sent')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    {t('Expired')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-3 py-2.5 text-right font-medium"
                                >
                                    {t('Average days')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Last activity')}
                                </th>
                                <th scope="col" className="px-3 py-2.5">
                                    <span className="sr-only">
                                        {t('Invitations')}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {shown.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={10}
                                        className="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        {reviewers.length === 0
                                            ? t(
                                                  'No reviewers have been invited yet.',
                                              )
                                            : t(
                                                  'No one matches these filters.',
                                              )}
                                    </td>
                                </tr>
                            )}
                            {shown.map((r) => {
                                const open = expanded.has(r.email);
                                const panel = `reviewer-${r.email.replace(/[^a-z0-9]/gi, '-')}`;
                                const overdue = isOverdue(r);

                                return (
                                    <Fragment key={r.email}>
                                        <tr className="border-b align-top">
                                            <th
                                                scope="row"
                                                className="px-4 py-3 text-left font-normal"
                                            >
                                                <span className="font-medium">
                                                    {r.name || '—'}
                                                </span>
                                                <a
                                                    href={`mailto:${r.email}`}
                                                    className="block text-muted-foreground underline-offset-4 hover:underline"
                                                >
                                                    {r.email}
                                                </a>
                                                <span className="mt-1 flex flex-wrap gap-1.5 text-xs">
                                                    {!r.hasAccount && (
                                                        <span className="rounded border px-1.5 py-0.5 text-muted-foreground">
                                                            {t(
                                                                'No account yet',
                                                            )}
                                                        </span>
                                                    )}
                                                    {overdue && (
                                                        <span className="inline-flex items-center gap-1 rounded border border-red-300 px-1.5 py-0.5 font-semibold text-red-700 dark:border-red-800 dark:text-red-400">
                                                            <CircleAlert
                                                                aria-hidden="true"
                                                                className="size-3"
                                                            />
                                                            {t('Overdue')}
                                                        </span>
                                                    )}
                                                </span>
                                            </th>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {r.affiliation ?? '—'}
                                                {r.expertise && (
                                                    <span className="mt-1 block text-xs">
                                                        {r.expertise}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {r.counts.invited}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {r.counts.accepted}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {r.counts.declined}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {r.counts.submitted}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {r.counts.expired}
                                            </td>
                                            <td className="px-3 py-3 text-right tabular-nums">
                                                {r.averageDays === null
                                                    ? '—'
                                                    : Math.round(r.averageDays)}
                                            </td>
                                            <td className="px-4 py-3 text-muted-foreground">
                                                {date(r.lastActivity)}
                                            </td>
                                            <td className="px-3 py-3 text-right">
                                                <button
                                                    type="button"
                                                    aria-expanded={open}
                                                    aria-controls={panel}
                                                    onClick={() =>
                                                        toggle(r.email)
                                                    }
                                                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                                                >
                                                    <ChevronDown
                                                        aria-hidden="true"
                                                        className={cn(
                                                            'size-3.5 transition-transform',
                                                            open &&
                                                                'rotate-180',
                                                        )}
                                                    />
                                                    {t(
                                                        'Invitations ({count})',
                                                        {
                                                            count: r.assignments
                                                                .length,
                                                        },
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                        {open && (
                                            <tr
                                                id={panel}
                                                className="border-b bg-muted/30"
                                            >
                                                <td
                                                    colSpan={10}
                                                    className="px-4 py-3"
                                                >
                                                    <Assignments reviewer={r} />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}

ReviewersIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Reviewers', href: reviewersIndex() },
    ],
};
