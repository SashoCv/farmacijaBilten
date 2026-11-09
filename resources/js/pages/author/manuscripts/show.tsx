import { Head, Link, setLayoutProps } from '@inertiajs/react';
import {
    ArrowRight,
    ExternalLink,
    FileDown,
    FileText,
    PenLine,
} from 'lucide-react';
import { StatusBadge } from '@/components/manuscript/status-badge';
import { DueDate } from '@/components/review/due-date';
import { ReviewFiles } from '@/components/review/review-files';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { decisionLabel, eventLabel, statusNext } from '@/lib/manuscript-status';
import { dashboard } from '@/routes';
import { index as manuscriptsIndex } from '@/routes/author/manuscripts';
import { docx, pdf } from '@/routes/manuscripts';
import type { ManuscriptEvent, ManuscriptShowProps } from '@/types/manuscript';
import type { AuthorDecision } from '@/types/review';
import '../../../../css/manuscript.css';
import '../../../../css/manuscript-article.css';

function useDateTime() {
    const { locale } = useT();
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
            timeZone: 'Europe/Skopje',
        },
    );

    return (iso: string | null) => (iso ? format.format(new Date(iso)) : '—');
}

/** Status changes and other events of the manuscript, newest first. */
function History({ events }: { events: ManuscriptEvent[] }) {
    const { t } = useT();
    const when = useDateTime();
    const ordered = [...events].sort((a, b) => b.at.localeCompare(a.at));

    return (
        <section
            aria-labelledby="history-heading"
            className="rounded-xl border bg-card p-5"
        >
            <h2 id="history-heading" className="m-0 text-base font-semibold">
                {t('History')}
            </h2>
            {ordered.length === 0 ? (
                <p className="m-0 mt-2 text-sm text-muted-foreground">
                    {t('Nothing has happened yet.')}
                </p>
            ) : (
                <ol className="m-0 mt-4 grid list-none gap-0 p-0">
                    {ordered.map((event) => (
                        <li
                            key={event.id}
                            className="relative border-l border-border pb-5 pl-5 last:pb-0"
                        >
                            <span
                                aria-hidden="true"
                                className="absolute top-1 -left-[5px] size-2.5 rounded-full border-2 border-background bg-foreground/70"
                            />
                            <p className="m-0 flex flex-wrap items-center gap-1.5 text-sm">
                                {event.toStatus ? (
                                    <>
                                        {event.fromStatus ? (
                                            <>
                                                <StatusBadge
                                                    status={event.fromStatus}
                                                />
                                                <ArrowRight
                                                    aria-label={t('to')}
                                                    className="size-3.5 text-muted-foreground"
                                                />
                                            </>
                                        ) : null}
                                        <StatusBadge status={event.toStatus} />
                                    </>
                                ) : (
                                    <span className="font-medium">
                                        {t(eventLabel(event.type))}
                                    </span>
                                )}
                            </p>
                            <p className="m-0 mt-1 text-xs text-muted-foreground">
                                <time dateTime={event.at}>
                                    {when(event.at)}
                                </time>
                                {event.actor && <> · {event.actor}</>}
                            </p>
                            {event.note && (
                                <p className="m-0 mt-1.5 text-sm whitespace-pre-line">
                                    {event.note}
                                </p>
                            )}
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}

/** Editorial decisions with the anonymised reviews, newest first. */
function Decisions({ decisions }: { decisions: AuthorDecision[] }) {
    const { t } = useT();
    const when = useDateTime();
    const ordered = [...decisions].sort((a, b) => b.at.localeCompare(a.at));

    return (
        <section aria-labelledby="decisions-heading" className="grid gap-3">
            <h2 id="decisions-heading" className="m-0 text-base font-semibold">
                {t('Decisions and reviews')}
            </h2>
            {ordered.map((decision, index) => (
                <details
                    key={`${decision.round}-${decision.at}`}
                    open={index === 0}
                    className="rounded-xl border bg-card"
                >
                    <summary className="cursor-pointer px-5 py-3">
                        <span className="font-semibold">
                            {t(decisionLabel(decision.type))}
                        </span>{' '}
                        <span className="text-sm text-muted-foreground">
                            · {t('Round {n}', { n: decision.round })} ·{' '}
                            <time dateTime={decision.at}>
                                {when(decision.at)}
                            </time>
                        </span>
                    </summary>
                    <div className="grid gap-5 border-t px-5 py-4">
                        <div>
                            <h3 className="m-0 mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                {t('Letter from the editorial office')}
                            </h3>
                            <p className="m-0 text-sm whitespace-pre-line">
                                {decision.letter}
                            </p>
                        </div>
                        {decision.reviews.map((review) => (
                            <div key={review.number} className="grid gap-2">
                                <h3 className="m-0 text-sm font-semibold">
                                    {t('Reviewer {n}', { n: review.number })}
                                </h3>
                                <p className="m-0 text-sm whitespace-pre-line">
                                    {review.commentsToAuthor || '—'}
                                </p>
                                <ReviewFiles files={review.files} />
                            </div>
                        ))}
                    </div>
                </details>
            ))}
        </section>
    );
}

export default function ShowManuscript({
    manuscript,
    html,
    events,
    editUrl,
    decisions = [],
    revisionDueAt = null,
    messages = [],
    publication = null,
}: ManuscriptShowProps) {
    const { t } = useT();
    const when = useDateTime();
    const title = manuscript.title.trim() || t('Untitled manuscript');
    const latest = [...decisions].sort((a, b) => b.at.localeCompare(a.at))[0];
    const returned = latest?.type === 'return';

    // The layout translates these English keys.
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'My manuscripts', href: manuscriptsIndex() },
            { title: manuscript.reference ?? title, href: manuscript.url },
        ],
    });

    return (
        <>
            <Head title={title} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="flex flex-wrap items-start gap-4">
                    <div className="min-w-0 flex-1">
                        <h1 className="m-0 text-2xl font-semibold tracking-tight">
                            {title}
                        </h1>
                        {manuscript.authorsLine && (
                            <p className="m-0 mt-1 text-sm text-muted-foreground">
                                {manuscript.authorsLine}
                            </p>
                        )}
                        <p className="m-0 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                            <StatusBadge status={manuscript.status} />
                            <span>{manuscript.typeLabel}</span>
                            {manuscript.reference && (
                                <span className="tabular-nums">
                                    {t('Reference {reference}', {
                                        reference: manuscript.reference,
                                    })}
                                </span>
                            )}
                            {manuscript.submittedAt && (
                                <span>
                                    {t('Submitted {date}', {
                                        date: when(manuscript.submittedAt),
                                    })}
                                </span>
                            )}
                        </p>
                    </div>
                    <Button asChild variant="outline">
                        <a href={docx(manuscript.id).url} download>
                            <FileDown aria-hidden="true" />
                            {t('Download Word (.docx)')}
                        </a>
                    </Button>
                    <Button asChild variant="outline">
                        <a
                            href={pdf(manuscript.id).url}
                            target="_blank"
                            rel="noopener"
                        >
                            <FileText aria-hidden="true" />
                            {t('PDF (journal layout)')}
                        </a>
                    </Button>
                    {editUrl && (
                        <Button asChild>
                            <Link href={editUrl}>
                                <PenLine aria-hidden="true" />
                                {t('Edit')}
                            </Link>
                        </Button>
                    )}
                </header>

                {manuscript.status !== 'revision_requested' && (
                    <section
                        aria-label={t('Where your manuscript is')}
                        className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-4"
                    >
                        <StatusBadge status={manuscript.status} />
                        <p className="m-0 min-w-0 flex-1 text-sm">
                            {t(statusNext(manuscript.status))}
                        </p>
                    </section>
                )}

                {publication &&
                    (publication.issue ||
                        publication.doi ||
                        publication.articleUrl) && (
                        <section
                            aria-labelledby="publication-heading"
                            className="grid gap-3 rounded-xl border border-emerald-300 bg-emerald-50/60 p-5 dark:border-emerald-800 dark:bg-emerald-950/40"
                        >
                            <h2
                                id="publication-heading"
                                className="m-0 text-base font-semibold"
                            >
                                {t('Publication')}
                            </h2>
                            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                                {publication.issue && (
                                    <>
                                        <dt className="text-muted-foreground">
                                            {t('Issue')}
                                        </dt>
                                        <dd className="m-0">
                                            {publication.issue}
                                            {publication.year &&
                                                ` (${publication.year})`}
                                        </dd>
                                    </>
                                )}
                                {publication.pages && (
                                    <>
                                        <dt className="text-muted-foreground">
                                            {t('Pages')}
                                        </dt>
                                        <dd className="m-0">
                                            {publication.pages}
                                        </dd>
                                    </>
                                )}
                                {publication.doi && (
                                    <>
                                        <dt className="text-muted-foreground">
                                            DOI
                                        </dt>
                                        <dd className="m-0 break-all">
                                            <a
                                                href={`https://doi.org/${publication.doi}`}
                                                target="_blank"
                                                rel="noopener"
                                                className="underline underline-offset-4"
                                            >
                                                https://doi.org/
                                                {publication.doi}
                                            </a>
                                        </dd>
                                    </>
                                )}
                                {publication.publishedAt && (
                                    <>
                                        <dt className="text-muted-foreground">
                                            {t('Online')}
                                        </dt>
                                        <dd className="m-0">
                                            {t('Published online on {date}', {
                                                date: when(
                                                    publication.publishedAt,
                                                ),
                                            })}
                                        </dd>
                                    </>
                                )}
                            </dl>
                            {publication.articleUrl && (
                                <Button asChild className="w-fit">
                                    <a
                                        href={publication.articleUrl}
                                        target="_blank"
                                        rel="noopener"
                                    >
                                        <ExternalLink aria-hidden="true" />
                                        {t(
                                            'View your article on the journal website',
                                        )}
                                    </a>
                                </Button>
                            )}
                        </section>
                    )}

                {manuscript.status === 'revision_requested' && (
                    <div
                        role="status"
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50"
                    >
                        <div className="min-w-0 flex-1">
                            {returned ? (
                                <>
                                    <p className="m-0 font-semibold">
                                        {t(
                                            'The editorial office returned the manuscript for corrections.',
                                        )}
                                    </p>
                                    <p className="m-0 mt-1">
                                        {t(
                                            'Read the letter below, correct the manuscript and submit it again.',
                                        )}
                                    </p>
                                </>
                            ) : (
                                <>
                                    <p className="m-0 font-semibold">
                                        {t(
                                            'The editors ask you to revise the manuscript.',
                                        )}
                                    </p>
                                    <p className="m-0 mt-1">
                                        {t(
                                            'Read the decision and the reviews below, revise the text and answer each comment in your response to the reviewers.',
                                        )}
                                    </p>
                                </>
                            )}
                            {revisionDueAt && (
                                <p className="m-0 mt-1">
                                    <DueDate
                                        label={t('Revision due')}
                                        iso={revisionDueAt}
                                    />
                                </p>
                            )}
                        </div>
                        {editUrl && (
                            <Button asChild>
                                <Link href={editUrl}>
                                    <PenLine aria-hidden="true" />
                                    {t('Revise the manuscript')}
                                </Link>
                            </Button>
                        )}
                    </div>
                )}

                {messages.length > 0 && (
                    <section
                        aria-labelledby="messages-heading"
                        className="rounded-xl border bg-card p-5"
                    >
                        <h2
                            id="messages-heading"
                            className="m-0 mb-3 text-base font-semibold"
                        >
                            {t('Messages from the editorial office')}
                        </h2>
                        <ol className="m-0 grid list-none gap-4 p-0">
                            {[...messages]
                                .sort((a, b) => b.at.localeCompare(a.at))
                                .map((message) => (
                                    <li
                                        key={message.id}
                                        className="border-l-2 border-border pl-3"
                                    >
                                        <p className="m-0 text-xs text-muted-foreground">
                                            <time dateTime={message.at}>
                                                {when(message.at)}
                                            </time>
                                        </p>
                                        <p className="m-0 mt-1 text-sm whitespace-pre-line">
                                            {message.body}
                                        </p>
                                    </li>
                                ))}
                        </ol>
                    </section>
                )}

                {decisions.length > 0 && <Decisions decisions={decisions} />}

                <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
                    <section aria-label={t('The manuscript')}>
                        <div className="ms-desk rounded-xl border">
                            <div
                                lang={manuscript.language}
                                className="ms ms-paper"
                                // Sanitised on the server (ManuscriptRenderer).
                                dangerouslySetInnerHTML={{ __html: html }}
                            />
                        </div>
                    </section>
                    <History events={events} />
                </div>
            </div>
        </>
    );
}
