import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/*
 * Controls placed on the paper. The sheet is white in both themes, so these
 * use fixed light colours instead of the theme tokens.
 */

export const paperInput =
    'ms-ui block h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-slate-900 shadow-xs outline-none placeholder:text-slate-400 focus-visible:border-[#2c4a8a] focus-visible:ring-2 focus-visible:ring-[#2c4a8a]/30 aria-[invalid=true]:border-red-600 aria-[invalid=true]:ring-red-600/20';

export function PaperInput({ className, ...props }: ComponentProps<'input'>) {
    return <input className={cn(paperInput, className)} {...props} />;
}

export function PaperTextarea({
    className,
    ...props
}: ComponentProps<'textarea'>) {
    return (
        <textarea
            className={cn(
                paperInput,
                '[field-sizing:content] h-auto min-h-[4.5rem] py-2 leading-relaxed',
                className,
            )}
            {...props}
        />
    );
}

export function PaperLabel({ className, ...props }: ComponentProps<'label'>) {
    return (
        <label
            className={cn(
                'ms-ui mb-1 block text-xs font-medium text-slate-700',
                className,
            )}
            {...props}
        />
    );
}

export function PaperButton({
    className,
    tone = 'default',
    ...props
}: ComponentProps<'button'> & { tone?: 'default' | 'danger' | 'quiet' }) {
    return (
        <button
            type="button"
            className={cn(
                'ms-ui inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-[#2c4a8a] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
                tone === 'default' &&
                    'border border-slate-300 bg-white text-slate-800 shadow-xs hover:bg-slate-50',
                tone === 'quiet' && 'text-slate-700 hover:bg-slate-100',
                tone === 'danger' && 'text-red-700 hover:bg-red-50',
                className,
            )}
            {...props}
        />
    );
}

export function PaperCheckbox({
    label,
    className,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode }) {
    return (
        <label
            className={cn(
                'ms-ui inline-flex cursor-pointer items-start gap-2 text-sm text-slate-800',
                className,
            )}
        >
            <input
                type="checkbox"
                className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[#2c4a8a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2c4a8a]"
                {...props}
            />
            <span>{label}</span>
        </label>
    );
}

/** A short hint under a control; `invalid` turns it into the field's error. */
export function PaperHint({
    id,
    invalid,
    children,
}: {
    id?: string;
    invalid?: boolean;
    children: ReactNode;
}) {
    return (
        <p
            id={id}
            className={cn(
                'ms-ui mt-1 text-xs leading-snug',
                invalid ? 'text-red-700' : 'text-slate-600',
            )}
        >
            {children}
        </p>
    );
}
