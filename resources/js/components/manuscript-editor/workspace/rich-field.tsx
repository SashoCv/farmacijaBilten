import type { Editor } from '@tiptap/react';
import { EditorContent, useEditor } from '@tiptap/react';
import { memo, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { manuscriptExtensions } from '../extensions';
import type { ManuscriptVariant } from '../extensions';
import { issueId, useWorkspace } from './context';

type Props = {
    /** Field name: 'title', 'abstract', 'sections.<key>', … (also the check-issue field). */
    field: string;
    variant: ManuscriptVariant;
    /** Accessible name, also shown in the toolbar while the field is focused. */
    label: string;
    placeholder?: string;
    /** Language of the text (spell checking, "Table"/"Табела"). */
    lang: string;
    className?: string;
    /** Called after every change (e.g. a word count). */
    onText?: (editor: Editor) => void;
};

/**
 * One rich-text field of the manuscript: a TipTap editor with the schema of
 * its variant. Mounted once; its JSON is read from the editor when the page
 * saves, so typing never re-renders the page.
 */
export const RichField = memo(function RichField({
    field,
    variant,
    label,
    placeholder,
    lang,
    className,
    onText,
}: Props) {
    const { t } = useT();
    const workspace = useWorkspace();

    const editor = useEditor({
        extensions: manuscriptExtensions({
            variant,
            headings: variant === 'body',
            placeholder,
            placeholders: {
                tableCaption: t('Table caption (no final period)'),
                tableNote: t('Table note'),
                figureCaption: t('Figure caption (no final period)'),
            },
            figures: variant === 'body' ? workspace.figures : undefined,
        }),
        content: workspace.initial(field) ?? undefined,
        immediatelyRender: false,
        shouldRerenderOnTransaction: false,
        editorProps: {
            attributes: {
                class: cn('ms-ed-field', `ms-ed-${variant}`),
                role: 'textbox',
                'aria-multiline': variant === 'inline' ? 'false' : 'true',
                'aria-label': label,
                'aria-describedby': issueId(field),
                spellcheck: 'true',
                lang,
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
            onText?.(created);
        },
        onUpdate: ({ editor: updated, transaction }) => {
            // Ids added to the loaded nodes (UniqueID) are not a change.
            if (transaction.getMeta('addToHistory') !== false) {
                workspace.changed();
            }

            onText?.(updated);
        },
        onFocus: ({ editor: focused }) => {
            workspace.active.set({ editor: focused, label, field });
        },
        onBlur: () => workspace.blurred(),
    });

    useEffect(() => {
        if (!editor) {
            return;
        }

        workspace.register(field, editor);

        return () => {
            workspace.unregister(field, editor);

            if (workspace.active.get()?.editor === editor) {
                workspace.active.set(null);
            }
        };
    }, [editor, field, workspace]);

    return (
        <div data-field={field} className={cn('ms-ed-box', className)}>
            {editor ? (
                <EditorContent editor={editor} />
            ) : (
                <div className="ms-ed-loading" aria-hidden="true" />
            )}
        </div>
    );
});
