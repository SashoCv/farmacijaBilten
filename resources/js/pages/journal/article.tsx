import { clsx as cn } from 'clsx';
import { Head, Link, usePage } from '@inertiajs/react';
import { Copy, Download, LockOpen, Quote } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import {
    ArticleActions,
    MobileActionBar,
    ShareLinks,
    useCopy,
    useInView,
    usePdfFacts,
    useShare,
} from '@/components/journal/article-actions';
import { articleHref } from '@/components/journal/article-row';
import { AuthorList } from '@/components/journal/author-list';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import { CitationText, CiteDialog } from '@/components/journal/cite-dialog';
import {
    formatCitation,
    segmentsToHtml,
    segmentsToText,
} from '@/components/journal/citation-formats';
import type { CiteSource } from '@/components/journal/citation-formats';
import { IssueCover } from '@/components/journal/issue-cover';
import { PdfViewer } from '@/components/journal/pdf-viewer';
import { listSurnames } from '@/lib/journal';
import { useT } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { archive, home, search } from '@/routes';
import { show as showIssue } from '@/routes/issues';
import type {
    ArticleDetail,
    ArticleSummary,
    ContentLang,
    IssueDetail,
} from '@/types/journal';

type Props = {
    issue: IssueDetail;
    article: ArticleDetail;
    related: ArticleSummary[];
    /** Absolute PDF address (the scholar meta tags are printed by the server). */
    pdfUrl: string | null;
};

/**
 * Sticky offsets. From lg the site's nav row (52px) stays at the top, so the
 * section tabs sit under it; below lg the header hides while reading down,
 * so the tabs stick at the very top. The root already reserves
 * --anchor-offset (scroll-padding) for the header; anchors add the tabs' 48px.
 */
const STICKY_TOP = 'top-0 lg:top-[var(--site-sticky-offset,52px)]';
const ANCHOR = 'scroll-mt-12';

const h2 = 'm-0 font-serif text-h3 font-medium text-ink';

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

const MONTHS = [
    'jan',
    'feb',
    'mar',
    'apr',
    'may',
    'jun',
    'jul',
    'aug',
    'sep',
    'oct',
    'nov',
    'dec',
];

/**
 * "Received: February 2025; Accepted: April 2025" → { received: "2025-02",
 * accepted: "2025-04" }. Used only until the structured dates exist (WS9);
 * text that does not parse is not shown.
 */
function parseHistory(history: string | null): {
    received?: string;
    accepted?: string;
} {
    const out: { received?: string; accepted?: string } = {};

    if (!history) {
        return out;
    }

    const pattern =
        /\b(received|accepted)\b\s*:?\s*(?:on\s+)?(?:\d{1,2}(?:st|nd|rd|th)?\s+)?([a-z]{3,9})\.?,?\s+((?:19|20)\d{2})\b/gi;

    for (const [, kind, month, year] of history.matchAll(pattern)) {
        const index = MONTHS.indexOf(month.slice(0, 3).toLowerCase());

        if (index >= 0) {
            out[kind.toLowerCase() as 'received' | 'accepted'] =
                `${year}-${String(index + 1).padStart(2, '0')}`;
        }
    }

    return out;
}

/**
 * Macedonian short month names. Browsers differ in their Macedonian locale
 * data (Chrome falls back to English, Node adds "г."), so the server render
 * and the browser would disagree; this table keeps both identical.
 */
const MK_MONTHS = [
    'јан.',
    'фев.',
    'мар.',
    'апр.',
    'мај',
    'јун.',
    'јул.',
    'авг.',
    'сеп.',
    'окт.',
    'ноем.',
    'дек.',
];

/** "30 Apr 2025" / "30 апр. 2025", "Feb 2025" / "фев. 2025", or the year. */
function formatDate(
    iso: string,
    locale: Locale,
    precision: 'day' | 'month' | 'year',
): string {
    const [y, m = 1, d = 1] = iso.split('-').map(Number);

    if (precision === 'year') {
        return String(y);
    }

    if (locale === 'mk') {
        const month = `${MK_MONTHS[m - 1]} ${y}`;

        return precision === 'day' ? `${d} ${month}` : month;
    }

    return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'UTC',
        year: 'numeric',
        month: 'short',
        ...(precision === 'day' ? { day: 'numeric' } : {}),
    }).format(new Date(Date.UTC(y, m - 1, d)));
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** Cut at a word boundary: "Analytical methods for determination of…" */
function truncate(text: string, max = 52): string {
    if (text.length <= max) {
        return text;
    }

    const cut = text.slice(0, max);

    return `${cut.slice(0, cut.lastIndexOf(' ') > 24 ? cut.lastIndexOf(' ') : max).replace(/[\s,.:;–-]+$/, '')}…`;
}

/** Eyebrow colour by article type (design direction: TOC entry). */
function typeTone(type: string | null): 'research' | 'review' | 'other' {
    if (!type) {
        return 'other';
    }

    if (/^original/i.test(type)) {
        return 'research';
    }

    return /^review/i.test(type) ? 'review' : 'other';
}

const LANGUAGE_NAMES: Record<ContentLang, string> = {
    en: 'English',
    mk: 'Македонски',
};

/** "71(2)", "72(Suppl 1)" or "52" */
function volumeRef(issue: IssueDetail): string {
    if (
        issue.number === null ||
        !['issue', 'supplement'].includes(issue.kind)
    ) {
        return String(issue.volume);
    }

    return issue.kind === 'supplement'
        ? `${issue.volume}(Suppl ${issue.number})`
        : `${issue.volume}(${issue.number})`;
}

/** Highlights the section tab whose heading is nearest the top of the viewport. */
function useActiveSection(ids: readonly string[]): string {
    const [active, setActive] = useState(ids[0]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort(
                        (a, b) =>
                            a.boundingClientRect.top - b.boundingClientRect.top,
                    );

                if (visible[0]) {
                    setActive(visible[0].target.id);
                }
            },
            { rootMargin: '-120px 0px -60% 0px' },
        );

        ids.forEach((id) => {
            const el = document.getElementById(id);

            if (el) {
                observer.observe(el);
            }
        });

        return () => observer.disconnect();
    }, [ids]);

    return active;
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function ArticlePage(props: Props) {
    return (
        <ArticleView
            key={`${props.article.issueSlug}/${props.article.number}`}
            {...props}
        />
    );
}

type SectionId = 'abstract' | 'keywords' | 'full-text' | 'cite' | 'references';

function sectionsFor(article: ArticleDetail): SectionId[] {
    return [
        ...(article.abstract ? (['abstract'] as const) : []),
        ...(article.keywords.length ? (['keywords'] as const) : []),
        ...(article.pdf ? (['full-text'] as const) : []),
        'cite',
        ...(article.references ? (['references'] as const) : []),
    ];
}

function sectionLabel(id: SectionId, t: (text: string) => string): string {
    switch (id) {
        case 'abstract':
            return t('Abstract');
        case 'keywords':
            return t('Keywords');
        case 'full-text':
            return t('Full text');
        case 'cite':
            return t('How to cite');
        case 'references':
            return t('References');
    }
}

function ArticleView({ issue, article, related }: Props) {
    const { t, locale } = useT();
    const { journal, canonical } = usePage().props;
    const copy = useCopy();
    const share = useShare(canonical, article.title);
    const pdfFacts = usePdfFacts(article.pdfBytes, article.pdfPages);
    const [citeOpen, setCiteOpen] = useState(false);
    const openCite = () => setCiteOpen(true);

    const header = useRef<HTMLElement>(null);
    const actionRow = useRef<HTMLDivElement>(null);

    // Stable for the life of this view (it is keyed by article).
    const [sections] = useState(() => sectionsFor(article));
    const active = useActiveSection(sections);

    const source: CiteSource = {
        article,
        issue,
        journal,
        pageUrl: canonical,
    };
    const vancouver = formatCitation('vancouver', source);

    const doi = article.doi;
    const doiLink = article.doiRegistered === true ? article.doiUrl : null;
    const doiPending = article.doi !== null && article.doiRegistered === false;

    const history = parseHistory(article.history);
    const received = article.receivedAt?.slice(0, 7) ?? history.received;
    const accepted = article.acceptedAt?.slice(0, 7) ?? history.accepted;
    const online = article.onlineAt ?? article.publishedAt;
    const timeline = [
        received && {
            label: t('Received'),
            iso: received,
            text: formatDate(received, locale, 'month'),
        },
        accepted && {
            label: t('Accepted'),
            iso: accepted,
            text: formatDate(accepted, locale, 'month'),
        },
        online
            ? {
                  label: t('Published online'),
                  iso: online,
                  text: formatDate(online, locale, 'day'),
              }
            : (received || accepted) && {
                  label: t('Published'),
                  iso: String(issue.year),
                  text: String(issue.year),
              },
    ].filter((step): step is { label: string; iso: string; text: string } =>
        Boolean(step),
    );

    const tone = typeTone(article.type);
    const issueHref = showIssue.url(issue.slug);
    const abstractForeign =
        article.abstractLang !== null && article.abstractLang !== locale;
    const licence = article.licence ?? journal.licence.name;
    const licenceUrl =
        licence === journal.licence.name ? journal.licence.url : null;

    return (
        <>
            <Head>
                <title>{article.title}</title>
            </Head>

            <div className="page-wrap pt-5 section-pb md:pt-8">
                <Breadcrumbs
                    items={[
                        { label: t('Home'), href: home.url() },
                        { label: t('Archive'), href: archive.url() },
                        {
                            label: t('Volume {volume}', {
                                volume: issue.volume,
                            }),
                            href: issue.part
                                ? `${archive.url()}#volume-${issue.volume}`
                                : issueHref,
                        },
                        ...(issue.part
                            ? [{ label: issue.part, href: issueHref }]
                            : []),
                        { label: truncate(article.title) },
                    ]}
                />

                <div className="mt-6 grid grid-cols-1 gap-y-12 md:mt-10 lg:grid-cols-12 lg:gap-x-6">
                    <article className="flex min-w-0 flex-col gap-7 lg:col-span-8 lg:pr-10">
                        <header ref={header} className="flex flex-col gap-4">
                            <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
                                {article.type && (
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-2',
                                            tone === 'review' &&
                                                'text-brand-dark',
                                            tone === 'other' &&
                                                'text-ink-muted',
                                        )}
                                    >
                                        {tone === 'review' && (
                                            <span
                                                aria-hidden="true"
                                                className="size-2 rounded-full bg-sky"
                                            />
                                        )}
                                        {t(article.type)}
                                    </span>
                                )}
                                {article.type && (
                                    <span
                                        aria-hidden="true"
                                        className="text-line-strong"
                                    >
                                        |
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1.5 text-ink-muted">
                                    <LockOpen
                                        className="size-3.5"
                                        aria-hidden="true"
                                    />
                                    {t('Open access')}
                                </span>
                            </p>

                            <h1
                                lang={article.titleLang}
                                className="m-0 font-serif text-h1 font-medium text-balance text-ink [&_sub]:text-[0.6em] [&_sup]:text-[0.6em]"
                                dangerouslySetInnerHTML={{
                                    __html: article.titleHtml,
                                }}
                            />

                            <AuthorList
                                authors={article.authors}
                                affiliations={article.affiliations}
                                className="mt-1"
                            />
                        </header>

                        <div className="flex flex-col gap-2.5 border-y border-line py-4 text-ui text-ink-soft">
                            <p className="m-0 tabular-nums">
                                <span className="font-semibold text-ink">
                                    {journal.abbrev}
                                </span>{' '}
                                {issue.year};
                                <Link
                                    href={issueHref}
                                    prefetch
                                    className="text-ink-soft underline decoration-underline underline-offset-4 hover:text-brand hover:decoration-brand"
                                    aria-label={issue.label}
                                >
                                    {volumeRef(issue)}
                                </Link>
                                {article.pages && `:${article.pages}`}
                                {!issue.isPublished && (
                                    <span className="ml-2 inline-flex items-center rounded-full bg-tint px-2.5 py-0.5 text-meta font-semibold text-brand-dark">
                                        {t('Early online')}
                                    </span>
                                )}
                            </p>

                            {timeline.length > 0 && (
                                <ol
                                    aria-label={t('Publication history')}
                                    className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-meta tabular-nums"
                                >
                                    {timeline.map((step, index) => (
                                        <li
                                            key={step.label}
                                            className="inline-flex items-center gap-2"
                                        >
                                            {index > 0 && (
                                                <span
                                                    aria-hidden="true"
                                                    className="text-ink-muted/70"
                                                >
                                                    →
                                                </span>
                                            )}
                                            <span className="text-ink-muted">
                                                {step.label}
                                            </span>
                                            <time
                                                dateTime={step.iso}
                                                className="font-semibold text-ink"
                                            >
                                                {step.text}
                                            </time>
                                        </li>
                                    ))}
                                </ol>
                            )}

                            {doi && (
                                <div className="flex min-w-0 flex-wrap items-center gap-x-3">
                                    <span className="shrink-0 text-meta font-semibold tracking-[0.06em] text-ink-muted uppercase max-sm:basis-full">
                                        {doiPending
                                            ? t('DOI (registration pending)')
                                            : 'DOI'}
                                    </span>
                                    {doiLink ? (
                                        <a
                                            href={doiLink}
                                            className="min-w-0 flex-1 font-semibold break-all sm:flex-none"
                                        >
                                            {doiLink.replace(/^https:\/\//, '')}
                                        </a>
                                    ) : (
                                        <span className="min-w-0 flex-1 break-all text-ink sm:flex-none">
                                            {doi}
                                        </span>
                                    )}
                                    {!doiPending && (
                                        <button
                                            type="button"
                                            className="btn-icon -my-2 size-10 shrink-0 border-transparent bg-transparent text-ink-muted"
                                            onClick={() =>
                                                copy(
                                                    doiLink ?? doi,
                                                    t('DOI copied'),
                                                )
                                            }
                                            aria-label={t('Copy DOI')}
                                            title={t('Copy DOI')}
                                        >
                                            <Copy
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <ArticleActions
                            rowRef={actionRow}
                            pdf={article.pdf}
                            pdfFacts={pdfFacts}
                            onCite={openCite}
                            onShare={share}
                        />

                        {sections.length >= 3 && (
                            <SectionTabs
                                sections={sections}
                                active={active}
                                header={header}
                                title={article.titleHtml}
                                titleLang={article.titleLang}
                                pdf={article.pdf}
                            />
                        )}

                        {article.abstract && (
                            <section
                                id="abstract"
                                aria-labelledby="abstract-title"
                                className={cn('flex flex-col gap-4', ANCHOR)}
                            >
                                <div className="flex flex-wrap items-center gap-3">
                                    <h2 id="abstract-title" className={h2}>
                                        {t('Abstract')}
                                    </h2>
                                    {abstractForeign &&
                                        article.abstractLang && (
                                            <span className="inline-flex items-center rounded-full border border-line-card bg-mist px-2.5 py-0.5 text-meta text-ink-soft">
                                                <span className="sr-only">
                                                    {t('Language')}:{' '}
                                                </span>
                                                <span
                                                    lang={article.abstractLang}
                                                >
                                                    {
                                                        LANGUAGE_NAMES[
                                                            article.abstractLang
                                                        ]
                                                    }
                                                </span>
                                            </span>
                                        )}
                                </div>
                                <div
                                    lang={article.abstractLang ?? undefined}
                                    className="flex max-w-[70ch] flex-col gap-4 text-body leading-[1.7] text-ink-soft"
                                >
                                    {article.abstract
                                        .split(/\n{2,}/)
                                        .map((paragraph, index) => (
                                            <p key={index} className="m-0">
                                                {paragraph}
                                            </p>
                                        ))}
                                </div>
                            </section>
                        )}

                        {article.keywords.length > 0 && (
                            <section
                                id="keywords"
                                aria-labelledby="keywords-title"
                                className={cn('flex flex-col gap-3', ANCHOR)}
                            >
                                <h2 id="keywords-title" className={h2}>
                                    {t('Keywords')}
                                </h2>
                                <ul
                                    lang={article.keywordsLang ?? undefined}
                                    className="m-0 flex list-none flex-wrap gap-y-1 p-0 text-ui"
                                >
                                    {article.keywords.map((keyword) => (
                                        <li
                                            key={keyword}
                                            className="inline-flex items-center after:px-2 after:text-ink-muted/70 after:content-['·'] last:after:content-none"
                                        >
                                            <Link
                                                href={search.url({
                                                    query: { q: keyword },
                                                })}
                                                className="no-underline decoration-underline underline-offset-4 hover:underline"
                                            >
                                                {keyword}
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        {article.pdf && (
                            <section
                                id="full-text"
                                aria-labelledby="full-text-title"
                                className={cn('flex flex-col gap-4', ANCHOR)}
                            >
                                <div className="flex flex-col gap-1.5">
                                    <h2 id="full-text-title" className={h2}>
                                        {t('Full text')}
                                    </h2>
                                    {!article.abstract && (
                                        <p className="m-0 max-w-[70ch] text-ui text-ink-muted">
                                            {article.type ===
                                            'Short communication'
                                                ? t(
                                                      'Short communications are published without a separate abstract. The full text is in the PDF.',
                                                  )
                                                : t(
                                                      'The full text of this article is available as a PDF.',
                                                  )}
                                        </p>
                                    )}
                                </div>
                                <PdfViewer
                                    src={article.pdf}
                                    title={article.title}
                                    titleLang={article.titleLang}
                                    pages={article.pdfPages}
                                    bytes={article.pdfBytes}
                                    thumb={article.pdfThumb}
                                />
                            </section>
                        )}

                        <section
                            id="cite"
                            aria-labelledby="cite-title"
                            className={cn('flex flex-col gap-4', ANCHOR)}
                        >
                            <h2 id="cite-title" className={h2}>
                                {t('How to cite')}
                            </h2>
                            <div className="flex flex-col gap-4 rounded-lg border border-line-card bg-mist p-5 md:p-6">
                                <p className="eyebrow m-0 text-ink-muted">
                                    Vancouver
                                </p>
                                <p
                                    lang={article.titleLang}
                                    className="m-0 text-base leading-[1.65] break-words text-ink"
                                >
                                    <CitationText segments={vancouver} />
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={() =>
                                            copy(
                                                segmentsToText(vancouver),
                                                t('Citation copied'),
                                                segmentsToHtml(vancouver),
                                            )
                                        }
                                    >
                                        <Copy
                                            className="size-4 text-brand"
                                            aria-hidden="true"
                                        />
                                        {t('Copy citation')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-outline"
                                        onClick={openCite}
                                        aria-haspopup="dialog"
                                    >
                                        <Quote
                                            className="size-4 text-brand"
                                            aria-hidden="true"
                                        />
                                        {t('All formats')}
                                        <span className="font-normal text-ink-muted max-sm:hidden">
                                            APA · Harvard · Chicago · BibTeX ·
                                            RIS
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </section>

                        {article.references && (
                            <section
                                id="references"
                                aria-labelledby="references-title"
                                className={cn('flex flex-col gap-4', ANCHOR)}
                            >
                                <h2 id="references-title" className={h2}>
                                    {t('References')}
                                </h2>
                                <div
                                    lang={article.titleLang}
                                    className="max-w-[70ch] text-ui leading-[1.7] whitespace-pre-line text-ink-soft"
                                >
                                    {article.references}
                                </div>
                            </section>
                        )}
                    </article>

                    <aside
                        aria-label={t('About this article')}
                        className="flex min-w-0 flex-col gap-5 lg:col-span-4"
                    >
                        <PublishedIn issue={issue} />

                        <section
                            aria-labelledby="licence-title"
                            className="flex flex-col gap-3 rounded-lg border border-line-card p-5"
                        >
                            <h2
                                id="licence-title"
                                className="eyebrow m-0 inline-flex items-center gap-1.5"
                            >
                                <LockOpen
                                    className="size-3.5"
                                    aria-hidden="true"
                                />
                                {t('Open access')}
                            </h2>
                            <div className="flex items-start gap-3">
                                <CcBadge />
                                <p className="m-0 text-ui text-ink-soft">
                                    {t('This article is licensed under')}{' '}
                                    {licenceUrl ? (
                                        <a
                                            href={licenceUrl}
                                            target="_blank"
                                            rel="license noopener noreferrer"
                                            className="font-semibold"
                                        >
                                            {licence}
                                        </a>
                                    ) : (
                                        <span className="font-semibold text-ink">
                                            {licence}
                                        </span>
                                    )}
                                    .
                                </p>
                            </div>
                        </section>

                        {related.length > 0 && (
                            <section
                                aria-labelledby="related-title"
                                className="flex flex-col gap-4 rounded-lg border border-line-card p-5"
                            >
                                <h2
                                    id="related-title"
                                    className="eyebrow m-0 text-ink-muted"
                                >
                                    {t('In this issue')}
                                </h2>
                                <ul className="m-0 flex list-none flex-col p-0">
                                    {related.map((item, index) => (
                                        <li
                                            key={item.number}
                                            className={cn(
                                                index > 0 &&
                                                    'mt-4 border-t border-line pt-4',
                                            )}
                                        >
                                            <Link
                                                href={articleHref(item)}
                                                prefetch
                                                className="group flex flex-col gap-1 text-ink no-underline"
                                            >
                                                <span
                                                    lang={item.titleLang}
                                                    className="line-clamp-3 font-serif text-base leading-[1.45] font-medium group-hover:text-brand group-hover:underline group-hover:decoration-underline group-hover:underline-offset-4"
                                                    dangerouslySetInnerHTML={{
                                                        __html: item.titleHtml,
                                                    }}
                                                />
                                                <span className="text-meta text-ink-muted">
                                                    {listSurnames(item.authors)}
                                                    {item.pages &&
                                                        ` · ${t('pp. {pages}', { pages: item.pages })}`}
                                                </span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                                <Link
                                    href={issueHref}
                                    prefetch
                                    className="link-u self-start text-ui"
                                >
                                    {t('Full table of contents')}
                                </Link>
                            </section>
                        )}

                        <section
                            aria-labelledby="share-title"
                            className="flex flex-col gap-3 rounded-lg border border-line-card p-5 lg:sticky lg:top-[88px]"
                        >
                            <button
                                type="button"
                                className="btn-outline w-full"
                                onClick={openCite}
                                aria-haspopup="dialog"
                            >
                                <Quote
                                    className="size-4 text-brand"
                                    aria-hidden="true"
                                />
                                {t('Cite this article')}
                            </button>
                            <h2
                                id="share-title"
                                className="eyebrow m-0 mt-2 text-ink-muted"
                            >
                                {t('Share')}
                            </h2>
                            <ShareLinks url={canonical} title={article.title} />
                        </section>
                    </aside>
                </div>
            </div>

            <MobileActionBar
                pdf={article.pdf}
                onCite={openCite}
                watch={actionRow}
            />

            <CiteDialog
                source={source}
                open={citeOpen}
                onOpenChange={setCiteOpen}
            />
        </>
    );
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function SectionTabs({
    sections,
    active,
    header,
    title,
    titleLang,
    pdf,
}: {
    sections: SectionId[];
    active: string;
    header: RefObject<HTMLElement | null>;
    title: string;
    titleLang: ContentLang;
    pdf: string | null;
}) {
    const { t } = useT();
    const view = useInView(header);
    const scrolled = view !== undefined && !view.visible && view.above;

    return (
        <div
            className={cn(
                'sticky z-20 -mx-4 border-b border-line bg-white/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-white/90 lg:mx-0 lg:px-0',
                STICKY_TOP,
            )}
        >
            <div className="flex items-center gap-4">
                <div
                    aria-hidden={!scrolled}
                    className={cn(
                        'hidden min-w-0 flex-1 font-serif text-ui leading-snug font-medium text-ink transition-opacity duration-200 motion-reduce:transition-none lg:block',
                        scrolled
                            ? 'opacity-100'
                            : 'pointer-events-none w-0 flex-none opacity-0',
                    )}
                >
                    <span
                        lang={titleLang}
                        className="line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: title }}
                    />
                </div>
                <nav
                    aria-label={t('Article sections')}
                    className="-mb-px flex min-w-0 [scrollbar-width:none] overflow-x-auto"
                >
                    {sections.map((section) => (
                        <a
                            key={section}
                            href={`#${section}`}
                            aria-current={
                                active === section ? 'true' : undefined
                            }
                            className={cn(
                                'inline-flex min-h-12 shrink-0 items-center border-b-[3px] px-3 text-ui whitespace-nowrap no-underline first:pl-0 lg:px-3.5',
                                active === section
                                    ? 'border-brand-dark font-semibold text-ink hover:text-ink'
                                    : 'border-transparent text-ink-muted hover:text-ink',
                            )}
                        >
                            {sectionLabel(section, t)}
                        </a>
                    ))}
                </nav>
                {pdf && (
                    <a
                        href={pdf}
                        tabIndex={scrolled ? undefined : -1}
                        aria-hidden={!scrolled}
                        className={cn(
                            'ml-auto hidden min-h-9 shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 text-ui font-semibold text-white no-underline transition-opacity duration-200 hover:bg-brand-dark hover:text-white motion-reduce:transition-none lg:inline-flex',
                            scrolled
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0',
                        )}
                    >
                        <Download className="size-4" aria-hidden="true" />
                        PDF
                    </a>
                )}
            </div>
        </div>
    );
}

function PublishedIn({ issue }: { issue: IssueDetail }) {
    const { t } = useT();
    const href = showIssue.url(issue.slug);
    const detail = [
        issue.note,
        issue.publishedSpan ?? String(issue.year),
        issue.articleCount
            ? issue.articleCount === 1
                ? t('1 article')
                : t('{count} articles', { count: issue.articleCount })
            : null,
    ].filter(Boolean);

    return (
        <section
            aria-labelledby="published-in-title"
            className="flex flex-col gap-3 rounded-lg border border-line-card p-5"
        >
            <h2 id="published-in-title" className="eyebrow m-0 text-ink-muted">
                {t('Published in')}
            </h2>
            <Link
                href={href}
                prefetch
                className="group flex items-start gap-4 text-ink no-underline"
            >
                <span className="block w-[72px] shrink-0 overflow-hidden rounded-[3px] border border-line-card bg-white">
                    {issue.coverImage ? (
                        <img
                            src={issue.coverImage}
                            alt=""
                            width={72}
                            height={90}
                            loading="lazy"
                            className="block aspect-[4/5] h-auto w-full object-cover"
                        />
                    ) : (
                        <IssueCover
                            volume={issue.volume}
                            caption={issue.label}
                            year={issue.year}
                            variant={
                                issue.kind === 'supplement'
                                    ? 'supplement'
                                    : 'regular'
                            }
                            size="xs"
                        />
                    )}
                </span>
                <span className="flex min-w-0 flex-col gap-1 pt-0.5">
                    <span className="font-serif text-h4 leading-snug font-medium group-hover:text-brand">
                        {issue.label}
                    </span>
                    {detail.length > 0 && (
                        <span className="text-meta text-ink-muted tabular-nums">
                            {detail.join(' · ')}
                        </span>
                    )}
                    <span className="mt-1 text-ui font-semibold text-brand underline decoration-underline underline-offset-4 group-hover:decoration-brand">
                        {t('Table of contents')}
                    </span>
                </span>
            </Link>
        </section>
    );
}

/** Creative Commons "cc by" mark, drawn inline (no external image). */
function CcBadge() {
    return (
        <span
            aria-hidden="true"
            className="mt-0.5 inline-flex h-7 shrink-0 items-center gap-1 rounded-[4px] bg-ink px-1.5 text-white"
        >
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
                <circle
                    cx="12"
                    cy="12"
                    r="10.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />
                <path
                    d="M10.6 9.9a2.6 2.6 0 1 0 0 4.2M17 9.9a2.6 2.6 0 1 0 0 4.2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                />
            </svg>
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="none">
                <circle
                    cx="12"
                    cy="12"
                    r="10.5"
                    stroke="currentColor"
                    strokeWidth="1.8"
                />
                <circle cx="12" cy="6.9" r="1.6" fill="currentColor" />
                <path
                    d="M9.4 10h5.2v4.6h-1.5V19h-2.2v-4.4H9.4z"
                    fill="currentColor"
                />
            </svg>
        </span>
    );
}
