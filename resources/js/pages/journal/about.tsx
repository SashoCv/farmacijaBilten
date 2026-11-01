import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { CmsPageHeader } from '@/components/journal/cms-page-header';
import { ClosingCta, LinkCards } from '@/components/journal/cms-rail';
import { IndexingLogos } from '@/components/journal/indexing-logos';
import { useT } from '@/lib/i18n';
import { archive as archiveRoute, home, indexing } from '@/routes';

type Props = {
    title: string;
    /** Range of the online archive (published issues). */
    archive: {
        firstVolume: number | null;
        firstYear: number | null;
        lastVolume: number | null;
        lastYear: number | null;
        issues: number;
        articles: number;
    };
};

const LANGUAGE_NAMES: Record<string, string> = {
    en: 'English',
    mk: 'Macedonian',
};

/**
 * About the journal: a fact sheet built from config('journal.*') and the
 * archive, then links to the pages that describe the journal's policies.
 * Facts the editors have not stated (null in config) are left out.
 */
export default function AboutPage({ title, archive }: Props) {
    const { t, locale } = useT();
    const journal = usePage().props.journal;
    // Thousands separator by hand, so the server and the browser agree.
    const number = (n: number) =>
        String(n).replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'mk' ? '.' : ',');

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
                lead={t(
                    'An international, peer-reviewed, open-access journal of the Macedonian Pharmaceutical Association, published in cooperation with the Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.',
                )}
            />

            <div className="page-wrap section-y">
                <div className="grid gap-y-12 md:grid-cols-12 md:gap-x-8 lg:gap-x-12">
                    <div className="flex min-w-0 flex-col gap-12 md:col-span-8 md:gap-16">
                        <section
                            aria-labelledby="facts-title"
                            className="flex flex-col gap-5"
                        >
                            <h2
                                id="facts-title"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t('Journal facts')}
                            </h2>
                            <dl className="m-0 flex flex-col rounded-lg border border-line-card bg-white px-5 sm:px-6">
                                <Fact label={t('Title')}>
                                    <span lang="en">{journal.nameEn}</span>
                                </Fact>
                                <Fact label={t('Title in Macedonian')}>
                                    <span lang="mk">{journal.nameMk}</span>
                                </Fact>
                                <Fact label={t('Abbreviation')}>
                                    <span lang="en">{journal.abbrev}</span>
                                </Fact>
                                <Fact label={t('Publisher')}>
                                    <a
                                        href={journal.publisher.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {locale === 'mk'
                                            ? journal.publisher.nameMk
                                            : journal.publisher.nameEn}
                                    </a>
                                </Fact>
                                <Fact label={t('In cooperation with')}>
                                    <a
                                        href={journal.coPublisher.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {locale === 'mk'
                                            ? journal.coPublisher.nameMk
                                            : journal.coPublisher.nameEn}
                                    </a>
                                </Fact>
                                <Fact label={t('Print ISSN')}>
                                    <span className="tabular-nums">
                                        {journal.issnPrint}
                                    </span>
                                </Fact>
                                <Fact label={t('Online ISSN')}>
                                    <span className="tabular-nums">
                                        {journal.issnOnline}
                                    </span>
                                </Fact>
                                <Fact label={t('DOI prefix')}>
                                    <span className="tabular-nums">
                                        {journal.doiPrefix}
                                    </span>
                                </Fact>
                                {journal.foundedYear && (
                                    <Fact label={t('Founded')}>
                                        <span className="tabular-nums">
                                            {journal.foundedYear}
                                        </span>
                                    </Fact>
                                )}
                                {journal.frequency && (
                                    <Fact label={t('Frequency')}>
                                        {t(journal.frequency)}
                                    </Fact>
                                )}
                                {archive.firstVolume !== null && (
                                    <Fact label={t('Online archive')}>
                                        <Link href={archiveRoute.url()}>
                                            {t(
                                                'Volume {first} ({firstYear}) to Volume {last} ({lastYear})',
                                                {
                                                    first: archive.firstVolume,
                                                    firstYear:
                                                        archive.firstYear ?? '',
                                                    last:
                                                        archive.lastVolume ??
                                                        '',
                                                    lastYear:
                                                        archive.lastYear ?? '',
                                                },
                                            )}
                                        </Link>
                                        <span className="mt-0.5 block text-meta text-ink-muted tabular-nums">
                                            {t(
                                                '{issues} issues and supplements, {articles} articles',
                                                {
                                                    issues: number(
                                                        archive.issues,
                                                    ),
                                                    articles: number(
                                                        archive.articles,
                                                    ),
                                                },
                                            )}
                                        </span>
                                    </Fact>
                                )}
                                <Fact label={t('Languages')}>
                                    {journal.languages
                                        .map((l) => t(LANGUAGE_NAMES[l] ?? l))
                                        .join(', ')}
                                    <span className="mt-0.5 block text-meta text-ink-muted">
                                        {t(
                                            'Research papers in English; professional papers may also be in Macedonian.',
                                        )}
                                    </span>
                                </Fact>
                                {journal.openAccess && (
                                    <Fact label={t('Access')}>
                                        <Link href="/guidelines/open-access-policy">
                                            {t('Open access')}
                                        </Link>
                                    </Fact>
                                )}
                                <Fact label={t('Licence')}>
                                    <a
                                        href={journal.licence.url}
                                        target="_blank"
                                        rel="license noopener noreferrer"
                                    >
                                        {journal.licence.name}
                                    </a>
                                </Fact>
                                {journal.apc && (
                                    <Fact
                                        label={t('Article processing charge')}
                                    >
                                        <Link href="/guidelines/article-processing-charges">
                                            <span className="tabular-nums">
                                                {journal.apc.amount}{' '}
                                                {journal.apc.currency}
                                            </span>
                                            {journal.apc.charged && (
                                                <>, {t(journal.apc.charged)}</>
                                            )}
                                        </Link>
                                    </Fact>
                                )}
                                {journal.reviewModel && (
                                    <Fact label={t('Peer review')}>
                                        <Link href="/guidelines/review-policies">
                                            {t(journal.reviewModel)}
                                        </Link>
                                    </Fact>
                                )}
                                <Fact
                                    label={t(journal.editor.role ?? 'Editor')}
                                >
                                    <Link href="/editorial" lang="en">
                                        {[
                                            journal.editor.title,
                                            journal.editor.name,
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                    </Link>
                                </Fact>
                                <Fact label={t('Indexed in')}>
                                    <IndexingLogos />
                                    <Link
                                        href={indexing.url()}
                                        className="mt-2 inline-block text-ui"
                                    >
                                        {t('Indexing and abstracting')}
                                    </Link>
                                </Fact>
                            </dl>
                        </section>

                        <section
                            aria-labelledby="explore-title"
                            className="flex flex-col gap-5"
                        >
                            <h2
                                id="explore-title"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t('Policies and people')}
                            </h2>
                            <LinkCards
                                items={[
                                    {
                                        href: '/guidelines/aims-and-scope',
                                        title: t('Aims and scope'),
                                        description: t(
                                            'The fields the journal covers and the types of paper it publishes.',
                                        ),
                                    },
                                    {
                                        href: '/editorial-board',
                                        title: t('Editorial board'),
                                        description: t(
                                            'The editors and the international editorial board of the Macedonian Pharmaceutical Bulletin.',
                                        ),
                                    },
                                    {
                                        href: '/guidelines/review-policies',
                                        title: t('Peer review'),
                                        description: t(
                                            'How manuscripts are handled, from submission to decision.',
                                        ),
                                    },
                                    {
                                        href: '/guidelines/editorial-policies',
                                        title: t('Publication ethics'),
                                        description: t(
                                            'Publication ethics: the duties of authors, editors and reviewers.',
                                        ),
                                    },
                                    {
                                        href: '/guidelines/open-access-policy',
                                        title: t('Open access'),
                                        description: t(
                                            'How published articles can be read and re-used.',
                                        ),
                                    },
                                    {
                                        href: '/contact',
                                        title: t('Contact'),
                                        description: t(
                                            'How to reach the editorial office and the publisher.',
                                        ),
                                    },
                                ]}
                            />
                        </section>
                    </div>

                    <aside
                        aria-label={t('The printed journal')}
                        className="md:col-span-4"
                    >
                        <div className="flex flex-col gap-6 lg:sticky lg:top-[88px]">
                            <figure className="m-0 flex flex-col gap-4 rounded-lg border border-line-card bg-mist p-6">
                                <img
                                    src="/media/images/naslovna.jpg"
                                    alt={t(
                                        'Cover of the printed Macedonian Pharmaceutical Bulletin',
                                    )}
                                    width={303}
                                    height={426}
                                    loading="lazy"
                                    className="mx-auto h-auto w-full max-w-[220px] rounded-sm border border-line shadow-[0_1px_2px_rgba(22,38,77,0.08)]"
                                />
                                <figcaption className="text-center text-meta text-ink-muted">
                                    {t('The printed journal')}
                                </figcaption>
                            </figure>
                            <div className="flex flex-col gap-3 rounded-lg border border-line-card bg-white p-5">
                                <p className="eyebrow">
                                    {t('Read the journal')}
                                </p>
                                <Link
                                    href="/editorial"
                                    className="link-u self-start text-ui"
                                >
                                    {t('Editor’s words')}
                                </Link>
                                <Link
                                    href={archiveRoute.url()}
                                    className="link-u self-start text-ui"
                                >
                                    {t('Browse the full archive')}
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>

            <ClosingCta />
        </>
    );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-x-6 gap-y-0.5 border-t border-line py-3.5 first:border-t-0 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <dt className="text-meta leading-[1.75] text-ink-muted">{label}</dt>
            <dd className="m-0 min-w-0 text-ui [overflow-wrap:anywhere] text-ink">
                {children}
            </dd>
        </div>
    );
}
