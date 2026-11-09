import { router, useForm, usePage } from '@inertiajs/react';
import {
    BellRing,
    ChevronDown,
    Gavel,
    Search,
    UserPlus,
    UserX,
} from 'lucide-react';
import { Fragment, useEffect, useId, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { decisionActionLabel, decisionLabel } from '@/lib/manuscript-status';
import { cn } from '@/lib/utils';
import type { ManuscriptSummary } from '@/types/manuscript';
import type {
    AdminAssignment,
    AdminReviews,
    DecisionType,
} from '@/types/review';
import { AssignmentStatusBadge } from './assignment-status-badge';
import { decisionLetter } from './decision-letter';
import { DueDate } from './due-date';
import { ReviewView } from './review-view';

const textareaClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

function Part({
    id,
    title,
    action,
    children,
}: {
    id: string;
    title: string;
    action?: ReactNode;
    children: ReactNode;
}) {
    return (
        <section aria-labelledby={id} className="grid gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 id={id} className="m-0 text-sm font-semibold">
                    {title}
                </h3>
                {action}
            </div>
            {children}
        </section>
    );
}

/* --- Invite ---------------------------------------------------------- */

function InviteForm({
    reviews,
    onDone,
}: {
    reviews: AdminReviews;
    onDone: () => void;
}) {
    const { t } = useT();
    const id = useId();
    const [query, setQuery] = useState('');
    const form = useForm({
        email: '',
        name: '',
        response_days: reviews.defaults.responseDays,
        review_days: reviews.defaults.reviewDays,
        message: '',
    });

    const invited = new Set(
        reviews.assignments
            .filter(
                (a) =>
                    a.round === reviews.round &&
                    !['cancelled', 'declined', 'expired'].includes(a.status),
            )
            .map((a) => a.email.toLowerCase()),
    );

    const pick = (email: string, name: string) => {
        form.setData((data) => ({ ...data, email, name }));
        setQuery('');
        document.getElementById(`${id}-email`)?.focus();
    };

    const q = query.trim().toLowerCase();
    const matches =
        q.length < 2
            ? []
            : reviews.pool
                  .filter((p) =>
                      [p.name, p.email, p.affiliation ?? '', p.expertise ?? '']
                          .join(' ')
                          .toLowerCase()
                          .includes(q),
                  )
                  .slice(0, 8);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(reviews.inviteUrl, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                onDone();
            },
        });
    };

    return (
        <form
            onSubmit={submit}
            className="grid gap-4 rounded-lg border bg-muted/30 p-4"
            noValidate
        >
            {reviews.suggested.length > 0 && (
                <div className="grid gap-1.5">
                    <p className="m-0 text-xs font-medium text-muted-foreground">
                        {t('Suggested by the authors')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {reviews.suggested.map((s) => (
                            <button
                                key={s.email}
                                type="button"
                                disabled={invited.has(s.email.toLowerCase())}
                                onClick={() => pick(s.email, s.name)}
                                title={s.affiliation}
                                className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                            >
                                {s.name || s.email}
                                {invited.has(s.email.toLowerCase()) &&
                                    ` · ${t('invited')}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {reviews.pool.length > 0 && (
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-search`}>
                        {t('Find a reviewer in the journal’s list')}
                    </Label>
                    <div className="relative">
                        <Search
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                        />
                        <Input
                            id={`${id}-search`}
                            type="search"
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t(
                                'Name, e-mail, institution or expertise',
                            )}
                            aria-controls={`${id}-matches`}
                            className="pl-9"
                        />
                    </div>
                    <ul
                        id={`${id}-matches`}
                        aria-live="polite"
                        className="m-0 grid list-none gap-1 p-0 empty:hidden"
                    >
                        {matches.map((p) => (
                            <li key={p.id}>
                                <button
                                    type="button"
                                    disabled={invited.has(
                                        p.email.toLowerCase(),
                                    )}
                                    onClick={() => pick(p.email, p.name)}
                                    className="w-full rounded-md border bg-background px-3 py-2 text-left text-sm hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50"
                                >
                                    <span className="font-medium">
                                        {p.name}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        {p.email}
                                    </span>
                                    {(p.affiliation || p.expertise) && (
                                        <span className="block text-xs text-muted-foreground">
                                            {[p.affiliation, p.expertise]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </span>
                                    )}
                                </button>
                            </li>
                        ))}
                        {q.length >= 2 && matches.length === 0 && (
                            <li className="text-sm text-muted-foreground">
                                {t(
                                    'No one in the list matches. Type the e-mail address below.',
                                )}
                            </li>
                        )}
                    </ul>
                </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-email`}>{t('E-mail')}</Label>
                    <Input
                        id={`${id}-email`}
                        type="email"
                        required
                        value={form.data.email}
                        aria-invalid={form.errors.email ? true : undefined}
                        onChange={(e) =>
                            form.setData('email', e.target.value.trim())
                        }
                    />
                    <InputError message={form.errors.email} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-name`}>{t('Name')}</Label>
                    <Input
                        id={`${id}-name`}
                        value={form.data.name}
                        aria-invalid={form.errors.name ? true : undefined}
                        onChange={(e) => form.setData('name', e.target.value)}
                    />
                    <InputError message={form.errors.name} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-response`}>
                        {t('Days to answer the invitation')}
                    </Label>
                    <Input
                        id={`${id}-response`}
                        type="number"
                        min={1}
                        max={60}
                        value={form.data.response_days}
                        onChange={(e) =>
                            form.setData(
                                'response_days',
                                e.target.valueAsNumber || 0,
                            )
                        }
                    />
                    <InputError message={form.errors.response_days} />
                </div>
                <div className="grid gap-1.5">
                    <Label htmlFor={`${id}-review`}>
                        {t('Days to send the review')}
                    </Label>
                    <Input
                        id={`${id}-review`}
                        type="number"
                        min={1}
                        max={120}
                        value={form.data.review_days}
                        onChange={(e) =>
                            form.setData(
                                'review_days',
                                e.target.valueAsNumber || 0,
                            )
                        }
                    />
                    <InputError message={form.errors.review_days} />
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor={`${id}-message`}>
                        {t('Personal message (optional)')}
                    </Label>
                    <textarea
                        id={`${id}-message`}
                        rows={3}
                        value={form.data.message}
                        onChange={(e) =>
                            form.setData('message', e.target.value)
                        }
                        className={textareaClass}
                    />
                    <p className="m-0 text-xs text-muted-foreground">
                        {t(
                            'Added to the invitation e-mail, above the title and abstract.',
                        )}
                    </p>
                    <InputError message={form.errors.message} />
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={form.processing}>
                    <UserPlus aria-hidden="true" />
                    {form.processing ? t('Sending…') : t('Send the invitation')}
                </Button>
                <Button type="button" variant="ghost" onClick={onDone}>
                    {t('Cancel')}
                </Button>
            </div>
        </form>
    );
}

/* --- Assignments ----------------------------------------------------- */

function AssignmentRow({
    assignment: a,
    onWithdraw,
}: {
    assignment: AdminAssignment;
    onWithdraw: (assignment: AdminAssignment) => void;
}) {
    const { t } = useT();
    const { date } = useDates();
    const [open, setOpen] = useState(false);
    const [reminding, setReminding] = useState(false);
    const panel = `review-${a.id}`;

    return (
        <Fragment>
            <tr className="border-b align-top last:border-b-0">
                <th
                    scope="row"
                    className="px-3 py-3 text-left font-medium whitespace-nowrap"
                >
                    {t('Reviewer {n}', { n: a.number })}
                </th>
                <td className="px-3 py-3">
                    <span className="font-medium">{a.name || '—'}</span>
                    <a
                        href={`mailto:${a.email}`}
                        className="block text-muted-foreground underline-offset-4 hover:underline"
                    >
                        {a.email}
                    </a>
                </td>
                <td className="px-3 py-3">
                    <AssignmentStatusBadge status={a.status} />
                    {a.status === 'declined' && a.declineReason && (
                        <p className="m-0 mt-1 max-w-56 text-xs whitespace-pre-line text-muted-foreground">
                            {a.declineReason}
                        </p>
                    )}
                </td>
                <td className="px-3 py-3 text-xs">
                    <div className="grid gap-0.5">
                        <span>
                            <span className="text-muted-foreground">
                                {t('Invited')}:
                            </span>{' '}
                            {date(a.invitedAt)}
                        </span>
                        {a.status === 'invited' ? (
                            <DueDate
                                label={t('Answer by')}
                                iso={a.responseDueAt}
                            />
                        ) : (
                            a.respondedAt && (
                                <span>
                                    <span className="text-muted-foreground">
                                        {t('Answered')}:
                                    </span>{' '}
                                    {date(a.respondedAt)}
                                </span>
                            )
                        )}
                        {a.status === 'submitted' ? (
                            <span>
                                <span className="text-muted-foreground">
                                    {t('Review received')}:
                                </span>{' '}
                                {date(a.submittedAt)}
                            </span>
                        ) : (
                            ['invited', 'accepted'].includes(a.status) && (
                                <DueDate
                                    label={t('Review due')}
                                    iso={a.reviewDueAt}
                                    showCountdown={a.status === 'accepted'}
                                />
                            )
                        )}
                    </div>
                </td>
                <td className="px-3 py-3 text-xs">
                    {a.competingInterests === null ? (
                        '—'
                    ) : a.competingInterests === 'none' ? (
                        t('None declared')
                    ) : (
                        <span className="font-medium text-amber-800 dark:text-amber-300">
                            {a.competingInterests}
                        </span>
                    )}
                </td>
                <td className="px-3 py-3">
                    <div className="flex flex-wrap justify-end gap-1">
                        {a.review && (
                            <Button
                                variant="outline"
                                size="sm"
                                aria-expanded={open}
                                aria-controls={panel}
                                onClick={() => setOpen((v) => !v)}
                            >
                                <ChevronDown
                                    aria-hidden="true"
                                    className={cn(
                                        'transition-transform',
                                        open && 'rotate-180',
                                    )}
                                />
                                {open ? t('Hide review') : t('Read review')}
                            </Button>
                        )}
                        {a.remindUrl && (
                            <Button
                                variant="ghost"
                                size="sm"
                                disabled={reminding}
                                onClick={() =>
                                    router.post(
                                        a.remindUrl!,
                                        {},
                                        {
                                            preserveScroll: true,
                                            onStart: () => setReminding(true),
                                            onFinish: () => setReminding(false),
                                        },
                                    )
                                }
                            >
                                <BellRing aria-hidden="true" />
                                {t('Remind')}
                            </Button>
                        )}
                        {a.cancelUrl && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-700 hover:text-red-800 dark:text-red-400"
                                onClick={() => onWithdraw(a)}
                            >
                                <UserX aria-hidden="true" />
                                {t('Withdraw')}
                            </Button>
                        )}
                    </div>
                </td>
            </tr>
            {a.review && open && (
                <tr id={panel} className="border-b bg-muted/30">
                    <td colSpan={6} className="px-4 py-4">
                        <ReviewView review={a.review} />
                    </td>
                </tr>
            )}
        </Fragment>
    );
}

/* --- Decision -------------------------------------------------------- */

function DecisionForm({
    reviews,
    manuscript,
    initialType,
    onClose,
}: {
    reviews: AdminReviews;
    manuscript: ManuscriptSummary;
    initialType?: DecisionType;
    onClose: () => void;
}) {
    const { t, locale } = useT();
    const id = useId();
    const { journal } = usePage().props;
    const errors = usePage().props.errors as Record<string, string>;
    // A technical return is possible only before the review starts.
    const types = reviews.decision.types.filter(
        (value) =>
            value !== 'return' ||
            ['submitted', 'resubmitted'].includes(manuscript.status),
    );
    const build = (type: DecisionType) =>
        decisionLetter({
            type,
            language: manuscript.language,
            authorName: manuscript.submitter?.name ?? null,
            title: manuscript.title,
            reference: manuscript.reference,
            journal:
                (manuscript.language === 'mk'
                    ? journal.nameMk
                    : journal.nameEn) ?? '',
            assignments: reviews.assignments,
            round: reviews.round,
        });
    // No default: the editor always chooses the decision.
    const first: DecisionType | '' =
        initialType && types.includes(initialType) ? initialType : '';
    const [type, setType] = useState<DecisionType | ''>(first);
    const [letter, setLetter] = useState(() => (first ? build(first) : ''));
    const [edited, setEdited] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [processing, setProcessing] = useState(false);
    const pending = reviews.assignments.filter(
        (a) =>
            a.round === reviews.round &&
            ['invited', 'accepted'].includes(a.status),
    ).length;

    const changeType = (next: DecisionType | '') => {
        setType(next);

        if (!edited) {
            setLetter(next ? build(next) : '');
        }
    };

    const send = () =>
        router.post(
            reviews.decision.url,
            { type, letter },
            {
                preserveScroll: true,
                onStart: () => setProcessing(true),
                onFinish: () => {
                    setProcessing(false);
                    setConfirming(false);
                },
            },
        );

    return (
        <div className="grid gap-4 rounded-lg border p-4">
            {pending > 0 && (
                <p className="m-0 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                    {t(
                        '{count} reviewer(s) of this round have not sent a review yet.',
                        { count: pending },
                    )}
                </p>
            )}
            <div className="grid gap-1.5 sm:max-w-sm">
                <Label htmlFor={`${id}-type`}>{t('Decision')}</Label>
                <select
                    id={`${id}-type`}
                    value={type}
                    onChange={(e) =>
                        changeType(e.target.value as DecisionType | '')
                    }
                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                >
                    <option value="" disabled>
                        {t('Choose a decision…')}
                    </option>
                    {types.map((value) => (
                        <option key={value} value={value}>
                            {t(decisionActionLabel(value))}
                        </option>
                    ))}
                </select>
                <InputError message={errors.type} />
            </div>
            <div className="grid gap-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label htmlFor={`${id}-letter`}>
                        {t('Letter to the authors')}
                    </Label>
                    {edited && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                                setLetter(type ? build(type) : '');
                                setEdited(false);
                            }}
                        >
                            {t('Start again from the template')}
                        </Button>
                    )}
                </div>
                <p
                    id={`${id}-letter-hint`}
                    className="m-0 text-xs text-muted-foreground"
                >
                    {t(
                        'Prepared from the template with the reviewers’ comments to the authors (never the confidential comments). Written in the language of the manuscript ({language}); edit it as needed.',
                        {
                            language:
                                manuscript.language === 'mk'
                                    ? t('Macedonian')
                                    : t('English'),
                        },
                    )}
                </p>
                <textarea
                    id={`${id}-letter`}
                    rows={16}
                    lang={manuscript.language}
                    value={letter}
                    aria-describedby={`${id}-letter-hint`}
                    aria-invalid={errors.letter ? true : undefined}
                    onChange={(e) => {
                        setLetter(e.target.value);
                        setEdited(true);
                    }}
                    className={cn(textareaClass, 'font-mono text-[13px]')}
                />
                <InputError message={errors.letter} />
            </div>
            <div>
                <Button
                    type="button"
                    disabled={type === '' || letter.trim() === ''}
                    onClick={() => setConfirming(true)}
                >
                    <Gavel aria-hidden="true" />
                    {t('Send the decision…')}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    className="ml-2"
                    onClick={onClose}
                >
                    {t('Cancel')}
                </Button>
            </div>

            <Dialog
                open={confirming}
                onOpenChange={(open) => !processing && setConfirming(open)}
            >
                <DialogContent className="sm:max-w-md" lang={locale}>
                    <DialogTitle>{t('Send this decision?')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            '"{decision}" and the letter are e-mailed to the authors and shown on their manuscript page. This cannot be undone.',
                            { decision: type ? t(decisionLabel(type)) : '' },
                        )}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            disabled={processing}
                            onClick={() => setConfirming(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button disabled={processing} onClick={send}>
                            {processing
                                ? t('Sending…')
                                : t('Send the decision')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/* --- Section --------------------------------------------------------- */

/**
 * Peer review on the editor's manuscript page: invitations per round,
 * the reviews as they arrive, the decision and its history.
 */
export type PeerReviewRequest = {
    kind: 'invite' | 'decision';
    type?: DecisionType;
    /** Changes on every request, so the same one can be repeated. */
    seq: number;
};

export function AdminPeerReview({
    reviews,
    manuscript,
    request = null,
}: {
    reviews: AdminReviews;
    manuscript: ManuscriptSummary;
    /** Opens the invite form or the decision form (action bar, #review, #decision). */
    request?: PeerReviewRequest | null;
}) {
    const { t } = useT();
    const { dateTime } = useDates();
    const [inviting, setInviting] = useState(false);
    const [deciding, setDeciding] = useState(false);
    const [presetType, setPresetType] = useState<DecisionType | undefined>();
    const [handled, setHandled] = useState(0);

    // A new request from the page opens the matching form.
    if (request && request.seq !== handled) {
        setHandled(request.seq);

        if (request.kind === 'invite' && reviews.canInvite) {
            setInviting(true);
        }

        if (request.kind === 'decision' && reviews.decision.canDecide) {
            setPresetType(request.type);
            setDeciding(true);
        }
    }

    useEffect(() => {
        if (!request) {
            return;
        }

        const target = document.getElementById(
            request.kind === 'invite'
                ? 'peer-review-reviewers'
                : 'peer-review-decision',
        );
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        requestAnimationFrame(() =>
            target
                ?.closest('section')
                ?.querySelector<HTMLElement>(
                    request.kind === 'invite'
                        ? 'input[type="search"], input[type="email"]'
                        : 'select',
                )
                ?.focus({ preventScroll: true }),
        );
    }, [request]);
    const [withdrawing, setWithdrawing] = useState<AdminAssignment | null>(
        null,
    );
    const [processing, setProcessing] = useState(false);

    const rounds = [...new Set(reviews.assignments.map((a) => a.round))].sort(
        (a, b) => b - a,
    );

    if (!rounds.includes(reviews.round)) {
        rounds.unshift(reviews.round);
    }

    const current = reviews.assignments.filter(
        (a) => a.round === reviews.round,
    );
    const received = current.filter((a) => a.status === 'submitted').length;
    const active = current.filter((a) =>
        ['invited', 'accepted', 'submitted'].includes(a.status),
    ).length;
    const ready = received > 0 && received === active;

    return (
        <section
            aria-labelledby="peer-review"
            className="grid gap-6 rounded-xl border bg-card p-4 md:p-5"
        >
            <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 id="peer-review" className="m-0 text-lg font-semibold">
                    {t('Peer review')}
                </h2>
                <span className="rounded-md border px-2 py-0.5 text-xs font-medium">
                    {t('Round {n}', { n: reviews.round })}
                </span>
                <span className="text-sm text-muted-foreground">
                    {t('{received} of {active} reviews received', {
                        received,
                        active,
                    })}
                </span>
                <span className="text-xs text-muted-foreground">
                    {reviews.anonymity === 'double'
                        ? t(
                              'Double-anonymous: reviewers do not see the authors.',
                          )
                        : t('Single-anonymous: reviewers see the authors.')}
                </span>
            </header>

            <Part
                id="peer-review-reviewers"
                title={t('Reviewers')}
                action={
                    reviews.canInvite &&
                    !inviting && (
                        <Button size="sm" onClick={() => setInviting(true)}>
                            <UserPlus aria-hidden="true" />
                            {t('Invite a reviewer')}
                        </Button>
                    )
                }
            >
                {inviting && (
                    <InviteForm
                        reviews={reviews}
                        onDone={() => setInviting(false)}
                    />
                )}
                {!reviews.canInvite && reviews.assignments.length === 0 && (
                    <p className="m-0 text-sm text-muted-foreground">
                        {t(
                            'Reviewers can be invited once the manuscript is submitted.',
                        )}
                    </p>
                )}
                {rounds.map((round) => {
                    const list = reviews.assignments
                        .filter((a) => a.round === round)
                        .sort((a, b) => a.number - b.number);

                    return (
                        <div key={round} className="grid gap-2">
                            {rounds.length > 1 && (
                                <h4 className="m-0 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    {t('Round {n}', { n: round })}
                                </h4>
                            )}
                            {list.length === 0 ? (
                                <p className="m-0 text-sm text-muted-foreground">
                                    {t(
                                        'No reviewers invited in this round yet.',
                                    )}
                                </p>
                            ) : (
                                <div className="overflow-x-auto rounded-lg border">
                                    <table className="w-full min-w-[760px] text-left text-sm">
                                        <thead className="border-b bg-muted/50 text-xs text-muted-foreground">
                                            <tr>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-medium"
                                                >
                                                    {t('Reviewer')}
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-medium"
                                                >
                                                    {t('Name and e-mail')}
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-medium"
                                                >
                                                    {t('Status')}
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-medium"
                                                >
                                                    {t('Dates')}
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2 font-medium"
                                                >
                                                    {t('Competing interests')}
                                                </th>
                                                <th
                                                    scope="col"
                                                    className="px-3 py-2"
                                                >
                                                    <span className="sr-only">
                                                        {t('Actions')}
                                                    </span>
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {list.map((a) => (
                                                <AssignmentRow
                                                    key={a.id}
                                                    assignment={a}
                                                    onWithdraw={setWithdrawing}
                                                />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    );
                })}
            </Part>

            {reviews.decision.canDecide && (
                <Part
                    id="peer-review-decision"
                    title={t('Decision')}
                    action={
                        !deciding && (
                            <Button
                                size="sm"
                                variant={ready ? 'default' : 'outline'}
                                onClick={() => setDeciding(true)}
                            >
                                {t('Make a decision…')}
                            </Button>
                        )
                    }
                >
                    {deciding ? (
                        <DecisionForm
                            key={`${handled}-${presetType ?? ''}`}
                            reviews={reviews}
                            manuscript={manuscript}
                            initialType={presetType}
                            onClose={() => setDeciding(false)}
                        />
                    ) : (
                        <p className="m-0 text-sm text-muted-foreground">
                            {ready
                                ? t('All reviews of this round are in.')
                                : t(
                                      'You can decide now or wait for the reviews; the letter is prepared with the reviews received.',
                                  )}
                        </p>
                    )}
                </Part>
            )}

            {reviews.decisions.length > 0 && (
                <Part id="peer-review-decisions" title={t('Decisions sent')}>
                    <ol className="m-0 grid list-none gap-2 p-0">
                        {[...reviews.decisions]
                            .sort((a, b) => b.at.localeCompare(a.at))
                            .map((d) => (
                                <li key={d.id}>
                                    <details className="rounded-lg border">
                                        <summary className="cursor-pointer px-3 py-2 text-sm">
                                            <span className="font-medium">
                                                {t(decisionLabel(d.type))}
                                            </span>{' '}
                                            <span className="text-muted-foreground">
                                                ·{' '}
                                                {t('Round {n}', { n: d.round })}{' '}
                                                · {dateTime(d.at)}
                                                {d.decidedBy &&
                                                    ` · ${d.decidedBy}`}
                                            </span>
                                        </summary>
                                        <p className="m-0 border-t px-3 py-3 text-sm whitespace-pre-line">
                                            {d.letter}
                                        </p>
                                    </details>
                                </li>
                            ))}
                    </ol>
                </Part>
            )}

            <Dialog
                open={withdrawing !== null}
                onOpenChange={(open) =>
                    !open && !processing && setWithdrawing(null)
                }
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>{t('Withdraw this invitation?')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            '{name} ({email}) is told by e-mail that the review is no longer needed.',
                            {
                                name: withdrawing?.name || t('The reviewer'),
                                email: withdrawing?.email ?? '',
                            },
                        )}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            disabled={processing}
                            onClick={() => setWithdrawing(null)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={processing}
                            onClick={() =>
                                withdrawing?.cancelUrl &&
                                router.post(
                                    withdrawing.cancelUrl,
                                    {},
                                    {
                                        preserveScroll: true,
                                        onStart: () => setProcessing(true),
                                        onFinish: () => {
                                            setProcessing(false);
                                            setWithdrawing(null);
                                        },
                                    },
                                )
                            }
                        >
                            {t('Withdraw the invitation')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
