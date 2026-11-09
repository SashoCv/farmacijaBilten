import { AlarmClock, CircleAlert } from 'lucide-react';
import { useDates } from '@/lib/dates';
import { cn } from '@/lib/utils';

/**
 * A due date with its countdown in words ("Overdue by 2 days"); overdue is
 * also red and has an icon, never colour alone.
 */
export function DueDate({
    label,
    iso,
    showCountdown = true,
    className,
}: {
    label: string;
    iso: string | null | undefined;
    showCountdown?: boolean;
    className?: string;
}) {
    const { date, due } = useDates();
    const state = showCountdown ? due(iso) : null;

    return (
        <span
            className={cn(
                'inline-flex flex-wrap items-center gap-x-1.5',
                className,
            )}
        >
            <span className="text-muted-foreground">{label}:</span>
            <time dateTime={iso ?? undefined}>{date(iso)}</time>
            {state && (
                <span
                    className={cn(
                        'inline-flex items-center gap-1 font-medium',
                        state.overdue
                            ? 'text-red-700 dark:text-red-400'
                            : state.soon
                              ? 'text-amber-800 dark:text-amber-300'
                              : 'text-muted-foreground',
                    )}
                >
                    {state.overdue ? (
                        <CircleAlert aria-hidden="true" className="size-3.5" />
                    ) : (
                        <AlarmClock aria-hidden="true" className="size-3.5" />
                    )}
                    ({state.text})
                </span>
            )}
        </span>
    );
}
