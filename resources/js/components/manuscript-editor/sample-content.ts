import type { JSONContent } from '@tiptap/core';

/*
 * Lab sample: three journal tables rebuilt from the printed issue.
 *  - Table 1: 71_2_001 p. 5, Table 1 (header row in bold, "*" note).
 *  - Table 2: 71_2_001 p. 6, Table 2, an EXCERPT (group rows
 *    "Chromatography" / "Spectroscopy" spanning all columns).
 *  - Table 3: 71_2_008 p. 4, Table 1 (two-level header "NAT" / "PIO" over
 *    three columns each, cells merged across rows).
 * Ids are added by the UniqueID extension when the editor loads.
 */

type Inline = string | JSONContent;
type CellAttrs = {
    colspan?: number;
    rowspan?: number;
    align?: 'left' | 'center' | 'right';
};

const text = (value: string, marks: string[] = []): JSONContent => ({
    type: 'text',
    text: value,
    ...(marks.length > 0 ? { marks: marks.map((type) => ({ type })) } : {}),
});

const sub = (value: string) => text(value, ['subscript']);
const sup = (value: string) => text(value, ['superscript']);
const italic = (value: string) => text(value, ['italic']);

function inline(parts: Inline[]): JSONContent[] {
    return parts
        .filter((part) => part !== '')
        .map((part) => (typeof part === 'string' ? text(part) : part));
}

const paragraph = (...parts: Inline[]): JSONContent => ({
    type: 'paragraph',
    ...(parts.length > 0 ? { content: inline(parts) } : {}),
});

function cell(
    type: 'tableCell' | 'tableHeader',
    content: Inline | Inline[],
    attrs: CellAttrs = {},
): JSONContent {
    const parts = Array.isArray(content) ? content : [content];

    return {
        type,
        attrs: { colspan: 1, rowspan: 1, align: null, ...attrs },
        content: [paragraph(...parts)],
    };
}

const td = (content: Inline | Inline[], attrs?: CellAttrs) =>
    cell('tableCell', content, attrs);
const th = (content: Inline | Inline[], attrs?: CellAttrs) =>
    cell('tableHeader', content, attrs);
const row = (...cells: JSONContent[]): JSONContent => ({
    type: 'tableRow',
    content: cells,
});

function tableBlock(
    caption: Inline[],
    rows: JSONContent[],
    notes: { marker: string; content: Inline[] }[] = [],
): JSONContent {
    return {
        type: 'tableBlock',
        content: [
            { type: 'tableCaption', content: inline(caption) },
            { type: 'table', content: rows },
            {
                type: 'tableNotes',
                content: notes.map((note) => ({
                    type: 'tableNote',
                    attrs: { marker: note.marker },
                    content: inline(note.content),
                })),
            },
        ],
    };
}

const thiosulfate = ['Na', sub('2'), 'S', sub('2'), 'O', sub('3')];
const permanganate = ['KMnO', sub('4')];

const table1 = tableBlock(
    [
        'Characteristics of methods for sugar analysis based on reducing properties of monosaccharides',
    ],
    [
        row(
            th('Method'),
            th('Reaction type'),
            th('Titrant'),
            th('Application'),
        ),
        row(
            td('Luff-Schoorl'),
            td('Iodometric (back titration)'),
            td(thiosulfate),
            td('Food analysis'),
        ),
        row(
            td('Bertrand’s'),
            td(['Redox (', ...permanganate, ' titration)']),
            td(permanganate),
            td(['Food & industrial analysis', sup('*')]),
        ),
        row(
            td('Benedict’s'),
            td('Iodometric'),
            td(thiosulfate),
            td('Clinical & food analyses'),
        ),
        row(
            td('Munson & Walker'),
            td('Gravimetric + Titration'),
            td(thiosulfate),
            td(['Industrial analysis', sup('*')]),
        ),
    ],
    [
        {
            marker: '*',
            content: [
                'A control process used in the sugar industry at continuous and semi-batch level.',
            ],
        },
    ],
);

const group = (label: string) =>
    row(td(label, { colspan: 3, align: 'center' }));

const table2 = tableBlock(
    [
        'Examples of the application of chromatographic and spectroscopic techniques in the analysis of sugars in fruit juices (excerpt)',
    ],
    [
        row(
            th('Analytical technique/ detector type'),
            th('Reference'),
            th('Sample type'),
        ),
        group('Chromatography'),
        row(td('HPLC-RID'), td('Zielinski et al., 2014'), td('Apple juice')),
        row(
            td('HPLC-RID'),
            td('Rokai and Sana, 2020'),
            td('Apple juice, apple pulped juice, carrot juice, cabbage juice'),
        ),
        row(
            td('HPLC-ELSD'),
            td('Ma et al., 2014'),
            td('Peach, watermelon, apple and cherry'),
        ),
        group('Spectroscopy'),
        row(
            td('FT-NIR spectroscopy'),
            td('Rodriguez-Saona et al., 2001'),
            td('Orange juice'),
        ),
        row(
            td('Handheld short-wavelength NIR spectroscopy'),
            td('Chen et al., 2021'),
            td(
                'Fresh apple, banana, cucumber, celery, orange and melon mixtures',
            ),
        ),
    ],
);

const c = { align: 'center' } as const;
const stat = (parts: Inline[], rowspan = 1) =>
    td(parts, { ...c, ...(rowspan > 1 ? { rowspan } : {}) });

const table3 = tableBlock(
    [
        'Linear regression equation generated from validation of NAT and PIO: Slope, Intercept and Coefficient of determination',
    ],
    [
        row(th('NAT', { colspan: 3, ...c }), th('PIO', { colspan: 3, ...c })),
        row(
            th('Conc (µg/mL)', c),
            th('Peak area (mV.s)', c),
            th('', c),
            th('Conc (µg/mL)', c),
            th('Peak area (mV.s)', c),
            th('', c),
        ),
        row(
            td('50', c),
            td('1604.66', c),
            stat(['Slope: 31.294'], 2),
            td('50', c),
            td('2203.17', c),
            stat(['Slope 44.84'], 2),
        ),
        row(td('100', c), td('3067.30', c), td('100', c), td('4368.87', c)),
        row(
            td('150', c),
            td('4596.70', c),
            stat(['Intercept: 1.9888']),
            td('150', c),
            td('6813.31', c),
            stat(['Intercept 1.098']),
        ),
        row(
            td('200', c),
            td('6335.76', c),
            stat([italic('R'), sup('2'), ': 0.9991'], 2),
            td('200', c),
            td('8928.43', c),
            stat([italic('R'), sup('2'), ': 0.9995'], 2),
        ),
        row(td('250', c), td('7843.43', c), td('250', c), td('11274.39', c)),
    ],
);

export const sampleDocument: JSONContent = {
    type: 'doc',
    content: [
        paragraph(
            'Methods such as Luff−Schoorl show high accuracy in sugar analysis but it cannot distinguish individual sugars. The comparison of methods based on the reducing properties of monosaccharides are presented in Table 1.',
        ),
        table1,
        paragraph(
            'Examples of chromatographic and spectroscopic techniques are given in Table 2, an excerpt that shows the full-width group rows.',
        ),
        table2,
        paragraph(
            'Table 3 is Table 1 of 71_2_008: a two-level header (NAT and PIO each span three columns) and statistics merged across rows. The ',
            italic('R'),
            sup('2'),
            ' values were 0.999 for both drugs.',
        ),
        table3,
        paragraph(),
    ],
};
