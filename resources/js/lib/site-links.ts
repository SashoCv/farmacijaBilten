/**
 * Site navigation, shared by the header, the mobile menu and the footer.
 * Labels are English keys for t(); hrefs are site paths.
 */
export type SiteLink = { label: string; href: string };

export const submitHref = '/submit-your-paper';
export const contactHref = '/contact';
export const privacyHref = '/privacy';
export const accessibilityHref = '/accessibility';

/**
 * "For authors": every page under /guidelines. Instructions for authors
 * stays first; other components link to authorLinks[0].
 */
export const authorLinks: SiteLink[] = [
    {
        label: 'Instructions for authors',
        href: '/guidelines/instructions-for-authors',
    },
    { label: 'Aims and scope', href: '/guidelines/aims-and-scope' },
    { label: 'Editorial policies', href: '/guidelines/editorial-policies' },
    { label: 'Review policies', href: '/guidelines/review-policies' },
    { label: 'Open access policy', href: '/guidelines/open-access-policy' },
    {
        label: 'Article processing charges',
        href: '/guidelines/article-processing-charges',
    },
    { label: 'Forms and downloads', href: '/guidelines/downloads' },
];

/** "About": the journal, its people and its standing. */
export const aboutLinks: SiteLink[] = [
    { label: 'About the journal', href: '/about' },
    { label: 'Aims and scope', href: '/guidelines/aims-and-scope' },
    { label: 'Editorial board', href: '/editorial-board' },
    { label: 'Editor’s words', href: '/editorial' },
    { label: 'Peer review', href: '/guidelines/review-policies' },
    { label: 'Indexing and abstracting', href: '/indexing' },
    { label: 'Contact', href: contactHref },
];

/** Legal and accessibility pages, linked from the footer's bottom bar. */
export const legalLinks: SiteLink[] = [
    { label: 'Privacy', href: privacyHref },
    { label: 'Accessibility', href: accessibilityHref },
];

/** Strips the query and hash, and a trailing slash, for comparing paths. */
export function pathOf(url: string): string {
    const path = url.split(/[?#]/)[0].replace(/\/+$/, '');

    return path === '' ? '/' : path;
}

/** Whether `url` (the current page) is `href` or a page below it. */
export function isActiveHref(url: string, href: string): boolean {
    const current = pathOf(url);
    const target = pathOf(href);

    return current === target || current.startsWith(`${target}/`);
}
