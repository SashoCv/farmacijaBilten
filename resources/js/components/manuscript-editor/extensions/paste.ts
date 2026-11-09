import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';

/*
 * Paste from Word, Excel, LibreOffice or a web page (plan.md §6.3 "Paste from
 * Word"). The HTML is cleaned before ProseMirror parses it:
 *
 *  - Office junk goes: <style>, <meta>, comments, conditional list bullets,
 *    <o:p> and other namespaced tags, <col>/<colgroup>;
 *  - inline formatting that matters is kept as tags (bold, italic, sub, sup,
 *    including Word's vertical-align spans), everything else is unwrapped;
 *  - every attribute is dropped except colspan, rowspan and a cell's
 *    alignment (left / center / right);
 *  - a pasted table becomes a journal table block (caption above, notes
 *    below). A preceding "Table 3. …" paragraph becomes its caption, and the
 *    first row becomes the header when the source had none.
 *
 * Pasting inside an existing table is left to prosemirror-tables, which
 * fills the cells from the cursor on.
 */

const KEEP_TAGS = new Set([
    'p',
    'br',
    'b',
    'strong',
    'i',
    'em',
    'sub',
    'sup',
    'ul',
    'ol',
    'li',
    'table',
    'thead',
    'tbody',
    'tfoot',
    'tr',
    'td',
    'th',
    'figure',
    'figcaption',
    'div',
]);

const DROP_TAGS = new Set([
    'style',
    'script',
    'meta',
    'link',
    'title',
    'head',
    'xml',
    'col',
    'colgroup',
    'img',
    'svg',
    'o:p',
]);

const BLOCK_TAGS = new Set([
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'blockquote',
    'pre',
]);

const CAPTION_LABEL = /^\s*(?:Table|Табела)\s+[A-Z]?\.?\d+\.?\s*/i;

function alignOf(element: Element): string | null {
    const style = (element as HTMLElement).style?.textAlign ?? '';
    const value = (style || element.getAttribute('align') || '')
        .trim()
        .toLowerCase();

    return ['left', 'center', 'right'].includes(value) ? value : null;
}

function unwrap(element: Element): void {
    element.replaceWith(...Array.from(element.childNodes));
}

function rename(element: Element, tag: string): Element {
    const replacement = element.ownerDocument.createElement(tag);
    replacement.append(...Array.from(element.childNodes));
    element.replaceWith(replacement);

    return replacement;
}

/** Wraps an element's children in the given inline tags. */
function wrapChildren(element: Element, tags: string[]): void {
    for (const tag of tags) {
        const wrapper = element.ownerDocument.createElement(tag);
        wrapper.append(...Array.from(element.childNodes));
        element.append(wrapper);
    }
}

/** Removes comments, and Word's "[if !supportLists]" bullet runs. */
function removeComments(root: Node): void {
    const walker = root.ownerDocument!.createTreeWalker(
        root,
        NodeFilter.SHOW_COMMENT,
    );
    const comments: Comment[] = [];

    while (walker.nextNode()) {
        comments.push(walker.currentNode as Comment);
    }

    for (const comment of comments) {
        if (/\[if !supportLists\]/i.test(comment.data)) {
            let next = comment.nextSibling;

            while (
                next &&
                !(next.nodeType === 8 && /endif/i.test((next as Comment).data))
            ) {
                const remove = next;
                next = next.nextSibling;
                remove.remove();
            }
        }
    }

    for (const comment of comments) {
        comment.remove();
    }
}

function cleanElement(element: Element): void {
    const tag = element.tagName.toLowerCase();

    if (DROP_TAGS.has(tag) || (tag.includes(':') && tag.endsWith(':p'))) {
        element.remove();

        return;
    }

    // Read before the children lose their attributes.
    let align: string | null = null;

    if (tag === 'td' || tag === 'th') {
        align = alignOf(element);

        // Word aligns the paragraphs inside the cell, not the cell.
        if (!align) {
            const aligns = Array.from(element.querySelectorAll('p')).map(
                alignOf,
            );

            if (
                aligns.length > 0 &&
                aligns.every((value) => value && value === aligns[0])
            ) {
                align = aligns[0];
            }
        }
    }

    // Children first, so unwrapping does not skip nodes.
    for (const child of Array.from(element.children)) {
        cleanElement(child);
    }

    const style = (element as HTMLElement).style;
    const inline: string[] = [];

    if (style) {
        const vertical = style.verticalAlign;

        if (vertical === 'sub') {
            inline.push('sub');
        } else if (vertical === 'super') {
            inline.push('sup');
        }

        if (
            ['bold', '700', '800', '900'].includes(style.fontWeight) &&
            !['b', 'strong', 'th'].includes(tag)
        ) {
            inline.push('b');
        }

        if (style.fontStyle === 'italic' && !['i', 'em'].includes(tag)) {
            inline.push('i');
        }
    }

    const keep: Record<string, string> = {};

    for (const name of ['colspan', 'rowspan']) {
        const value = Number.parseInt(element.getAttribute(name) ?? '', 10);

        if (value > 1) {
            keep[name] = String(Math.min(value, 50));
        }
    }

    if (align && align !== 'left') {
        keep.align = align;
    }

    for (const name of element.getAttributeNames()) {
        element.removeAttribute(name);
    }

    for (const [name, value] of Object.entries(keep)) {
        element.setAttribute(name, value);
    }

    if (inline.length > 0) {
        wrapChildren(element, inline);
    }

    if (BLOCK_TAGS.has(tag)) {
        rename(element, 'p');
    } else if (!KEEP_TAGS.has(tag)) {
        unwrap(element);
    }
}

function isEmptyRow(row: Element): boolean {
    return Array.from(row.children).every(
        (cell) => (cell.textContent ?? '').replace(/ /g, ' ').trim() === '',
    );
}

/** Turns a cleaned <table> into the journal table block markup. */
function wrapTable(table: HTMLTableElement): void {
    const doc = table.ownerDocument;
    const rows = Array.from(table.querySelectorAll('tr'));

    // Empty spacer rows go, unless a rowspan makes removal unsafe.
    if (!table.querySelector('[rowspan]')) {
        for (const row of rows) {
            if (isEmptyRow(row) && rows.length > 1) {
                row.remove();
            }
        }
    }

    // The first row becomes the header when the source marked none.
    const first = table.querySelector('tr');

    if (first && !table.querySelector('th')) {
        for (const cell of Array.from(first.children)) {
            if (cell.tagName.toLowerCase() === 'td') {
                const header = doc.createElement('th');
                header.append(...Array.from(cell.childNodes));

                for (const name of cell.getAttributeNames()) {
                    header.setAttribute(name, cell.getAttribute(name)!);
                }

                cell.replaceWith(header);
            }
        }
    }

    // Header weight comes from the stylesheet, not from pasted bold.
    for (const bold of Array.from(table.querySelectorAll('th b, th strong'))) {
        unwrap(bold);
    }

    const figure = doc.createElement('figure');
    figure.setAttribute('data-type', 'table-block');
    const caption = doc.createElement('figcaption');
    const notes = doc.createElement('div');
    notes.setAttribute('data-type', 'table-notes');

    // "Table 3. Caption" right above the table becomes the caption.
    const previous = table.previousElementSibling;

    if (
        previous &&
        previous.tagName.toLowerCase() === 'p' &&
        CAPTION_LABEL.test(previous.textContent ?? '')
    ) {
        caption.innerHTML = previous.innerHTML;
        const firstText = caption.ownerDocument.createTreeWalker(
            caption,
            NodeFilter.SHOW_TEXT,
        );

        // Strip the label from the leading text nodes.
        let rest =
            (previous.textContent ?? '').match(CAPTION_LABEL)?.[0].length ?? 0;

        while (rest > 0 && firstText.nextNode()) {
            const node = firstText.currentNode as Text;
            const cut = Math.min(rest, node.data.length);
            node.data = node.data.slice(cut);
            rest -= cut;
        }

        caption.innerHTML = caption.innerHTML.replace(/\.\s*$/, '');
        previous.remove();
    }

    table.replaceWith(figure);
    figure.append(caption, table, notes);
}

export function cleanPastedHTML(html: string, wrapTables: boolean): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const body = doc.body;

    // Copied from this editor: already clean, keep its structure.
    const internal = body.querySelector('[data-pm-slice]') !== null;

    if (!internal) {
        removeComments(body);

        for (const child of Array.from(body.children)) {
            cleanElement(child);
        }
    }

    if (wrapTables) {
        const tables = Array.from(body.querySelectorAll('table')).filter(
            (table) =>
                !table.parentElement?.closest('table') &&
                !table.closest('figure[data-type="table-block"]'),
        );

        for (const table of tables) {
            wrapTable(table);
        }
    }

    return body.innerHTML;
}

function selectionInTable(view: EditorView): boolean {
    const { $from } = view.state.selection;

    for (let depth = $from.depth; depth > 0; depth--) {
        if ($from.node(depth).type.spec.tableRole === 'table') {
            return true;
        }
    }

    return false;
}

export const PasteCleanup = Extension.create({
    name: 'pasteCleanup',

    addProseMirrorPlugins() {
        return [
            new Plugin({
                key: new PluginKey('pasteCleanup'),
                props: {
                    // Tables become journal table blocks where the schema
                    // has them (section bodies), never inside a table.
                    transformPastedHTML: (html, view) =>
                        cleanPastedHTML(
                            html,
                            view.state.schema.nodes.tableBlock !== undefined &&
                                !selectionInTable(view),
                        ),
                },
            }),
        ];
    },
});
