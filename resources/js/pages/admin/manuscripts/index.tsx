import { Head, Link, router } from '@inertiajs/react';
import {
    ExternalLink,
    Gavel,
    MoreHorizontal,
    NotebookPen,
    Search,
    UserPlus,
} from 'lucide-react';
import { StatusBadge } from '@/components/manuscript/status-badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { statusLabel } from '@/lib/manuscript-status';
import { dashboard } from '@/routes';
import { index } from '@/routes/admin/manuscripts';
import type { ManuscriptStatus, ManuscriptSummary } from '@/types/manuscript';

type Props = {
    manuscripts: ManuscriptSummary[];
    counts: Partial<Record<ManuscriptStatus, number>>;
    statuses: ManuscriptStatus[];
    filters: { q: string; status: ManuscriptStatus | null };
    pagination: { currentPage: number; lastPage: number; total: number };
};

function useDate() {
    const { locale } = useT();
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Europe/Skopje',
        },
    );

    return (iso: string | null) => (iso ? format.format(new Date(iso)) : '—');
}

export default function AdminManuscripts({
    manuscripts,
    counts,
    statuses,
    filters,
    pagination,
}: Props) {
    const { t } = useT();
    const date = useDate();

    const visit = (query: Record<string, string | number | null>) =>
        router.get(
            index().url,
            Object.fromEntries(
                Object.entries({ ...filters, ...query }).filter(
                    ([, value]) => value !== null && value !== '',
                ),
            ),
            { preserveState: true, preserveScroll: true, replace: true },
        );

    const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

    return (
        <>
            <Head title={t('Manuscripts')} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('Manuscripts')}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-muted-foreground">
                        {t(
                            'Every manuscript sent through the system. Drafts stay private to their authors.',
                        )}
                    </p>
                </header>

                <nav
                    aria-label={t('Filter by status')}
                    className="flex flex-wrap gap-2"
                >
                    <button
                        type="button"
                        onClick={() => visit({ status: null, page: null })}
                        aria-pressed={filters.status === null}
                        className="rounded-full border px-3 py-1 text-sm aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                    >
                        {t('All')} · {total}
                    </button>
                    {statuses
                        .filter((status) => (counts[status] ?? 0) > 0)
                        .map((status) => (
                            <button
                                key={status}
                                type="button"
                                onClick={() => visit({ status, page: null })}
                                aria-pressed={filters.status === status}
                                className="rounded-full border px-3 py-1 text-sm aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background"
                            >
                                {t(statusLabel(status))} · {counts[status]}
                            </button>
                        ))}
                </nav>

                <form
                    role="search"
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const q = new FormData(event.currentTarget).get('q');
                        visit({
                            q: typeof q === 'string' ? q : '',
                            page: null,
                        });
                    }}
                >
                    <div className="grid min-w-[16rem] flex-1 gap-1.5">
                        <Label htmlFor="q">{t('Search')}</Label>
                        <div className="relative">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="q"
                                name="q"
                                type="search"
                                defaultValue={filters.q}
                                placeholder={t(
                                    'Reference, title, author or e-mail',
                                )}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <Button type="submit" variant="secondary">
                        {t('Search')}
                    </Button>
                </form>

                <div className="overflow-x-auto rounded-xl border">
                    <table className="w-full min-w-[760px] text-left text-sm">
                        <thead className="border-b bg-muted/50 text-xs tracking-wide text-muted-foreground uppercase">
                            <tr>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Reference')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Manuscript')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Submitted by')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Status')}
                                </th>
                                <th
                                    scope="col"
                                    className="px-4 py-2.5 font-medium"
                                >
                                    {t('Received')}
                                </th>
                                <th scope="col" className="px-4 py-2.5">
                                    <span className="sr-only">
                                        {t('Actions')}
                                    </span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {manuscripts.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={6}
                                        className="px-4 py-10 text-center text-muted-foreground"
                                    >
                                        {t(
                                            'No manuscripts match these filters.',
                                        )}
                                    </td>
                                </tr>
                            )}
                            {manuscripts.map((m) => (
                                <tr
                                    key={m.id}
                                    className="border-b last:border-b-0"
                                >
                                    <td className="px-4 py-3 align-top font-mono text-xs whitespace-nowrap">
                                        {m.reference ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <Link
                                            href={m.url}
                                            className="font-medium underline-offset-4 hover:underline"
                                        >
                                            {m.title ||
                                                t('Untitled manuscript')}
                                        </Link>
                                        <div className="text-muted-foreground">
                                            {m.typeLabel}
                                            {m.language === 'mk' && ' · МК'}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        {m.submitter?.name}
                                        <div className="text-muted-foreground">
                                            {m.submitter?.email}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <StatusBadge status={m.status} />
                                    </td>
                                    <td className="px-4 py-3 align-top whitespace-nowrap text-muted-foreground">
                                        {date(m.submittedAt)}
                                    </td>
                                    <td className="px-2 py-2 text-right align-top">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    aria-label={t(
                                                        'Actions for {reference}',
                                                        {
                                                            reference:
                                                                m.reference ??
                                                                m.title,
                                                        },
                                                    )}
                                                >
                                                    <MoreHorizontal aria-hidden="true" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem asChild>
                                                    <Link href={m.url}>
                                                        <ExternalLink aria-hidden="true" />
                                                        {t('Open')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={`${m.url}#review`}
                                                    >
                                                        <UserPlus aria-hidden="true" />
                                                        {t('Invite reviewers')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={`${m.url}#decision`}
                                                    >
                                                        <Gavel aria-hidden="true" />
                                                        {t('Decision…')}
                                                    </Link>
                                                </DropdownMenuItem>
                                                <DropdownMenuItem asChild>
                                                    <Link
                                                        href={`${m.url}#notes`}
                                                    >
                                                        <NotebookPen aria-hidden="true" />
                                                        {t('Add note')}
                                                    </Link>
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {pagination.lastPage > 1 && (
                    <nav
                        aria-label={t('Pages')}
                        className="flex items-center justify-between text-sm"
                    >
                        <span className="text-muted-foreground">
                            {t('Page {page} of {pages}', {
                                page: pagination.currentPage,
                                pages: pagination.lastPage,
                            })}
                        </span>
                        <div className="flex gap-2">
                            {pagination.currentPage > 1 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        visit({
                                            page: pagination.currentPage - 1,
                                        })
                                    }
                                    className="rounded-md border px-3 py-1.5 hover:bg-muted"
                                >
                                    {t('Previous')}
                                </button>
                            )}
                            {pagination.currentPage < pagination.lastPage && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        visit({
                                            page: pagination.currentPage + 1,
                                        })
                                    }
                                    className="rounded-md border px-3 py-1.5 hover:bg-muted"
                                >
                                    {t('Next')}
                                </button>
                            )}
                        </div>
                    </nav>
                )}
            </div>
        </>
    );
}

AdminManuscripts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Manuscripts', href: index() },
    ],
};
