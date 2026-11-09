import { mergeAttributes, Node } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FigureView } from '../figure-view';
import { FIGURE_WIDTHS } from './figure-shared';
import type { FigureOptions, FigureWidth } from './figure-shared';
import { failUpload, finishUpload, startUpload } from './figure-uploads';

export * from './figure-shared';

/*
 * Figures in section bodies (manuscript-template-spec.md §(e)):
 *
 *   figure = figureCaption     attrs: image (public id), alt, width (25|50|75|100)
 *
 * The image is not content: the node view shows it above the caption. The
 * caption sits below the image; "Fig. 1." is not stored, manuscript.css
 * numbers the figures with a CSS counter across all sections.
 *
 * `upload` is a client-only token while a file is being uploaded; the page
 * strips it before saving.
 */

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        figure: {
            /** Uploads image files and inserts a figure for each (after the cursor's block, or at `pos`). */
            insertFigureFiles: (files: File[], pos?: number) => ReturnType;
            /** Uploads a file into the figure at `pos` (replace image). */
            replaceFigureImage: (pos: number, file: File) => ReturnType;
            /** Sets the width of the figure holding the cursor. */
            setFigureWidth: (width: FigureWidth) => ReturnType;
            /** Deletes the figure holding the cursor. */
            deleteFigure: () => ReturnType;
        };
    }
}

/** The figure holding the selection (cursor in the caption, or the figure selected). */
export function currentFigure(
    state: Editor['state'],
): { node: PMNode; pos: number } | null {
    const { selection } = state;
    const selected = (selection as { node?: PMNode }).node;

    if (selected?.type.name === 'figure') {
        return { node: selected, pos: selection.from };
    }

    const { $from } = selection;

    for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.name === 'figure') {
            return { node: $from.node(depth), pos: $from.before(depth) };
        }
    }

    return null;
}

/** Default width from the pixel size: small images are not blown up. */
function widthFor(pixels: number): FigureWidth {
    if (pixels >= 1200) {
        return 100;
    }

    if (pixels >= 800) {
        return 75;
    }

    return pixels >= 400 ? 50 : 25;
}

function findByToken(
    doc: PMNode,
    token: string,
): { node: PMNode; pos: number } | null {
    let found: { node: PMNode; pos: number } | null = null;

    doc.descendants((node, pos) => {
        if (found) {
            return false;
        }

        if (node.type.name === 'figure' && node.attrs.upload === token) {
            found = { node, pos };

            return false;
        }

        return true;
    });

    return found;
}

function token(): string {
    return `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** Uploads into the figure marked with `mark`; the figure shows progress and errors. */
function runUpload(
    editor: Editor,
    options: FigureOptions,
    file: File,
    mark: string,
    resetWidth: boolean,
): void {
    const refused = options.rejectFile(file);

    if (refused) {
        failUpload(mark, refused);

        return;
    }

    startUpload(mark);

    options
        .upload(file, (fraction) => startUpload(mark, fraction))
        .then((image) => {
            finishUpload(mark);

            if (editor.isDestroyed) {
                return;
            }

            const target = findByToken(editor.state.doc, mark);

            if (!target) {
                return;
            }

            editor.view.dispatch(
                editor.state.tr.setNodeMarkup(target.pos, undefined, {
                    ...target.node.attrs,
                    image: image.id,
                    upload: null,
                    width: resetWidth
                        ? widthFor(image.width)
                        : target.node.attrs.width,
                }),
            );
        })
        .catch((error: unknown) => {
            failUpload(
                mark,
                error instanceof Error ? error.message : String(error),
            );
        });
}

/** Where a new figure goes: after the top-level block at `pos`, or in place of an empty paragraph. */
function insertionPoint(
    doc: PMNode,
    pos: number,
): { from: number; to: number } {
    const $pos = doc.resolve(Math.min(Math.max(pos, 0), doc.content.size));

    if ($pos.depth === 0) {
        return { from: $pos.pos, to: $pos.pos };
    }

    const block = $pos.node(1);
    const start = $pos.before(1);
    const end = $pos.after(1);

    if (block.type.name === 'paragraph' && block.content.size === 0) {
        return { from: start, to: end };
    }

    return { from: end, to: end };
}

function imageFiles(list: FileList | null | undefined): File[] {
    return Array.from(list ?? []).filter((file) =>
        file.type.startsWith('image/'),
    );
}

export const Figure = Node.create<FigureOptions>({
    name: 'figure',
    group: 'block',
    content: 'figureCaption',
    isolating: true,
    defining: true,
    draggable: false,
    selectable: true,

    addOptions() {
        return {
            upload: () => Promise.reject(new Error('No upload')),
            imageUrl: () => '',
            rejectFile: () => null,
        };
    },

    addAttributes() {
        return {
            image: {
                default: '',
                parseHTML: (element) =>
                    element.getAttribute('data-image') ?? '',
                renderHTML: (attributes) => ({
                    'data-image': String(attributes.image ?? ''),
                }),
            },
            alt: {
                default: '',
                parseHTML: (element) => element.getAttribute('data-alt') ?? '',
                renderHTML: (attributes) => ({
                    'data-alt': String(attributes.alt ?? ''),
                }),
            },
            width: {
                default: 100,
                parseHTML: (element) => {
                    const value = Number(element.getAttribute('data-width'));

                    return FIGURE_WIDTHS.includes(value as FigureWidth)
                        ? value
                        : 100;
                },
                renderHTML: (attributes) => ({
                    'data-width': String(attributes.width ?? 100),
                }),
            },
            // Client-only: an upload in progress (never saved).
            upload: {
                default: null,
                rendered: false,
            },
        };
    },

    parseHTML() {
        return [{ tag: 'figure[data-type="figure"]', priority: 60 }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'figure',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'figure',
                class: 'ms-ed-figure',
            }),
            0,
        ];
    },

    addNodeView() {
        return ReactNodeViewRenderer(FigureView, {
            selectedOnTextSelection: true,
        });
    },

    addCommands() {
        return {
            insertFigureFiles:
                (files, pos) =>
                ({ editor, state, dispatch }) => {
                    const images = files.filter((file) =>
                        file.type.startsWith('image/'),
                    );

                    if (images.length === 0) {
                        return false;
                    }

                    if (!dispatch) {
                        return true;
                    }

                    const { figure, figureCaption } = state.schema.nodes;
                    let at = insertionPoint(
                        state.doc,
                        pos ?? state.selection.to,
                    );
                    const tr = state.tr;
                    const marks: string[] = [];

                    for (let i = 0; i < images.length; i++) {
                        const mark = token();
                        marks.push(mark);
                        const node = figure.create(
                            { upload: mark },
                            figureCaption.create(),
                        );
                        tr.replaceWith(at.from, at.to, node);
                        const after = at.from + node.nodeSize;
                        at = { from: after, to: after };
                    }

                    // The cursor goes to the first caption.
                    const first = findByToken(tr.doc, marks[0]);

                    if (first) {
                        tr.setSelection(
                            TextSelection.create(tr.doc, first.pos + 2),
                        );
                    }

                    tr.scrollIntoView();
                    dispatch(tr);

                    images.forEach((file, index) =>
                        runUpload(
                            editor,
                            this.options,
                            file,
                            marks[index],
                            true,
                        ),
                    );

                    return true;
                },

            replaceFigureImage:
                (pos, file) =>
                ({ editor, state, dispatch }) => {
                    const node = state.doc.nodeAt(pos);

                    if (node?.type.name !== 'figure') {
                        return false;
                    }

                    if (dispatch) {
                        const mark = token();
                        dispatch(
                            state.tr.setNodeMarkup(pos, undefined, {
                                ...node.attrs,
                                upload: mark,
                            }),
                        );
                        runUpload(editor, this.options, file, mark, false);
                    }

                    return true;
                },

            setFigureWidth:
                (width) =>
                ({ state, tr, dispatch }) => {
                    const found = currentFigure(state);

                    if (!found) {
                        return false;
                    }

                    if (dispatch) {
                        tr.setNodeMarkup(found.pos, undefined, {
                            ...found.node.attrs,
                            width,
                        });
                    }

                    return true;
                },

            deleteFigure:
                () =>
                ({ state, tr, dispatch }) => {
                    const found = currentFigure(state);

                    if (!found) {
                        return false;
                    }

                    if (dispatch) {
                        tr.delete(found.pos, found.pos + found.node.nodeSize);
                        tr.setSelection(
                            TextSelection.near(
                                tr.doc.resolve(
                                    Math.min(found.pos, tr.doc.content.size),
                                ),
                            ),
                        );
                    }

                    return true;
                },
        };
    },

    addKeyboardShortcuts() {
        return {
            // Enter in the caption leaves the figure (to the next paragraph).
            Enter: ({ editor }) => {
                const { state } = editor;

                if (
                    state.selection.$from.parent.type.name !== 'figureCaption'
                ) {
                    return false;
                }

                const found = currentFigure(state);

                if (!found) {
                    return true;
                }

                const after = found.pos + found.node.nodeSize;

                return editor
                    .chain()
                    .command(({ tr }) => {
                        const next = tr.doc.nodeAt(after);

                        if (!next || !next.isTextblock) {
                            tr.insert(
                                after,
                                state.schema.nodes.paragraph.create(),
                            );
                        }

                        tr.setSelection(
                            TextSelection.create(tr.doc, after + 1),
                        );

                        return true;
                    })
                    .scrollIntoView()
                    .run();
            },

            // Backspace at the start of the caption must not unwrap it.
            Backspace: ({ editor }) => {
                const { $from, empty } = editor.state.selection;

                return (
                    empty &&
                    $from.parentOffset === 0 &&
                    $from.parent.type.name === 'figureCaption'
                );
            },
        };
    },

    addProseMirrorPlugins() {
        const editor = this.editor;

        const handleFiles = (view: EditorView, files: File[], pos?: number) => {
            if (files.length === 0 || !view.editable) {
                return false;
            }

            return editor.commands.insertFigureFiles(files, pos);
        };

        return [
            new Plugin({
                key: new PluginKey('figureFiles'),
                props: {
                    // A pasted screenshot or image file (not Word's picture
                    // of copied text, which comes with the text itself).
                    handlePaste: (view, event) => {
                        const data = event.clipboardData;
                        const files = imageFiles(data?.files);

                        if (files.length === 0) {
                            return false;
                        }

                        const html = data?.getData('text/html') ?? '';
                        const text = data?.getData('text/plain') ?? '';
                        const htmlText = html
                            ? (new DOMParser()
                                  .parseFromString(html, 'text/html')
                                  .body.textContent?.trim() ?? '')
                            : '';

                        if (text.trim() !== '' || htmlText !== '') {
                            return false;
                        }

                        return handleFiles(view, files);
                    },

                    handleDrop: (view, event, _slice, moved) => {
                        const files = imageFiles(event.dataTransfer?.files);

                        if (moved || files.length === 0) {
                            return false;
                        }

                        event.preventDefault();
                        const at = view.posAtCoords({
                            left: event.clientX,
                            top: event.clientY,
                        });

                        return handleFiles(view, files, at?.pos);
                    },
                },
            }),
        ];
    },
});

export const FigureCaption = Node.create({
    name: 'figureCaption',
    content: 'inline*',
    marks: 'bold italic subscript superscript',
    defining: true,

    parseHTML() {
        return [
            { tag: 'figcaption[data-type="figure-caption"]', priority: 60 },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'figcaption',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'figure-caption',
                class: 'ms-ed-figure-caption',
            }),
            0,
        ];
    },
});
