import { clsx as cn } from 'clsx';
import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent, RefObject } from 'react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';

export type TocItem = { id: string; title: string };

/**
 * Id of the section currently being read: the last heading that has passed
 * the sticky header (96px), else the first one.
 */
export function useActiveSection(ids: string[]): string | null {
    const [active, setActive] = useState<string | null>(ids[0] ?? null);
    const key = ids.join('|');

    useEffect(() => {
        const headings = key
            .split('|')
            .map((id) => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null);

        if (headings.length === 0) {
            return;
        }

        let frame = 0;

        const update = () => {
            frame = 0;
            const offset = 120;
            let current = headings[0].id;

            for (const heading of headings) {
                if (heading.getBoundingClientRect().top - offset <= 0) {
                    current = heading.id;
                } else {
                    break;
                }
            }

            // At the very bottom, the last section is the one being read.
            if (
                window.innerHeight + window.scrollY >=
                document.documentElement.scrollHeight - 4
            ) {
                current = headings[headings.length - 1].id;
            }

            setActive(current);
        };

        const onScroll = () => {
            if (!frame) {
                frame = requestAnimationFrame(update);
            }
        };

        update();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll);

        return () => {
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('resize', onScroll);
            cancelAnimationFrame(frame);
        };
    }, [key]);

    return active;
}

/**
 * "On this page": the sections of a long page, numbered as in the text.
 * `rail` is the sticky list for the right column (lg and up; the sticky
 * behaviour comes from .toc-rail); `disclosure` is the collapsible
 * "Contents" for smaller screens.
 */
export function PageToc({
    items,
    variant,
    className,
}: {
    items: TocItem[];
    variant: 'rail' | 'disclosure';
    className?: string;
}) {
    const { t } = useT();
    const active = useActiveSection(
        variant === 'rail' ? items.map((item) => item.id) : [],
    );
    const detailsRef = useRef<HTMLDetailsElement>(null);

    if (items.length === 0) {
        return null;
    }

    const list = (
        <ol className="m-0 flex list-none flex-col gap-0.5 p-0">
            {items.map((item, index) => (
                <li key={item.id}>
                    <a
                        href={`#${item.id}`}
                        aria-current={
                            variant === 'rail' && active === item.id
                                ? 'true'
                                : undefined
                        }
                        onClick={() => {
                            if (detailsRef.current) {
                                detailsRef.current.open = false;
                            }
                        }}
                        className={cn(
                            'flex gap-2.5',
                            variant === 'disclosure' &&
                                'rounded-md px-3 py-2 text-ui text-ink no-underline hover:bg-mist hover:text-brand',
                        )}
                    >
                        <span
                            aria-hidden="true"
                            className="w-5 shrink-0 text-meta leading-[inherit] text-ink-muted tabular-nums"
                        >
                            {index + 1}.
                        </span>
                        <span>{item.title}</span>
                    </a>
                </li>
            ))}
        </ol>
    );

    if (variant === 'disclosure') {
        return (
            <details
                ref={detailsRef}
                className={cn(
                    'group rounded-lg border border-line-card bg-white',
                    className,
                )}
            >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-ui font-semibold text-ink [&::-webkit-details-marker]:hidden">
                    <span>
                        {t('Contents')}{' '}
                        <span className="font-normal text-ink-muted tabular-nums">
                            ({items.length})
                        </span>
                    </span>
                    <svg
                        viewBox="0 0 16 16"
                        width="16"
                        height="16"
                        fill="none"
                        aria-hidden="true"
                        focusable="false"
                        className="shrink-0 text-ink-muted transition-transform group-open:rotate-180"
                    >
                        <path
                            d="M4 6l4 4 4-4"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </summary>
                <nav
                    aria-label={t('On this page')}
                    className="border-t border-line px-1 py-2"
                >
                    {list}
                </nav>
            </details>
        );
    }

    return (
        <nav
            aria-labelledby="page-toc-title"
            className={cn('toc-rail', className)}
        >
            <p id="page-toc-title" className="eyebrow mb-2">
                {t('On this page')}
            </p>
            {list}
        </nav>
    );
}

/**
 * Numbers the h2 sections of sanitised page HTML ("1.", "2." …, matching the
 * table of contents) and adds a "#" link after each one that copies the
 * section's address. A plain string transform, so it renders the same on
 * the server and in the browser.
 */
export function withSectionAnchors(
    html: string,
    items: TocItem[],
    copyLabel: string,
): string {
    if (items.length === 0) {
        return html;
    }

    const numbers = new Map(items.map((item, index) => [item.id, index + 1]));
    const escape = (s: string) =>
        s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

    return html.replace(
        /<h2 id="([^"]+)">([\s\S]*?)<\/h2>/g,
        (match, id: string, inner: string) => {
            const number = numbers.get(id);

            if (number === undefined) {
                return match;
            }

            return (
                `<h2 id="${id}" class="group/heading flex items-baseline gap-2.5">` +
                `<span class="min-w-6 shrink-0 font-sans text-[0.8em] font-semibold text-brand tabular-nums" aria-hidden="true">${number}.</span>` +
                `<span>${inner}` +
                `<a href="#${id}" data-copy-link class="ml-2 inline-block font-sans text-ui font-normal text-ink-muted no-underline! opacity-0 transition-opacity group-hover/heading:opacity-100 focus-visible:opacity-100" aria-label="${escape(copyLabel)}" title="${escape(copyLabel)}">#</a>` +
                `</span></h2>`
            );
        },
    );
}

/**
 * Click handler for the "#" links added by withSectionAnchors(): copies the
 * section's address and moves to it.
 */
export function useCopySectionLink(ref: RefObject<HTMLElement | null>) {
    const { t } = useT();

    return (event: ReactMouseEvent<HTMLElement>) => {
        const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(
            'a[data-copy-link]',
        );

        if (!link || !ref.current?.contains(link)) {
            return;
        }

        event.preventDefault();
        const hash = link.getAttribute('href') ?? '';
        const url = `${window.location.origin}${window.location.pathname}${hash}`;

        window.history.replaceState(window.history.state, '', hash);
        document
            .getElementById(hash.slice(1))
            ?.scrollIntoView({ block: 'start' });

        navigator.clipboard
            ?.writeText(url)
            .then(() => toast.success(t('Link copied')))
            .catch(() => undefined);
    };
}
