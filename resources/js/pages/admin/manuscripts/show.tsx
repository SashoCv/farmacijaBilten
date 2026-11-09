import { Head } from '@inertiajs/react';
import {
    Check,
    FileDown,
    FileText,
    Gavel,
    Newspaper,
    NotebookPen,
    Undo2,
    UserPlus,
    X,
    XCircle,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PublicationPanel } from '@/components/manuscript/publication-panel';
import type { PublicationDetails } from '@/components/manuscript/publication-panel';
import { StatusBadge } from '@/components/manuscript/status-badge';
import { IssueBox } from '@/components/publishing/issue-box';
import { AdminNotes } from '@/components/review/admin-notes';
import { AdminPeerReview } from '@/components/review/admin-peer-review';
import type { PeerReviewRequest } from '@/components/review/admin-peer-review';
import { useT } from '@/lib/i18n';
import { eventLabel, statusLabel } from '@/lib/manuscript-status';
import { dashboard } from '@/routes';
import { index } from '@/routes/admin/manuscripts';
import { docx, pdf } from '@/routes/manuscripts';
import type {
    ManuscriptEvent,
    ManuscriptSummary,
    SubmissionData,
} from '@/types/manuscript';
import type { ManuscriptPublishing } from '@/types/publishing';
import type {
    AdminNotes as Notes,
    AdminReviews,
    DecisionType,
} from '@/types/review';
import '../../../../css/manuscript.css';
import '../../../../css/manuscript-article.css';

type Props = {
    manuscript: ManuscriptSummary & { authorsLine: string; versions: number };
    html: string;
    events: ManuscriptEvent[];
    submission: SubmissionData;
    declarations: Record<string, string>;
    publication: PublicationDetails;
    reviews: AdminReviews;
    notes?: Notes;
    publishing?: ManuscriptPublishing;
};

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
            timeZone: 'Europe/Skopje',
        },
    );

    return (iso: string | null) => (iso ? format.format(new Date(iso)) : '—');
}

function Box({
    title,
    children,
}: {
    title: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-xl border bg-card p-4">
            <h2 className="m-0 mb-3 text-sm font-semibold">{title}</h2>
            <div className="text-sm">{children}</div>
        </section>
    );
}

export default function AdminManuscript({
    manuscript: m,
    html,
    events,
    submission,
    declarations,
    publication,
    reviews,
    notes,
    publishing,
}: Props) {
    const { t } = useT();
    const dateTime = useDateTime();
    const [request, setRequest] = useState<PeerReviewRequest | null>(null);
    const types = reviews.decision.types;
    const canDecide = reviews.decision.canDecide;
    // A technical return is possible only before the review starts.
    const canReturn = ['submitted', 'resubmitted'].includes(m.status);

    const open = (kind: PeerReviewRequest['kind'], type?: DecisionType) =>
        setRequest((previous) => ({
            kind,
            type,
            seq: (previous?.seq ?? 0) + 1,
        }));

    // #review and #decision (from the manuscripts list) open the right form.
    useEffect(() => {
        const hash = window.location.hash;

        if (hash === '#review') {
            open('invite');
        } else if (hash === '#decision') {
            open('decision');
        } else if (hash === '#notes') {
            document.getElementById('note-body')?.focus();
        }
    }, []);

    return (
        <>
            <Head title={m.reference ?? m.title} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="m-0 font-mono text-xs text-muted-foreground">
                            {m.reference} · {m.typeLabel}
                        </p>
                        <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight">
                            {m.title || t('Untitled manuscript')}
                        </h1>
                        <p className="m-0 mt-1 text-sm text-muted-foreground">
                            {m.authorsLine}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <StatusBadge status={m.status} />
                        <Button asChild variant="outline" size="sm">
                            <a href={docx(m.id).url} download>
                                <FileDown aria-hidden="true" />
                                {t('Download Word (.docx)')}
                            </a>
                        </Button>
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={pdf(m.id).url}
                                target="_blank"
                                rel="noopener"
                            >
                                <FileText aria-hidden="true" />
                                {t('PDF (journal layout)')}
                            </a>
                        </Button>
                    </div>
                </header>

                <nav
                    aria-label={t('Actions on this manuscript')}
                    className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2"
                >
                    <Button
                        size="sm"
                        disabled={!reviews.canInvite}
                        onClick={() => open('invite')}
                    >
                        <UserPlus aria-hidden="true" />
                        {t('Invite reviewers')}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={!canDecide}
                        onClick={() => open('decision')}
                    >
                        <Gavel aria-hidden="true" />
                        {t('Decision…')}
                    </Button>
                    {types.includes('return') && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!canDecide || !canReturn}
                            title={
                                canReturn
                                    ? undefined
                                    : t(
                                          'Only before the review starts (submitted or resubmitted).',
                                      )
                            }
                            onClick={() => open('decision', 'return')}
                        >
                            <Undo2 aria-hidden="true" />
                            {t('Return to the authors for corrections')}
                        </Button>
                    )}
                    {types.includes('reject') && (
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={!canDecide}
                            onClick={() => open('decision', 'reject')}
                            className="text-red-700 dark:text-red-400"
                        >
                            <XCircle aria-hidden="true" />
                            {t('Reject')}
                        </Button>
                    )}
                    {publishing?.canAssign && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                document
                                    .getElementById('issue-box')
                                    ?.scrollIntoView({
                                        behavior: 'smooth',
                                        block: 'start',
                                    });
                                document
                                    .querySelector<HTMLElement>(
                                        '#issue-box select, #issue-box input',
                                    )
                                    ?.focus({ preventScroll: true });
                            }}
                        >
                            <Newspaper aria-hidden="true" />
                            {t('Place in an issue')}
                        </Button>
                    )}
                    {notes && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                const box = document.getElementById('notes');
                                box?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'start',
                                });
                                document
                                    .getElementById('note-body')
                                    ?.focus({ preventScroll: true });
                            }}
                        >
                            <NotebookPen aria-hidden="true" />
                            {t('Add note')}
                        </Button>
                    )}
                    {!reviews.canInvite && !canDecide && (
                        <span className="px-2 text-xs text-muted-foreground">
                            {t(
                                'No review actions in this status; notes and publication details stay available.',
                            )}
                        </span>
                    )}
                </nav>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="flex min-w-0 flex-col gap-5">
                        <AdminPeerReview
                            reviews={reviews}
                            manuscript={m}
                            request={request}
                        />

                        <section aria-label={t('The manuscript')}>
                            <h2 className="m-0 mb-2 text-sm font-semibold">
                                {t('The manuscript')}
                                {m.versions > 1 && (
                                    <span className="ml-2 font-normal text-muted-foreground">
                                        {t('version {n}', { n: m.versions })}
                                    </span>
                                )}
                            </h2>
                            <div className="ms-desk min-w-0 rounded-xl">
                                <div
                                    lang={m.language}
                                    className="ms ms-paper"
                                    // Rendered and escaped by App\Manuscripts\Rendering\ManuscriptRenderer.
                                    dangerouslySetInnerHTML={{ __html: html }}
                                />
                            </div>
                        </section>
                    </div>

                    <aside className="flex flex-col gap-4">
                        {notes && <AdminNotes notes={notes} />}

                        <Box title={t('Submitted by')}>
                            <p className="m-0 font-medium">
                                {m.submitter?.name}
                            </p>
                            <a
                                href={`mailto:${m.submitter?.email}`}
                                className="text-muted-foreground underline-offset-4 hover:underline"
                            >
                                {m.submitter?.email}
                            </a>
                            <p className="m-0 mt-2 text-muted-foreground">
                                {t('Received')}: {dateTime(m.submittedAt)}
                            </p>
                        </Box>

                        {publishing && (
                            <div id="issue-box" className="scroll-mt-4">
                                <Box title={t('Issue and publishing')}>
                                    <IssueBox publishing={publishing} />
                                </Box>
                            </div>
                        )}

                        <Box title={t('Publication details')}>
                            <PublicationPanel
                                key={publishing?.issue?.slug ?? 'none'}
                                details={publication}
                                placedIn={publishing?.issue?.label ?? null}
                            />
                        </Box>

                        <Box title={t('History')}>
                            <ol className="m-0 flex list-none flex-col gap-3 p-0">
                                {events.map((event) => (
                                    <li
                                        key={event.id}
                                        className="border-l-2 border-border pl-3"
                                    >
                                        <p className="m-0 font-medium">
                                            {event.toStatus
                                                ? t(statusLabel(event.toStatus))
                                                : t(eventLabel(event.type))}
                                        </p>
                                        <p className="m-0 text-xs text-muted-foreground">
                                            {dateTime(event.at)}
                                            {event.actor && ` · ${event.actor}`}
                                        </p>
                                    </li>
                                ))}
                            </ol>
                        </Box>

                        <Box title={t('Suggested reviewers')}>
                            {submission.suggestedReviewers.length === 0 ? (
                                <p className="m-0 text-muted-foreground">—</p>
                            ) : (
                                <ol className="m-0 flex flex-col gap-2 pl-4">
                                    {submission.suggestedReviewers.map((r) => (
                                        <li key={r.email}>
                                            <span className="font-medium">
                                                {r.name}
                                            </span>
                                            <br />
                                            <span className="text-muted-foreground">
                                                {r.affiliation}
                                            </span>
                                            <br />
                                            <a
                                                href={`mailto:${r.email}`}
                                                className="underline-offset-4 hover:underline"
                                            >
                                                {r.email}
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </Box>

                        {submission.responseToReviewers && (
                            <Box title={t('Response to the reviewers')}>
                                <p className="m-0 whitespace-pre-line">
                                    {submission.responseToReviewers}
                                </p>
                            </Box>
                        )}

                        {submission.coverLetter && (
                            <Box title={t('Cover letter')}>
                                <p className="m-0 whitespace-pre-line">
                                    {submission.coverLetter}
                                </p>
                            </Box>
                        )}

                        <Box title={t('Submission declaration')}>
                            <ul className="m-0 flex list-none flex-col gap-2 p-0">
                                {Object.entries(declarations).map(
                                    ([key, sentence]) => (
                                        <li key={key} className="flex gap-2">
                                            {submission.declarations[key] ? (
                                                <Check
                                                    aria-label={t('Confirmed')}
                                                    className="mt-0.5 size-4 shrink-0 text-emerald-600"
                                                />
                                            ) : (
                                                <X
                                                    aria-label={t(
                                                        'Not confirmed',
                                                    )}
                                                    className="mt-0.5 size-4 shrink-0 text-destructive"
                                                />
                                            )}
                                            <span>{t(sentence)}</span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </Box>
                    </aside>
                </div>
            </div>
        </>
    );
}

AdminManuscript.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Manuscripts', href: index() },
    ],
};
