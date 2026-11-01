import { Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import {
    CmsPageHeader,
    DraftNotice,
    EnglishOnlyNote,
} from '@/components/journal/cms-page-header';
import { PageToc } from '@/components/journal/page-toc';
import { useT } from '@/lib/i18n';
import { home } from '@/routes';

type Cookie = {
    name: string;
    purpose: 'session' | 'xsrf' | 'locale';
    /** Lifetime in minutes; null for a long-lived preference cookie. */
    minutes: number | null;
};

type Props = {
    title: string;
    cookies: Cookie[];
    /** Largest manuscript file accepted, in MB. */
    maxMb: number;
};

export type DocumentSection = {
    id: string;
    title: string;
    body: ReactNode;
};

/**
 * Layout of the legal pages (privacy, accessibility): a draft notice, the
 * numbered sections in a 70ch column and "On this page" in the rail. The
 * text is English until the editors approve and translate it.
 */
export function PolicyDocument({
    title,
    lead,
    draft,
    sections,
}: {
    title: string;
    lead: string;
    draft: string;
    sections: DocumentSection[];
}) {
    const { t } = useT();
    const toc = sections.map(({ id, title }) => ({ id, title }));

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
                lead={lead}
            >
                <EnglishOnlyNote />
                <DraftNotice>{draft}</DraftNotice>
            </CmsPageHeader>

            <div className="page-wrap section-y">
                <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-8 lg:gap-x-12">
                    <div className="flex min-w-0 flex-col gap-8 md:col-span-8">
                        <PageToc
                            items={toc}
                            variant="disclosure"
                            className="lg:hidden"
                        />
                        <article
                            lang="en"
                            className="prose-journal max-w-[70ch] [&_:is(h2,h3)+*]:mt-3 [&>:first-child]:mt-0"
                        >
                            {sections.map((section, index) => (
                                <section
                                    key={section.id}
                                    className="mt-10 first:mt-0"
                                >
                                    <h2
                                        id={section.id}
                                        className="mt-0 flex items-baseline gap-2.5"
                                    >
                                        <span
                                            aria-hidden="true"
                                            className="min-w-6 shrink-0 font-sans text-[0.8em] font-semibold text-brand tabular-nums"
                                        >
                                            {index + 1}.
                                        </span>
                                        <span>{section.title}</span>
                                    </h2>
                                    <div className="mt-3 [&>*+*]:mt-4">
                                        {section.body}
                                    </div>
                                </section>
                            ))}
                        </article>
                    </div>
                    <aside
                        aria-label={t('On this page')}
                        className="hidden md:col-span-4 lg:block"
                    >
                        <PageToc items={toc} variant="rail" />
                    </aside>
                </div>
            </div>
        </>
    );
}

/** Marks text the publisher still has to supply. */
export function ToConfirm({ children }: { children: ReactNode }) {
    return (
        <span className="rounded-sm bg-tint px-1.5 py-0.5 text-[0.92em] text-brand-dark">
            [{children}]
        </span>
    );
}

/**
 * Privacy notice (DRAFT until the editors approve it). Describes what the
 * site actually does: the submission form's fields, the three strictly
 * necessary cookies, no analytics. Retention and other facts only the
 * publisher can give are marked as to be confirmed.
 */
export default function PrivacyPage({ title, cookies, maxMb }: Props) {
    const { t } = useT();
    const journal = usePage().props.journal;
    const { publisher } = journal;

    const cookiePurpose: Record<Cookie['purpose'], string> = {
        session:
            'Keeps your session between pages, for example while you fill in the submission form.',
        xsrf: 'Protects forms against cross-site request forgery.',
        locale: 'Remembers the interface language you chose (English or Macedonian).',
    };

    const sections: DocumentSection[] = [
        {
            id: 'controller',
            title: 'Who is responsible for your data',
            body: (
                <>
                    <p>
                        The {journal.nameEn} is published by the{' '}
                        {publisher.nameEn} ({publisher.abbrev}), which is the
                        controller of the personal data processed through this
                        website.
                    </p>
                    <p>
                        {publisher.nameEn}, {publisher.address},{' '}
                        {journal.address.country}.
                        <br />
                        E-mail:{' '}
                        <a href={`mailto:${publisher.email}`}>
                            {publisher.email}
                        </a>
                    </p>
                    <p>
                        For questions about a manuscript, write to the editorial
                        office at{' '}
                        <a href={`mailto:${journal.editorialEmail}`}>
                            {journal.editorialEmail}
                        </a>
                        .
                    </p>
                </>
            ),
        },
        {
            id: 'submissions',
            title: 'What we collect when you submit a manuscript',
            body: (
                <>
                    <p>
                        The{' '}
                        <Link href="/submit-your-paper">submission form</Link>{' '}
                        asks for:
                    </p>
                    <ul>
                        <li>
                            the corresponding author’s name, e-mail address and
                            (optionally) affiliation;
                        </li>
                        <li>
                            the manuscript’s title, type and file (up to {maxMb}{' '}
                            MB), and the signed author forms;
                        </li>
                        <li>
                            optionally, the names and e-mail addresses of
                            suggested reviewers, and a message to the editor;
                        </li>
                        <li>
                            your confirmation that you have read this notice,
                            with the time you gave it.
                        </li>
                    </ul>
                    <p>
                        With each submission we also record the date and time
                        and the IP address it was sent from, to protect the form
                        against abuse.
                    </p>
                </>
            ),
        },
        {
            id: 'purpose',
            title: 'Why we use it',
            body: (
                <>
                    <p>
                        We use these data only to handle your manuscript: to
                        confirm receipt, to organise peer review, to correspond
                        with you about the editorial decision and, if the
                        manuscript is accepted, to publish it. The names and
                        affiliations of the authors of a published article are
                        published with it.
                    </p>
                    <p>
                        Suggested reviewers’ details are used only to invite
                        them to review the manuscript.
                    </p>
                </>
            ),
        },
        {
            id: 'recipients',
            title: 'Who can see it',
            body: (
                <p>
                    Submissions are delivered to the editorial office’s mailbox
                    and stored on the journal’s server. They are seen by the
                    editors and, for peer review, the manuscript is sent to
                    reviewers. We do not sell personal data or share it for
                    advertising.{' '}
                    <ToConfirm>
                        Hosting provider and e-mail service: to be confirmed by
                        the publisher
                    </ToConfirm>
                </p>
            ),
        },
        {
            id: 'retention',
            title: 'How long we keep it',
            body: (
                <p>
                    <ToConfirm>
                        Retention periods for accepted and rejected manuscripts:
                        to be confirmed by the publisher
                    </ToConfirm>
                </p>
            ),
        },
        {
            id: 'rights',
            title: 'Your rights',
            body: (
                <>
                    <p>
                        You can ask us for access to the personal data we hold
                        about you, and ask us to correct or delete it, to
                        restrict its use or to object to it. Write to{' '}
                        <a href={`mailto:${publisher.email}`}>
                            {publisher.email}
                        </a>
                        .
                    </p>
                    <p>
                        You also have the right to complain to the personal data
                        protection supervisory authority of North Macedonia.
                    </p>
                </>
            ),
        },
        {
            id: 'cookies',
            title: 'Cookies',
            body: (
                <>
                    <p>
                        This website uses only the cookies it needs to work. It
                        does not use analytics, advertising or tracking cookies,
                        so it does not ask for consent.
                    </p>
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Cookie</th>
                                <th scope="col">Purpose</th>
                                <th scope="col">Lifetime</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cookies.map((cookie) => (
                                <tr key={cookie.name}>
                                    <td>
                                        <code className="text-[0.92em]">
                                            {cookie.name}
                                        </code>
                                    </td>
                                    <td>{cookiePurpose[cookie.purpose]}</td>
                                    <td className="whitespace-nowrap">
                                        {cookie.minutes === null
                                            ? 'Until you change it'
                                            : cookie.minutes >= 60
                                              ? `${Math.round(cookie.minutes / 60)} hours`
                                              : `${cookie.minutes} minutes`}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            ),
        },
        {
            id: 'changes',
            title: 'Changes to this notice',
            body: (
                <p>
                    We will publish any change to this notice on this page.{' '}
                    <ToConfirm>Date of the approved version</ToConfirm>
                </p>
            ),
        },
    ];

    return (
        <PolicyDocument
            title={title}
            lead={t(
                'How the Macedonian Pharmaceutical Bulletin handles personal data and cookies.',
            )}
            draft={t(
                'This notice is a draft awaiting approval by the editors and the publisher. Details in brackets are still to be confirmed.',
            )}
            sections={sections}
        />
    );
}
