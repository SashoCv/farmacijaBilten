import { Head, Link, usePage } from '@inertiajs/react';
import { CmsPageHeader } from '@/components/journal/cms-page-header';
import { ClosingCta, CmsRail, LinkCards } from '@/components/journal/cms-rail';
import { localTitle } from '@/components/journal/section-nav';
import type { SectionData } from '@/components/journal/section-nav';
import { useT } from '@/lib/i18n';
import { submitHref } from '@/lib/site-links';
import { home } from '@/routes';
import type { CmsPageData } from './page';

type Child = {
    path: string;
    title: string;
    titleMk: string | null;
    summary: string | null;
};

type Props = {
    page: CmsPageData;
    section: SectionData | null;
    /** Every page under /guidelines, in menu order. */
    children: Child[];
};

/**
 * "For authors" hub: the path from manuscript to publication, then every
 * guideline page as a card, with the key facts in the rail.
 */
export default function GuidelinesPage({ page, children }: Props) {
    const { t, locale } = useT();
    const { reviewModel } = usePage().props.journal;
    const title = localTitle(page, locale);

    const steps = [
        {
            title: t('Prepare'),
            text: t(
                'Follow the instructions for authors: structure, formatting and reference style.',
            ),
            href: '/guidelines/instructions-for-authors',
            link: t('Instructions for authors'),
        },
        {
            title: t('Sign the forms'),
            text: t('Author disclosure and ethical responsibility forms.'),
            href: '/guidelines/downloads',
            link: t('Forms and downloads'),
        },
        {
            title: t('Submit'),
            text: t(
                'Send the manuscript and the signed forms through the online form.',
            ),
            href: submitHref,
            link: t('Submit manuscript'),
        },
        {
            title: t('Peer review'),
            text: reviewModel
                ? t(
                      '{model}: referees remain anonymous throughout the process.',
                      {
                          model: t(reviewModel),
                      },
                  )
                : t('Referees remain anonymous throughout the process.'),
            href: '/guidelines/review-policies',
            link: t('Review policies'),
        },
        {
            title: t('Publication'),
            text: t(
                'Accepted articles are published open access, online ahead of the issue.',
            ),
            href: '/guidelines/open-access-policy',
            link: t('Open access policy'),
        },
    ];

    return (
        <>
            <Head title={title} />

            <CmsPageHeader
                crumbs={[
                    { label: t('Home'), href: home.url() },
                    { label: title },
                ]}
                title={title}
                lead={page.summary ? t(page.summary) : undefined}
            />

            <div className="page-wrap flex flex-col gap-12 section-y md:gap-16">
                <section
                    aria-labelledby="steps-title"
                    className="flex flex-col gap-6"
                >
                    <h2
                        id="steps-title"
                        className="m-0 font-serif text-h3 font-medium text-ink"
                    >
                        {t('From manuscript to publication')}
                    </h2>
                    <ol className="m-0 grid list-none gap-0 p-0 md:grid-cols-5 md:gap-4">
                        {steps.map((step, index) => (
                            <li
                                key={step.href}
                                className="relative flex gap-4 pb-6 last:pb-0 md:flex-col md:gap-3 md:pb-0"
                            >
                                {/* Connector: vertical on mobile, horizontal from md. */}
                                {index < steps.length - 1 && (
                                    <span
                                        aria-hidden="true"
                                        className="absolute top-10 bottom-0 left-[19px] w-px bg-line-strong md:top-[19px] md:right-[-16px] md:bottom-auto md:left-12 md:h-px md:w-auto"
                                    />
                                )}
                                <span
                                    aria-hidden="true"
                                    className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full border border-brand bg-white font-sans text-ui font-semibold text-brand tabular-nums"
                                >
                                    {index + 1}
                                </span>
                                <div className="flex min-w-0 flex-col gap-1.5">
                                    <h3 className="m-0 font-sans text-[17px] font-semibold text-ink">
                                        <span className="sr-only">
                                            {t('Step {number}', {
                                                number: index + 1,
                                            })}
                                            :{' '}
                                        </span>
                                        {step.title}
                                    </h3>
                                    <p className="m-0 text-ui text-ink-soft">
                                        {step.text}
                                    </p>
                                    <Link
                                        href={step.href}
                                        className="link-u mt-1 self-start text-ui"
                                    >
                                        {step.link}
                                    </Link>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <div className="grid gap-y-10 md:grid-cols-12 md:gap-x-8 lg:gap-x-12">
                    <section
                        aria-labelledby="guidelines-title"
                        className="flex flex-col gap-6 md:col-span-8"
                    >
                        <h2
                            id="guidelines-title"
                            className="m-0 font-serif text-h3 font-medium text-ink"
                        >
                            {t('Guidelines and policies')}
                        </h2>
                        <LinkCards
                            items={children.map((child) => ({
                                href: `/${child.path}`,
                                title: localTitle(child, locale),
                                description: child.summary
                                    ? t(child.summary)
                                    : null,
                            }))}
                        />
                    </section>
                    <aside
                        aria-label={t('Key facts')}
                        className="md:col-span-4"
                    >
                        <CmsRail showSubmit={false} />
                    </aside>
                </div>
            </div>

            <ClosingCta />
        </>
    );
}
