import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = {
    fill: 'none',
    'aria-hidden': true,
    focusable: false,
} as const;

/**
 * Journal mark (interim, until the official vector emblem is supplied): the
 * bowl of Hygieia, the symbol of pharmacy that appears on the printed cover.
 * Strokes are at least 2.25 units so it stays legible at 16-24px. The disc
 * behind it is white; set `--logo-bg` (e.g. `[--logo-bg:transparent]`) to
 * change it on dark backgrounds.
 */
export function LogoMark({
    size,
    style,
    ...props
}: IconProps & { size?: number }) {
    return (
        <svg
            viewBox="0 0 44 44"
            width={size}
            height={size}
            {...base}
            {...props}
            style={style}
        >
            <circle
                cx="22"
                cy="22"
                r="20.6"
                style={{ fill: 'var(--logo-bg, #FFFFFF)' }}
                stroke="currentColor"
                strokeWidth="2.4"
            />
            <path
                d="M12.6 18h18.8c0 5.4-4.2 9-9.4 9s-9.4-3.6-9.4-9z"
                fill="currentColor"
            />
            <path
                d="M22 26.5v5.2M16.8 32.8h10.4"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <path
                d="M15 30.2c-3.4-1.6-5.6-5-5.4-9.2.2-4.6 4-8.4 8.8-8.8 3.2-.2 5.6 1.1 6.6 3.1"
                stroke="currentColor"
                strokeWidth="2.3"
                strokeLinecap="round"
            />
            <circle cx="25.6" cy="14.9" r="1.9" fill="currentColor" />
        </svg>
    );
}

export function SearchIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" width="20" height="20" {...base} {...props}>
            <circle
                cx="9"
                cy="9"
                r="6"
                stroke="currentColor"
                strokeWidth="1.6"
            />
            <path
                d="M13.5 13.5L17 17"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function MenuIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" width="20" height="20" {...base} {...props}>
            <path
                d="M3 6h14M3 10h14M3 14h14"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function CloseIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 20 20" width="20" height="20" {...base} {...props}>
            <path
                d="M5 5l10 10M15 5L5 15"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function ChevronDown(props: IconProps) {
    return (
        <svg viewBox="0 0 12 12" width="12" height="12" {...base} {...props}>
            <path
                d="M3 4.5L6 7.5 9 4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function ChevronRight(props: IconProps) {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" {...base} {...props}>
            <path
                d="M6 3.5L10.5 8 6 12.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function DownloadIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" {...base} {...props}>
            <path
                d="M8 2v8M4.5 6.5L8 10l3.5-3.5M3 13h10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function BellIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" {...base} {...props}>
            <path
                d="M4 7a4 4 0 0 1 8 0v3l1.5 2h-11L4 10V7zM6.5 14h3"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function CopyIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" {...base} {...props}>
            <rect
                x="5"
                y="5"
                width="8.5"
                height="8.5"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
            />
            <path
                d="M3 10.5V3.5A1 1 0 0 1 4 2.5h6.5"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function LockIcon(props: IconProps) {
    return (
        <svg viewBox="0 0 12 14" width="12" height="14" {...base} {...props}>
            <rect
                x="1"
                y="6"
                width="10"
                height="7"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
            />
            <path
                d="M3.5 6V4a2.5 2.5 0 0 1 5 0"
                stroke="currentColor"
                strokeWidth="1.3"
                strokeLinecap="round"
            />
        </svg>
    );
}

export function ArrowRight(props: IconProps) {
    return (
        <svg viewBox="0 0 16 16" width="16" height="16" {...base} {...props}>
            <path
                d="M3 8h10M9 4l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
