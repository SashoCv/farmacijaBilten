import { mergeAttributes, Node } from '@tiptap/core';
import type { Editor } from '@tiptap/core';
import type { Node as PMNode, NodeType } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { EditorState, Transaction } from '@tiptap/pm/state';
import { isInTable, selectedRect } from '@tiptap/pm/tables';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
    Table,
    TableCell,
    TableHeader,
    TableRow,
} from '@tiptap/extension-table';

/*
 * Journal table (manuscript schema, docs/backoffice/plan.md §6.3):
 *
 *   tableBlock  = tableCaption table tableNotes
 *   tableNotes  = tableNote*
 *
 * The caption sits above the table, the notes below. "Table N." is not
 * stored: manuscript.css numbers the blocks with a CSS counter. A bare table
 * is not a block, so every table in the document has a caption and notes.
 */

export type CellAlign = 'left' | 'center' | 'right';

/** Markers offered for table notes; '' is a free note ("Abbreviations: …"). */
export const NOTE_MARKERS = [
    'a',
    'b',
    'c',
    'd',
    'e',
    'f',
    '*',
    '**',
    '***',
    '',
] as const;

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        tableBlock: {
            /** Inserts a captioned journal table with a header row. */
            insertTableBlock: (options?: {
                rows?: number;
                cols?: number;
            }) => ReturnType;
            /** Deletes the table block around the selection. */
            deleteTableBlock: () => ReturnType;
            /** Appends a note under the current table, with the next free letter. */
            addTableNote: () => ReturnType;
            /** Sets the marker of the note holding the cursor. */
            setTableNoteMarker: (marker: string) => ReturnType;
            /** Aligns every cell of the selected column(s). */
            setColumnAlign: (align: CellAlign | null) => ReturnType;
            /** Turns the selected row(s) into header rows, or back. */
            toggleHeaderRows: () => ReturnType;
        };
    }
}

type Found = { node: PMNode; pos: number };

function findAncestor(state: EditorState, name: string): Found | null {
    const { $from } = state.selection;

    for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);

        if (node.type.name === name) {
            return { node, pos: $from.before(depth) };
        }
    }

    return null;
}

/** Positions of the caption, table and notes inside a table block. */
function parts(block: Found) {
    const caption = block.node.child(0);
    const table = block.node.child(1);
    const notes = block.node.child(2);
    const captionPos = block.pos + 1;
    const tablePos = captionPos + caption.nodeSize;
    const notesPos = tablePos + table.nodeSize;

    return { caption, table, notes, captionPos, tablePos, notesPos };
}

function nextNoteMarker(notes: PMNode): string {
    const used = new Set<string>();
    notes.forEach((note) => used.add(String(note.attrs.marker ?? '')));

    return (
        NOTE_MARKERS.find(
            (marker) => /^[a-z]$/.test(marker) && !used.has(marker),
        ) ?? ''
    );
}

/** Cells of the current table rectangle, as absolute positions. */
function cellsIn(
    state: EditorState,
    area: 'columns' | 'rows',
): { pos: number; node: PMNode }[] {
    const rect = selectedRect(state);
    const { map, tableStart, table } = rect;
    const box =
        area === 'columns'
            ? { left: rect.left, right: rect.right, top: 0, bottom: map.height }
            : { left: 0, right: map.width, top: rect.top, bottom: rect.bottom };

    return map
        .cellsInRect(box)
        .filter((relative) => {
            // A spanning cell that reaches outside the chosen columns (a
            // column-group header such as "NAT") keeps its own alignment.
            if (area !== 'columns') {
                return true;
            }

            const cell = map.findCell(relative);

            return cell.left >= rect.left && cell.right <= rect.right;
        })
        .map((relative) => ({
            pos: tableStart + relative,
            node: table.nodeAt(relative)!,
        }));
}

function setCellType(
    tr: Transaction,
    cells: { pos: number; node: PMNode }[],
    type: NodeType,
): void {
    for (const { pos, node } of cells) {
        if (node.type !== type) {
            tr.setNodeMarkup(pos, type, node.attrs, node.marks);
        }
    }
}

/** True when every cell of the selected row(s) is a header cell. */
export function isHeaderRowSelected(state: EditorState): boolean {
    if (!isInTable(state)) {
        return false;
    }

    const cells = cellsIn(state, 'rows');

    return (
        cells.length > 0 &&
        cells.every(({ node }) => node.type.name === 'tableHeader')
    );
}

/** The table block holding the cursor, if any. */
export function currentTableBlock(state: EditorState): Found | null {
    return findAncestor(state, 'tableBlock');
}

/** The note holding the cursor, if any. */
export function currentTableNote(state: EditorState): Found | null {
    return findAncestor(state, 'tableNote');
}

/** Alignment of the cell holding the cursor. */
export function currentCellAlign(state: EditorState): CellAlign | null {
    const cell =
        findAncestor(state, 'tableCell') ?? findAncestor(state, 'tableHeader');

    return (cell?.node.attrs.align as CellAlign | null) ?? null;
}

function createTableBlock(editor: Editor, rows: number, cols: number): PMNode {
    const { nodes } = editor.schema;
    const makeRow = (type: NodeType) =>
        nodes.tableRow.create(
            null,
            Array.from({ length: cols }, () => type.createAndFill()!),
        );

    return nodes.tableBlock.create(null, [
        nodes.tableCaption.create(),
        nodes.table.create(null, [
            makeRow(nodes.tableHeader),
            ...Array.from({ length: Math.max(rows - 1, 1) }, () =>
                makeRow(nodes.tableCell),
            ),
        ]),
        nodes.tableNotes.create(),
    ]);
}

export const TableBlock = Node.create({
    name: 'tableBlock',
    group: 'block',
    content: 'tableCaption table tableNotes',
    isolating: true,
    defining: true,

    parseHTML() {
        return [{ tag: 'figure[data-type="table-block"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'figure',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'table-block',
                class: 'ms-table-block',
            }),
            0,
        ];
    },

    addCommands() {
        return {
            insertTableBlock:
                ({ rows = 3, cols = 3 } = {}) =>
                ({ tr, dispatch, editor }) => {
                    const node = createTableBlock(
                        editor,
                        Math.min(Math.max(rows, 2), 50),
                        Math.min(Math.max(cols, 1), 12),
                    );

                    if (dispatch) {
                        const start = tr.selection.from;
                        tr.replaceSelectionWith(node);

                        // Put the cursor in the new caption.
                        let caption = -1;
                        tr.doc.nodesBetween(
                            tr.mapping.map(start, -1),
                            tr.doc.content.size,
                            (child, pos) => {
                                if (
                                    caption < 0 &&
                                    child.type.name === 'tableCaption'
                                ) {
                                    caption = pos + 1;
                                }

                                return caption < 0;
                            },
                        );

                        if (caption >= 0) {
                            tr.setSelection(
                                TextSelection.create(tr.doc, caption),
                            );
                        }

                        tr.scrollIntoView();
                    }

                    return true;
                },

            deleteTableBlock:
                () =>
                ({ state, tr, dispatch }) => {
                    const block = currentTableBlock(state);

                    if (!block) {
                        return false;
                    }

                    if (dispatch) {
                        tr.delete(block.pos, block.pos + block.node.nodeSize);
                        tr.setSelection(
                            TextSelection.near(
                                tr.doc.resolve(
                                    Math.min(block.pos, tr.doc.content.size),
                                ),
                            ),
                        );
                    }

                    return true;
                },

            addTableNote:
                () =>
                ({ state, tr, dispatch }) => {
                    const block = currentTableBlock(state);

                    if (!block) {
                        return false;
                    }

                    if (dispatch) {
                        const { notes, notesPos } = parts(block);
                        const at = notesPos + notes.nodeSize - 1;
                        const note = state.schema.nodes.tableNote.create({
                            marker: nextNoteMarker(notes),
                        });

                        tr.insert(at, note);
                        tr.setSelection(TextSelection.create(tr.doc, at + 1));
                        tr.scrollIntoView();
                    }

                    return true;
                },

            setTableNoteMarker:
                (marker) =>
                ({ state, tr, dispatch }) => {
                    const note = currentTableNote(state);

                    if (!note) {
                        return false;
                    }

                    if (dispatch) {
                        tr.setNodeMarkup(note.pos, undefined, {
                            ...note.node.attrs,
                            marker,
                        });
                    }

                    return true;
                },

            setColumnAlign:
                (align) =>
                ({ state, tr, dispatch }) => {
                    if (!isInTable(state)) {
                        return false;
                    }

                    if (dispatch) {
                        for (const { pos, node } of cellsIn(state, 'columns')) {
                            tr.setNodeMarkup(pos, undefined, {
                                ...node.attrs,
                                align,
                            });
                        }
                    }

                    return true;
                },

            toggleHeaderRows:
                () =>
                ({ state, tr, dispatch }) => {
                    if (!isInTable(state)) {
                        return false;
                    }

                    if (dispatch) {
                        const { tableCell, tableHeader } = state.schema.nodes;
                        setCellType(
                            tr,
                            cellsIn(state, 'rows'),
                            isHeaderRowSelected(state)
                                ? tableCell
                                : tableHeader,
                        );
                    }

                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        // Marks the table block holding the cursor (`is-active`), so the
        // editor can show the cell grid while the author works in it.
        return [
            new Plugin({
                key: new PluginKey('tableBlockActive'),
                props: {
                    decorations: (state) => {
                        const block = currentTableBlock(state);

                        return block
                            ? DecorationSet.create(state.doc, [
                                  Decoration.node(
                                      block.pos,
                                      block.pos + block.node.nodeSize,
                                      { class: 'is-active' },
                                  ),
                              ])
                            : null;
                    },
                },
            }),
        ];
    },

    addKeyboardShortcuts() {
        return {
            // Enter in the caption moves to the first cell.
            Enter: ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if ($from.parent.type.name === 'tableCaption') {
                    const block = currentTableBlock(state);

                    if (!block || !empty) {
                        return true;
                    }

                    const { tablePos } = parts(block);
                    // table > row > cell > paragraph
                    const inside = tablePos + 4;

                    return editor.commands.setTextSelection(inside);
                }

                if ($from.parent.type.name === 'tableNote') {
                    const note = currentTableNote(state);

                    // Enter on an empty note leaves the table.
                    if (note && note.node.content.size === 0) {
                        const block = currentTableBlock(state)!;
                        const after = block.pos + block.node.nodeSize;

                        return editor
                            .chain()
                            .command(({ tr }) => {
                                tr.delete(
                                    note.pos,
                                    note.pos + note.node.nodeSize,
                                );
                                const end = tr.mapping.map(after);
                                const next = tr.doc.nodeAt(end);

                                if (!next || !next.isTextblock) {
                                    tr.insert(
                                        end,
                                        state.schema.nodes.paragraph.create(),
                                    );
                                }

                                tr.setSelection(
                                    TextSelection.create(tr.doc, end + 1),
                                );

                                return true;
                            })
                            .scrollIntoView()
                            .run();
                    }

                    return editor.commands.addTableNote();
                }

                return false;
            },

            // Backspace at the start of the caption must not unwrap it, and
            // at the start of an empty note removes the note.
            Backspace: ({ editor }) => {
                const { state } = editor;
                const { $from, empty } = state.selection;

                if (!empty || $from.parentOffset > 0) {
                    return false;
                }

                if ($from.parent.type.name === 'tableCaption') {
                    return true;
                }

                if (
                    $from.parent.type.name === 'tableNote' &&
                    $from.parent.content.size === 0
                ) {
                    const note = currentTableNote(state)!;

                    return editor
                        .chain()
                        .command(({ tr }) => {
                            tr.delete(note.pos, note.pos + note.node.nodeSize);
                            tr.setSelection(
                                TextSelection.near(
                                    tr.doc.resolve(note.pos),
                                    -1,
                                ),
                            );

                            return true;
                        })
                        .run();
                }

                return false;
            },
        };
    },
});

export const TableCaption = Node.create({
    name: 'tableCaption',
    content: 'inline*',
    marks: 'bold italic subscript superscript',
    defining: true,

    parseHTML() {
        return [{ tag: 'figcaption' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'figcaption',
            mergeAttributes(HTMLAttributes, { class: 'ms-table-caption' }),
            0,
        ];
    },
});

export const TableNotes = Node.create({
    name: 'tableNotes',
    content: 'tableNote*',

    parseHTML() {
        return [{ tag: 'div[data-type="table-notes"]' }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'div',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'table-notes',
                class: 'ms-table-notes',
            }),
            0,
        ];
    },
});

export const TableNote = Node.create({
    name: 'tableNote',
    content: 'inline*',
    marks: 'bold italic subscript superscript',
    defining: true,

    addAttributes() {
        return {
            marker: {
                default: 'a',
                parseHTML: (element) =>
                    element.getAttribute('data-marker') ?? '',
                renderHTML: (attributes) => ({
                    'data-marker': String(attributes.marker ?? ''),
                }),
            },
        };
    },

    parseHTML() {
        return [{ tag: 'p[data-type="table-note"]', priority: 60 }];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'p',
            mergeAttributes(HTMLAttributes, {
                'data-type': 'table-note',
                class: 'ms-table-note',
            }),
            0,
        ];
    },
});

/** Column widths are never stored: tables keep their natural width. */
const noColwidth = {
    default: null,
    parseHTML: () => null,
    renderHTML: () => ({}),
};

/** The prosemirror-tables table, allowed only inside a table block. */
export const JournalTable = Table.extend({
    group: 'tableBlockContent',

    addCommands() {
        return {
            ...this.parent?.(),
            // Deleting the table deletes the whole block (caption and notes).
            deleteTable:
                () =>
                ({ commands }) =>
                    commands.deleteTableBlock(),
            insertTable:
                (options) =>
                ({ commands }) =>
                    commands.insertTableBlock({
                        rows: options?.rows,
                        cols: options?.cols,
                    }),
        };
    },
}).configure({
    resizable: false,
    View: null,
    allowTableNodeSelection: false,
});

export const JournalTableRow = TableRow;

/** A cell holds paragraphs only: no lists, images or nested tables. */
export const JournalTableCell = TableCell.extend({
    content: 'paragraph+',

    addAttributes() {
        return { ...this.parent?.(), colwidth: noColwidth };
    },
});

export const JournalTableHeader = TableHeader.extend({
    content: 'paragraph+',

    addAttributes() {
        return { ...this.parent?.(), colwidth: noColwidth };
    },
});
