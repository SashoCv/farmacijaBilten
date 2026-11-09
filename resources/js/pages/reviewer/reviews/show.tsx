import { Head, Link, router, setLayoutProps, usePage } from '@inertiajs/react';
import { CircleCheck, FileDown, MessageSquareQuote } from 'lucide-react';
import { useId, useState } from 'react';
import type { ReactNode } from 'react';
import { AssignmentStatusBadge } from '@/components/review/assignment-status-badge';
import { DueDate } from '@/components/review/due-date';
import { ReviewForm } from '@/components/review/review-form';
import { ReviewView } from '@/components/review/review-view';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { index as myReviews } from '@/routes/reviewer/reviews';
import { dashboard } from '@/routes';
import type { ReviewerShowProps } from '@/types/review';
import '../../../../css/manuscript.css';
import '../../../../css/manuscript-article.css';

const textareaClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

/** The article (or, before accepting, its title page and abstract) on paper. */
function Paper({ html, label }: { html: string; label: string }) {
    return (
        <section
            aria-label={label}
            className="ms-desk min-w-0 rounded-xl border"
        >
            <div
                className="ms ms-paper"
                // Rendered and escaped by the server (ManuscriptRenderer).
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </section>
    );
}

function Card({ title, children }: { title?: string; children: ReactNode }) {
    return (
        <section className="rounded-xl border bg-card p-5">
            {title && (
                <h2 className="m-0 mb-3 text-base font-semibold">{title}</h2>
            )}
            {children}
        </section>
    );
}

function OfficeMessage({ message }: { message: string | null }) {
    const { t } = useT();

    if (!message) {
        return null;
    }

    return (
        <figure className="m-0 rounded-lg border-l-4 border-primary/40 bg-muted/50 px-4 py-3 text-sm">
            <figcaption className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MessageSquareQuote aria-hidden="true" className="size-3.5" />
                {t('Message from the editorial office')}
            </figcaption>
            <blockquote className="m-0 whitespace-pre-line">
                {message}
            </blockquote>
        </figure>
    );
}

/** Accept (with a competing-interests declaration) or decline. */
function Respond({ url }: { url: string }) {
    const { t } = useT();
    const id = useId();
    const errors = usePage().props.errors as Record<string, string>;
    const [interests, setInterests] = useState<'none' | 'declared' | null>(
        null,
    );
    const [note, setNote] = useState('');
    const [declining, setDeclining] = useState(false);
    const [reason, setReason] = useState('');
    const [processing, setProcessing] = useState(false);
    const [tried, setTried] = useState(false);

    const interestsError =
        errors.competing_interests ??
        (tried && interests === null
            ? t('Choose one of the two statements.')
            : undefined);
    const noteError =
        errors.competing_interests_note ??
        (tried && interests === 'declared' && note.trim() === ''
            ? t('Describe the competing interests.')
            : undefined);

    const accept = () => {
        setTried(true);

        if (interests === null || (interests === 'declared' && !note.trim())) {
            return;
        }

        router.post(
            url,
            {
                decision: 'accept',
                competing_interests: interests,
                competing_interests_note:
                    interests === 'declared' ? note.trim() : undefined,
            },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );
    };

    const decline = () =>
        router.post(
            url,
            { decision: 'decline', decline_reason: reason.trim() || undefined },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => setProcessing(false),
            },
        );

    return (
        <div className="grid gap-5">
            <fieldset
                className="m-0 grid gap-2 border-0 p-0"
                aria-describedby={interestsError ? `${id}-ci-error` : undefined}
            >
                <legend className="mb-1 p-0 text-sm font-medium">
                    {t('Competing interests')}
                </legend>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted">
                    <input
                        type="radio"
                        name={`${id}-ci`}
                        checked={interests === 'none'}
                        onChange={() => setInterests('none')}
                        className="mt-0.5 size-4 accent-[#2c4a8a]"
                    />
                    {t('I have no competing interests.')}
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-muted">
                    <input
                        type="radio"
                        name={`${id}-ci`}
                        checked={interests === 'declared'}
                        onChange={() => setInterests('declared')}
                        className="mt-0.5 size-4 accent-[#2c4a8a]"
                    />
                    {t('I have competing interests (describe them below).')}
                </label>
                {interestsError && (
                    <p
                        id={`${id}-ci-error`}
                        className="m-0 text-sm text-red-600 dark:text-red-400"
                    >
                        {interestsError}
                    </p>
                )}
                {interests === 'declared' && (
                    <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-ci-note`}>
                            {t('Competing interests')}
                        </Label>
                        <textarea
                            id={`${id}-ci-note`}
                            rows={3}
                            value={note}
                            aria-invalid={noteError ? true : undefined}
                            aria-describedby={
                                noteError ? `${id}-ci-note-error` : undefined
                            }
                            onChange={(event) => setNote(event.target.value)}
                            className={textareaClass}
                        />
                        {noteError && (
                            <p
                                id={`${id}-ci-note-error`}
                                className="m-0 text-sm text-red-600 dark:text-red-400"
                            >
                                {noteError}
                            </p>
                        )}
                    </div>
                )}
            </fieldset>

            <p className="m-0 text-sm text-muted-foreground">
                {t(
                    'By accepting you agree to keep the manuscript confidential and not to use it for your own work.',
                )}
            </p>

            <div className="flex flex-wrap gap-2">
                <Button disabled={processing} onClick={accept}>
                    {t('Accept and start the review')}
                </Button>
                {!declining && (
                    <Button
                        variant="outline"
                        disabled={processing}
                        onClick={() => setDeclining(true)}
                        aria-expanded={false}
                    >
                        {t('Decline')}
                    </Button>
                )}
            </div>

            {declining && (
                <div className="grid gap-2 rounded-lg border p-4">
                    <Label htmlFor={`${id}-reason`}>
                        {t('Reason (optional)')}
                    </Label>
                    <textarea
                        id={`${id}-reason`}
                        rows={3}
                        value={reason}
                        placeholder={t(
                            'e.g. outside my field, no time now; you may suggest a colleague.',
                        )}
                        onChange={(event) => setReason(event.target.value)}
                        className={textareaClass}
                    />
                    {errors.decline_reason && (
                        <p className="m-0 text-sm text-red-600 dark:text-red-400">
                            {errors.decline_reason}
                        </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="destructive"
                            disabled={processing}
                            onClick={decline}
                        >
                            {t('Decline the invitation')}
                        </Button>
                        <Button
                            variant="ghost"
                            disabled={processing}
                            onClick={() => setDeclining(false)}
                        >
                            {t('Cancel')}
                        </Button>
                    </div>
                </div>
            )}

            {errors.decision && (
                <p
                    role="alert"
                    className="m-0 text-sm text-red-600 dark:text-red-400"
                >
                    {errors.decision}
                </p>
            )}
        </div>
    );
}

export default function ReviewerReview({
    assignment,
    manuscript,
    review,
    recommendations,
    urls,
    files,
}: ReviewerShowProps) {
    const { t } = useT();
    const { date } = useDates();
    const title = manuscript.title || t('Untitled manuscript');
    const page = usePage();

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'My reviews', href: myReviews() },
            {
                title: manuscript.reference ?? 'Review',
                href: page.url,
            },
        ],
    });

    const header = (
        <header>
            <p className="m-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <AssignmentStatusBadge status={assignment.status} />
                <span>{manuscript.typeLabel}</span>
                {manuscript.reference && (
                    <span className="tabular-nums">{manuscript.reference}</span>
                )}
                <span>
                    {t('Round {n}', { n: assignment.round })} ·{' '}
                    {t('You are Reviewer {n}', { n: assignment.number })}
                </span>
            </p>
            <h1 className="m-0 mt-2 text-2xl font-semibold tracking-tight">
                {title}
            </h1>
        </header>
    );

    const dates = (
        <p className="m-0 flex flex-wrap gap-x-5 gap-y-1 text-sm">
            {assignment.status === 'invited' && (
                <DueDate
                    label={t('Answer by')}
                    iso={assignment.responseDueAt}
                />
            )}
            <DueDate
                label={t('Review due')}
                iso={assignment.reviewDueAt}
                showCountdown={assignment.status === 'accepted'}
            />
        </p>
    );

    let body: ReactNode;

    if (assignment.status === 'invited') {
        body = (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
                <Paper
                    html={manuscript.html}
                    label={t('Title page and abstract')}
                />
                <div className="grid gap-4 xl:sticky xl:top-4">
                    <Card title={t('Will you review this manuscript?')}>
                        <div className="grid gap-4">
                            {dates}
                            <OfficeMessage message={assignment.message} />
                            <p className="m-0 text-sm text-muted-foreground">
                                {t(
                                    'You see the title page and the abstract. The full text opens when you accept.',
                                )}
                            </p>
                            <Respond url={urls.respond} />
                        </div>
                    </Card>
                </div>
            </div>
        );
    } else if (assignment.status === 'accepted') {
        body = (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_30rem]">
                <div className="grid min-w-0 gap-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {dates}
                        {manuscript.docxUrl && (
                            <Button asChild variant="outline" size="sm">
                                <a href={manuscript.docxUrl} download>
                                    <FileDown aria-hidden="true" />
                                    {t('Download Word (.docx)')}
                                </a>
                            </Button>
                        )}
                    </div>
                    <OfficeMessage message={assignment.message} />
                    {manuscript.responseToReviewers && (
                        <Card
                            title={t('The authors’ response to the reviewers')}
                        >
                            <p className="m-0 text-sm whitespace-pre-line">
                                {manuscript.responseToReviewers}
                            </p>
                        </Card>
                    )}
                    <Paper html={manuscript.html} label={t('The manuscript')} />
                </div>
                <div className="rounded-xl border bg-card p-5 xl:sticky xl:top-4 xl:max-h-[calc(100svh-2rem)] xl:overflow-y-auto">
                    <ReviewForm
                        review={review}
                        recommendations={recommendations}
                        urls={urls}
                        files={files}
                    />
                </div>
            </div>
        );
    } else if (assignment.status === 'submitted') {
        body = (
            <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_30rem]">
                <Paper html={manuscript.html} label={t('The manuscript')} />
                <div className="grid gap-4">
                    <div
                        role="status"
                        className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-50"
                    >
                        <CircleCheck
                            aria-hidden="true"
                            className="mt-0.5 size-5 shrink-0"
                        />
                        <p className="m-0">
                            {t(
                                'Thank you. Your review was sent on {date}; the editorial office will make the decision.',
                                { date: date(assignment.submittedAt) },
                            )}
                        </p>
                    </div>
                    <Card title={t('Your review')}>
                        <ReviewView review={review} />
                    </Card>
                </div>
            </div>
        );
    } else {
        const reason =
            assignment.status === 'declined'
                ? t(
                      'You declined this invitation. Thank you for letting us know.',
                  )
                : assignment.status === 'cancelled'
                  ? t(
                        'The editorial office withdrew this invitation. You do not need to do anything.',
                    )
                  : t(
                        'The invitation expired without an answer. If you would still like to review, write to the editorial office.',
                    );

        body = (
            <Card>
                <p className="m-0 text-sm">{reason}</p>
                <Link
                    href={myReviews()}
                    className="mt-3 inline-block text-sm underline underline-offset-4"
                >
                    {t('Back to my reviews')}
                </Link>
            </Card>
        );
    }

    return (
        <>
            <Head title={title} />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                {header}
                {body}
            </div>
        </>
    );
}
