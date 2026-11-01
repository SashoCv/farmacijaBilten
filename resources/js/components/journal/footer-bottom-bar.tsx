import { Link, usePage } from '@inertiajs/react';
import { useT } from '@/lib/i18n';
import { legalLinks } from '@/lib/site-links';

/** The developer credit. Exactly one per page (asserted by ShellTest). */
export const DEVELOPER_URL = 'https://nexsollabs.com';

/**
 * Last row of the site footer: copyright, licence, legal links and the
 * developer credit. Stacks and centres on mobile.
 */
export function FooterBottomBar() {
    const { t } = useT();
    const { licence } = usePage().props.journal;

    return (
        <div className="border-t border-white/10">
            <div className="page-wrap flex flex-col items-center gap-4 py-6 text-center text-meta text-footer-text md:flex-row md:items-start md:justify-between md:gap-10 md:text-left">
                <div className="flex flex-col gap-1.5">
                    <p className="m-0">
                        {t(
                            '© {year} Macedonian Pharmaceutical Association & Faculty of Pharmacy, UKIM',
                            { year: new Date().getFullYear() },
                        )}
                    </p>
                    <p className="m-0 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 md:justify-start">
                        <span>
                            {t('Content licensed under')}{' '}
                            <a
                                href={licence.url}
                                target="_blank"
                                rel="license noopener noreferrer"
                                className="text-white underline decoration-white/40 underline-offset-4 hover:text-white hover:decoration-white"
                            >
                                {licence.name}
                            </a>
                        </span>
                        {legalLinks.map((link) => (
                            <span key={link.href} className="contents">
                                <span
                                    aria-hidden="true"
                                    className="text-white/40"
                                >
                                    ·
                                </span>
                                <Link
                                    href={link.href}
                                    className="text-footer-text no-underline hover:text-white hover:underline hover:underline-offset-4"
                                >
                                    {t(link.label)}
                                </Link>
                            </span>
                        ))}
                    </p>
                </div>
                <p className="m-0 shrink-0 md:text-right">
                    {t('Design & development:')}{' '}
                    <a
                        href={DEVELOPER_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-footer-text underline decoration-white/25 underline-offset-4 transition-colors hover:text-white hover:decoration-white"
                    >
                        Nexsol Labs
                    </a>
                </p>
            </div>
        </div>
    );
}
