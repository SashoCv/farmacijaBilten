import { useT } from '@/lib/i18n';
import { assignmentStatusLabel } from '@/lib/manuscript-status';
import { cn } from '@/lib/utils';
import type { AssignmentStatus } from '@/types/review';

const TONES: Record<AssignmentStatus, string> = {
    invited:
        'border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100',
    accepted:
        'border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700 dark:bg-indigo-950 dark:text-indigo-100',
    submitted:
        'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100',
    declined:
        'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
    cancelled:
        'border-slate-300 bg-transparent text-slate-600 dark:border-slate-600 dark:text-slate-300',
    expired:
        'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100',
};

/** The status of a reviewer's assignment, in words. */
export function AssignmentStatusBadge({
    status,
    className,
}: {
    status: AssignmentStatus;
    className?: string;
}) {
    const { t } = useT();

    return (
        <span
            className={cn(
                'inline-flex w-fit shrink-0 items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
                TONES[status] ?? TONES.invited,
                className,
            )}
        >
            {t(assignmentStatusLabel(status))}
        </span>
    );
}
