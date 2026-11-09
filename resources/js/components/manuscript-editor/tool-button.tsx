import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export const toolClass =
    'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-md border border-transparent px-1.5 text-sm text-foreground transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40 aria-pressed:border-border aria-pressed:bg-accent data-[state=open]:bg-accent';

type ToolButtonProps = Omit<ComponentProps<'button'>, 'onClick'> & {
    label: string;
    onRun: () => void;
    pressed?: boolean;
    children: ReactNode;
};

/**
 * A toolbar button. It keeps the editor selection: mousedown does not move
 * focus, and the command refocuses the editor itself.
 */
export function ToolButton({
    label,
    onRun,
    pressed,
    className,
    children,
    ...props
}: ToolButtonProps) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={pressed}
            className={cn(toolClass, className)}
            onMouseDown={(event) => event.preventDefault()}
            onClick={onRun}
            {...props}
        >
            {children}
        </button>
    );
}

export function ToolGroup({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div
            role="group"
            aria-label={label}
            className="flex items-center gap-0.5 border-r border-border pr-1.5 last:border-r-0"
        >
            {children}
        </div>
    );
}
