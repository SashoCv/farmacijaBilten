import { Head, Link, usePage } from '@inertiajs/react';
import {
    ClipboardCheck,
    FilePen,
    Inbox,
    ShieldAlert,
    Users,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AdminOverview } from '@/components/dashboard/admin-overview';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { index as adminManuscripts } from '@/routes/admin/manuscripts';
import { index as legacySubmissions } from '@/routes/admin/submissions';
import { index as myManuscripts } from '@/routes/author/manuscripts';
import { index as users } from '@/routes/admin/users';
import { index as myReviews } from '@/routes/reviewer/reviews';
import { edit as security } from '@/routes/security';
import type { Role } from '@/types';
import type { AdminDashboardStats } from '@/types/review';

type Props = {
    roles: Role[];
    admin: {
        people: Record<Role, number>;
        unverified: number;
        legacySubmissions: number;
        legacySubmissionsLastWeek: number;
        newManuscripts: number;
        manuscriptsInProgress: number;
    } | null;
    author: { drafts: number; sent: number; revisions: number } | null;
    reviewer?: {
        invitations: number;
        inProgress: number;
        submitted: number;
    } | null;
    stats?: AdminDashboardStats | null;
    needsSecondFactor: boolean;
};

function Panel({
    icon,
    title,
    description,
    children,
}: {
    icon: ReactNode;
    title: string;
    description: string;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col rounded-xl border border-sidebar-border/70 bg-card p-5 dark:border-sidebar-border">
            <div className="flex items-start gap-3">
                <span
                    aria-hidden
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
                >
                    {icon}
                </span>
                <div className="min-w-0">
                    <h2 className="m-0 text-base font-semibold">{title}</h2>
                    <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                        {description}
                    </p>
                </div>
            </div>
            <div className="mt-4 flex flex-1 flex-col gap-3 text-sm">
                {children}
            </div>
        </section>
    );
}

function Stat({
    label,
    value,
    href,
}: {
    label: string;
    value: number;
    href?: string;
}) {
    const body = (
        <>
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums">{value}</span>
        </>
    );

    return href ? (
        <Link
            href={href}
            className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
        >
            {body}
        </Link>
    ) : (
        <div className="flex items-center justify-between px-2 py-1.5">
            {body}
        </div>
    );
}

/** Coming in a later release: says what will appear here, no dead buttons. */
function Upcoming({ children }: { children: ReactNode }) {
    return (
        <p className="m-0 rounded-md border border-dashed border-border px-3 py-2.5 text-muted-foreground">
            {children}
        </p>
    );
}

export default function Dashboard({
    roles,
    admin,
    author,
    reviewer = null,
    stats = null,
    needsSecondFactor,
}: Props) {
    const { t } = useT();
    const { auth } = usePage().props;

    return (
        <>
            <Head title={t('Dashboard')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('Welcome, {name}', { name: auth.user?.name ?? '' })}
                    </h1>
                    <p className="m-0 mt-1 text-sm text-muted-foreground">
                        {roles.length > 0
                            ? t('Your roles: {roles}', {
                                  roles: roles
                                      .map((role) => t(ROLE_LABELS[role]))
                                      .join(', '),
                              })
                            : t(
                                  'Your account has no role yet. The editorial office will assign one.',
                              )}
                    </p>
                </header>

                {needsSecondFactor && (
                    <div
                        role="alert"
                        className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
                    >
                        <ShieldAlert aria-hidden className="mt-0.5 size-5" />
                        <p className="m-0">
                            {t(
                                'The editorial office pages need two-factor authentication.',
                            )}{' '}
                            <Link
                                href={security()}
                                className="font-semibold underline underline-offset-4"
                            >
                                {t('Set it up now')}
                            </Link>
                        </p>
                    </div>
                )}

                {stats && <AdminOverview stats={stats} />}

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {admin && (
                        <Panel
                            icon={<Users className="size-5" />}
                            title={t('Editorial office')}
                            description={t(
                                'People, roles and manuscripts sent through the website.',
                            )}
                        >
                            <div className="grid">
                                <Stat
                                    label={t('New manuscripts to check')}
                                    value={admin.newManuscripts}
                                    href={
                                        adminManuscripts({
                                            query: { status: 'submitted' },
                                        }).url
                                    }
                                />
                                <Stat
                                    label={t('Manuscripts in progress')}
                                    value={admin.manuscriptsInProgress}
                                    href={adminManuscripts().url}
                                />
                                <Stat
                                    label={t('Authors')}
                                    value={admin.people.author}
                                    href={
                                        users({ query: { role: 'author' } }).url
                                    }
                                />
                                <Stat
                                    label={t('Reviewers')}
                                    value={admin.people.reviewer}
                                    href={
                                        users({ query: { role: 'reviewer' } })
                                            .url
                                    }
                                />
                                <Stat
                                    label={t('Editorial office')}
                                    value={admin.people.admin}
                                    href={
                                        users({ query: { role: 'admin' } }).url
                                    }
                                />
                                <Stat
                                    label={t('Unconfirmed e-mail addresses')}
                                    value={admin.unverified}
                                />
                            </div>
                            <Link
                                href={legacySubmissions()}
                                className="mt-auto flex items-center gap-2 rounded-md border border-border px-3 py-2.5 hover:bg-muted"
                            >
                                <Inbox aria-hidden className="size-4" />
                                <span className="flex-1">
                                    {t('Website submissions')}
                                </span>
                                <span className="text-muted-foreground tabular-nums">
                                    {t('{count} this week', {
                                        count: admin.legacySubmissionsLastWeek,
                                    })}{' '}
                                    · {admin.legacySubmissions}
                                </span>
                            </Link>
                        </Panel>
                    )}

                    {roles.includes('author') && (
                        <Panel
                            icon={<FilePen className="size-5" />}
                            title={t('My manuscripts')}
                            description={t(
                                'Write on the journal template, submit, and follow the review.',
                            )}
                        >
                            {author && (
                                <div className="grid">
                                    <Stat
                                        label={t('Drafts')}
                                        value={author.drafts}
                                        href={myManuscripts().url}
                                    />
                                    <Stat
                                        label={t('Sent to the journal')}
                                        value={author.sent}
                                        href={myManuscripts().url}
                                    />
                                    {author.revisions > 0 && (
                                        <Stat
                                            label={t('Revision requested')}
                                            value={author.revisions}
                                            href={myManuscripts().url}
                                        />
                                    )}
                                </div>
                            )}
                            <Link
                                href={myManuscripts()}
                                className="mt-auto inline-flex w-fit items-center rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                {t('Write a new manuscript')}
                            </Link>
                        </Panel>
                    )}

                    {roles.includes('reviewer') && (
                        <Panel
                            icon={<ClipboardCheck className="size-5" />}
                            title={t('My reviews')}
                            description={t(
                                'Invitations from the editorial office and the manuscripts you review.',
                            )}
                        >
                            {reviewer &&
                            reviewer.invitations +
                                reviewer.inProgress +
                                reviewer.submitted >
                                0 ? (
                                <div className="grid">
                                    <Stat
                                        label={t('Invitations to answer')}
                                        value={reviewer.invitations}
                                        href={myReviews().url}
                                    />
                                    <Stat
                                        label={t('Reviews in progress')}
                                        value={reviewer.inProgress}
                                        href={myReviews().url}
                                    />
                                    <Stat
                                        label={t('Reviews sent')}
                                        value={reviewer.submitted}
                                        href={myReviews().url}
                                    />
                                </div>
                            ) : (
                                <Upcoming>
                                    {t(
                                        'No review invitations at the moment. We will e-mail you when the editorial office invites you.',
                                    )}
                                </Upcoming>
                            )}
                            <Link
                                href={myReviews()}
                                className="mt-auto inline-flex w-fit items-center rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                {t('Open my reviews')}
                            </Link>
                        </Panel>
                    )}
                </div>
            </div>
        </>
    );
}

const ROLE_LABELS: Record<Role, string> = {
    admin: 'Editorial office',
    author: 'Author',
    reviewer: 'Reviewer',
};

Dashboard.layout = {
    breadcrumbs: [{ title: 'Dashboard', href: dashboard() }],
};
