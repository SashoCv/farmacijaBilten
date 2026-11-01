import { Link, usePage } from '@inertiajs/react';
import { clsx as cn } from 'clsx';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { IndexingLogos } from '@/components/journal/indexing-logos';
import { useT } from '@/lib/i18n';
import { authorLinks, submitHref } from '@/lib/site-links';

type Props = {
    /** Heading level of the panel title (default h2). */
    headingLevel?: 'h2' | 'h3';
    /** Show the Submit button and the instructions link (default true). */
    showSubmit?: boolean;
    /** Show the original EBSCO licensing sentence under the logos. */
    showEbscoStatement?: boolean;
    className?: string;
};

const APC_HREF = '/guidelines/article-processing-charges';
const REVIEW_HREF = '/guidelines/review-policies';

/**
 * "Journal at a glance": the identifiers and policies a reader or author
 * checks first, read from the shared `journal` prop (config/journal.php).
 * Facts that are not stated (null) are left out rather than guessed.
 */
export function JournalFacts({
    headingLevel: Heading = 'h2',
    showSubmit = true,
    showEbscoStatement = false,
    className,
}: Props) {
    const { t, locale } = useT();
    const journal = usePage().props.journal;
    const titleId = useId();
    const publisher =
        locale === 'mk' ? journal.publisher.nameMk : journal.publisher.nameEn;
    const coPublisher =
        locale === 'mk'
            ? journal.coPublisher.nameMk
            : journal.coPublisher.nameEn;

    return (
        <section
            aria-labelledby={titleId}
            className={cn(
                'flex flex-col gap-5 rounded-lg border border-line-card bg-white p-5 sm:p-6',
                className,
            )}
        >
            <Heading
                id={titleId}
                className="m-0 font-serif text-h4 font-medium text-ink"
            >
                {t('Journal at a glance')}
            </Heading>

            <dl className="m-0 flex flex-col text-ui">
                <Fact label={t('Print ISSN')}>
                    <span className="tabular-nums">{journal.issnPrint}</span>
                </Fact>
                <Fact label={t('Online ISSN')}>
                    <span className="tabular-nums">{journal.issnOnline}</span>
                </Fact>
                <Fact label={t('DOI prefix')}>
                    <span className="tabular-nums">{journal.doiPrefix}</span>
                </Fact>
                {journal.frequency && (
                    <Fact label={t('Frequency')}>{t(journal.frequency)}</Fact>
                )}
                {journal.openAccess && (
                    <Fact label={t('Access')}>
                        {t('Open access')} ·{' '}
                        <a
                            href={journal.licence.url}
                            target="_blank"
                            rel="license noopener noreferrer"
                        >
                            {journal.licence.name}
                        </a>
                    </Fact>
                )}
                {journal.reviewModel && (
                    <Fact label={t('Peer review')}>
                        <Link href={REVIEW_HREF}>{t(journal.reviewModel)}</Link>
                    </Fact>
                )}
                {journal.apc && (
                    <Fact label={t('APC')}>
                        <Link href={APC_HREF}>
                            <span className="tabular-nums">
                                {journal.apc.amount} {journal.apc.currency}
                            </span>
                            {journal.apc.charged && (
                                <>, {t(journal.apc.charged)}</>
                            )}
                        </Link>
                    </Fact>
                )}
                <Fact label={t('Publisher')}>
                    <span className="block">{publisher}</span>
                    <span className="mt-0.5 block text-meta text-ink-muted">
                        {t('with the {organisation}', {
                            organisation: coPublisher,
                        })}
                    </span>
                </Fact>
            </dl>

            <div className="flex flex-col gap-2.5">
                <p className="eyebrow text-ink-muted">{t('Indexed in')}</p>
                <IndexingLogos showEbscoStatement={showEbscoStatement} />
            </div>

            {showSubmit && (
                <div className="flex flex-col gap-3 border-t border-line pt-5">
                    <Link href={submitHref} className="btn-primary w-full">
                        {t('Submit manuscript')}
                    </Link>
                    <Link
                        href={authorLinks[0].href}
                        className="link-u self-center text-ui"
                    >
                        {t('Instructions for authors')}
                    </Link>
                </div>
            )}
        </section>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)] gap-x-4 border-t border-line py-2.5 first:border-t-0 first:pt-0">
            <dt className="text-meta leading-[1.6] text-ink-muted">{label}</dt>
            <dd className="m-0 min-w-0 [overflow-wrap:anywhere] text-ink">
                {children}
            </dd>
        </div>
    );
}
