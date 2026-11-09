import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, FolderPlus, Search, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { ArticleRow } from '@/components/archive/article-row';
import { NewIssueForm } from '@/components/archive/new-issue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { index as archiveIndex } from '@/routes/admin/archive';
import type { ArchiveIndexProps } from '@/types/archive';

function Tile({
    label,
    value,
    warn,
    href,
    hint,
}: {
    label: string;
    value: number;
    warn?: boolean;
    href?: string;
    hint?: string;
}) {
    const body = (
        <>
            <p className="m-0 text-sm text-muted-foreground">{label}</p>
            <p
                className={
                    warn && value > 0
                        ? 'm-0 mt-1 text-2xl font-semibold text-amber-800 tabular-nums dark:text-amber-300'
                        : 'm-0 mt-1 text-2xl font-semibold tabular-nums'
                }
            >
                {value}
            </p>
            {href && hint && (
                <p className="m-0 mt-1 text-xs font-medium underline-offset-4 group-hover:underline">
                    {hint}
                </p>
            )}
        </>
    );

    return href ? (
        <Link
            href={href}
            className="group rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
        >
            {body}
        </Link>
    ) : (
        <div className="rounded-xl border bg-card p-4">{body}</div>
    );
}

export default function ArchiveIndex({
    issues,
    filters,
    results,
    totals,
    createIssueUrl,
    nextIssue,
    doiCheckUrl,
}: ArchiveIndexProps) {
    const { t } = useT();
    const [creating, setCreating] = useState(false);
    const open = issues.filter((issue) => issue.manageUrl);

    const volumes = new Map<number, ArchiveIndexProps['issues']>();

    for (const issue of issues.filter((i) => !i.manageUrl)) {
        volumes.set(issue.volume, [
            ...(volumes.get(issue.volume) ?? []),
            issue,
        ]);
    }

    return (
        <>
            <Head title={t('Archive')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('Archive')}
                    </h1>
                    <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                        {t(
                            'The published volumes, archived as they appeared: each article is its original PDF in the old two-column layout. They are shown as they are and cannot be edited; new manuscripts use the new template.',
                        )}
                    </p>
                </header>

                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
                    <Tile label={t('Articles')} value={totals.articles} />
                    <Tile label={t('Issues')} value={totals.issues} />
                    <Tile
                        label={t('DOIs not registered')}
                        value={totals.doiUnregistered}
                        warn
                        href={doiCheckUrl}
                        hint={t('See which and why')}
                    />
                    <Tile
                        label={t('Without an abstract')}
                        value={totals.withoutAbstract}
                        warn
                    />
                    <Tile
                        label={t('Without key words')}
                        value={totals.withoutKeywords}
                        warn
                    />
                </div>

                <form
                    role="search"
                    className="flex flex-wrap items-end gap-3"
                    onSubmit={(event) => {
                        event.preventDefault();
                        const raw = new FormData(event.currentTarget).get('q');
                        const q = typeof raw === 'string' ? raw.trim() : '';
                        router.get(archiveIndex().url, q ? { q } : {}, {
                            preserveState: true,
                            preserveScroll: true,
                            replace: true,
                        });
                    }}
                >
                    <div className="grid min-w-[16rem] flex-1 gap-1.5">
                        <Label htmlFor="archive-q">
                            {t('Find an article')}
                        </Label>
                        <div className="relative">
                            <Search
                                aria-hidden
                                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                            />
                            <Input
                                id="archive-q"
                                name="q"
                                type="search"
                                defaultValue={filters.q}
                                placeholder={t(
                                    'Title, author, key word, abstract or exact DOI',
                                )}
                                className="pl-9"
                            />
                        </div>
                    </div>
                    <Button type="submit" variant="secondary">
                        {t('Search')}
                    </Button>
                </form>

                {filters.q !== '' && (
                    <section
                        aria-labelledby="archive-results"
                        className="grid gap-2"
                    >
                        <h2
                            id="archive-results"
                            className="m-0 text-base font-semibold"
                        >
                            {t('Results for “{q}”', { q: filters.q })}{' '}
                            <span className="font-normal text-muted-foreground">
                                ({results.length})
                            </span>
                        </h2>
                        {results.length === 0 ? (
                            <p className="m-0 text-sm text-muted-foreground">
                                {t('No article matches. Try fewer words.')}
                            </p>
                        ) : (
                            <ul className="m-0 grid list-none overflow-hidden rounded-xl border p-0">
                                {results.map((row) => (
                                    <ArticleRow key={row.id} row={row} />
                                ))}
                            </ul>
                        )}
                        {results.length >= 50 && (
                            <p className="m-0 text-xs text-muted-foreground">
                                {t('Only the first 50 matches are shown.')}
                            </p>
                        )}
                    </section>
                )}

                <section
                    aria-labelledby="issues-open"
                    className="grid gap-3 rounded-xl border bg-card p-4 md:p-5"
                >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <h2
                                id="issues-open"
                                className="m-0 text-base font-semibold"
                            >
                                {t('Issues in preparation')}
                            </h2>
                            <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                                {t(
                                    'Place accepted manuscripts in an open issue, publish each online with its final PDF, then close the issue to publish it.',
                                )}
                            </p>
                        </div>
                        {!creating && (
                            <Button size="sm" onClick={() => setCreating(true)}>
                                <FolderPlus aria-hidden="true" />
                                {t('New issue')}
                            </Button>
                        )}
                    </div>
                    {creating && (
                        <NewIssueForm
                            url={createIssueUrl}
                            defaults={nextIssue}
                            onCancel={() => setCreating(false)}
                        />
                    )}
                    {open.length === 0 ? (
                        <p className="m-0 text-sm text-muted-foreground">
                            {t(
                                'No issue is open. Open one to place accepted manuscripts in it.',
                            )}
                        </p>
                    ) : (
                        <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
                            {open.map((issue) => (
                                <li
                                    key={issue.slug}
                                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                                >
                                    <div className="min-w-0">
                                        <p className="m-0 font-medium">
                                            {issue.label}
                                        </p>
                                        <p className="m-0 text-xs text-muted-foreground">
                                            {[
                                                issue.year,
                                                t('{count} articles', {
                                                    count: issue.articles,
                                                }),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}{' '}
                                            · {t('in preparation')}
                                        </p>
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        <Link href={issue.manageUrl!}>
                                            <Settings2 aria-hidden="true" />
                                            {t('Manage')}
                                        </Link>
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section
                    aria-labelledby="archive-volumes"
                    className="grid gap-4"
                >
                    <h2
                        id="archive-volumes"
                        className="m-0 text-base font-semibold"
                    >
                        {t('Volumes and issues')}
                    </h2>
                    {[...volumes.entries()].map(([volume, list]) => (
                        <section
                            key={volume}
                            aria-label={t('Volume {n}', { n: volume })}
                            className="grid gap-2"
                        >
                            <h3 className="m-0 text-sm font-semibold text-muted-foreground">
                                {t('Volume {n}', { n: volume })}
                                {list[0]?.year ? ` · ${list[0].year}` : ''}
                            </h3>
                            <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 xl:grid-cols-3">
                                {list.map((issue) => (
                                    <li
                                        key={issue.slug}
                                        className="flex gap-3 rounded-xl border bg-card p-3"
                                    >
                                        {issue.cover ? (
                                            <img
                                                src={issue.cover}
                                                alt=""
                                                loading="lazy"
                                                className="h-20 w-14 shrink-0 rounded border object-cover"
                                            />
                                        ) : (
                                            <span
                                                aria-hidden="true"
                                                className="h-20 w-14 shrink-0 rounded border bg-muted"
                                            />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <Link
                                                href={issue.url}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {issue.label}
                                            </Link>
                                            <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                                                {[
                                                    issue.year,
                                                    t('{count} articles', {
                                                        count: issue.articles,
                                                    }),
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </p>
                                            {!issue.published && (
                                                <p className="m-0 mt-1 text-xs font-medium text-amber-800 dark:text-amber-300">
                                                    {t(
                                                        'Early online (issue not complete)',
                                                    )}
                                                </p>
                                            )}
                                            <a
                                                href={issue.publicUrl}
                                                target="_blank"
                                                rel="noopener"
                                                className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
                                            >
                                                <ExternalLink
                                                    aria-hidden="true"
                                                    className="size-3"
                                                />
                                                {t('Public page')}
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    ))}
                </section>
            </div>
        </>
    );
}

ArchiveIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Archive', href: archiveIndex() },
    ],
};
