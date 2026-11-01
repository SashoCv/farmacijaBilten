import { Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useT } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { PageSection } from '@/types/journal';

/** The section as sent by PageController (adds the Macedonian section title). */
export type SectionData = Omit<PageSection, 'pages'> & {
    titleMk?: string | null;
    /** One line about the section's hub page. */
    summary?: string | null;
    pages: (PageSection['pages'][number] & { summary?: string | null })[];
};

type Titled = { title: string; titleMk?: string | null };

/** A page or section title in the reader's language. */
export function localTitle(item: Titled, locale: Locale): string {
    return locale === 'mk' && item.titleMk ? item.titleMk : item.title;
}

/**
 * Navigation between the pages of a section ("For authors"). From md up it is
 * a vertical list in the rail; below md a compact disclosure
 * ("In this section: Review policies ▾") so the page text starts high.
 * Both carry the same links.
 */
export function SectionNav({
    section,
    currentPath,
    variant,
    className,
}: {
    section: SectionData;
    currentPath: string;
    variant: 'list' | 'disclosure';
    className?: string;
}) {
    const { t, locale } = useT();
    const sectionTitle = localTitle(section, locale);
    const pages = [
        { path: section.path, title: section.title, titleMk: section.titleMk },
        ...section.pages,
    ];
    const current = pages.find((p) => p.path === currentPath);

    const links = (
        <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
            {pages.map((item, index) => {
                const active = item.path === currentPath;

                return (
                    <li key={item.path}>
                        <Link
                            href={`/${item.path}`}
                            prefetch
                            aria-current={active ? 'page' : undefined}
                            className={cn(
                                'block border-l-2 py-2 pr-2 pl-3 text-ui no-underline transition-colors',
                                active
                                    ? 'border-brand font-semibold text-brand-dark'
                                    : 'border-line text-ink-soft hover:border-brand hover:text-brand',
                            )}
                        >
                            {index === 0
                                ? t('Overview')
                                : localTitle(item, locale)}
                        </Link>
                    </li>
                );
            })}
        </ul>
    );

    if (variant === 'disclosure') {
        return (
            <details
                className={cn(
                    'group rounded-lg border border-line-card bg-white',
                    className,
                )}
            >
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-ui [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0">
                        <span className="text-ink-muted">
                            {t('In this section')}:
                        </span>{' '}
                        <span className="font-semibold text-ink">
                            {current
                                ? current.path === section.path
                                    ? t('Overview')
                                    : localTitle(current, locale)
                                : sectionTitle}
                        </span>
                    </span>
                    <Chevron />
                </summary>
                <nav
                    aria-label={sectionTitle}
                    className="border-t border-line px-2 py-2"
                >
                    {links}
                </nav>
            </details>
        );
    }

    return (
        <nav
            aria-labelledby="section-nav-title"
            className={cn('flex flex-col gap-3', className)}
        >
            <p id="section-nav-title" className="eyebrow">
                {sectionTitle}
            </p>
            {links}
        </nav>
    );
}

function Chevron() {
    return (
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
    );
}
