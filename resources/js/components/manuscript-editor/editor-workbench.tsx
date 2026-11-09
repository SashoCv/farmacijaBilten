import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { useRef, useState } from 'react';
import { ManuscriptEditor } from './manuscript-editor';
import { sampleDocument } from './sample-content';

const STORAGE_KEY = 'mpb-lab:editor';

function readStored(): JSONContent | null {
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        return raw ? (JSON.parse(raw) as JSONContent) : null;
    } catch {
        return null;
    }
}

function writeStored(doc: JSONContent): boolean {
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(doc));

        return true;
    } catch {
        return false;
    }
}

type Loaded = { doc: JSONContent; source: string; generation: number };

type RoundTrip = { ok: boolean; bytes: number } | null;

/**
 * Lab workbench: the editor, its live JSON and HTML, and a reload from the
 * stored JSON that proves the document survives a round trip unchanged.
 */
export default function EditorWorkbench() {
    const [loaded, setLoaded] = useState<Loaded>(() => {
        const stored = readStored();

        return stored
            ? { doc: stored, source: 'localStorage', generation: 0 }
            : { doc: sampleDocument, source: 'built-in sample', generation: 0 };
    });
    const [json, setJson] = useState('');
    const [html, setHtml] = useState('');
    const [saved, setSaved] = useState<boolean | null>(null);
    const [roundTrip, setRoundTrip] = useState<RoundTrip>(null);
    const expected = useRef<string | null>(null);

    const onChange = (editor: Editor) => {
        const doc = editor.getJSON();
        setJson(JSON.stringify(doc, null, 2));
        setHtml(editor.getHTML());
        setSaved(writeStored(doc));
    };

    const onCreate = (editor: Editor) => {
        if (expected.current !== null) {
            const actual = JSON.stringify(editor.getJSON());
            setRoundTrip({
                ok: actual === expected.current,
                bytes: actual.length,
            });
            expected.current = null;
        }
    };

    const reloadFromJson = () => {
        const stored = readStored();

        if (!stored) {
            setSaved(false);

            return;
        }

        expected.current = JSON.stringify(stored);
        setRoundTrip(null);
        setLoaded((previous) => ({
            doc: stored,
            source: 'localStorage (reloaded)',
            generation: previous.generation + 1,
        }));
    };

    const resetToSample = () => {
        expected.current = null;
        setRoundTrip(null);
        setLoaded((previous) => ({
            doc: sampleDocument,
            source: 'built-in sample (reset)',
            generation: previous.generation + 1,
        }));
    };

    return (
        <div className="space-y-4">
            <ManuscriptEditor
                key={loaded.generation}
                content={loaded.doc}
                onChange={onChange}
                onCreate={onCreate}
            />

            <section
                aria-label="Round trip"
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-background p-3 text-sm"
            >
                <button
                    type="button"
                    onClick={reloadFromJson}
                    className="inline-flex h-9 items-center rounded-md bg-primary px-3 font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    Reload from JSON
                </button>
                <button
                    type="button"
                    onClick={resetToSample}
                    className="inline-flex h-9 items-center rounded-md border border-border px-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                    Reset to sample
                </button>
                <span className="text-muted-foreground">
                    Loaded from: {loaded.source}.{' '}
                    {saved === false
                        ? 'localStorage is unavailable: changes are not kept.'
                        : 'Every change is saved to localStorage.'}
                </span>
                <span role="status" aria-live="polite" className="font-medium">
                    {roundTrip &&
                        (roundTrip.ok
                            ? `Round trip OK: the recreated editor's JSON is identical (${roundTrip.bytes.toLocaleString()} bytes).`
                            : 'Round trip FAILED: the recreated JSON differs from the stored JSON.')}
                </span>
            </section>

            <details className="rounded-lg border border-border bg-background">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Document JSON (live, {json.length.toLocaleString()} bytes)
                </summary>
                <pre className="max-h-[32rem] overflow-auto border-t border-border p-3 text-xs leading-snug">
                    {json}
                </pre>
            </details>

            <details className="rounded-lg border border-border bg-background">
                <summary className="cursor-pointer px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring">
                    Editor HTML (live, input for the preview / PDF renderer)
                </summary>
                <pre className="max-h-[32rem] overflow-auto border-t border-border p-3 text-xs leading-snug whitespace-pre-wrap">
                    {html}
                </pre>
            </details>
        </div>
    );
}
