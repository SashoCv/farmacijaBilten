import { Link } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import type { ReactNode } from 'react';
import { ArrowRight } from '@/components/journal/icons';
import { JournalFacts } from '@/components/journal/journal-facts';
import { useT } from '@/lib/i18n';
import { authorLinks, submitHref } from '@/lib/site-links';

/**
 * Right rail of the short editorial pages: "Journal at a glance" (ISSN,
 * licence, peer review, APC, indexing) with the Submit button.
 */
export function CmsRail({
    showSubmit = true,
    className,
}: {
    showSubmit?: boolean;
    className?: string;
}) {
    return (
        <div className={cn('flex flex-col gap-6', className)}>
            <JournalFacts headingLevel="h2" showSubmit={showSubmit} />
        </div>
    );
}

/**
 * The one strong colour block of an inner page: a navy band before the
 * footer that sends authors to the instructions and the submission form.
 */
export function ClosingCta() {
    const { t } = useT();

    return (
        <section aria-labelledby="closing-cta" className="navy-band">
            <div className="page-wrap flex flex-col gap-6 py-10 md:flex-row md:items-center md:justify-between md:gap-12 md:py-14">
                <div className="flex max-w-[58ch] flex-col gap-2">
                    <h2
                        id="closing-cta"
                        className="m-0 font-serif text-h3 font-medium md:text-h2"
                    >
                        {t('Ready to submit?')}
                    </h2>
                    <p className="m-0 text-body text-white/85">
                        {t(
                            'Read the instructions for authors, prepare the signed forms, then send your manuscript through the online form.',
                        )}
                    </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row md:shrink-0">
                    <Link
                        href={authorLinks[0].href}
                        className="btn-outline border-white/50 bg-transparent text-white hover:border-white hover:bg-white/10 hover:text-white"
                    >
                        {t('Instructions for authors')}
                    </Link>
                    <Link
                        href={submitHref}
                        className="btn-primary bg-white text-brand-dark hover:bg-tint hover:text-brand-dark"
                    >
                        {t('Submit manuscript')}
                        <ArrowRight />
                    </Link>
                </div>
            </div>
        </section>
    );
}

export type LinkCardItem = {
    href: string;
    title: string;
    description?: string | null;
    /** Small label above the title. */
    eyebrow?: string;
    /** Language of the description, when it is content. */
    lang?: string;
};

/**
 * A grid of navigation cards: white, 1px border, radius 8, no shadow; the
 * border darkens on hover and the whole card is the link.
 */
export function LinkCards({
    items,
    headingLevel: Heading = 'h3',
    compact = false,
    className,
}: {
    items: LinkCardItem[];
    headingLevel?: 'h2' | 'h3';
    /** Sans-serif titles for narrow, three-up grids. */
    compact?: boolean;
    className?: string;
}) {
    return (
        <ul
            className={cn(
                'm-0 grid list-none gap-4 p-0 sm:grid-cols-2',
                className,
            )}
        >
            {items.map((item) => (
                <li key={item.href} className="flex">
                    <Link
                        href={item.href}
                        prefetch
                        className="group flex w-full flex-col gap-2 rounded-lg border border-line-card bg-white p-5 text-ink no-underline transition-colors hover:border-line-strong hover:text-ink focus-visible:border-brand"
                    >
                        {item.eyebrow && (
                            <span className="eyebrow">{item.eyebrow}</span>
                        )}
                        <Heading
                            className={cn(
                                'm-0 flex items-start justify-between gap-3 text-ink group-hover:text-brand-dark',
                                compact
                                    ? 'font-sans text-[17px] leading-snug font-semibold'
                                    : 'font-serif text-h4 font-medium',
                            )}
                        >
                            <span>{item.title}</span>
                            <ArrowRight
                                className="mt-1 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand"
                                aria-hidden="true"
                            />
                        </Heading>
                        {item.description && (
                            <p
                                lang={item.lang}
                                className="m-0 text-ui text-ink-soft"
                            >
                                {item.description}
                            </p>
                        )}
                    </Link>
                </li>
            ))}
        </ul>
    );
}

/** A titled block in the main column of an information page. */
export function CmsSection({
    id,
    title,
    intro,
    children,
    className,
}: {
    id: string;
    title: string;
    intro?: ReactNode;
    children: ReactNode;
    className?: string;
}) {
    return (
        <section
            aria-labelledby={id}
            className={cn('flex scroll-mt-24 flex-col gap-5', className)}
        >
            <div className="flex flex-col gap-2">
                <h2
                    id={id}
                    className="m-0 font-serif text-h3 font-medium text-ink"
                >
                    {title}
                </h2>
                {intro && (
                    <p className="m-0 max-w-[62ch] text-ui text-ink-soft">
                        {intro}
                    </p>
                )}
            </div>
            {children}
        </section>
    );
}

/** Previous / next page within a section ("Review policies → Article processing charges"). */
export function SectionPager({
    previous,
    next,
}: {
    previous: { href: string; title: string } | null;
    next: { href: string; title: string } | null;
}) {
    const { t } = useT();

    if (!previous && !next) {
        return null;
    }

    return (
        <nav
            aria-label={t('Pages in this section')}
            className="grid gap-4 border-t border-line pt-8 sm:grid-cols-2"
        >
            {previous ? (
                <Link
                    href={previous.href}
                    prefetch
                    className="group flex flex-col gap-1 rounded-lg border border-line-card p-4 text-ink no-underline hover:border-line-strong hover:text-ink"
                >
                    <span className="text-meta text-ink-muted">
                        ← {t('Previous')}
                    </span>
                    <span className="font-semibold text-brand group-hover:text-brand-dark">
                        {previous.title}
                    </span>
                </Link>
            ) : (
                <span className="hidden sm:block" />
            )}
            {next && (
                <Link
                    href={next.href}
                    prefetch
                    className="group flex flex-col gap-1 rounded-lg border border-line-card p-4 text-ink no-underline hover:border-line-strong hover:text-ink sm:items-end sm:text-right"
                >
                    <span className="text-meta text-ink-muted">
                        {t('Next')} →
                    </span>
                    <span className="font-semibold text-brand group-hover:text-brand-dark">
                        {next.title}
                    </span>
                </Link>
            )}
        </nav>
    );
}
