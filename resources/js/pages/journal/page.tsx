import { Head, usePage } from '@inertiajs/react';
import { useRef } from 'react';
import {
    CmsPageHeader,
    EnglishOnlyNote,
} from '@/components/journal/cms-page-header';
import {
    ClosingCta,
    CmsRail,
    LinkCards,
    SectionPager,
} from '@/components/journal/cms-rail';
import { DownloadIcon } from '@/components/journal/icons';
import {
    PageToc,
    useCopySectionLink,
    withSectionAnchors,
} from '@/components/journal/page-toc';
import type { TocItem } from '@/components/journal/page-toc';
import { SectionNav, localTitle } from '@/components/journal/section-nav';
import type { SectionData } from '@/components/journal/section-nav';
import { SubmissionForm } from '@/components/journal/submission-form';
import type { SubmissionConfig } from '@/components/journal/submission-form';
import { useT } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { home } from '@/routes';
import type { CmsPage } from '@/types/journal';

/** A page as sent by PageController. */
export type CmsPageData = CmsPage & {
    /** The editorial's closing ("Sincerely", signature) was cut from the body; render the editor card. */
    signOff?: boolean;
};

export type DownloadFile = {
    name: string;
    url: string;
    extension: string;
    bytes: number | null;
};

type Props = {
    page: CmsPageData;
    /** Sections of a long page (h2 ids), for "On this page". */
    toc?: TocItem[];
    section: SectionData | null;
    submission: SubmissionConfig | null;
    /** Files linked from the downloads page. */
    files?: DownloadFile[];
};

/**
 * Editorial page imported from the old site: header band, the sanitised
 * text in a 70ch column, and a right rail with the section navigation and
 * either the table of contents (long pages) or "Journal at a glance".
 */
export default function ContentPage({
    page,
    toc = [],
    section,
    submission,
    files,
}: Props) {
    const { t, locale } = useT();
    const articleRef = useRef<HTMLElement>(null);
    const onArticleClick = useCopySectionLink(articleRef);

    const title = localTitle(page, locale);
    const isSubmit = page.path === 'submit-your-paper';
    const isEditorial = page.path === 'editorial';
    const inSection = section !== null && section.path !== page.path;
    const translated = locale === 'mk' && Boolean(page.bodyMk);
    const body = translated ? page.bodyMk! : page.body;
    const hasToc = toc.length > 0;

    const crumbs = [
        { label: t('Home'), href: home.url() },
        ...(inSection
            ? [{ label: localTitle(section, locale), href: `/${section.path}` }]
            : []),
        { label: title },
    ];

    return (
        <>
            <Head title={title} />

            <CmsPageHeader
                crumbs={crumbs}
                eyebrow={
                    inSection
                        ? localTitle(section, locale)
                        : isEditorial
                          ? t('About')
                          : undefined
                }
                title={title}
                lead={page.summary ? t(page.summary) : undefined}
            >
                {!isSubmit && !translated && body !== '' && <EnglishOnlyNote />}
            </CmsPageHeader>

            <div className="page-wrap section-y">
                <div className="grid gap-y-8 md:grid-cols-12 md:gap-x-8 lg:gap-x-12">
                    <div className="flex min-w-0 flex-col gap-8 md:col-span-8">
                        {(section || hasToc) && (
                            <div className="flex flex-col gap-3 empty:hidden lg:hidden">
                                {section && (
                                    <SectionNav
                                        section={section}
                                        currentPath={page.path}
                                        variant="disclosure"
                                        className="md:hidden"
                                    />
                                )}
                                {hasToc && (
                                    <PageToc items={toc} variant="disclosure" />
                                )}
                            </div>
                        )}

                        {isSubmit && submission ? (
                            <SubmissionForm config={submission} />
                        ) : files ? (
                            <DownloadList files={files} locale={locale} />
                        ) : (
                            <article
                                ref={articleRef}
                                lang={translated ? 'mk' : 'en'}
                                onClick={hasToc ? onArticleClick : undefined}
                                className="prose-journal max-w-[70ch] [&_:is(h2,h3,h4)+*]:mt-3 [&>:first-child]:mt-0"
                                // Sanitised on import (App\Journal\Import\HtmlSanitizer).
                                dangerouslySetInnerHTML={{
                                    __html: withSectionAnchors(
                                        body,
                                        toc,
                                        t('Copy link to this section'),
                                    ),
                                }}
                            />
                        )}

                        {isEditorial && page.signOff && <EditorSignOff />}

                        {inSection &&
                            (hasToc ? (
                                <SectionPager
                                    {...neighbours(section, page.path, locale)}
                                />
                            ) : (
                                <section
                                    aria-labelledby="more-in-section"
                                    className="flex flex-col gap-5 border-t border-line pt-8"
                                >
                                    <h2
                                        id="more-in-section"
                                        className="m-0 font-serif text-h4 font-medium text-ink"
                                    >
                                        {t('More in {section}', {
                                            section: localTitle(
                                                section,
                                                locale,
                                            ),
                                        })}
                                    </h2>
                                    <LinkCards
                                        items={[
                                            {
                                                path: section.path,
                                                title: t('Overview'),
                                                titleMk: null,
                                                summary:
                                                    section.summary ?? null,
                                            },
                                            ...section.pages,
                                        ]
                                            .filter((p) => p.path !== page.path)
                                            .map((p) => ({
                                                href: `/${p.path}`,
                                                title: localTitle(p, locale),
                                                description: p.summary
                                                    ? t(p.summary)
                                                    : null,
                                            }))}
                                    />
                                </section>
                            ))}
                    </div>

                    <aside
                        aria-label={t('Related information')}
                        className="flex flex-col gap-8 md:col-span-4"
                    >
                        {section && (
                            <SectionNav
                                section={section}
                                currentPath={page.path}
                                variant="list"
                                className="hidden md:flex"
                            />
                        )}
                        {hasToc ? (
                            <PageToc
                                items={toc}
                                variant="rail"
                                className="hidden lg:flex"
                            />
                        ) : (
                            // Short section pages end with the closing band's Submit button.
                            <CmsRail showSubmit={!isSubmit && !inSection} />
                        )}
                    </aside>
                </div>
            </div>

            {!isSubmit && <ClosingCta />}
        </>
    );
}

/** Previous and next page in the section, in menu order (the hub first). */
function neighbours(section: SectionData, path: string, locale: Locale) {
    const pages = [
        { path: section.path, title: section.title, titleMk: section.titleMk },
        ...section.pages,
    ];
    const index = pages.findIndex((p) => p.path === path);
    const link = (i: number) =>
        i >= 0 && i < pages.length && index >= 0
            ? { href: `/${pages[i].path}`, title: localTitle(pages[i], locale) }
            : null;

    return { previous: link(index - 1), next: link(index + 1) };
}

/** The editor's closing of the editorial, with the signature image. */
function EditorSignOff() {
    const { t } = useT();
    const { editor } = usePage().props.journal;
    const shortTitle = editor.title === 'Professor' ? 'Prof.' : editor.title;
    const fullName = [editor.title, editor.name].filter(Boolean).join(' ');

    return (
        <figure className="m-0 flex max-w-[70ch] flex-col gap-4 border-t border-line pt-6">
            <p lang="en" className="m-0 text-body text-ink-soft">
                Sincerely,
            </p>
            {editor.signature && (
                <img
                    src={editor.signature}
                    alt={t('Signature of {name}', {
                        name: [shortTitle, editor.name]
                            .filter(Boolean)
                            .join(' '),
                    })}
                    width={150}
                    height={68}
                    loading="lazy"
                    className="h-[68px] w-auto self-start mix-blend-multiply"
                />
            )}
            <figcaption className="flex items-center gap-4">
                <span
                    aria-hidden="true"
                    className="flex size-12 shrink-0 items-center justify-center rounded-full bg-tint font-serif text-[17px] font-medium text-brand-dark"
                >
                    {initials(editor.name)}
                </span>
                <span className="flex flex-col">
                    <span lang="en" className="font-serif text-h4 text-ink">
                        {fullName}
                    </span>
                    {editor.role && (
                        <span className="text-ui text-ink-muted">
                            {t(editor.role)}
                        </span>
                    )}
                </span>
            </figcaption>
        </figure>
    );
}

/** "Marija Glavas Dodov" → "MD" (first and last word). */
export function initials(name: string): string {
    const words = name.trim().split(/\s+/);

    return (
        (words[0]?.[0] ?? '') + (words.length > 1 ? words.at(-1)![0] : '')
    ).toUpperCase();
}

/** "109028" → "106 KB"; a decimal comma in Macedonian. Same output on server and client. */
export function formatBytes(bytes: number, locale: Locale): string {
    if (bytes < 1024 * 1024) {
        return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    }

    const mb = (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '');

    return `${locale === 'mk' ? mb.replace('.', ',') : mb} MB`;
}

const KIND: Record<string, string> = {
    doc: 'Word document',
    docx: 'Word document',
    pdf: 'PDF document',
};

/** The downloads page: one card per form, with type, size and a Download button. */
function DownloadList({
    files,
    locale,
}: {
    files: DownloadFile[];
    locale: Locale;
}) {
    const { t } = useT();

    return (
        <div className="flex max-w-[70ch] flex-col gap-5">
            <p className="m-0 text-body text-ink-soft">
                {t(
                    'Sign these forms and include them with your manuscript when you submit it.',
                )}
            </p>
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
                {files.map((file) => (
                    <li
                        key={file.url}
                        className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-4 rounded-lg border border-line-card bg-white p-4 sm:flex sm:gap-5 sm:p-5"
                    >
                        <FileGlyph extension={file.extension} />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <p lang="en" className="m-0 font-semibold text-ink">
                                {file.name}
                            </p>
                            <p className="m-0 text-meta text-ink-muted tabular-nums">
                                {t(KIND[file.extension] ?? 'File')} ·{' '}
                                {file.extension.toUpperCase()}
                                {file.bytes !== null &&
                                    ` · ${formatBytes(file.bytes, locale)}`}
                            </p>
                        </div>
                        <a
                            href={file.url}
                            download
                            className="btn-outline col-span-2 justify-self-start"
                        >
                            <DownloadIcon />
                            {t('Download')}
                            <span className="sr-only">{file.name}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

function FileGlyph({ extension }: { extension: string }) {
    return (
        <span
            aria-hidden="true"
            className="relative flex h-14 w-11 shrink-0 items-end justify-center rounded-[4px] border border-line-strong bg-white pb-1.5"
        >
            <span className="absolute top-0 right-0 size-3 rounded-bl-[3px] border-b border-l border-line-strong bg-mist" />
            <span className="rounded-[2px] bg-brand px-1 text-[10px] leading-4 font-bold tracking-[0.04em] text-white uppercase">
                {extension}
            </span>
        </span>
    );
}
