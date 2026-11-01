import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/journal/site-footer';
import { SiteHeader } from '@/components/journal/site-header';
import { initializeTheme } from '@/hooks/use-appearance';
import { useT } from '@/lib/i18n';

/**
 * Public journal shell: header, main content and the one site footer (with
 * the developer credit) on every page. The journal is designed light-only,
 * so it opts out of the signed-in app's dark mode while mounted.
 */
export default function JournalLayout({ children }: { children: ReactNode }) {
    const { t } = useT();

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('dark');
        root.style.colorScheme = 'light';

        return () => initializeTheme();
    }, []);

    return (
        <div className="journal flex min-h-screen flex-col">
            <a
                href="#main"
                className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:text-white"
            >
                {t('Skip to content')}
            </a>
            <SiteHeader />
            <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
                {children}
            </main>
            <SiteFooter />
        </div>
    );
}
