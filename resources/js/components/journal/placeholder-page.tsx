import { Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import { useT } from '@/lib/i18n';
import { home } from '@/routes';

/**
 * Minimal page used by routes whose real page is still being built
 * (foundation stubs). Replace it in the page component, not here.
 */
export function PlaceholderPage({
    title,
    children,
}: {
    title: string;
    children?: ReactNode;
}) {
    const { t } = useT();

    return (
        <>
            <Head title={title} />
            <div className="page-wrap flex flex-col gap-6 section-y">
                <Breadcrumbs
                    items={[
                        { label: t('Home'), href: home.url() },
                        { label: title },
                    ]}
                />
                <h1 className="m-0 font-serif text-h1 font-medium text-balance">
                    {title}
                </h1>
                {children ?? (
                    <p className="m-0 max-w-[70ch] text-ink-soft">
                        {t('This page is being prepared.')}
                    </p>
                )}
            </div>
        </>
    );
}
