import { Head, Link, usePage } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useT } from '@/lib/i18n';

export type Crumb = { label: string; href?: string };

/** Longest visible last crumb; longer titles are cut with an ellipsis. */
const MAX_LAST = 60;

function shorten(label: string): string {
    if (label.length <= MAX_LAST) {
        return label;
    }

    const cut = label.slice(0, MAX_LAST - 1);
    const space = cut.lastIndexOf(' ');

    return `${(space > MAX_LAST * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,;:.–-]+$/, '')}…`;
}

/** Absolute URL for a crumb: relative hrefs resolve against the canonical URL. */
function absolute(href: string, base: string): string {
    try {
        return new URL(href, base).toString();
    } catch {
        return href;
    }
}

/** schema.org BreadcrumbList for the trail; the last crumb is the current page. */
export function breadcrumbJsonLd(items: Crumb[], canonical: string): string {
    const data = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => {
            const href =
                item.href ?? (index === items.length - 1 ? canonical : null);

            return {
                '@type': 'ListItem',
                position: index + 1,
                name: item.label,
                ...(href ? { item: absolute(href, canonical) } : {}),
            };
        }),
    };

    // Escape "<" so a title can never close the script element.
    return JSON.stringify(data).replace(/</g, '\\u003c');
}

/** Path of the page the browser loaded from the server (null during SSR). */
const serverPath =
    typeof window === 'undefined' ? null : window.location.pathname;

/**
 * Whether the server already printed a BreadcrumbList for this page (the SEO
 * partial, tagged data-seo). It describes only the first page loaded and is
 * removed on client navigation, after which this component supplies it.
 */
function serverHasBreadcrumbs(): boolean {
    if (typeof document === 'undefined') {
        return false;
    }

    return (
        window.location.pathname === serverPath &&
        [
            ...document.querySelectorAll(
                'head script[data-seo][type="application/ld+json"]',
            ),
        ].some((script) => script.textContent?.includes('BreadcrumbList'))
    );
}

export function Breadcrumbs({
    items,
    className,
}: {
    items: Crumb[];
    className?: string;
}) {
    const { t } = useT();
    const { canonical } = usePage().props;

    return (
        <>
            {!serverHasBreadcrumbs() && (
                <Head>
                    <script
                        type="application/ld+json"
                        head-key="breadcrumb-jsonld"
                        dangerouslySetInnerHTML={{
                            __html: breadcrumbJsonLd(items, canonical),
                        }}
                    />
                </Head>
            )}
            <nav
                aria-label={t('Breadcrumb')}
                className={cn('text-meta text-ink-muted', className)}
            >
                <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
                    {items.map((item, index) => {
                        const last = index === items.length - 1;
                        const short = last ? shorten(item.label) : item.label;

                        return (
                            <li
                                key={`${item.label}-${index}`}
                                className="flex min-w-0 items-center gap-2"
                            >
                                {index > 0 && (
                                    <span
                                        aria-hidden="true"
                                        className="text-ink-muted/60"
                                    >
                                        /
                                    </span>
                                )}
                                {item.href && !last ? (
                                    <Link
                                        href={item.href}
                                        className="text-ink-muted no-underline hover:text-brand hover:underline"
                                    >
                                        {item.label}
                                    </Link>
                                ) : (
                                    <span
                                        aria-current={last ? 'page' : undefined}
                                        title={
                                            short !== item.label
                                                ? item.label
                                                : undefined
                                        }
                                        className={cn(
                                            last && 'font-semibold text-ink',
                                        )}
                                    >
                                        {short === item.label ? (
                                            item.label
                                        ) : (
                                            <>
                                                <span aria-hidden="true">
                                                    {short}
                                                </span>
                                                <span className="sr-only">
                                                    {item.label}
                                                </span>
                                            </>
                                        )}
                                    </span>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </nav>
        </>
    );
}
