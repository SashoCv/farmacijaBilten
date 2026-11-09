import { Extension, mergeAttributes, Node } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import Heading from '@tiptap/extension-heading';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import UniqueID from '@tiptap/extension-unique-id';
import { Placeholder } from '@tiptap/extensions';
import { Fragment, Slice } from '@tiptap/pm/model';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import StarterKit from '@tiptap/starter-kit';
import { Figure, FigureCaption } from './figure';
import type { FigureOptions } from './figure';
import { PasteCleanup } from './paste';
import {
    JournalTable,
    JournalTableCell,
    JournalTableHeader,
    JournalTableRow,
    TableBlock,
    TableCaption,
    TableNote,
    TableNotes,
} from './table-block';

/**
 * What a field may hold (resources/js/types/manuscript.ts):
 *  - `body`: a section body. Paragraphs, lists, journal tables and, with
 *    `headings`, level-2 subheadings (printed italic);
 *  - `prose`: paragraphs with the four marks (abstract, acknowledgements,
 *    references: one paragraph per reference);
 *  - `inline`: exactly one paragraph with the four marks (titles).
 */
export type ManuscriptVariant = 'body' | 'prose' | 'inline';

export type ManuscriptExtensionOptions = {
    variant?: ManuscriptVariant;
    /** Body only: allow level-2 subheadings. */
    headings?: boolean;
    /** Hint shown while the whole field is empty. */
    placeholder?: string;
    /** Hints in empty table captions, notes and figure captions (translated by the caller). */
    placeholders?: {
        tableCaption?: string;
        tableNote?: string;
        figureCaption?: string;
    };
    /** Body only: figures, with the page's upload and image URLs. */
    figures?: FigureOptions;
};

const TABLE_PLACEHOLDERS = {
    tableCaption: 'Table caption (no final period)',
    tableNote: 'Table note',
    figureCaption: 'Figure caption (no final period)',
};

/**
 * Subheadings: level 2 in the JSON, an <h3> on the page (the section
 * heading above the editor is the <h2>, as in the rendered article).
 */
const Subheading = Heading.extend({
    parseHTML() {
        return [
            { tag: 'h3', attrs: { level: 2 } },
            { tag: 'h2', attrs: { level: 2 } },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return [
            'h3',
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
                class: 'ms-subheading',
            }),
            0,
        ];
    },
}).configure({ levels: [2] });

/** A document of exactly one paragraph. */
const SingleParagraphDocument = Node.create({
    name: 'doc',
    topNode: true,
    content: 'paragraph',
});

/** Collects the inline content of every textblock in a slice. */
function inlineContent(
    fragment: Fragment,
    out: PMNode[],
    schema: PMNode['type']['schema'],
): void {
    fragment.forEach((node) => {
        if (node.isTextblock) {
            if (out.length > 0) {
                out.push(schema.text(' '));
            }

            node.content.forEach((child) => {
                out.push(child);
            });
        } else if (node.isInline) {
            out.push(node);
        } else {
            inlineContent(node.content, out, schema);
        }
    });
}

/**
 * Titles: Enter does nothing, and pasted paragraphs are joined into one line.
 */
const InlineOnly = Extension.create({
    name: 'inlineOnly',

    addKeyboardShortcuts() {
        return {
            Enter: () => true,
            'Shift-Enter': () => true,
            'Mod-Enter': () => true,
        };
    },

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('inlineOnly'),
                props: {
                    transformPasted: (slice, view) => {
                        if (
                            slice.content.childCount <= 1 &&
                            slice.content.firstChild?.isTextblock !== false
                        ) {
                            return slice;
                        }

                        const nodes: PMNode[] = [];
                        inlineContent(slice.content, nodes, view.state.schema);

                        return new Slice(Fragment.from(nodes), 0, 0);
                    },
                },
            }),
        ];
    },
});

/**
 * The manuscript schema. Only the marks the journal prints (bold, italic,
 * sub, sup); no links, underline, colours or code (plan.md §6.3). Without
 * options it is the lab editor's body schema (tables, no headings).
 */
export function manuscriptExtensions(
    options: ManuscriptExtensionOptions = {},
): Extensions {
    const variant = options.variant ?? 'body';
    const body = variant === 'body';
    const headings = body && options.headings === true;
    const tablePlaceholders = {
        ...TABLE_PLACEHOLDERS,
        ...options.placeholders,
    };
    const fieldPlaceholder = options.placeholder ?? '';

    const extensions: Extensions = [
        StarterKit.configure({
            blockquote: false,
            code: false,
            codeBlock: false,
            heading: false,
            horizontalRule: false,
            link: false,
            strike: false,
            underline: false,
            bulletList: body ? {} : false,
            orderedList: body ? {} : false,
            listItem: body ? {} : false,
            listKeymap: body ? {} : false,
            hardBreak: body ? {} : false,
            document: variant === 'inline' ? false : undefined,
            trailingNode: variant === 'inline' ? false : undefined,
        }),
        // x₂ and x² cannot be combined.
        Subscript.extend({ excludes: 'superscript' }),
        Superscript.extend({ excludes: 'subscript' }),
        PasteCleanup,
        Placeholder.configure({
            includeChildren: true,
            showOnlyCurrent: false,
            placeholder: ({ node, editor }) => {
                if (node.type.name === 'tableCaption') {
                    return tablePlaceholders.tableCaption;
                }

                if (node.type.name === 'tableNote') {
                    return tablePlaceholders.tableNote;
                }

                if (node.type.name === 'figureCaption') {
                    return tablePlaceholders.figureCaption;
                }

                // The field hint only while the whole field is empty.
                return node.type.name === 'paragraph' &&
                    editor.state.doc.childCount === 1 &&
                    editor.isEmpty
                    ? fieldPlaceholder
                    : '';
            },
        }),
    ];

    if (headings) {
        extensions.push(Subheading);
    }

    if (variant === 'inline') {
        extensions.push(SingleParagraphDocument, InlineOnly);
    }

    if (body) {
        extensions.push(
            TableBlock,
            TableCaption,
            TableNotes,
            TableNote,
            JournalTable,
            JournalTableRow,
            JournalTableHeader,
            JournalTableCell,
        );

        if (options.figures) {
            extensions.push(Figure.configure(options.figures), FigureCaption);
        }
    }

    if (variant !== 'inline') {
        extensions.push(
            UniqueID.configure({
                types: body
                    ? [
                          'paragraph',
                          ...(headings ? ['heading'] : []),
                          'tableBlock',
                          'tableNote',
                          'bulletList',
                          'orderedList',
                      ]
                    : ['paragraph'],
            }),
        );
    }

    return extensions;
}
