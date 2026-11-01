import { Link, usePage } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import type { ReactNode } from 'react';
import { ChevronRight } from '@/components/journal/icons';
import { useT } from '@/lib/i18n';
import { authorLinks, submitHref } from '@/lib/site-links';

/**
 * Home page rail: submit, the journal at a glance, indexing and author
 * links. Every value comes from config/journal.php (the `journal` prop);
 * facts that are not stated (null) are left out.
 */
export function JournalRail({
    className,
    children,
}: {
    className?: string;
    /** Extra blocks shown after the indexing (e.g. the supplement banner). */
    children?: ReactNode;
}) {
    const { t, locale } = useT();
    const { journal } = usePage().props;
    const mk = locale === 'mk';

    const facts: { label: string; value: ReactNode }[] = [
        { label: t('Print ISSN'), value: journal.issnPrint },
        { label: t('Online ISSN'), value: journal.issnOnline },
        { label: t('DOI prefix'), value: journal.doiPrefix },
    ];

    if (journal.frequency) {
        facts.push({ label: t('Frequency'), value: t(journal.frequency) });
    }

    if (journal.reviewModel) {
        facts.push({ label: t('Peer review'), value: t(journal.reviewModel) });
    }

    if (journal.openAccess) {
        facts.push({
            label: t('Access'),
            value: (
                <Link href="/guidelines/open-access-policy">
                    {t('Open access')}
                </Link>
            ),
        });
    }

    facts.push({
        label: t('Licence'),
        value: (
            <a
                href={journal.licence.url}
                target="_blank"
                rel="license noopener noreferrer"
            >
                {journal.licence.name}
            </a>
        ),
    });

    if (journal.apc) {
        facts.push({
            label: t('Publication fee'),
            value: (
                <Link href="/guidelines/article-processing-charges">
                    {journal.apc.amount} {journal.apc.currency}
                </Link>
            ),
        });
    }

    facts.push({
        label: t('Publisher'),
        value: (
            <a
                href={journal.publisher.url}
                target="_blank"
                rel="noopener noreferrer"
            >
                {mk ? journal.publisher.nameMk : journal.publisher.nameEn}
            </a>
        ),
    });

    const ebsco = journal.indexing.find((service) => service.key === 'ebsco');

    return (
        <aside
            aria-label={t('About the journal')}
            className={cn('flex flex-col gap-7', className)}
        >
            <div className="flex flex-col gap-3 rounded-lg border border-line-card bg-white p-5">
                <p className="m-0 text-ui text-ink-soft">
                    {t(
                        'Original research, reviews and professional papers in the pharmaceutical sciences.',
                    )}
                </p>
                <Link href={submitHref} className="btn-primary w-full">
                    {t('Submit manuscript')}
                </Link>
                <Link
                    href={authorLinks[0].href}
                    className="self-center text-ui font-semibold underline decoration-underline underline-offset-4 hover:decoration-brand"
                >
                    {t('Instructions for authors')}
                </Link>
            </div>

            <section aria-labelledby="glance-title">
                <h2 id="glance-title" className="eyebrow mb-2">
                    {t('Journal at a glance')}
                </h2>
                <dl className="m-0 border-t border-line">
                    {facts.map((fact) => (
                        <div
                            key={fact.label}
                            className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-x-4 border-b border-line py-1.5"
                        >
                            <dt className="text-meta text-ink-muted">
                                {fact.label}
                            </dt>
                            <dd className="m-0 text-ui text-ink tabular-nums">
                                {fact.value}
                            </dd>
                        </div>
                    ))}
                </dl>
            </section>

            <section aria-labelledby="indexing-title">
                <h2 id="indexing-title" className="eyebrow mb-3">
                    {t('Indexed in')}
                </h2>
                <ul className="m-0 flex list-none flex-wrap items-center gap-x-5 gap-y-3 p-0">
                    {journal.indexing.map((service) => (
                        <li key={service.key}>
                            <a
                                href={service.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={service.label}
                                className="group inline-flex min-h-11 items-center"
                            >
                                {service.logo ? (
                                    <img
                                        src={service.logo}
                                        alt={`${service.name} – ${service.label}`}
                                        loading="lazy"
                                        decoding="async"
                                        className={cn(
                                            'w-auto opacity-80 grayscale transition group-hover:opacity-100 group-hover:grayscale-0 group-focus-visible:opacity-100 group-focus-visible:grayscale-0',
                                            service.key === 'doaj'
                                                ? 'h-7'
                                                : 'h-9',
                                        )}
                                    />
                                ) : (
                                    <span className="rounded-md border border-control px-2.5 py-1 text-meta font-semibold tracking-[0.02em] text-ink-soft group-hover:border-brand group-hover:text-brand">
                                        {service.name}
                                    </span>
                                )}
                            </a>
                        </li>
                    ))}
                </ul>
                {ebsco && (
                    <p
                        lang="en"
                        className="m-0 mt-3 text-meta leading-normal text-ink-muted"
                    >
                        {journal.ebscoStatement}
                    </p>
                )}
            </section>

            {children}

            <nav aria-labelledby="authors-title">
                <h2 id="authors-title" className="eyebrow mb-2">
                    {t('For authors')}
                </h2>
                <ul className="m-0 list-none border-t border-line p-0">
                    {authorLinks.map((link) => (
                        <li key={link.href} className="border-b border-line">
                            <Link
                                href={link.href}
                                className="group flex min-h-9 items-center justify-between gap-3 text-ui text-ink no-underline hover:text-brand"
                            >
                                {t(link.label)}
                                <ChevronRight className="shrink-0 text-ink-muted group-hover:text-brand" />
                            </Link>
                        </li>
                    ))}
                </ul>
            </nav>
        </aside>
    );
}
