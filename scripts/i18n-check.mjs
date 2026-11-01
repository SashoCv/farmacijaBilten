#!/usr/bin/env node
/**
 * Fails when an interface string has no Macedonian translation.
 *
 *  - every t('…') key under resources/js must exist in resources/js/lang/mk.ts
 *  - every __('…') / trans_choice('…') key under app/ and resources/views must exist in lang/mk.json
 *
 * Usage: node scripts/i18n-check.mjs [--list]   (--list prints missing keys as JSON)
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;

function walk(dir, exts, out = []) {
    for (const name of readdirSync(dir)) {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) {
            if (
                ![
                    'node_modules',
                    'routes',
                    'actions',
                    'wayfinder',
                    'components/ui',
                ].some((skip) => path.endsWith(skip))
            ) {
                walk(path, exts, out);
            }
        } else if (exts.some((ext) => name.endsWith(ext))) {
            out.push(path);
        }
    }
    return out;
}

/** Decodes a JS/PHP single- or double-quoted string body. */
function unquote(body) {
    return body.replace(/\\(['"\\])/g, '$1');
}

function collect(files, pattern) {
    const keys = new Map();
    for (const file of files) {
        const source = readFileSync(file, 'utf8');
        for (const match of source.matchAll(pattern)) {
            const key = unquote(match[2]);
            if (!keys.has(key)) keys.set(key, file.replace(root, ''));
        }
    }
    return keys;
}

// Frontend: t('…') or t("…"), including when the string starts on the next line.
const tsFiles = walk(join(root, 'resources/js'), ['.ts', '.tsx']).filter(
    (f) => !f.includes('/lang/'),
);
const tKeys = collect(tsFiles, /\bt\(\s*(['"])((?:\\.|(?!\1).)*)\1/g);

const mkSource = readFileSync(join(root, 'resources/js/lang/mk.ts'), 'utf8');
const mkKeys = new Set();
for (const m of mkSource.matchAll(
    /^\s*(?:(['"])((?:\\.|(?!\1).)*)\1|([A-Za-z_$][\w$]*))\s*:/gm,
)) {
    mkKeys.add(m[2] !== undefined ? unquote(m[2]) : m[3]);
}

// Backend: __('…') and trans_choice('…').
const phpFiles = [
    ...walk(join(root, 'app'), ['.php']),
    ...walk(join(root, 'resources/views'), ['.php']),
];
const phpKeys = collect(
    phpFiles,
    /\b(?:__|trans_choice)\(\s*(['"])((?:\\.|(?!\1).)*)\1/g,
);
const mkJson = JSON.parse(readFileSync(join(root, 'lang/mk.json'), 'utf8'));

// Keys that are deliberately the same in both languages.
const SAME = new Set([
    'PDF',
    'DOI',
    'ISSN',
    'BibTeX',
    'RIS',
    'APA 7',
    'Vancouver',
    'Harvard',
    'Chicago',
    'DOAJ',
    'EBSCO',
    'Crossref',
    'ORCID',
    'English',
    'Македонски',
    'E-mail',
]);

const missingTs = [...tKeys].filter(
    ([k]) => !mkKeys.has(k) && !SAME.has(k) && !/^[\s\d\W]*$/.test(k),
);
const missingPhp = [...phpKeys].filter(
    ([k]) =>
        !(k in mkJson) &&
        !SAME.has(k) &&
        !k.startsWith('validation.') &&
        !k.includes('::'),
);

if (process.argv.includes('--list')) {
    console.log(
        JSON.stringify(
            {
                ts: missingTs.map(([k, f]) => [k, f]),
                php: missingPhp.map(([k, f]) => [k, f]),
            },
            null,
            1,
        ),
    );
    process.exit(0);
}

for (const [key, file] of missingTs)
    console.log(`mk.ts   missing: ${JSON.stringify(key)}  (${file})`);
for (const [key, file] of missingPhp)
    console.log(`mk.json missing: ${JSON.stringify(key)}  (${file})`);

const total = missingTs.length + missingPhp.length;
console.log(
    total
        ? `\n${total} untranslated key(s).`
        : `All ${tKeys.size} frontend and ${phpKeys.size} backend keys are translated.`,
);
process.exit(total ? 1 : 0);
