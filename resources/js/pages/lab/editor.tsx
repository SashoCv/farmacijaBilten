import { Head } from '@inertiajs/react';
import { lazy, Suspense, useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import '../../../css/manuscript.css';

/*
 * Release 0, spike S1 (docs/backoffice/README.md): journal tables in a
 * TipTap v3 editor, round-tripped through JSON. Local environment only
 * (routes/lab.php). Dev-only English strings, no translations.
 *
 * The editor is client-only: the SSR build replaces the import with null,
 * so ProseMirror never enters bootstrap/ssr.
 */
const EditorWorkbench = import.meta.env.SSR
    ? null
    : lazy(() => import('@/components/manuscript-editor/editor-workbench'));

const subscribe = () => () => {};

/** False during SSR and hydration, true once mounted in the browser. */
function useIsClient(): boolean {
    return useSyncExternalStore(
        subscribe,
        () => true,
        () => false,
    );
}

function Placeholder() {
    return (
        <p className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
            Loading the editor…
        </p>
    );
}

export default function LabEditor() {
    const isClient = useIsClient();

    return (
        <>
            <Head title="Lab: editor tables" />

            <header className="space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    Lab · release 0 · spike S1 · local only
                </p>
                <h1 className="text-2xl font-semibold">
                    Journal tables in the editor
                </h1>
                <p className="max-w-3xl text-sm text-muted-foreground">
                    Tables 1 and 2 are from 71_2_001 (pp. 5–6; Table 2 is an
                    excerpt), Table 3 is Table 1 of 71_2_008. Try: Tab between
                    cells, Shift+arrows to select cells then Merge, Header on a
                    second row for a two-level header, Note under a table, the
                    Symbol menu, and paste a table from Word or Excel. Alt+F10
                    moves to the toolbar, Escape returns. Changes are kept in
                    this browser; “Reload from JSON” rebuilds the editor from
                    the stored JSON.
                </p>
            </header>

            {isClient && EditorWorkbench ? (
                <Suspense fallback={<Placeholder />}>
                    <EditorWorkbench />
                </Suspense>
            ) : (
                <Placeholder />
            )}
        </>
    );
}

function LabLayout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen bg-muted text-foreground">
            <main className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
                {children}
            </main>
        </div>
    );
}

LabEditor.layout = LabLayout;
