import { Head, Link } from '@inertiajs/react';
import { ChevronRight, ClipboardCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { AssignmentStatusBadge } from '@/components/review/assignment-status-badge';
import { DueDate } from '@/components/review/due-date';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { index as myReviews } from '@/routes/reviewer/reviews';
import { dashboard } from '@/routes';
import type { ReviewerIndexProps } from '@/types/review';

type Item = ReviewerIndexProps['assignments'][number];

function Row({ item }: { item: Item }) {
    const { t } = useT();
    const { date } = useDates();

    const action =
        item.status === 'invited'
            ? t('Respond')
            : item.status === 'accepted'
              ? t('Write the review')
              : t('View');

    return (
        <li className="border-b last:border-b-0">
            <Link
                href={item.url}
                className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
                <div className="min-w-0 flex-1">
                    <p className="m-0 font-medium">
                        {item.title || t('Untitled manuscript')}
                    </p>
                    <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <AssignmentStatusBadge status={item.status} />
                        <span>{item.typeLabel}</span>
                        {item.reference && (
                            <span className="tabular-nums">
                                {item.reference}
                            </span>
                        )}
                        {item.round > 1 && (
                            <span>{t('Round {n}', { n: item.round })}</span>
                        )}
                    </p>
                    <p className="m-0 mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        {item.status === 'invited' && (
                            <DueDate
                                label={t('Answer by')}
                                iso={item.responseDueAt}
                            />
                        )}
                        {(item.status === 'invited' ||
                            item.status === 'accepted') && (
                            <DueDate
                                label={t('Review due')}
                                iso={item.reviewDueAt}
                                showCountdown={item.status === 'accepted'}
                            />
                        )}
                        {item.status === 'submitted' && (
                            <span className="text-muted-foreground">
                                {t('Sent {date}', {
                                    date: date(item.submittedAt),
                                })}
                            </span>
                        )}
                    </p>
                </div>
                <span className="hidden text-sm font-medium sm:inline">
                    {action}
                </span>
                <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
                />
            </Link>
        </li>
    );
}

function Group({
    id,
    title,
    hint,
    items,
}: {
    id: string;
    title: string;
    hint?: ReactNode;
    items: Item[];
}) {
    if (items.length === 0) {
        return null;
    }

    return (
        <section aria-labelledby={id} className="grid gap-2">
            <h2 id={id} className="m-0 text-base font-semibold">
                {title}{' '}
                <span className="font-normal text-muted-foreground">
                    ({items.length})
                </span>
            </h2>
            {hint && (
                <p className="m-0 text-sm text-muted-foreground">{hint}</p>
            )}
            <ul className="m-0 grid list-none overflow-hidden rounded-xl border p-0">
                {items.map((item) => (
                    <Row key={item.id} item={item} />
                ))}
            </ul>
        </section>
    );
}

export default function MyReviews({ assignments }: ReviewerIndexProps) {
    const { t } = useT();
    const invited = assignments.filter((a) => a.status === 'invited');
    const active = assignments.filter((a) => a.status === 'accepted');
    const done = assignments.filter((a) => a.status === 'submitted');
    const closed = assignments.filter((a) =>
        ['declined', 'cancelled', 'expired'].includes(a.status),
    );

    return (
        <>
            <Head title={t('My reviews')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('My reviews')}
                    </h1>
                    <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                        {t(
                            'Invitations from the editorial office and the manuscripts you review.',
                        )}
                    </p>
                </header>

                {assignments.length === 0 ? (
                    <section className="flex items-start gap-3 rounded-xl border border-dashed p-6 text-sm">
                        <span
                            aria-hidden
                            className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"
                        >
                            <ClipboardCheck className="size-5" />
                        </span>
                        <div>
                            <h2 className="m-0 text-base font-semibold">
                                {t('No reviews yet')}
                            </h2>
                            <p className="m-0 mt-1 text-muted-foreground">
                                {t(
                                    'No review invitations at the moment. We will e-mail you when the editorial office invites you.',
                                )}
                            </p>
                        </div>
                    </section>
                ) : (
                    <>
                        <Group
                            id="reviews-invited"
                            title={t('Invitations to answer')}
                            hint={t(
                                'Read the abstract, then accept or decline. The editorial office waits for your answer.',
                            )}
                            items={invited}
                        />
                        <Group
                            id="reviews-active"
                            title={t('Reviews in progress')}
                            items={active}
                        />
                        <Group
                            id="reviews-done"
                            title={t('Reviews sent')}
                            items={done}
                        />
                        <Group
                            id="reviews-closed"
                            title={t('Declined, withdrawn or expired')}
                            items={closed}
                        />
                    </>
                )}
            </div>
        </>
    );
}

MyReviews.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My reviews', href: myReviews() },
    ],
};
