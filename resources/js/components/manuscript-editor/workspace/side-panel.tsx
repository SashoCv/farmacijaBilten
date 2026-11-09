import {
    CircleAlert,
    CircleCheck,
    CloudOff,
    LoaderCircle,
    TriangleAlert,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CheckIssue } from '@/types/manuscript';
import type { SaveStatus } from './autosave';
import type { Store } from './store';
import { useStore } from './store';

function useTime() {
    const { locale } = useT();
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        },
    );

    return (iso: string) => {
        const date = new Date(iso);

        return Number.isNaN(date.getTime()) ? '' : format.format(date);
    };
}

/** "Saved 10:42", "Saving…", "Not saved — retrying"… (announced politely). */
export function SaveIndicator({
    status: store,
    className,
}: {
    status: Store<SaveStatus>;
    className?: string;
}) {
    const { t } = useT();
    const time = useTime();
    const status = useStore(store);

    let icon = (
        <CircleCheck aria-hidden="true" className="size-4 text-emerald-600" />
    );
    let text: string;

    switch (status.kind) {
        case 'saved':
            text = status.at
                ? t('Saved {time}', { time: time(status.at) })
                : t('All changes saved');
            break;
        case 'idle':
            text = t('All changes saved');
            break;
        case 'dirty':
            icon = (
                <span
                    aria-hidden="true"
                    className="size-2 rounded-full bg-amber-500"
                />
            );
            text = t('Unsaved changes');
            break;
        case 'saving':
            icon = (
                <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin text-muted-foreground"
                />
            );
            text = t('Saving…');
            break;
        case 'offline':
            icon = (
                <CloudOff aria-hidden="true" className="size-4 text-red-600" />
            );
            text = t('Not saved — retrying');
            break;
        case 'session':
            icon = (
                <CloudOff aria-hidden="true" className="size-4 text-red-600" />
            );
            text = t('Not saved — session expired');
            break;
        case 'rejected':
            icon = (
                <CircleAlert
                    aria-hidden="true"
                    className="size-4 text-red-600"
                />
            );
            text = t('Not saved');
            break;
        case 'conflict':
            icon = (
                <CircleAlert
                    aria-hidden="true"
                    className="size-4 text-red-600"
                />
            );
            text = t('Changed in another window');
            break;
    }

    return (
        <p
            role="status"
            aria-live="polite"
            className={cn('m-0 flex items-center gap-2 text-sm', className)}
        >
            <span className="flex size-4 items-center justify-center">
                {icon}
            </span>
            <span>{text}</span>
        </p>
    );
}

/** Errors first, then warnings. */
export function sortIssues(issues: CheckIssue[]): CheckIssue[] {
    return [...issues].sort((a, b) =>
        a.level === b.level ? 0 : a.level === 'error' ? -1 : 1,
    );
}

/** The check results; each one jumps to its field. */
export function IssuesList({
    issues: store,
    onGo,
}: {
    issues: Store<CheckIssue[]>;
    onGo: (field: string) => void;
}) {
    const { t } = useT();
    const issues = sortIssues(useStore(store));
    const errors = issues.filter((issue) => issue.level === 'error').length;
    const warnings = issues.length - errors;

    return (
        <section aria-labelledby="ms-checks-heading" className="grid gap-2">
            <h2 id="ms-checks-heading" className="m-0 text-sm font-semibold">
                {t('Checks')}
            </h2>
            <p className="m-0 text-sm text-muted-foreground">
                {issues.length === 0
                    ? t('No problems found. The manuscript is ready to submit.')
                    : t('{errors} to fix, {warnings} to consider.', {
                          errors:
                              errors === 1
                                  ? t('1 error')
                                  : t('{count} errors', { count: errors }),
                          warnings:
                              warnings === 1
                                  ? t('1 warning')
                                  : t('{count} warnings', { count: warnings }),
                      })}
            </p>
            {issues.length > 0 && (
                <ul className="m-0 grid list-none gap-1 p-0">
                    {issues.map((issue, index) => (
                        <li key={`${issue.field}-${index}`}>
                            <button
                                type="button"
                                onClick={() => onGo(issue.field)}
                                className="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
                            >
                                {issue.level === 'error' ? (
                                    <CircleAlert
                                        aria-hidden="true"
                                        className="mt-0.5 size-4 shrink-0 text-red-600 dark:text-red-400"
                                    />
                                ) : (
                                    <TriangleAlert
                                        aria-hidden="true"
                                        className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400"
                                    />
                                )}
                                <span>
                                    <span className="sr-only">
                                        {issue.level === 'error'
                                            ? t('Error:')
                                            : t('Warning:')}{' '}
                                    </span>
                                    {issue.message}
                                </span>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}
