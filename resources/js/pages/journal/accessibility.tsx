import { Link, usePage } from '@inertiajs/react';
import { useT } from '@/lib/i18n';
import { PolicyDocument, ToConfirm } from './privacy';
import type { DocumentSection } from './privacy';

type Props = {
    title: string;
};

/**
 * Accessibility statement (DRAFT until the editors approve it): the target
 * standard, what the site does, the known limitations of the archive, and
 * how to ask for an accessible format.
 */
export default function AccessibilityPage({ title }: Props) {
    const { t } = useT();
    const journal = usePage().props.journal;
    const email = journal.editorialEmail;

    const sections: DocumentSection[] = [
        {
            id: 'commitment',
            title: 'Our aim',
            body: (
                <p>
                    The {journal.nameEn} wants its website and its articles to
                    be usable by everyone, including people who use a screen
                    reader, keyboard navigation, magnification or other
                    assistive technology. The website is designed to meet the{' '}
                    <a
                        href="https://www.w3.org/TR/WCAG21/"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Web Content Accessibility Guidelines (WCAG) 2.1
                    </a>{' '}
                    at level AA.
                </p>
            ),
        },
        {
            id: 'measures',
            title: 'What the website does',
            body: (
                <ul>
                    <li>
                        Pages use real headings, landmarks and lists, and every
                        page starts with a “Skip to content” link.
                    </li>
                    <li>
                        Everything can be reached and used with a keyboard, with
                        a visible focus outline.
                    </li>
                    <li>
                        Text and controls are designed to meet the WCAG AA
                        contrast ratios.
                    </li>
                    <li>
                        The language of each piece of content (English or
                        Macedonian) is marked, so screen readers pronounce it
                        correctly.
                    </li>
                    <li>
                        Pages reflow to a single column on small screens and
                        when text is enlarged.
                    </li>
                    <li>
                        Every article has an HTML page with its title, authors
                        and, where available, abstract and keywords, in addition
                        to the PDF.
                    </li>
                </ul>
            ),
        },
        {
            id: 'limitations',
            title: 'Known limitations',
            body: (
                <ul>
                    <li>
                        Many article PDFs, especially from older volumes, were
                        produced for print. They may not be tagged for screen
                        readers, and some older PDFs are scans without a text
                        layer.
                    </li>
                    <li>
                        Text imported from the journal’s previous website, and
                        abstracts extracted from older PDFs, may contain
                        formatting or transcription errors.
                    </li>
                    <li>
                        Links to other services (for example DOAJ, EBSCO and
                        Crossref) lead to websites we do not control.
                    </li>
                </ul>
            ),
        },
        {
            id: 'formats',
            title: 'Asking for an accessible format',
            body: (
                <p>
                    If you cannot read an article or a page, write to the
                    editorial office at <a href={`mailto:${email}`}>{email}</a>{' '}
                    with the address of the page or the article’s title, and
                    tell us the format you need. We will try to provide it.{' '}
                    <ToConfirm>Expected response time</ToConfirm>
                </p>
            ),
        },
        {
            id: 'feedback',
            title: 'Feedback',
            body: (
                <p>
                    Please tell us about any accessibility problem you find on
                    this website at <a href={`mailto:${email}`}>{email}</a> or
                    through the <Link href="/contact">contact page</Link>.
                </p>
            ),
        },
        {
            id: 'status',
            title: 'About this statement',
            body: (
                <p>
                    This statement was prepared with the redesign of the website
                    and has not yet been reviewed by an independent audit.{' '}
                    <ToConfirm>Date of the approved version</ToConfirm>
                </p>
            ),
        },
    ];

    return (
        <PolicyDocument
            title={title}
            lead={t(
                'How accessible this website is, what we know is not yet accessible, and how to ask for another format.',
            )}
            draft={t(
                'This statement is a draft awaiting approval by the editors. Details in brackets are still to be confirmed.',
            )}
            sections={sections}
        />
    );
}
