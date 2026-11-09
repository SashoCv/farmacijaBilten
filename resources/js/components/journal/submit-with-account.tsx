import { Link } from '@inertiajs/react';
import { useT } from '@/lib/i18n';
import { authorLinks } from '@/lib/site-links';

export type SubmitAccess = {
    signedIn: boolean;
    isAuthor: boolean;
    register: string;
    login: string;
    manuscripts: string;
};

/**
 * "Submit manuscript": manuscripts are written and sent in the manuscript
 * system, on the journal template, after signing in.
 */
export function SubmitWithAccount({ access }: { access: SubmitAccess }) {
    const { t } = useT();

    const steps = [
        t('Create an author account (or sign in).'),
        t(
            'Write the manuscript on the journal template: title page, sections, tables and references. It is saved as you type.',
        ),
        t(
            'Check the preview and send it. You get a reference number by e-mail.',
        ),
        t('Follow the review and the decision in your account.'),
    ];

    return (
        <section
            aria-labelledby="submit-title"
            className="rounded-lg border border-line-card bg-white p-6 sm:p-8"
        >
            <h2
                id="submit-title"
                className="m-0 font-serif text-h3 leading-snug font-medium text-ink"
            >
                {t('Submit through the manuscript system')}
            </h2>
            <ol className="mt-5 mb-0 flex list-none flex-col gap-3 p-0">
                {steps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-ui text-ink-soft">
                        <span
                            aria-hidden
                            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-tint font-semibold text-brand-dark tabular-nums"
                        >
                            {index + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                    </li>
                ))}
            </ol>

            <div className="mt-7 flex flex-wrap items-center gap-3">
                {access.signedIn ? (
                    <Link href={access.manuscripts} className="btn-primary">
                        {access.isAuthor
                            ? t('Go to my manuscripts')
                            : t('Open the manuscript system')}
                    </Link>
                ) : (
                    <>
                        <Link href={access.register} className="btn-primary">
                            {t('Create an author account')}
                        </Link>
                        <Link
                            href={access.login}
                            className="inline-flex min-h-11 items-center px-2 text-ui font-semibold"
                        >
                            {t('Sign in')}
                        </Link>
                    </>
                )}
            </div>

            <p className="mt-6 mb-0 border-t border-line pt-5 text-meta text-ink-muted">
                {t('Before you start, read the')}{' '}
                <Link href={authorLinks[0].href} className="link-u">
                    {t('Instructions for authors')}
                </Link>
                .
            </p>
        </section>
    );
}
