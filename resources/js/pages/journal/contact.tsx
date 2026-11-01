import { Head, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { toast } from 'sonner';
import { CmsPageHeader } from '@/components/journal/cms-page-header';
import { CmsRail, LinkCards } from '@/components/journal/cms-rail';
import { CopyIcon } from '@/components/journal/icons';
import { useT } from '@/lib/i18n';
import { authorLinks, submitHref } from '@/lib/site-links';
import { home } from '@/routes';

type Props = {
    /** Page title in the reader's language. */
    title: string;
    /** Titles of the imported contact page (its text is not used). */
    page?: { path: string; title: string; titleMk: string | null } | null;
};

/**
 * Contact: the editorial office and the publisher, from config('journal.*')
 * (the one place the street address is kept), with quick actions for authors.
 */
export default function ContactPage({ title }: Props) {
    const { t, locale } = useT();
    const journal = usePage().props.journal;
    const { address, publisher, coPublisher } = journal;

    const journalName = locale === 'mk' ? journal.nameMk : journal.nameEn;
    const publisherName = locale === 'mk' ? publisher.nameMk : publisher.nameEn;
    const coPublisherName =
        locale === 'mk' ? coPublisher.nameMk : coPublisher.nameEn;
    const officeLine = [
        address.street,
        `${address.postalCode} ${address.city}`,
        address.country,
    ].join(', ');
    const mapUrl = `https://www.openstreetmap.org/search?query=${encodeURIComponent(officeLine)}`;

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
                    'Questions about a manuscript, peer review or a published article? Write to the editorial office.',
                )}
            />

            <div className="page-wrap section-y">
                <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8 lg:gap-x-12">
                    <div className="flex min-w-0 flex-col gap-12 md:col-span-8">
                        <div className="grid gap-4 lg:grid-cols-2">
                            <ContactCard
                                eyebrow={t('Editorial office')}
                                title={journalName}
                            >
                                <address
                                    lang="en"
                                    className="flex flex-col text-ui text-ink-soft not-italic"
                                >
                                    <span>{address.organisation}</span>
                                    <span>{address.street}</span>
                                    <span>
                                        {address.postalCode} {address.city}
                                    </span>
                                    <span>{address.country}</span>
                                </address>
                                <dl className="m-0 flex flex-col gap-2 border-t border-line pt-4 text-ui">
                                    <ContactRow label={t('E-mail')}>
                                        <EmailWithCopy
                                            email={journal.editorialEmail}
                                        />
                                    </ContactRow>
                                    {journal.phone && (
                                        <ContactRow label={t('Phone')}>
                                            <a
                                                href={`tel:${journal.phone.replace(/[^+\d]/g, '')}`}
                                            >
                                                {journal.phone}
                                            </a>
                                        </ContactRow>
                                    )}
                                </dl>
                                <a
                                    href={mapUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="link-u mt-auto self-start text-ui"
                                >
                                    {t('Open in OpenStreetMap')}
                                    <span className="sr-only">
                                        {' '}
                                        ({t('external site')})
                                    </span>
                                </a>
                            </ContactCard>

                            <ContactCard
                                eyebrow={t('Publisher')}
                                title={publisherName}
                            >
                                <address
                                    lang="en"
                                    className="flex flex-col text-ui text-ink-soft not-italic"
                                >
                                    <span>{publisher.address}</span>
                                    <span>{address.country}</span>
                                </address>
                                <dl className="m-0 flex flex-col gap-2 border-t border-line pt-4 text-ui">
                                    <ContactRow label={t('E-mail')}>
                                        <a href={`mailto:${publisher.email}`}>
                                            {publisher.email}
                                        </a>
                                    </ContactRow>
                                    <ContactRow label={t('Website')}>
                                        <a
                                            href={publisher.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            {host(publisher.url)}
                                        </a>
                                    </ContactRow>
                                </dl>
                                <div className="mt-auto flex flex-col gap-1 border-t border-line pt-4">
                                    <p className="m-0 text-meta text-ink-muted">
                                        {t('In cooperation with')}
                                    </p>
                                    <p className="m-0 text-ui text-ink">
                                        {coPublisherName}
                                    </p>
                                    <a
                                        href={coPublisher.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="self-start text-ui"
                                    >
                                        {host(coPublisher.url)}
                                    </a>
                                </div>
                            </ContactCard>
                        </div>

                        <section
                            aria-labelledby="authors-title"
                            className="flex flex-col gap-5"
                        >
                            <h2
                                id="authors-title"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t('For authors')}
                            </h2>
                            <LinkCards
                                compact
                                className="lg:grid-cols-3"
                                items={[
                                    {
                                        href: submitHref,
                                        title: t('Submit a manuscript'),
                                        description: t(
                                            'Send your manuscript to the editorial office through the online form.',
                                        ),
                                    },
                                    {
                                        href: authorLinks[0].href,
                                        title: t('Instructions for authors'),
                                        description: t(
                                            'Manuscript structure, formatting and reference style.',
                                        ),
                                    },
                                    {
                                        href: '/guidelines/downloads',
                                        title: t('Forms and downloads'),
                                        description: t(
                                            'Author disclosure and ethical responsibility forms.',
                                        ),
                                    },
                                ]}
                            />
                        </section>
                    </div>

                    <aside
                        aria-label={t('Journal at a glance')}
                        className="md:col-span-4"
                    >
                        <CmsRail showSubmit={false} />
                    </aside>
                </div>
            </div>
        </>
    );
}

function ContactCard({
    eyebrow,
    title,
    children,
}: {
    eyebrow: string;
    title: string;
    children: ReactNode;
}) {
    return (
        <section className="flex flex-col gap-4 rounded-lg border border-line-card bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-1.5">
                <p className="eyebrow">{eyebrow}</p>
                <h2 className="m-0 font-serif text-h4 font-medium text-ink">
                    {title}
                </h2>
            </div>
            {children}
        </section>
    );
}

function ContactRow({
    label,
    children,
}: {
    label: string;
    children: ReactNode;
}) {
    return (
        <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-x-3">
            <dt className="text-meta text-ink-muted">{label}</dt>
            <dd className="m-0 min-w-0 [overflow-wrap:anywhere]">{children}</dd>
        </div>
    );
}

function EmailWithCopy({ email }: { email: string }) {
    const { t } = useT();

    const copy = () => {
        navigator.clipboard
            ?.writeText(email)
            .then(() => toast.success(t('E-mail address copied')))
            .catch(() =>
                toast.error(
                    t('Could not copy. Select the text and copy it manually.'),
                ),
            );
    };

    return (
        <span className="flex flex-wrap items-center gap-x-2">
            <a href={`mailto:${email}`}>{email}</a>
            <button
                type="button"
                onClick={copy}
                className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-ink-muted hover:bg-mist hover:text-brand"
                aria-label={t('Copy e-mail address')}
                title={t('Copy e-mail address')}
            >
                <CopyIcon />
            </button>
        </span>
    );
}

function host(url: string): string {
    try {
        return new URL(url).host.replace(/^www\./, '');
    } catch {
        return url;
    }
}
