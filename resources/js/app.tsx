import { createInertiaApp } from '@inertiajs/react';
import type { ResolvedComponent } from '@inertiajs/react';
import { Toaster } from '@/components/ui/sonner';
import { initializeTheme } from '@/hooks/use-appearance';
import type { Locale } from '@/lib/i18n';

/*
 * Client and server entry. There is no separate ssr.tsx: the Inertia Vite
 * plugin builds the SSR bundle (bootstrap/ssr/app.js) from this file, so the
 * title, layouts and Toaster below apply to both.
 */

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

type PageModule = { default: ResolvedComponent };
type Layout = NonNullable<ResolvedComponent['layout']>;

const pages = import.meta.glob<PageModule>('./pages/**/*.tsx');

/**
 * Layouts are code-split and fetched in parallel with the page, so the public
 * journal never downloads the signed-in app's sidebar, icons or dialogs.
 */
async function resolveLayout(name: string): Promise<Layout> {
    if (name.startsWith('journal/')) {
        return (await import('@/layouts/journal-layout')).default;
    }

    if (name.startsWith('auth/')) {
        return (await import('@/layouts/auth-layout')).default;
    }

    if (name.startsWith('settings/')) {
        const [app, settings] = await Promise.all([
            import('@/layouts/app-layout'),
            import('@/layouts/settings/layout'),
        ]);

        return [app.default, settings.default];
    }

    return (await import('@/layouts/app-layout')).default;
}

/**
 * Default layout of each page, filled in by `resolve` (layouts load
 * asynchronously, Inertia asks for them synchronously). Inertia applies it
 * when a page declares no layout, and also when `Page.layout` is a plain
 * props object such as the auth pages' `{ title, description }` or the
 * settings pages' `{ breadcrumbs }`: the default layout then renders with
 * those props. Page modules are never mutated, so an edited layout is picked
 * up by the dev SSR server too.
 */
const defaultLayouts = new Map<string, Layout>();

/**
 * Document title: "{page} – {journal name}" in the reader's language. Pages
 * whose title already is the journal name (home) get the name alone.
 */
type TitleProps = {
    locale?: Locale;
    journal?: { nameEn?: string; nameMk?: string };
};

function documentTitle(title: string, props: TitleProps): string {
    const name =
        (props.locale === 'mk'
            ? props.journal?.nameMk
            : props.journal?.nameEn) || appName;

    if (!title || title === name || title === props.journal?.nameEn) {
        return name;
    }

    return `${title} – ${name}`;
}

void createInertiaApp({
    title: (title, page) => documentTitle(title, page.props as TitleProps),
    layout: (name) => defaultLayouts.get(name),
    resolve: async (name) => {
        const [module, layout] = await Promise.all([
            pages[`./pages/${name}.tsx`]?.(),
            resolveLayout(name),
        ]);

        if (!module) {
            throw new Error(`Page not found: ${name}`);
        }

        defaultLayouts.set(name, layout);

        return module.default;
    },
    strictMode: true,
    withApp(app, { ssr, page }) {
        // Light only, everywhere (clears a `dark` class left by an old visit).
        if (!ssr) {
            initializeTheme();
        }

        return (
            <>
                {app}
                <Toaster initialPage={page} />
            </>
        );
    },
    progress: {
        color: '#2C4A8A',
    },
});
