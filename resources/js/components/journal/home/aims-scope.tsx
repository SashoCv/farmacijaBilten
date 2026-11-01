import { Link } from '@inertiajs/react';
import { useT } from '@/lib/i18n';
import { search } from '@/routes';

/**
 * Subject areas, from the journal's aims and scope. Each one searches the
 * archive; the query stays in English, the language of the articles.
 */
export const topics = [
    'Pharmaceutics',
    'Pharmaceutical chemistry',
    'Pharmaceutical analysis',
    'Pharmaceutical technology',
    'Pharmacology',
    'Toxicology',
    'Clinical pharmacy',
    'Pharmacy practice',
    'Pharmacognosy',
    'Phytotherapy',
    'Biotechnology',
    'Immunology',
    'Nutrition',
    'Cosmetology',
    'Medicine',
    'Dental medicine',
];

export function AimsScope() {
    const { t } = useT();

    return (
        <section aria-labelledby="scope-title" className="bg-white">
            <div className="page-wrap grid gap-x-6 gap-y-6 py-10 md:py-12 lg:grid-cols-12">
                <div className="flex flex-col gap-3 lg:col-span-6">
                    <h2
                        id="scope-title"
                        className="m-0 font-serif text-[26px] leading-[1.2] font-medium md:text-h2"
                    >
                        {t('Aims and scope')}
                    </h2>
                    <p className="m-0 max-w-[70ch] text-body text-ink-soft">
                        {t(
                            'The Bulletin publishes original research articles, review papers, short communications, case studies and professional studies in basic and applied sciences: the pharmaceutical sciences and related fields of medicine, dental medicine and the life sciences.',
                        )}
                    </p>
                    <p className="m-0">
                        <Link
                            href="/guidelines/aims-and-scope"
                            className="link-u text-ui"
                        >
                            {t('Read the aims and scope')}
                            <span aria-hidden="true"> →</span>
                        </Link>
                    </p>
                </div>

                <nav aria-labelledby="topics-title" className="lg:col-span-6">
                    <h3 id="topics-title" className="eyebrow mb-1.5 lg:pt-3">
                        {t('Browse by topic')}
                    </h3>
                    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-0.5 p-0">
                        {topics.map((topic) => (
                            <li key={topic}>
                                <Link
                                    href={search.url({ query: { q: topic } })}
                                    className="inline-flex min-h-10 items-center text-ui font-medium text-brand underline decoration-underline underline-offset-4 hover:text-brand-dark hover:decoration-brand"
                                >
                                    {t(topic)}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            </div>
        </section>
    );
}
