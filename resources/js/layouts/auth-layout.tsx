import { Link, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { LogoMark } from '@/components/journal/icons';
import { initializeTheme } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { home } from '@/routes';

/**
 * The form controls on these pages are the app's shadcn components; inside
 * this layout their tokens resolve to the journal palette, in light mode
 * whatever the reader's app preference.
 */
const journalTokens = {
    // Tailwind's --color-* tokens resolve var(--primary) etc. on :root, so the
    // overrides target them directly.
    '--color-background': '#ffffff',
    '--color-foreground': 'var(--color-ink)',
    '--color-card': '#ffffff',
    '--color-card-foreground': 'var(--color-ink)',
    '--color-popover': '#ffffff',
    '--color-popover-foreground': 'var(--color-ink)',
    '--color-primary': 'var(--color-brand)',
    '--color-primary-foreground': '#ffffff',
    '--color-secondary': 'var(--color-mist)',
    '--color-secondary-foreground': 'var(--color-ink)',
    '--color-muted': 'var(--color-mist)',
    '--color-muted-foreground': 'var(--color-ink-muted)',
    '--color-accent': 'var(--color-tint)',
    '--color-accent-foreground': 'var(--color-brand-dark)',
    '--color-destructive': 'var(--color-danger)',
    '--color-border': 'var(--color-line-card)',
    '--color-input': 'var(--color-field)',
    '--color-ring': 'var(--color-brand)',
    colorScheme: 'light',
} as CSSProperties;

type Props = {
    title?: string;
    description?: string;
    /** The sign-up form is longer and uses two columns on wide screens. */
    wide?: boolean;
    children: ReactNode;
};

/**
 * Sign-in to the manuscript system: a centred card on the mist surface, under
 * the journal's mark and name, with a way back to the journal.
 */
export default function AuthLayout({
    title = '',
    description = '',
    wide = false,
    children,
}: Props) {
    const { t, locale } = useT();
    const { journal } = usePage().props;

    const name = locale === 'mk' ? journal.nameMk : journal.nameEn;
    const otherName = locale === 'mk' ? journal.nameEn : journal.nameMk;

    // Light only, like the public journal; the app's preference returns on leaving.
    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        root.style.colorScheme = 'light';

        return () => initializeTheme();
    }, []);

    return (
        <div
            className="journal flex min-h-svh flex-col bg-mist"
            style={journalTokens}
        >
            <div aria-hidden className="h-1 bg-brand-dark" />

            <main
                id="main"
                className="flex flex-1 flex-col items-center justify-start px-4 pt-10 pb-12 sm:justify-center sm:py-16"
            >
                <div
                    className={cn(
                        'w-full',
                        wide ? 'max-w-[640px]' : 'max-w-[400px]',
                    )}
                >
                    <Link
                        href={home()}
                        className="mx-auto mb-8 flex w-fit items-center gap-3 text-ink no-underline hover:text-ink"
                    >
                        <LogoMark className="size-11 shrink-0 text-brand" />
                        <span className="flex flex-col">
                            <span className="font-serif text-[19px] leading-tight font-medium text-ink">
                                {name}
                            </span>
                            <span
                                lang={locale === 'mk' ? 'en' : 'mk'}
                                className="mt-0.5 text-[11px] leading-tight tracking-[0.06em] text-ink-muted uppercase"
                            >
                                {otherName}
                            </span>
                        </span>
                    </Link>

                    <section
                        aria-labelledby="auth-title"
                        className="rounded-lg border border-line-card bg-white px-6 py-7 sm:px-8 sm:py-8"
                    >
                        <p className="eyebrow">{t('Manuscript system')}</p>
                        <h1
                            id="auth-title"
                            className="mt-2 mb-0 font-serif text-h3 leading-snug font-medium text-ink"
                        >
                            {t(title)}
                        </h1>
                        {description && (
                            <p className="mt-1.5 mb-0 text-ui leading-normal text-ink-soft">
                                {t(description)}
                            </p>
                        )}
                        <div className="mt-6 text-ui">{children}</div>
                    </section>

                    <p className="mt-5 mb-0 px-2 text-center text-meta leading-relaxed text-ink-muted">
                        {t(
                            'Authors create an account to submit manuscripts. Reviewers join by invitation from the editorial office.',
                        )}
                    </p>

                    <p className="mt-6 mb-0 text-center">
                        <Link
                            href={home()}
                            className="inline-flex min-h-11 items-center gap-1.5 text-ui font-semibold"
                        >
                            <span aria-hidden>←</span>
                            {t('Back to the journal')}
                        </Link>
                    </p>
                </div>
            </main>

            <footer className="border-t border-line px-4 py-5 text-center text-meta text-ink-muted">
                {t('Design & development:')}{' '}
                <a
                    href="https://nexsollabs.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-muted underline-offset-4 hover:text-ink hover:underline"
                >
                    Nexsol Labs
                </a>
            </footer>
        </div>
    );
}
