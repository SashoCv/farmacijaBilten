import { useT } from '@/lib/i18n';
import { statusLabel } from '@/lib/manuscript-status';
import { cn } from '@/lib/utils';
import type { ManuscriptStatus } from '@/types/manuscript';

/*
 * The status of a manuscript as a badge. The label always carries the
 * meaning; the colour only groups statuses (waiting, needs the author,
 * positive, closed).
 */

const TONES: Record<ManuscriptStatus, string> = {
    draft: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
    submitted:
        'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
    under_review:
        'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100',
    revision_requested:
        'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
    resubmitted:
        'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
    accepted:
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
    in_production:
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
    published:
        'border-emerald-600 bg-emerald-600 text-white dark:border-emerald-500 dark:bg-emerald-700',
    rejected:
        'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100',
    withdrawn:
        'border-slate-300 bg-transparent text-slate-600 dark:border-slate-600 dark:text-slate-300',
};

export function StatusBadge({
    status,
    className,
}: {
    status: ManuscriptStatus;
    className?: string;
}) {
    const { t } = useT();

    return (
        <span
            data-status={status}
            className={cn(
                'inline-flex w-fit shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                TONES[status] ?? TONES.draft,
                className,
            )}
        >
            {t(statusLabel(status))}
        </span>
    );
}
