import { Link, usePage } from '@inertiajs/react';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { FooterBottomBar } from '@/components/journal/footer-bottom-bar';
import { LogoMark } from '@/components/journal/icons';
import { IndexingLogos } from '@/components/journal/indexing-logos';
import { useT } from '@/lib/i18n';
import {
    aboutLinks,
    authorLinks,
    contactHref,
    submitHref,
} from '@/lib/site-links';
import type { SiteLink } from '@/lib/site-links';
import { archive, earlyOnline, home, search } from '@/routes';
import { show as showIssue } from '@/routes/issues';

const linkClass =
    'text-footer-text no-underline transition-colors hover:text-white hover:underline hover:underline-offset-4';

/** Host name of a URL, for showing publisher websites ("mfd.org.mk"). */
function hostOf(url: string): string {
    return url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '');
}

/**
 * The one site footer, on every journal page: identity and identifiers,
 * four link columns, indexing, and the bottom bar with the developer credit.
 */
export function SiteFooter() {
    const { t, locale } = useT();
    const { journal, currentIssueSlug } = usePage().props;
    const headingId = useId();

    const name = locale === 'mk' ? journal.nameMk : journal.nameEn;
    const otherName = locale === 'mk' ? journal.nameEn : journal.nameMk;

    const journalLinks: SiteLink[] = [
        ...(currentIssueSlug
            ? [
                  {
                      label: 'Current issue',
                      href: showIssue.url(currentIssueSlug),
                  },
              ]
            : []),
        { label: 'Archive', href: archive.url() },
        { label: 'Early online', href: earlyOnline.url() },
        { label: 'Search', href: search.url() },
    ];

    return (
        <footer
            aria-labelledby={headingId}
            className="on-navy bg-navy-deep text-ui text-footer-text [--logo-bg:transparent] print:hidden"
        >
            <h2 id={headingId} className="sr-only">
                {t('Site footer')}
            </h2>

            {/* Tier 1 and 2: identity, then four link columns. */}
            <div className="page-wrap grid gap-12 pt-14 pb-12 md:pt-[72px] lg:grid-cols-12 lg:gap-8">
                <div className="flex flex-col gap-6 lg:col-span-4 lg:pr-6">
                    <Link
                        href={home()}
                        className="flex items-center gap-3.5 text-white no-underline hover:text-white"
                    >
                        <LogoMark className="size-11 shrink-0 text-white" />
                        <span className="flex flex-col gap-1">
                            <span
                                lang={locale}
                                className="font-serif text-h4 leading-tight font-semibold text-white"
                            >
                                {name}
                            </span>
                            <span
                                lang={locale === 'mk' ? 'en' : 'mk'}
                                className="text-eyebrow tracking-[0.06em] text-footer-text uppercase"
                            >
                                {otherName}
                            </span>
                        </span>
                    </Link>

                    <p className="m-0 max-w-[46ch]">
                        {t(
                            'Published by the Macedonian Pharmaceutical Association in cooperation with the Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.',
                        )}
                    </p>

                    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-5 gap-y-1.5 text-meta">
                        <dt className="text-footer-text">{t('Print ISSN')}</dt>
                        <dd className="m-0 font-semibold text-white tabular-nums">
                            {journal.issnPrint}
                        </dd>
                        <dt className="text-footer-text">{t('Online ISSN')}</dt>
                        <dd className="m-0 font-semibold text-white tabular-nums">
                            {journal.issnOnline}
                        </dd>
                        <dt className="text-footer-text">{t('DOI prefix')}</dt>
                        <dd className="m-0 font-semibold text-white tabular-nums">
                            {journal.doiPrefix}
                        </dd>
                    </dl>

                    <ul className="m-0 flex list-none flex-wrap gap-x-5 gap-y-1 p-0 text-meta">
                        {[journal.publisher.url, journal.coPublisher.url].map(
                            (url) => (
                                <li key={url}>
                                    <a
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={linkClass}
                                    >
                                        {hostOf(url)}
                                    </a>
                                </li>
                            ),
                        )}
                    </ul>
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 lg:col-span-8">
                    <FooterColumn title={t('Journal')}>
                        {journalLinks.map((link) => (
                            <FooterLink key={link.href} link={link} />
                        ))}
                    </FooterColumn>
                    <FooterColumn title={t('For authors')}>
                        <FooterLink
                            link={{
                                label: 'Submit manuscript',
                                href: submitHref,
                            }}
                        />
                        {authorLinks.map((link) => (
                            <FooterLink key={link.href} link={link} />
                        ))}
                    </FooterColumn>
                    <FooterColumn title={t('About')}>
                        {aboutLinks
                            .filter((link) => link.href !== contactHref)
                            .map((link) => (
                                <FooterLink
                                    key={`${link.href}-${link.label}`}
                                    link={link}
                                />
                            ))}
                    </FooterColumn>
                    <FooterColumn title={t('Contact')} list={false}>
                        <address className="flex flex-col gap-1 not-italic">
                            <span className="text-white">
                                {t('Editorial office')}
                            </span>
                            <span>
                                {t(
                                    'Faculty of Pharmacy, Ss. Cyril and Methodius University',
                                )}
                            </span>
                            <span>
                                {t(journal.address.city)},{' '}
                                {t(journal.address.country)}
                            </span>
                            <a
                                href={`mailto:${journal.editorialEmail}`}
                                className={`${linkClass} mt-2 [overflow-wrap:anywhere]`}
                            >
                                {journal.editorialEmail}
                            </a>
                        </address>
                        <Link
                            href={contactHref}
                            className="mt-4 inline-flex text-white underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white"
                        >
                            {t('All contact details')}
                        </Link>
                    </FooterColumn>
                </div>
            </div>

            {/* Tier 3: indexing. */}
            <div className="page-wrap">
                <div className="flex flex-col gap-4 border-t border-white/10 py-8 md:flex-row md:items-center md:gap-8">
                    <p className="m-0 text-eyebrow font-semibold tracking-[0.08em] text-white uppercase">
                        {t('Indexed in')}
                    </p>
                    <IndexingLogos variant="dark" />
                    <p className="m-0 text-meta md:ml-auto md:text-right">
                        {t('Open access')} · {t('Free to read and download')}
                    </p>
                </div>
            </div>

            <FooterBottomBar />
        </footer>
    );
}

function FooterColumn({
    title,
    list = true,
    children,
}: {
    title: string;
    list?: boolean;
    children: ReactNode;
}) {
    const id = useId();
    const Wrapper = list ? 'nav' : 'div';

    return (
        <Wrapper aria-labelledby={id} className="flex min-w-0 flex-col">
            <h3
                id={id}
                className="m-0 mb-4 text-eyebrow font-semibold tracking-[0.08em] text-white uppercase"
            >
                {title}
            </h3>
            {list ? (
                <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {children}
                </ul>
            ) : (
                children
            )}
        </Wrapper>
    );
}

function FooterLink({ link }: { link: SiteLink }) {
    const { t } = useT();

    return (
        <li>
            <Link href={link.href} className={linkClass}>
                {t(link.label)}
            </Link>
        </li>
    );
}
