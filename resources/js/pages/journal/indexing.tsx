import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { CmsPageHeader } from '@/components/journal/cms-page-header';
import { ClosingCta, CmsRail } from '@/components/journal/cms-rail';
import { useT } from '@/lib/i18n';
import { home } from '@/routes';
import type { IndexingService } from '@/types/journal';

type Props = {
    title: string;
};

/**
 * Indexing and abstracting: each service from config('journal.indexing')
 * with a link to the journal's own record there, and the journal's
 * identifiers (ISSN, DOI prefix).
 */
export default function IndexingPage({ title }: Props) {
    const { t } = useT();
    const journal = usePage().props.journal;

    const describe = (service: IndexingService): ReactNode => {
        switch (service.key) {
            case 'doaj':
                return t(
                    'The journal’s record in the Directory of Open Access Journals.',
                );
            case 'ebsco':
                // Verbatim from the original site.
                return <span lang="en">{journal.ebscoStatement}.</span>;
            case 'crossref':
                return t(
                    'The DOIs (digital object identifiers) of the journal’s articles use the prefix {prefix}.',
                    { prefix: journal.doiPrefix },
                );
            default:
                return null;
        }
    };

    return (
        <>
            <Head title={title} />

            <CmsPageHeader
                crumbs={[
                    { label: t('Home'), href: home.url() },
                    { label: title },
                ]}
                eyebrow={t('About')}
                title={title}
                // Verbatim from the Editor's words.
                lead={journal.indexingStatement}
                leadLang="en"
            />

            <div className="page-wrap section-y">
                <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8 lg:gap-x-12">
                    <div className="flex min-w-0 flex-col gap-12 md:col-span-8">
                        <section
                            aria-labelledby="services-title"
                            className="flex flex-col gap-5"
                        >
                            <h2
                                id="services-title"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t('Where the journal is indexed')}
                            </h2>
                            <ul className="m-0 flex list-none flex-col gap-4 p-0">
                                {journal.indexing.map((service) => (
                                    <li
                                        key={service.key}
                                        className="flex flex-col gap-4 rounded-lg border border-line-card bg-white p-5 sm:flex-row sm:gap-6 sm:p-6"
                                    >
                                        <div className="flex h-14 w-full shrink-0 items-center justify-center rounded-md border border-line bg-white px-3 sm:w-44">
                                            {service.logo ? (
                                                <img
                                                    src={service.logo}
                                                    alt=""
                                                    loading="lazy"
                                                    className={`${service.key === 'ebsco' ? 'max-h-11' : 'max-h-9'} w-auto max-w-full mix-blend-multiply`}
                                                />
                                            ) : (
                                                <span className="font-sans text-h4 font-semibold tracking-[0.01em] text-ink">
                                                    {service.name}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex min-w-0 flex-col gap-2">
                                            <h3 className="m-0 font-serif text-h4 font-medium text-ink">
                                                {service.name}
                                                <span className="block font-sans text-ui font-normal text-ink-muted">
                                                    {service.label}
                                                </span>
                                            </h3>
                                            {describe(service) && (
                                                <p className="m-0 text-ui text-ink-soft">
                                                    {describe(service)}
                                                </p>
                                            )}
                                            <a
                                                href={service.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-u mt-1 self-start text-ui"
                                            >
                                                {service.key === 'crossref'
                                                    ? t('Search Crossref')
                                                    : t(
                                                          'View the journal’s record',
                                                      )}
                                                <span className="sr-only">
                                                    {' '}
                                                    ({service.name})
                                                </span>
                                            </a>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section
                            aria-labelledby="identifiers-title"
                            className="flex flex-col gap-5"
                        >
                            <h2
                                id="identifiers-title"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t('Identifiers')}
                            </h2>
                            <dl className="m-0 grid gap-4 sm:grid-cols-3">
                                <Identifier label={t('Print ISSN')}>
                                    <a
                                        href={`https://portal.issn.org/resource/ISSN/${journal.issnPrint}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {journal.issnPrint}
                                    </a>
                                </Identifier>
                                <Identifier label={t('Online ISSN')}>
                                    <a
                                        href={`https://portal.issn.org/resource/ISSN/${journal.issnOnline}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {journal.issnOnline}
                                    </a>
                                </Identifier>
                                <Identifier label={t('DOI prefix')}>
                                    {journal.doiPrefix}
                                </Identifier>
                            </dl>
                            <p className="m-0 max-w-[62ch] text-ui text-ink-soft">
                                {t(
                                    'Every article is free to read and download.',
                                )}{' '}
                                <Link href="/guidelines/open-access-policy">
                                    {t('Open access policy')}
                                </Link>
                            </p>
                        </section>
                    </div>

                    <aside
                        aria-label={t('Journal at a glance')}
                        className="md:col-span-4"
                    >
                        <CmsRail />
                    </aside>
                </div>
            </div>

            <ClosingCta />
        </>
    );
}

function Identifier({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1 rounded-lg border border-line-card bg-mist px-5 py-4">
            <dt className="text-meta text-ink-muted">{label}</dt>
            <dd className="m-0 font-serif text-h4 text-ink tabular-nums">
                {children}
            </dd>
        </div>
    );
}
