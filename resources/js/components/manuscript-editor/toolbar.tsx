import { isInTable } from '@tiptap/pm/tables';
import { useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/react';
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    BetweenHorizontalEnd,
    BetweenHorizontalStart,
    BetweenVerticalEnd,
    BetweenVerticalStart,
    Bold,
    Heading2,
    ImagePlus,
    ImageUp,
    Italic,
    List,
    ListOrdered,
    PanelTop,
    Redo2,
    StickyNote,
    Subscript,
    Superscript,
    Table,
    TableCellsMerge,
    TableCellsSplit,
    Trash2,
    Undo2,
} from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
    currentCellAlign,
    currentTableNote,
    isHeaderRowSelected,
    NOTE_MARKERS,
} from './extensions/table-block';
import type { CellAlign } from './extensions/table-block';
import { currentFigure } from './extensions/figure';
import { FIGURE_TYPES, FIGURE_WIDTHS } from './extensions/figure-shared';
import type { FigureWidth } from './extensions/figure-shared';
import { SymbolPicker } from './symbol-picker';
import { ToolButton, ToolGroup } from './tool-button';

const ICON = 'size-4';

function clamp(value: number, min: number, max: number): number {
    return Number.isFinite(value) ? Math.min(Math.max(value, min), max) : min;
}

const IDLE = {
    bold: false,
    italic: false,
    subscript: false,
    superscript: false,
    canUndo: false,
    canRedo: false,
    hasTables: false,
    hasHeadings: false,
    hasLists: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    inTable: false,
    inBlock: false,
    canMerge: false,
    canSplit: false,
    headerRow: false,
    align: null as CellAlign | null,
    noteMarker: null as string | null,
    hasFigures: false,
    figurePos: null as number | null,
    figureWidth: null as number | null,
};

type Props = {
    /** The editor the buttons act on; null disables them (nothing focused yet). */
    editor: Editor | null;
    /** Shown at the start: which field the toolbar acts on. */
    target?: ReactNode;
    className?: string;
};

/**
 * The formatting toolbar. It works with any manuscript editor and offers
 * what that editor's schema has: subheadings, lists and tables only in
 * section bodies, the marks and symbols everywhere.
 */
export function Toolbar({ editor, target, className }: Props) {
    const { t } = useT();
    const id = useId();
    const [rows, setRows] = useState(5);
    const [cols, setCols] = useState(4);
    const figureFiles = useRef<HTMLInputElement>(null);

    const state =
        useEditorState({
            editor,
            selector: ({ editor: e }) => {
                if (!e || e.isDestroyed) {
                    return IDLE;
                }

                const { nodes } = e.schema;
                const hasTables = nodes.tableBlock !== undefined;
                const inTable = hasTables && isInTable(e.state);
                const note = hasTables ? currentTableNote(e.state) : null;
                const figure =
                    nodes.figure !== undefined ? currentFigure(e.state) : null;

                return {
                    bold: e.isActive('bold'),
                    italic: e.isActive('italic'),
                    subscript: e.isActive('subscript'),
                    superscript: e.isActive('superscript'),
                    canUndo: e.can().undo(),
                    canRedo: e.can().redo(),
                    hasTables,
                    hasHeadings: nodes.heading !== undefined,
                    hasLists: nodes.bulletList !== undefined,
                    heading:
                        nodes.heading !== undefined &&
                        e.isActive('heading', { level: 2 }),
                    bulletList: e.isActive('bulletList'),
                    orderedList: e.isActive('orderedList'),
                    inTable,
                    inBlock: hasTables && e.can().addTableNote(),
                    canMerge: inTable && e.can().mergeCells(),
                    canSplit: inTable && e.can().splitCell(),
                    headerRow: inTable && isHeaderRowSelected(e.state),
                    align: inTable ? currentCellAlign(e.state) : null,
                    noteMarker: note
                        ? String(note.node.attrs.marker ?? '')
                        : null,
                    hasFigures: nodes.figure !== undefined,
                    figurePos: figure ? figure.pos : null,
                    figureWidth: figure
                        ? Number(figure.node.attrs.width ?? 100)
                        : null,
                };
            },
        }) ?? IDLE;

    const off = editor === null;

    const run =
        (command: (chain: ReturnType<Editor['chain']>) => unknown) => () => {
            if (editor && !editor.isDestroyed) {
                command(editor.chain().focus());
            }
        };

    const align = (value: CellAlign) =>
        run((c) =>
            c.setColumnAlign(state.align === value ? null : value).run(),
        );

    // Escape in the toolbar returns to the text.
    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape' && editor) {
            event.preventDefault();
            editor.commands.focus();
        }
    };

    /** An element of the figure's node view (its alt input, its file input). */
    const figurePart = (selector: string) => {
        if (!editor || state.figurePos === null) {
            return null;
        }

        const dom = editor.view.nodeDOM(state.figurePos);

        return dom instanceof HTMLElement
            ? dom.querySelector<HTMLElement>(selector)
            : null;
    };

    const noTables = !state.hasTables;
    const inFigure = state.figurePos !== null;
    const tableOff = !state.inTable;

    return (
        <div
            role="toolbar"
            aria-label={t(
                'Formatting toolbar (Alt+F10 from the text, Escape to return)',
            )}
            data-manuscript-toolbar=""
            onKeyDown={onKeyDown}
            className={cn(
                'sticky top-0 z-10 flex flex-wrap items-center gap-1.5 border-b border-border bg-background/95 px-2 py-1.5 backdrop-blur',
                className,
            )}
        >
            {target}

            <ToolGroup label={t('History')}>
                <ToolButton
                    label={t('Undo (Ctrl+Z)')}
                    disabled={!state.canUndo}
                    onRun={run((c) => c.undo().run())}
                >
                    <Undo2 aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Redo (Ctrl+Shift+Z)')}
                    disabled={!state.canRedo}
                    onRun={run((c) => c.redo().run())}
                >
                    <Redo2 aria-hidden="true" className={ICON} />
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Text')}>
                <ToolButton
                    label={t('Bold (Ctrl+B)')}
                    disabled={off}
                    pressed={state.bold}
                    onRun={run((c) => c.toggleBold().run())}
                >
                    <Bold aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Italic (Ctrl+I)')}
                    disabled={off}
                    pressed={state.italic}
                    onRun={run((c) => c.toggleItalic().run())}
                >
                    <Italic aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Subscript (Ctrl+,)')}
                    disabled={off}
                    pressed={state.subscript}
                    onRun={run((c) => c.toggleSubscript().run())}
                >
                    <Subscript aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Superscript (Ctrl+.)')}
                    disabled={off}
                    pressed={state.superscript}
                    onRun={run((c) => c.toggleSuperscript().run())}
                >
                    <Superscript aria-hidden="true" className={ICON} />
                </ToolButton>
                <SymbolPicker editor={editor} />
            </ToolGroup>

            <ToolGroup label={t('Paragraph')}>
                <ToolButton
                    label={t('Subheading (italic, level 2)')}
                    disabled={!state.hasHeadings}
                    pressed={state.heading}
                    onRun={run((c) => c.toggleHeading({ level: 2 }).run())}
                >
                    <Heading2 aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Bulleted list')}
                    disabled={!state.hasLists}
                    pressed={state.bulletList}
                    onRun={run((c) => c.toggleBulletList().run())}
                >
                    <List aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Numbered list')}
                    disabled={!state.hasLists}
                    pressed={state.orderedList}
                    onRun={run((c) => c.toggleOrderedList().run())}
                >
                    <ListOrdered aria-hidden="true" className={ICON} />
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Insert table')}>
                <label
                    htmlFor={`${id}-rows`}
                    className="text-xs text-muted-foreground"
                >
                    {t('Rows')}
                </label>
                <input
                    id={`${id}-rows`}
                    type="number"
                    min={2}
                    max={50}
                    value={rows}
                    disabled={noTables}
                    onChange={(event) =>
                        setRows(clamp(event.target.valueAsNumber, 2, 50))
                    }
                    className="h-8 w-12 rounded-md border border-input bg-background px-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                />
                <label
                    htmlFor={`${id}-cols`}
                    className="text-xs text-muted-foreground"
                >
                    {t('Cols')}
                </label>
                <input
                    id={`${id}-cols`}
                    type="number"
                    min={1}
                    max={12}
                    value={cols}
                    disabled={noTables}
                    onChange={(event) =>
                        setCols(clamp(event.target.valueAsNumber, 1, 12))
                    }
                    className="h-8 w-12 rounded-md border border-input bg-background px-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                />
                <ToolButton
                    label={t('Insert a {rows} × {cols} table', { rows, cols })}
                    disabled={noTables}
                    onRun={run((c) => c.insertTableBlock({ rows, cols }).run())}
                >
                    <Table aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Insert')}</span>
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Figures')}>
                <ToolButton
                    label={t('Insert figure (image)')}
                    disabled={!state.hasFigures}
                    onRun={() => figureFiles.current?.click()}
                >
                    <ImagePlus aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Figure')}</span>
                </ToolButton>
                <input
                    ref={figureFiles}
                    type="file"
                    multiple
                    accept={FIGURE_TYPES.join(',')}
                    className="sr-only"
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={(event) => {
                        const files = Array.from(event.target.files ?? []);
                        event.target.value = '';

                        if (editor && files.length > 0) {
                            editor
                                .chain()
                                .focus()
                                .insertFigureFiles(files)
                                .run();
                        }
                    }}
                />
                <label htmlFor={`${id}-figure-width`} className="sr-only">
                    {t('Figure width')}
                </label>
                <select
                    id={`${id}-figure-width`}
                    disabled={!inFigure}
                    value={state.figureWidth ?? ''}
                    onChange={(event) =>
                        editor
                            ?.chain()
                            .focus()
                            .setFigureWidth(
                                Number(event.target.value) as FigureWidth,
                            )
                            .run()
                    }
                    title={t('Figure width (cursor in a figure caption)')}
                    className="h-8 rounded-md border border-input bg-background px-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                >
                    {!inFigure && <option value="">{t('Width')}</option>}
                    {FIGURE_WIDTHS.map((value) => (
                        <option key={value} value={value}>
                            {value} %
                        </option>
                    ))}
                </select>
                <ToolButton
                    label={t('Describe image')}
                    disabled={!inFigure}
                    onRun={() => figurePart('[data-figure-alt]')?.focus()}
                >
                    <span className="text-xs">{t('Alt text')}</span>
                </ToolButton>
                <ToolButton
                    label={t('Replace image')}
                    disabled={!inFigure}
                    onRun={() => figurePart('[data-figure-file]')?.click()}
                >
                    <ImageUp aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Delete figure')}
                    disabled={!inFigure}
                    onRun={run((c) => c.deleteFigure().run())}
                >
                    <Trash2 aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Figure')}</span>
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Rows')}>
                <ToolButton
                    label={t('Add row above')}
                    disabled={tableOff}
                    onRun={run((c) => c.addRowBefore().run())}
                >
                    <BetweenHorizontalStart
                        aria-hidden="true"
                        className={ICON}
                    />
                </ToolButton>
                <ToolButton
                    label={t('Add row below')}
                    disabled={tableOff}
                    onRun={run((c) => c.addRowAfter().run())}
                >
                    <BetweenHorizontalEnd aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Delete row')}
                    disabled={tableOff}
                    onRun={run((c) => c.deleteRow().run())}
                >
                    <Trash2 aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Row')}</span>
                </ToolButton>
                <ToolButton
                    label={t('Header row (toggle for the selected rows)')}
                    disabled={tableOff}
                    pressed={state.headerRow}
                    onRun={run((c) => c.toggleHeaderRows().run())}
                >
                    <PanelTop aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Header')}</span>
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Columns')}>
                <ToolButton
                    label={t('Add column left')}
                    disabled={tableOff}
                    onRun={run((c) => c.addColumnBefore().run())}
                >
                    <BetweenVerticalStart aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Add column right')}
                    disabled={tableOff}
                    onRun={run((c) => c.addColumnAfter().run())}
                >
                    <BetweenVerticalEnd aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Delete column')}
                    disabled={tableOff}
                    onRun={run((c) => c.deleteColumn().run())}
                >
                    <Trash2 aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Col')}</span>
                </ToolButton>
                <ToolButton
                    label={t('Align column left')}
                    disabled={tableOff}
                    pressed={state.inTable && state.align === 'left'}
                    onRun={align('left')}
                >
                    <AlignLeft aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Center column')}
                    disabled={tableOff}
                    pressed={state.inTable && state.align === 'center'}
                    onRun={align('center')}
                >
                    <AlignCenter aria-hidden="true" className={ICON} />
                </ToolButton>
                <ToolButton
                    label={t('Align column right')}
                    disabled={tableOff}
                    pressed={state.inTable && state.align === 'right'}
                    onRun={align('right')}
                >
                    <AlignRight aria-hidden="true" className={ICON} />
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Cells')}>
                <ToolButton
                    label={t(
                        'Merge selected cells (select with Shift+arrows or drag)',
                    )}
                    disabled={!state.canMerge}
                    onRun={run((c) => c.mergeCells().run())}
                >
                    <TableCellsMerge aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Merge')}</span>
                </ToolButton>
                <ToolButton
                    label={t('Split merged cell')}
                    disabled={!state.canSplit}
                    onRun={run((c) => c.splitCell().run())}
                >
                    <TableCellsSplit aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Split')}</span>
                </ToolButton>
            </ToolGroup>

            <ToolGroup label={t('Table notes and table')}>
                <ToolButton
                    label={t('Add a note under the table')}
                    disabled={!state.inBlock}
                    onRun={run((c) => c.addTableNote().run())}
                >
                    <StickyNote aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Note')}</span>
                </ToolButton>
                <label htmlFor={`${id}-marker`} className="sr-only">
                    {t('Note marker')}
                </label>
                <select
                    id={`${id}-marker`}
                    disabled={state.noteMarker === null}
                    value={state.noteMarker ?? ''}
                    onChange={(event) =>
                        editor
                            ?.chain()
                            .setTableNoteMarker(event.target.value)
                            .run()
                    }
                    title={t('Note marker (cursor in a note)')}
                    className="h-8 rounded-md border border-input bg-background px-1 text-sm focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40"
                >
                    {NOTE_MARKERS.map((marker) => (
                        <option key={marker} value={marker}>
                            {marker === '' ? t('no marker') : marker}
                        </option>
                    ))}
                </select>
                <ToolButton
                    label={t('Delete table (with caption and notes)')}
                    disabled={!state.inBlock}
                    onRun={run((c) => c.deleteTableBlock().run())}
                >
                    <Trash2 aria-hidden="true" className={ICON} />
                    <span className="text-xs">{t('Table')}</span>
                </ToolButton>
            </ToolGroup>
        </div>
    );
}
