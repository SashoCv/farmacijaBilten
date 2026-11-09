import { CircleAlert, TriangleAlert } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { issueId, useWorkspace } from './context';
import { useStore } from './store';

/**
 * The check messages for one field, under it. Fields point at this element
 * with aria-describedby, so screen readers read the problem with the field.
 */
export function FieldIssues({
    field,
    className,
}: {
    field: string;
    className?: string;
}) {
    const { t } = useT();
    const { issues } = useWorkspace();
    const mine = useStore(issues).filter((issue) => issue.field === field);

    return (
        <div id={issueId(field)} className={cn('ms-ui', className)}>
            {mine.map((issue, index) => (
                <p
                    key={index}
                    className={cn(
                        'mt-1 flex items-start gap-1.5 text-[13px] leading-snug',
                        issue.level === 'error'
                            ? 'text-red-700'
                            : 'text-amber-800',
                    )}
                >
                    {issue.level === 'error' ? (
                        <CircleAlert
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0"
                        />
                    ) : (
                        <TriangleAlert
                            aria-hidden="true"
                            className="mt-0.5 size-3.5 shrink-0"
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
                </p>
            ))}
        </div>
    );
}
