import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import babel from '@rolldown/plugin-babel';
import tailwindcss from '@tailwindcss/vite';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { google } from 'laravel-vite-plugin/fonts';
import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';
import { defineConfig, lazyPlugins } from 'vite-plus';

/**
 * Preload only the Latin and Cyrillic subsets (the English and Macedonian
 * interface); Latin Extended (diacritics in some author names) still loads on
 * demand through unicode-range. laravel-vite-plugin preloads every subset of a
 * preloaded weight, so this trims its fonts manifest: 4 preloads instead of 6.
 */
const PRELOAD_RANGES = ['U+0000-00FF', 'U+0400-045F'];

type FontsManifest = {
    preloads: { file?: string; url?: string }[];
    families: Record<
        string,
        {
            variants: Record<
                string,
                {
                    files: {
                        file?: string;
                        url?: string;
                        unicodeRange?: string;
                    }[];
                }
            >;
        }
    >;
};

function trimFontPreloads(manifest: FontsManifest): FontsManifest {
    const keep = new Set<string>();

    for (const family of Object.values(manifest.families)) {
        for (const variant of Object.values(family.variants)) {
            for (const file of variant.files) {
                const ranges = (file.unicodeRange ?? '')
                    .split(',')
                    .map((range) => range.trim());

                if (PRELOAD_RANGES.some((range) => ranges.includes(range))) {
                    keep.add(file.file ?? file.url ?? '');
                }
            }
        }
    }

    return {
        ...manifest,
        preloads: manifest.preloads.filter((p) =>
            keep.has(p.file ?? p.url ?? ''),
        ),
    };
}

function fontPreloadSubsets(): Plugin {
    return {
        name: 'journal:font-preload-subsets',
        enforce: 'post',
        generateBundle: {
            order: 'post',
            handler(_options, bundle) {
                const asset = bundle['fonts-manifest.json'];

                if (asset?.type === 'asset') {
                    const manifest = JSON.parse(String(asset.source));
                    asset.source = JSON.stringify(
                        trimFontPreloads(manifest),
                        null,
                        2,
                    );
                }
            },
        },
        configureServer(server) {
            // laravel-vite-plugin writes the dev manifest once the dev server
            // listens and the font files are fetched; trim that fresh copy.
            const file = path.resolve('public/fonts-manifest.dev.json');
            const startedAt = Date.now();
            let tries = 0;
            const timer = setInterval(() => {
                tries += 1;

                try {
                    if (fs.statSync(file).mtimeMs < startedAt) {
                        throw new Error('stale manifest');
                    }

                    const manifest = JSON.parse(
                        fs.readFileSync(file, 'utf8'),
                    ) as FontsManifest;
                    const trimmed = trimFontPreloads(manifest);

                    if (trimmed.preloads.length < manifest.preloads.length) {
                        fs.writeFileSync(
                            file,
                            JSON.stringify(trimmed, null, 2),
                        );
                    }

                    clearInterval(timer);
                } catch {
                    if (tries > 60) {
                        clearInterval(timer);
                    }
                }
            }, 1000);

            server.httpServer?.once('close', () => clearInterval(timer));
        },
    };
}

export default defineConfig({
    plugins: lazyPlugins(() => [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            // Self-hosted at build time: no third-party request, preloaded
            // WOFF2 and metric-matched fallbacks to avoid layout shift.
            fonts: [
                google('Source Sans 3', {
                    weights: [400, 500, 600, 700],
                    subsets: ['latin', 'latin-ext', 'cyrillic'],
                    preload: [{ weight: 400 }, { weight: 600 }],
                }),
                google('Literata', {
                    weights: [400, 500, 600],
                    styles: ['normal', 'italic'],
                    subsets: ['latin', 'latin-ext', 'cyrillic'],
                    preload: [{ weight: 500 }],
                }),
            ],
        }),
        fontPreloadSubsets(),
        inertia(),
        react(),
        babel({
            presets: [reactCompilerPreset()],
        }),
        tailwindcss(),
        wayfinder({
            formVariants: true,
        }),
    ]),
    server: {
        watch: {
            ignored: [
                '**/.agents/**',
                '**/.claude/**',
                '**/.cursor/**',
                '**/.junie/**',
                '**/vendor/**',
            ],
        },
    },
    lint: {
        ignorePatterns: [
            'vendor/**',
            'node_modules/**',
            'public/**',
            'bootstrap/ssr/**',
            'tailwind.config.js',
            'resources/js/actions/**',
            'resources/js/components/ui/*',
            'resources/js/routes/**',
            'resources/js/wayfinder/**',
        ],
        options: {
            denyWarnings: true,
            typeAware: true,
        },
    },
    fmt: {
        printWidth: 80,
        tabWidth: 4,
        singleQuote: true,
        semi: true,
        singleAttributePerLine: false,
        htmlWhitespaceSensitivity: 'css',
        ignorePatterns: [
            '.github/**',
            'composer.json',
            'resources/js/components/ui/*',
            'resources/views/mail/*',
        ],
        sortTailwindcss: {
            functions: ['clsx', 'cn', 'cva'],
            stylesheet: 'resources/css/app.css',
        },
    },
});
