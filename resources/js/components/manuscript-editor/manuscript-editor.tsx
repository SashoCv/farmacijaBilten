import type { JSONContent } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import { manuscriptExtensions } from './extensions';
import { Toolbar } from './toolbar';

type Props = {
    content: JSONContent;
    onChange: (editor: Editor) => void;
    onCreate?: (editor: Editor) => void;
};

/**
 * The manuscript body editor: toolbar plus a paper-like canvas set in the
 * print font. Client-only (never imported by the SSR bundle).
 */
export function ManuscriptEditor({ content, onChange, onCreate }: Props) {
    const editor = useEditor({
        extensions: manuscriptExtensions(),
        content,
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: 'ms-body',
                role: 'textbox',
                'aria-multiline': 'true',
                'aria-label': 'Manuscript body',
                spellcheck: 'true',
                lang: 'en',
            },
            handleKeyDown: (_view, event) => {
                // Alt+F10 jumps to the toolbar (as in Word and TinyMCE).
                if (event.altKey && event.key === 'F10') {
                    document
                        .querySelector<HTMLElement>(
                            '[data-manuscript-toolbar] button:not(:disabled)',
                        )
                        ?.focus();

                    return true;
                }

                return false;
            },
        },
        onCreate: ({ editor: created }) => {
            onCreate?.(created);
            onChange(created);
        },
        onUpdate: ({ editor: updated }) => onChange(updated),
    });

    if (!editor) {
        return (
            <p className="p-6 text-sm text-muted-foreground">Loading editor…</p>
        );
    }

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-background">
            <Toolbar editor={editor} />
            <div className="ms-desk">
                <div className="ms ms-paper">
                    <EditorContent editor={editor} />
                </div>
            </div>
        </div>
    );
}
