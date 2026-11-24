import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronDown, ExternalLink, Search } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import {
    ArticleDepositButtons,
    CrossrefSettingsForm,
    DepositButtons,
    DepositLog,
    DepositStatusBadge,
    isDepositOpen,
    useDepositPolling,
} from '@/components/archive/crossref-panel';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import {
    dois as archiveDois,
    index as archiveIndex,
} from '@/routes/admin/archive';
import type { ArchiveDoisProps, CrossrefDepositRow } from '@/types/archive';

type Tab = 'pending' | 'double' | 'deposits' | 'settings';

const TABS: Tab[] = ['pending', 'double', 'deposits', 'settings'];

function tabFromHash(): Tab {
    const hash =
        typeof window === 'undefined' ? '' : window.location.hash.slice(1);

    return (TABS as string[]).includes(hash) ? (hash as Tab) : 'pending';
}

function Check({ href, children }: { href: string; children: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
        >
            <ExternalLink aria-hidden="true" className="size-3" />
            {children}
        </a>
    );
}

/** A number at the top that opens its tab. */
function Stat({
    value,
    label,
    tone,
    onClick,
}: {
    value: number;
    label: string;
    tone?: 'bad' | 'warn' | 'busy';
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className="grid gap-0.5 rounded-xl border bg-card px-4 py-3 text-left hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
        >
            <span
                className={cn(
                    'text-2xl font-semibold tabular-nums',
                    value > 0 &&
                        tone === 'bad' &&
                        'text-red-700 dark:text-red-400',
                    value > 0 &&
                        tone === 'warn' &&
                        'text-amber-800 dark:text-amber-300',
                    value > 0 &&
                        tone === 'busy' &&
                        'text-sky-800 dark:text-sky-300',
                )}
            >
                {value}
            </span>
            <span className="text-xs text-muted-foreground">{label}</span>
        </button>
    );
}

/** One issue: a header row with its actions, the articles when opened. */
function IssueCard({
    id,
    open,
    onToggle,
    title,
    href,
    meta,
    last,
    actions,
    children,
}: {
    id: string;
    open: boolean;
    onToggle: () => void;
    title: string;
    href: string;
    meta: string;
    last: CrossrefDepositRow | undefined;
    actions: ReactNode;
    children: ReactNode;
}) {
    const { t } = useT();

    return (
        <section className="rounded-xl border bg-card">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={id}
                    onClick={onToggle}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <ChevronDown
                        aria-hidden="true"
                        className={cn(
                            'size-4 shrink-0 text-muted-foreground transition-transform',
                            !open && '-rotate-90',
                        )}
                    />
                    <span className="min-w-0">
                        <span className="block font-semibold">{title}</span>
                        <span className="block text-xs text-muted-foreground">
                            {meta}
                        </span>
                    </span>
                </button>
                {last && (
                    <span
                        className="flex items-center gap-1.5 text-xs text-muted-foreground"
                        title={t('Last deposit')}
                    >
                        <span className="hidden sm:inline">
                            {t('Last deposit')}:
                        </span>
                        <DepositStatusBadge
                            status={last.status}
                            test={last.test}
                        />
                    </span>
                )}
                <div className="flex flex-wrap items-center gap-2">
                    {actions}
                    <Link
                        href={href}
                        className="text-xs text-muted-foreground underline-offset-4 hover:underline"
                    >
                        {t('Open the issue')}
                    </Link>
                </div>
            </div>
            {open && (
                <div id={id} className="border-t">
                    {children}
                </div>
            )}
        </section>
    );
}

/**
 * Which DOIs do not resolve and why: the result of comparing the articles
 * with the list of DOIs the journal has deposited at Crossref. Tabs: what
 * to register, what was registered with a mistake, the deposits, settings.
 */
export default function ArchiveDois({
    checkedAt,
    prefix,
    groups,
    double,
    crossref,
    deposits,
}: ArchiveDoisProps) {
    const { t, locale } = useT();
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const [tab, setTab] = useState<Tab>('pending');
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState<Set<string>>(new Set());

    useDepositPolling(deposits);

    // The tab is kept in the address (#deposits), so a reload stays on it.
    useEffect(() => {
        setTab(tabFromHash());
    }, []);

    const go = (next: Tab) => {
        setTab(next);
        window.history.replaceState(window.history.state, '', `#${next}`);
    };

    const toggle = (key: string) =>
        setOpen((current) => {
            const next = new Set(current);

            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }

            return next;
        });

    // The newest deposit of each issue (deposits come newest first).
    const lastBySlug = new Map<string, CrossrefDepositRow>();

    for (const d of deposits) {
        if (d.issueSlug && !lastBySlug.has(d.issueSlug)) {
            lastBySlug.set(d.issueSlug, d);
        }
    }

    const notRegistered = groups.reduce((n, g) => n + g.articles.length, 0);
    const mistaken = double.reduce((n, g) => n + g.articles.length, 0);
    const inProgress = deposits.filter(isDepositOpen).length;
    const failed = [...lastBySlug.values()].filter(
        (d) => d.status === 'failed',
    ).length;

    const q = query.trim().toLowerCase();
    const shown =
        q === ''
            ? groups
            : groups.filter((g) =>
                  [
                      g.label,
                      String(g.year ?? ''),
                      ...g.articles.flatMap((a) => [a.title, a.doi]),
                  ]
                      .join(' ')
                      .toLowerCase()
                      .includes(q),
              );

    const date = checkedAt
        ? new Date(checkedAt).toLocaleString(
              locale === 'mk' ? 'mk-MK' : 'en-GB',
              { dateStyle: 'long', timeStyle: 'short' },
          )
        : null;

    const tabLabel: Record<Tab, string> = {
        pending: t('To register ({count})', { count: notRegistered }),
        double: t('Registered with a mistake ({count})', { count: mistaken }),
        deposits: t('Deposits ({count})', { count: deposits.length }),
        settings: t('Settings'),
    };

    const visibleTabs = TABS.filter((k) => k !== 'double' || mistaken > 0);

    return (
        <>
            <Head title={t('DOI check')} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="grid max-w-3xl gap-2">
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('DOI check')}
                    </h1>
                    <p className="m-0 text-sm text-muted-foreground">
                        {date
                            ? t('Last compared with Crossref: {date}.', {
                                  date,
                              })
                            : t('Not compared with Crossref yet.')}{' '}
                        {crossref.connected ? (
                            <span
                                className={cn(
                                    'font-medium',
                                    crossref.testMode
                                        ? 'text-amber-800 dark:text-amber-300'
                                        : 'text-emerald-700 dark:text-emerald-400',
                                )}
                            >
                                {crossref.testMode
                                    ? t('Crossref: test system.')
                                    : t('Crossref: connected.')}
                            </span>
                        ) : (
                            <span className="font-medium">
                                {t('Crossref: not connected.')}
                            </span>
                        )}
                    </p>
                    <details className="text-sm text-muted-foreground">
                        <summary className="cursor-pointer font-medium text-foreground">
                            {t('How does this work?')}
                        </summary>
                        <p className="m-0 mt-2">
                            {t(
                                'A DOI works only after the publisher deposits it at Crossref, the DOI registration agency. The system downloads the list of every DOI deposited under the journal’s prefix {prefix} and compares it with the articles. A DOI that is not on that list does not open at doi.org: readers and indexing services cannot follow it.',
                                { prefix },
                            )}
                        </p>
                        <p className="m-0 mt-2">
                            {t(
                                'Each DOI can be checked by hand with the links next to it: doi.org opens the article when the DOI is registered and shows “DOI not found” when it is not.',
                            )}
                        </p>
                    </details>
                </header>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Stat
                        value={notRegistered}
                        label={t('DOIs not registered, in {count} issues', {
                            count: groups.length,
                        })}
                        tone="bad"
                        onClick={() => go('pending')}
                    />
                    <Stat
                        value={mistaken}
                        label={t('Registered with a mistake')}
                        tone="warn"
                        onClick={() => go('double')}
                    />
                    <Stat
                        value={inProgress}
                        label={t('Deposits in progress')}
                        tone="busy"
                        onClick={() => go('deposits')}
                    />
                    <Stat
                        value={failed}
                        label={t('Issues whose last deposit failed')}
                        tone="bad"
                        onClick={() => go('deposits')}
                    />
                </div>

                <InputError message={errors.crossref} />

                <div
                    role="tablist"
                    aria-label={t('DOI check')}
                    className="flex flex-wrap gap-1 border-b"
                >
                    {visibleTabs.map((k) => (
                        <button
                            key={k}
                            type="button"
                            role="tab"
                            id={`tab-${k}`}
                            aria-selected={tab === k}
                            aria-controls={`panel-${k}`}
                            onClick={() => go(k)}
                            className={cn(
                                '-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring',
                                tab === k
                                    ? 'border-foreground text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {tabLabel[k]}
                        </button>
                    ))}
                </div>

                {tab === 'pending' && (
                    <div
                        role="tabpanel"
                        id="panel-pending"
                        aria-labelledby="tab-pending"
                        className="grid gap-3"
                    >
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[14rem] flex-1">
                                <Search
                                    aria-hidden
                                    className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                                />
                                <Input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder={t(
                                        'Volume, year, title or DOI',
                                    )}
                                    aria-label={t('Search')}
                                    className="pl-9"
                                />
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setOpen(
                                        open.size > 0
                                            ? new Set()
                                            : new Set(
                                                  shown.map((g) => g.slug),
                                              ),
                                    )
                                }
                            >
                                {open.size > 0
                                    ? t('Close all')
                                    : t('Open all')}
                            </Button>
                        </div>

                        {shown.length === 0 && (
                            <p className="m-0 rounded-xl border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
                                {groups.length === 0
                                    ? t(
                                          'Every DOI of the archive is registered.',
                                      )
                                    : t('No issue matches the search.')}
                            </p>
                        )}

                        {shown.map((g) => (
                            <IssueCard
                                key={g.slug}
                                id={`doi-${g.slug}`}
                                open={open.has(g.slug)}
                                onToggle={() => toggle(g.slug)}
                                title={
                                    g.year ? `${g.label} (${g.year})` : g.label
                                }
                                href={g.url}
                                meta={
                                    g.articles.length === g.total
                                        ? t('all {count} articles', {
                                              count: g.total,
                                          })
                                        : t('{count} of {total} articles', {
                                              count: g.articles.length,
                                              total: g.total,
                                          })
                                }
                                last={lastBySlug.get(g.slug)}
                                actions={
                                    <DepositButtons
                                        pending={g.pending}
                                        xmlUrl={g.xmlUrl}
                                        depositUrl={
                                            crossref.connected
                                                ? g.depositUrl
                                                : null
                                        }
                                    />
                                }
                            >
                                {g.pending < g.articles.length && (
                                    <p className="m-0 border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
                                        {t(
                                            'Articles whose DOI is registered for another PDF are left out: check them by hand first.',
                                        )}
                                    </p>
                                )}
                                <ul className="m-0 grid list-none divide-y p-0">
                                    {g.articles.map((a) => (
                                        <li
                                            key={a.number}
                                            className="grid gap-1 px-4 py-3 text-sm"
                                        >
                                            <Link
                                                href={a.url}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {a.number}. {a.title}
                                            </Link>
                                            <span className="font-mono text-xs break-all">
                                                {a.doi}
                                            </span>
                                            <span className="text-xs font-medium text-red-700 dark:text-red-400">
                                                {t(a.problem)}
                                                {a.crossrefDoi &&
                                                    ` — ${t('Crossref has: {doi}', { doi: a.crossrefDoi })}`}
                                            </span>
                                            <span className="flex flex-wrap items-center gap-3">
                                                <ArticleDepositButtons
                                                    xmlUrl={a.xmlUrl}
                                                    depositUrl={
                                                        crossref.connected
                                                            ? a.depositUrl
                                                            : null
                                                    }
                                                />
                                                <Check
                                                    href={`https://doi.org/${a.doi}`}
                                                >
                                                    {t('Open at doi.org')}
                                                </Check>
                                                <Check
                                                    href={`https://search.crossref.org/search/works?q=${encodeURIComponent(a.doi)}&from_ui=yes`}
                                                >
                                                    {t('Search at Crossref')}
                                                </Check>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </IssueCard>
                        ))}
                    </div>
                )}

                {tab === 'double' && (
                    <div
                        role="tabpanel"
                        id="panel-double"
                        aria-labelledby="tab-double"
                        className="grid gap-3"
                    >
                        <p className="m-0 max-w-3xl text-sm text-muted-foreground">
                            {t(
                                'These DOIs were deposited at Crossref with a typo, most often the prefix written twice. The DOI printed on the article does not open; only the mistyped form does (the website links to it for now). The fix: deposit the issue again, which registers the DOIs as printed. Afterwards the publisher can ask Crossref support to alias the mistyped DOIs to the right ones.',
                            )}
                        </p>
                        {double.map((g) => (
                            <IssueCard
                                key={g.slug}
                                id={`double-${g.slug}`}
                                open={open.has(`double-${g.slug}`)}
                                onToggle={() => toggle(`double-${g.slug}`)}
                                title={g.label}
                                href={g.url}
                                meta={t('{count} DOIs', {
                                    count: g.articles.length,
                                })}
                                last={lastBySlug.get(g.slug)}
                                actions={
                                    <DepositButtons
                                        pending={g.pending}
                                        xmlUrl={g.xmlUrl}
                                        depositUrl={
                                            crossref.connected
                                                ? g.depositUrl
                                                : null
                                        }
                                    />
                                }
                            >
                                <ul className="m-0 grid list-none divide-y p-0">
                                    {g.articles.map((d) => (
                                        <li
                                            key={d.number}
                                            className="grid gap-1 px-4 py-3 text-sm"
                                        >
                                            <Link
                                                href={d.url}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {g.label}, {d.number}
                                            </Link>
                                            <span className="font-mono text-xs break-all">
                                                {t('Printed (does not open)')}:{' '}
                                                {d.doi}
                                            </span>
                                            <span className="font-mono text-xs break-all">
                                                {t('Registered (opens)')}:{' '}
                                                {d.registeredAs}
                                            </span>
                                            <span className="flex flex-wrap items-center gap-3">
                                                <ArticleDepositButtons
                                                    xmlUrl={d.xmlUrl}
                                                    depositUrl={
                                                        crossref.connected
                                                            ? d.depositUrl
                                                            : null
                                                    }
                                                />
                                                <Check
                                                    href={`https://doi.org/${d.doi}`}
                                                >
                                                    {t(
                                                        'Open printed at doi.org',
                                                    )}
                                                </Check>
                                                <Check
                                                    href={`https://doi.org/${d.registeredAs}`}
                                                >
                                                    {t(
                                                        'Open registered at doi.org',
                                                    )}
                                                </Check>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </IssueCard>
                        ))}
                    </div>
                )}

                {tab === 'deposits' && (
                    <div
                        role="tabpanel"
                        id="panel-deposits"
                        aria-labelledby="tab-deposits"
                        className="grid gap-2"
                    >
                        <p className="m-0 text-sm text-muted-foreground">
                            {t(
                                'The last deposits sent from here, newest first. Crossref’s answer arrives within minutes.',
                            )}
                        </p>
                        <DepositLog deposits={deposits} />
                    </div>
                )}

                {tab === 'settings' && (
                    <div
                        role="tabpanel"
                        id="panel-settings"
                        aria-labelledby="tab-settings"
                    >
                        {/* The account form (CrossrefAccountForm) is hidden: the Crossref
                            account is set on the server in .env (CROSSREF_USERNAME,
                            CROSSREF_PASSWORD, CROSSREF_MODE). */}
                        <CrossrefSettingsForm settings={crossref} />
                    </div>
                )}
            </div>
        </>
    );
}

ArchiveDois.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Archive', href: archiveIndex() },
        { title: 'DOI check', href: archiveDois() },
    ],
};
