import { router } from '@inertiajs/react';
import type { Page } from '@inertiajs/core';
import { useEffect, useState } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';
import { useAppearance } from '@/hooks/use-appearance';
import { useFlashToast } from '@/hooks/use-flash-toast';
import { translate } from '@/lib/i18n';

type Props = ToasterProps & {
    /**
     * The Toaster sits beside the Inertia app (outside its page context), so
     * it follows the page through router events, starting from this one.
     */
    initialPage?: Page;
};

/** Pages designed light-only: the public journal and the sign-in screens. */
function isLightOnly(component: string | undefined): boolean {
    return (
        !!component &&
        (component.startsWith('journal/') || component.startsWith('auth/'))
    );
}

function Toaster({ initialPage, ...props }: Props) {
    const { appearance } = useAppearance();
    const [page, setPage] = useState(initialPage);

    useFlashToast();

    useEffect(
        () =>
            router.on('navigate', (event) => {
                setPage(event.detail.page);
            }),
        [],
    );

    const locale = page?.props.locale === 'mk' ? 'mk' : 'en';

    return (
        <Sonner
            theme={isLightOnly(page?.component) ? 'light' : appearance}
            className="toaster group"
            position="bottom-right"
            containerAriaLabel={translate(locale, 'Notifications')}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
