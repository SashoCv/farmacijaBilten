import { Head, Link, usePage } from '@inertiajs/react';
import { ChevronRight } from '@/components/journal/icons';
import { SearchForm } from '@/components/journal/search-form';
import { useT } from '@/lib/i18n';
import { authorLinks, contactHref } from '@/lib/site-links';
import { archive } from '@/routes';

type Props = {
    status: number;
    /** Set on a 404 for /issues/… and /articles/… addresses. */
    context?: 'issue' | 'article' | null;
};

type Copy = { title: string; body: string };

/** English keys for t(); one heading and one sentence per case. */
function copyFor(status: number, context: Props['context']): Copy {
    if (context === 'issue') {
        return {
            title: 'This issue does not exist',
            body: 'There is no issue of the journal at this address. The archive lists every published volume and issue.',
        };
    }

    if (context === 'article') {
        return {
            title: 'This article does not exist',
            body: 'There is no article at this address. Find it through its issue in the archive, or search by title or author.',
        };
    }

    switch (status) {
        case 403:
            return {
                title: 'Access denied',
                body: 'You do not have permission to view this page.',
            };
        case 410:
            return {
                title: 'This page has been removed',
                body: 'The page you are looking for is no longer available. Try searching the journal, or use one of the links below.',
            };
        case 419:
            return {
                title: 'Page expired',
                body: 'The page was open for too long and its security token expired. Reload the page and try again.',
            };
        case 429:
            return {
                title: 'Too many requests',
                body: 'You have made too many requests in a short time. Please wait a minute and try again.',
            };
        case 503:
            return {
                title: 'Service unavailable',
                body: 'The journal website is temporarily unavailable. Please try again shortly.',
            };
        case 500:
            return {
                title: 'Something went wrong',
                body: 'An unexpected error occurred on our side. Please try again in a few minutes.',
            };
        default:
            return {
                title: 'Page not found',
                body: 'The page may have moved, or the address may be mistyped. Try searching the journal, or use one of the links below.',
            };
    }
}

/**
 * Branded error page (rendered by App\Http\ErrorPage for 403, 404, 410, 419,
 * 429, 500 and 503, with the status code kept).
 */
export default function ErrorPage({ status, context = null }: Props) {
    const { t } = useT();
    const page = usePage();
    const { currentIssueSlug } = page.props;

    const copy = copyFor(status, context);
    const title = t(copy.title);
    const notFound = status === 404 || status === 410;
    const retry = [419, 429, 500, 503].includes(status);

    const links = [
        ...(currentIssueSlug
            ? [
                  {
                      label: t('Current issue'),
                      hint: t('The latest table of contents'),
                      href: `/issues/${currentIssueSlug}`,
                  },
              ]
            : []),
        {
            label: t('Archive'),
            hint: t('All published volumes and issues'),
            href: archive.url(),
        },
        {
            label: t(authorLinks[0].label),
            hint: t('Preparing and submitting a manuscript'),
            href: authorLinks[0].href,
        },
        {
            label: t('Contact'),
            hint: t('The editorial office'),
            href: contactHref,
        },
    ];

    return (
        <>
            <Head title={title}>
                <meta name="robots" content="noindex,follow" />
            </Head>

            <div className="page-wrap section-y">
                <div className="grid gap-12 lg:grid-cols-12 lg:gap-6">
                    <div className="lg:col-span-7">
                        <p className="eyebrow">
                            {t('Error {status}', { status })}
                        </p>
                        <h1 className="mt-3 mb-0 font-serif text-display font-medium text-balance text-ink">
                            {title}
                        </h1>
                        <p className="mt-5 mb-0 max-w-[60ch] text-body text-ink-soft">
                            {t(copy.body)}
                        </p>

                        {context !== null && (
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href={archive.url()}
                                    className="btn-primary"
                                >
                                    {t('Browse the archive')}
                                </Link>
                            </div>
                        )}

                        {retry && (
                            <div className="mt-8 flex flex-wrap gap-3">
                                <a href={page.url} className="btn-primary">
                                    {t('Try again')}
                                </a>
                            </div>
                        )}

                        {(notFound || status === 403) && (
                            <SearchForm
                                id="error-search"
                                label={t('Search the journal')}
                                placeholder={t('Title, author or keyword')}
                                size="md"
                                className="mt-10 max-w-[600px]"
                            />
                        )}
                    </div>

                    <nav
                        aria-labelledby="error-links-title"
                        className="lg:col-span-4 lg:col-start-9 lg:pt-8"
                    >
                        <h2
                            id="error-links-title"
                            className="m-0 font-sans text-eyebrow font-semibold tracking-[0.08em] text-ink-muted uppercase"
                        >
                            {t('Useful pages')}
                        </h2>
                        <ul className="mt-3 mb-0 list-none border-t border-line p-0">
                            {links.map((link) => (
                                <li
                                    key={link.href}
                                    className="border-b border-line"
                                >
                                    <Link
                                        href={link.href}
                                        className="group flex min-h-11 items-center justify-between gap-4 py-3.5 no-underline"
                                    >
                                        <span className="flex flex-col">
                                            <span className="text-ui font-semibold text-ink group-hover:text-brand">
                                                {link.label}
                                            </span>
                                            <span className="text-meta text-ink-muted">
                                                {link.hint}
                                            </span>
                                        </span>
                                        <ChevronRight className="shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>
            </div>
        </>
    );
}
