import { Head, Link, router, setLayoutProps, usePage } from '@inertiajs/react';
import {
    ArrowDown,
    ArrowUp,
    BookOpen,
    CircleAlert,
    ExternalLink,
    FileText,
    Lock,
    Plus,
} from 'lucide-react';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/manuscript/status-badge';
import { DepositButtons } from '@/components/archive/crossref-panel';
import { PublishOnline } from '@/components/publishing/publish-online';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { index as archiveIndex } from '@/routes/admin/archive';
import type { ManuscriptStatus } from '@/types/manuscript';
import type { IssueShowProps } from '@/types/publishing';

function Section({
    id,
    title,
    hint,
    children,
}: {
    id: string;
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <section
            aria-labelledby={id}
            className="grid gap-3 rounded-xl border bg-card p-4 md:p-5"
        >
            <div>
                <h2 id={id} className="m-0 text-base font-semibold">
                    {title}
                </h2>
                {hint && (
                    <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                        {hint}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

function Missing({ children }: { children: ReactNode }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-800 dark:text-amber-300">
            <CircleAlert aria-hidden="true" className="size-3.5" />
            {children}
        </span>
    );
}

export default function IssueShow({
    issue,
    manuscripts,
    articles,
    waiting,
}: IssueShowProps) {
    const { t } = useT();
    const errors = usePage().props.errors as Record<string, string>;
    const [closing, setClosing] = useState(false);
    const [processing, setProcessing] = useState(false);

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Archive and issues', href: archiveIndex() },
            { title: issue.label, href: issue.archiveUrl },
        ],
    });

    const move = (index: number, by: number) => {
        const order = manuscripts.map((m) => m.id);
        const [item] = order.splice(index, 1);
        order.splice(index + by, 0, item);
        router.post(issue.reorderUrl, { order }, { preserveScroll: true });
    };

    const close = () =>
        router.post(
            issue.closeUrl,
            {},
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setClosing(false);
                },
            },
        );

    return (
        <>
            <Head title={issue.label} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="m-0 text-2xl font-semibold tracking-tight">
                            {issue.label}
                        </h1>
                        <p className="m-0 mt-1 text-sm">
                            {issue.closed ? (
                                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                                    <Lock
                                        aria-hidden="true"
                                        className="size-3.5"
                                    />
                                    {t('Closed — published')}
                                </span>
                            ) : (
                                <span className="font-medium text-amber-800 dark:text-amber-300">
                                    {t(
                                        'In preparation (articles appear under Early online)',
                                    )}
                                </span>
                            )}
                            {issue.year && (
                                <span className="text-muted-foreground">
                                    {' '}
                                    · {issue.year}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={issue.publicUrl}
                                target="_blank"
                                rel="noopener"
                            >
                                <ExternalLink aria-hidden="true" />
                                {t('Public page')}
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <Link href={issue.archiveUrl}>
                                <BookOpen aria-hidden="true" />
                                {t('Archive view')}
                            </Link>
                        </Button>
                        {!issue.closed && (
                            <Button
                                size="sm"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
                                onClick={() => setClosing(true)}
                            >
                                <Lock aria-hidden="true" />
                                {t('Close the issue…')}
                            </Button>
                        )}
                    </div>
                </header>

                {errors.issue && (
                    <p
                        role="alert"
                        className="m-0 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                    >
                        {errors.issue}
                    </p>
                )}

                <Section
                    id="issue-manuscripts"
                    title={t('Manuscripts in this issue')}
                    hint={t(
                        'In the order they will be printed. Fill in the DOI and pages in each manuscript’s publication details before publishing.',
                    )}
                >
                    {manuscripts.length === 0 ? (
                        <p className="m-0 text-sm text-muted-foreground">
                            {t('No manuscripts placed in this issue yet.')}
                        </p>
                    ) : (
                        <ol className="m-0 grid list-none gap-3 p-0">
                            {manuscripts.map((m, index) => (
                                <li
                                    key={m.id}
                                    className="flex flex-col gap-3 rounded-lg border p-3 md:flex-row md:items-start"
                                >
                                    <div className="flex shrink-0 items-center gap-1 md:flex-col">
                                        <span className="w-8 text-center text-sm font-semibold tabular-nums">
                                            {index + 1}
                                        </span>
                                        {!issue.closed && (
                                            <>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    disabled={index === 0}
                                                    onClick={() =>
                                                        move(index, -1)
                                                    }
                                                    aria-label={t(
                                                        'Move {item} up',
                                                        {
                                                            item:
                                                                m.reference ??
                                                                m.title,
                                                        },
                                                    )}
                                                >
                                                    <ArrowUp aria-hidden="true" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="size-7"
                                                    disabled={
                                                        index ===
                                                        manuscripts.length - 1
                                                    }
                                                    onClick={() =>
                                                        move(index, 1)
                                                    }
                                                    aria-label={t(
                                                        'Move {item} down',
                                                        {
                                                            item:
                                                                m.reference ??
                                                                m.title,
                                                        },
                                                    )}
                                                >
                                                    <ArrowDown aria-hidden="true" />
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="m-0 flex flex-wrap items-center gap-2">
                                            {m.reference && (
                                                <span className="font-mono text-xs text-muted-foreground">
                                                    {m.reference}
                                                </span>
                                            )}
                                            <StatusBadge
                                                status={
                                                    m.status as ManuscriptStatus
                                                }
                                            />
                                        </p>
                                        <Link
                                            href={m.url}
                                            className="mt-1 block font-medium underline-offset-4 hover:underline"
                                        >
                                            {m.title ||
                                                t('Untitled manuscript')}
                                        </Link>
                                        <p className="m-0 text-sm text-muted-foreground">
                                            {m.authorsLine}
                                        </p>
                                        <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                                            {m.doi ? (
                                                <span className="font-mono text-xs">
                                                    {m.doi}
                                                </span>
                                            ) : (
                                                <Missing>
                                                    {t('DOI missing')}
                                                </Missing>
                                            )}
                                            {m.pages ? (
                                                <span>
                                                    {t('pp. {pages}', {
                                                        pages: m.pages,
                                                    })}
                                                </span>
                                            ) : (
                                                <Missing>
                                                    {t('pages missing')}
                                                </Missing>
                                            )}
                                            {(!m.doi || !m.pages) && (
                                                <Link
                                                    href={m.url}
                                                    className="text-xs underline underline-offset-4"
                                                >
                                                    {t(
                                                        'Fill in the publication details',
                                                    )}
                                                </Link>
                                            )}
                                        </p>
                                    </div>
                                    <div className="md:w-72 md:shrink-0">
                                        {m.articleUrl ? (
                                            <a
                                                href={m.articleUrl}
                                                target="_blank"
                                                rel="noopener"
                                                className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                                            >
                                                <ExternalLink
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                                {t(
                                                    'Published — view on the website',
                                                )}
                                            </a>
                                        ) : m.publishUrl ? (
                                            <PublishOnline
                                                url={m.publishUrl}
                                                pdfUrl={m.pdfUrl}
                                            />
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>

                {!issue.closed && (
                    <Section
                        id="issue-waiting"
                        title={t('Accepted manuscripts waiting for an issue')}
                    >
                        {waiting.length === 0 ? (
                            <p className="m-0 text-sm text-muted-foreground">
                                {t('No accepted manuscript is waiting.')}
                            </p>
                        ) : (
                            <ul className="m-0 grid list-none gap-2 p-0">
                                {waiting.map((w) => (
                                    <li
                                        key={w.id}
                                        className="flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2"
                                    >
                                        {w.reference && (
                                            <span className="font-mono text-xs text-muted-foreground">
                                                {w.reference}
                                            </span>
                                        )}
                                        <Link
                                            href={w.url}
                                            className="min-w-0 flex-1 underline-offset-4 hover:underline"
                                        >
                                            {w.title ||
                                                t('Untitled manuscript')}
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() =>
                                                router.post(
                                                    w.assignUrl,
                                                    { issue: issue.slug },
                                                    { preserveScroll: true },
                                                )
                                            }
                                        >
                                            <Plus aria-hidden="true" />
                                            {t('Add to this issue')}
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </Section>
                )}

                <Section
                    id="issue-crossref"
                    title={t('DOI registration (Crossref)')}
                    hint={t(
                        'A DOI works only after it is deposited at Crossref. Download the file and upload it at Crossref, or send it from here when the Crossref account is set up.',
                    )}
                >
                    <div className="flex flex-wrap items-center gap-3">
                        <DepositButtons
                            pending={issue.crossref.pending}
                            xmlUrl={issue.crossref.xmlUrl}
                            depositUrl={issue.crossref.depositUrl}
                        />
                        <Link
                            href={issue.crossref.checkUrl}
                            className="text-sm underline-offset-4 hover:underline"
                        >
                            {t('DOI check and Crossref settings')}
                        </Link>
                    </div>
                    {errors.crossref && (
                        <p role="alert" className="m-0 text-sm text-red-700">
                            {errors.crossref}
                        </p>
                    )}
                </Section>

                <Section
                    id="issue-articles"
                    title={t('Articles in this issue')}
                >
                    {articles.length === 0 ? (
                        <p className="m-0 text-sm text-muted-foreground">
                            {t('No articles published in this issue yet.')}
                        </p>
                    ) : (
                        <ol className="m-0 grid list-none gap-2 p-0">
                            {articles.map((a) => (
                                <li
                                    key={a.number}
                                    className="flex flex-wrap items-start gap-3 rounded-lg border px-3 py-2"
                                >
                                    <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                                        {a.number}
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="m-0 font-medium">
                                            {a.title}
                                        </p>
                                        {a.authors.length > 0 && (
                                            <p className="m-0 text-sm text-muted-foreground">
                                                {a.authors.join(', ')}
                                            </p>
                                        )}
                                        <p className="m-0 mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                                            <span className="font-medium">
                                                {a.fromSystem
                                                    ? t(
                                                          'Published from the system',
                                                      )
                                                    : t(
                                                          'Archived · old layout',
                                                      )}
                                            </span>
                                            {a.pages && (
                                                <span>
                                                    {t('pp. {pages}', {
                                                        pages: a.pages,
                                                    })}
                                                </span>
                                            )}
                                            {a.doi && (
                                                <span className="font-mono">
                                                    {a.doi}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    <div className="flex gap-1">
                                        {a.pdfUrl && (
                                            <Button
                                                asChild
                                                size="sm"
                                                variant="ghost"
                                            >
                                                <a
                                                    href={a.pdfUrl}
                                                    target="_blank"
                                                    rel="noopener"
                                                >
                                                    <FileText aria-hidden="true" />
                                                    {t('PDF')}
                                                </a>
                                            </Button>
                                        )}
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="ghost"
                                        >
                                            <a
                                                href={a.publicUrl}
                                                target="_blank"
                                                rel="noopener"
                                            >
                                                <ExternalLink aria-hidden="true" />
                                                {t('Public page')}
                                            </a>
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    )}
                </Section>
            </div>

            <Dialog
                open={closing}
                onOpenChange={(open) => !processing && setClosing(open)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>{t('Close this issue?')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'The issue becomes the current published issue on the website and can no longer take manuscripts. Publish every manuscript in it first.',
                        )}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            disabled={processing}
                            onClick={() => setClosing(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={processing}
                            onClick={close}
                        >
                            {t('Close and publish the issue')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
