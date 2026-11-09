import { Head, setLayoutProps } from '@inertiajs/react';
import { lazy, Suspense, useSyncExternalStore } from 'react';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import type { ManuscriptEditProps } from '@/types/manuscript';
import '../../../../css/manuscript.css';
import '../../../../css/manuscript-article.css';

/*
 * The author writes the manuscript on the journal template (docs/backoffice,
 * plan.md §6.3). The editor (TipTap/ProseMirror) is client-only: the SSR
 * build replaces the import with null, so it never enters bootstrap/ssr, and
 * the server renders the loading state.
 */
const ManuscriptWorkspace = import.meta.env.SSR
    ? null
    : lazy(() => import('@/components/manuscript-editor/workspace/workspace'));

const subscribe = () => () => {};

/** False during SSR and hydration, true once mounted in the browser. */
function useIsClient(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}

function Loading() {
    const { t } = useT();

    return (
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
            <div className="ms-desk rounded-lg border">
                <div className="ms ms-paper grid min-h-[60svh] place-items-center">
                    <p
                        role="status"
                        className="font-sans text-sm text-muted-foreground"
                    >
                        {t('Loading the editor…')}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function EditManuscript(props: ManuscriptEditProps) {
    const { t } = useT();
    const isClient = useIsClient();

    // The layout translates these English keys.
    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'My manuscripts', href: props.urls.index },
            { title: 'Write the manuscript', href: props.urls.show },
        ],
    });

    return (
        <>
            <Head title={t('Write the manuscript')} />

            {isClient && ManuscriptWorkspace ? (
                <Suspense fallback={<Loading />}>
                    <ManuscriptWorkspace {...props} />
                </Suspense>
            ) : (
                <Loading />
            )}
        </>
    );
}
