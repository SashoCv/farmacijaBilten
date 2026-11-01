import { clsx as cn } from 'clsx';
import { Download, Link2, Linkedin, Mail, Quote, Share2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';
import { toast } from 'sonner';
import { useT } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** "1.2 MB" / "1,2 MB" in the reader's locale. */
export function formatBytes(bytes: number, locale: Locale): string {
    const mb = bytes / 1_048_576;
    const [value, unit] =
        mb >= 1 ? [mb, 'megabyte'] : [Math.max(1, bytes / 1024), 'kilobyte'];

    return new Intl.NumberFormat(locale, {
        style: 'unit',
        unit,
        unitDisplay: 'short',
        maximumFractionDigits: mb >= 10 || mb < 1 ? 0 : 1,
    }).format(value);
}

/** "1.2 MB, 2 pages" — whichever of the two is known, or null. */
export function usePdfFacts(
    bytes: number | null | undefined,
    pages: number | null | undefined,
): string | null {
    const { t, locale } = useT();
    const parts = [
        bytes ? formatBytes(bytes, locale) : null,
        pages
            ? pages === 1
                ? t('1 page')
                : t('{count} pages', { count: pages })
            : null,
    ].filter(Boolean);

    return parts.length ? parts.join(', ') : null;
}

/**
 * Copies text (and an HTML version, so italics survive a paste into a word
 * processor) and confirms with a toast. Resolves to whether it worked.
 */
export function useCopy() {
    const { t } = useT();

    return async (text: string, message: string, html?: string) => {
        try {
            if (
                html &&
                typeof ClipboardItem !== 'undefined' &&
                navigator.clipboard.write
            ) {
                await navigator.clipboard.write([
                    new ClipboardItem({
                        'text/plain': new Blob([text], { type: 'text/plain' }),
                        'text/html': new Blob([html], { type: 'text/html' }),
                    }),
                ]);
            } else {
                await navigator.clipboard.writeText(text);
            }

            toast.success(message);

            return true;
        } catch {
            toast.error(
                t('Could not copy. Select the text and copy it manually.'),
            );

            return false;
        }
    };
}

/** Native share sheet where there is one, otherwise copy the link. */
export function useShare(url: string, title: string) {
    const { t } = useT();
    const copy = useCopy();

    return async () => {
        if (typeof navigator.share === 'function') {
            try {
                await navigator.share({ title, url });
            } catch {
                // Dismissed by the reader.
            }

            return;
        }

        await copy(url, t('Link copied'));
    };
}

/**
 * Tracks whether `ref` is on screen (at least `ratio` of it), and whether the
 * page has scrolled past it. `undefined` until the first observation (server
 * render, first paint).
 */
export function useInView(ref: RefObject<Element | null>, ratio = 0) {
    const [state, setState] = useState<{ visible: boolean; above: boolean }>();

    useEffect(() => {
        const el = ref.current;

        if (!el || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver(
            ([entry]) =>
                setState({
                    visible:
                        entry.isIntersecting &&
                        entry.intersectionRatio >= ratio,
                    above: entry.boundingClientRect.top < 0,
                }),
            { threshold: [0, ratio || 0.01, 1] },
        );

        observer.observe(el);

        return () => observer.disconnect();
    }, [ref, ratio]);

    return state;
}

/* ------------------------------------------------------------------ */
/* Action row (main column)                                            */
/* ------------------------------------------------------------------ */

type ActionsProps = {
    pdf: string | null;
    pdfFacts: string | null;
    onCite: () => void;
    onShare: () => void;
};

/** Download PDF · Cite · Share, directly under the article's metadata. */
export function ArticleActions({
    pdf,
    pdfFacts,
    onCite,
    onShare,
    rowRef,
}: ActionsProps & { rowRef?: RefObject<HTMLDivElement | null> }) {
    const { t } = useT();

    return (
        <div ref={rowRef} className="flex flex-wrap items-center gap-2.5">
            {pdf && (
                <a
                    href={pdf}
                    className="btn-primary max-sm:flex-[1_1_100%]"
                    aria-label={
                        pdfFacts
                            ? `${t('Download PDF')} (${pdfFacts})`
                            : undefined
                    }
                >
                    <Download className="size-[18px]" aria-hidden="true" />
                    {t('Download PDF')}
                    {pdfFacts && (
                        <span className="text-ui font-normal text-white/80">
                            {pdfFacts}
                        </span>
                    )}
                </a>
            )}
            <button
                type="button"
                className="btn-outline max-sm:flex-1"
                onClick={onCite}
                aria-haspopup="dialog"
            >
                <Quote className="size-4 text-brand" aria-hidden="true" />
                {t('Cite')}
            </button>
            <button
                type="button"
                className="btn-outline max-sm:flex-1"
                onClick={onShare}
            >
                <Share2 className="size-4 text-brand" aria-hidden="true" />
                {t('Share')}
            </button>
        </div>
    );
}

/**
 * Below lg: PDF and Cite pinned to the bottom of the screen while the action
 * row is off screen, and out of the way once the footer is reached.
 */
export function MobileActionBar({
    pdf,
    onCite,
    watch,
}: {
    pdf: string | null;
    onCite: () => void;
    watch: RefObject<HTMLDivElement | null>;
}) {
    const { t } = useT();
    // Pinned unless the whole row is on screen, so PDF is always one tap away.
    const row = useInView(watch, 0.95);
    const footer = useRef<Element | null>(null);
    const [footerVisible, setFooterVisible] = useState(false);

    useEffect(() => {
        footer.current = document.querySelector('footer');

        if (!footer.current || typeof IntersectionObserver === 'undefined') {
            return;
        }

        const observer = new IntersectionObserver(([entry]) =>
            setFooterVisible(entry.isIntersecting),
        );

        observer.observe(footer.current);

        return () => observer.disconnect();
    }, []);

    const shown = row !== undefined && !row.visible && !footerVisible;

    return (
        <div
            className={cn(
                'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_-16px_rgba(22,38,77,0.35)] backdrop-blur transition-transform duration-200 motion-reduce:transition-none lg:hidden',
                shown
                    ? 'translate-y-0'
                    : 'pointer-events-none translate-y-full',
            )}
            aria-hidden={!shown}
            inert={!shown}
        >
            <div className="mx-auto flex max-w-[600px] gap-2.5">
                {pdf && (
                    <a href={pdf} className="btn-primary flex-[2_1_0]">
                        <Download className="size-[18px]" aria-hidden="true" />
                        {t('Download PDF')}
                    </a>
                )}
                <button
                    type="button"
                    className="btn-outline flex-1"
                    onClick={onCite}
                    aria-haspopup="dialog"
                >
                    <Quote className="size-4 text-brand" aria-hidden="true" />
                    {t('Cite')}
                </button>
            </div>
        </div>
    );
}

/* ------------------------------------------------------------------ */
/* Share links (rail)                                                  */
/* ------------------------------------------------------------------ */

function XLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className={className}
            fill="currentColor"
        >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
    );
}

function ShareItem({
    href,
    onClick,
    icon,
    children,
}: {
    href?: string;
    onClick?: () => void;
    icon: ReactNode;
    children: ReactNode;
}) {
    const className =
        'flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md border-0 bg-transparent px-2 font-sans text-ui font-normal text-ink no-underline transition-colors hover:bg-mist hover:text-brand-dark [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-brand';

    return (
        <li>
            {href ? (
                <a
                    href={href}
                    className={className}
                    {...(href.startsWith('http')
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : {})}
                >
                    {icon}
                    {children}
                </a>
            ) : (
                <button type="button" className={className} onClick={onClick}>
                    {icon}
                    {children}
                </button>
            )}
        </li>
    );
}

/** Copy link · Email · LinkedIn · X, built from the canonical address. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
    const { t } = useT();
    const copy = useCopy();
    const u = encodeURIComponent(url);
    const text = encodeURIComponent(title);

    return (
        <ul className="m-0 grid list-none grid-cols-2 gap-x-2 gap-y-0.5 p-0 lg:grid-cols-1">
            <ShareItem
                icon={<Link2 />}
                onClick={() => copy(url, t('Link copied'))}
            >
                {t('Copy link')}
            </ShareItem>
            <ShareItem
                icon={<Mail />}
                href={`mailto:?subject=${text}&body=${u}`}
            >
                {t('Email')}
            </ShareItem>
            <ShareItem
                icon={<Linkedin />}
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${u}`}
            >
                LinkedIn
            </ShareItem>
            <ShareItem
                icon={<XLogo />}
                href={`https://x.com/intent/post?url=${u}&text=${text}`}
            >
                X
            </ShareItem>
        </ul>
    );
}
