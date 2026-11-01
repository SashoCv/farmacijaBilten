import * as DialogPrimitive from '@radix-ui/react-dialog';
import { clsx as cn } from 'clsx';
import { Check, Copy, Download, X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import {
    CITE_STYLES,
    citableDoiUrl,
    citeFile,
    formatCitation,
    segmentsToHtml,
    segmentsToText,
    toBibTeX,
    toRIS,
} from '@/components/journal/citation-formats';
import type {
    CiteSource,
    CiteStyle,
    Segment,
} from '@/components/journal/citation-formats';
import { useCopy } from '@/components/journal/article-actions';
import { downloadText } from '@/lib/journal';
import { useT } from '@/lib/i18n';

const STORAGE_KEY = 'mpb.citeStyle';

function storedStyle(): CiteStyle {
    try {
        const value = window.localStorage.getItem(STORAGE_KEY);

        if (CITE_STYLES.some((s) => s.id === value)) {
            return value as CiteStyle;
        }
    } catch {
        // Storage blocked: fall back to the journal's own style.
    }

    return 'vancouver';
}

function rememberStyle(style: CiteStyle): void {
    try {
        window.localStorage.setItem(STORAGE_KEY, style);
    } catch {
        // Not important enough to report.
    }
}

/** Citation text with italic runs (journal name, APA volume). */
export function CitationText({ segments }: { segments: Segment[] }) {
    return (
        <>
            {segments.map((segment, index) =>
                segment.italic ? (
                    <i key={index}>{segment.text}</i>
                ) : (
                    <span key={index}>{segment.text}</span>
                ),
            )}
        </>
    );
}

export function downloadBibTeX(source: CiteSource): void {
    downloadText(
        citeFile(source, 'bib'),
        toBibTeX(source),
        'application/x-bibtex',
    );
}

export function downloadRIS(source: CiteSource): void {
    downloadText(
        citeFile(source, 'ris'),
        toRIS(source),
        'application/x-research-info-systems',
    );
}

type Props = {
    source: CiteSource;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

/**
 * "Cite this article": the citation in four styles (tabs), copy to the
 * clipboard, and BibTeX / RIS files for reference managers.
 */
export function CiteDialog({ source, open, onOpenChange }: Props) {
    const { t } = useT();

    return (
        <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-ink/55 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
                <DialogPrimitive.Content
                    className={cn(
                        // The portal renders outside .journal, so restate the base type.
                        'journal fixed z-50 flex flex-col bg-white font-sans text-ink shadow-[0_24px_64px_-24px_rgba(22,38,77,0.45)] focus:outline-none',
                        'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-xl pb-[env(safe-area-inset-bottom)]',
                        'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:max-h-[min(720px,90vh)] sm:w-[min(680px,calc(100vw-48px))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-lg sm:pb-0',
                        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
                    )}
                >
                    <div className="flex items-start justify-between gap-4 border-b border-line px-6 pt-5 pb-4">
                        <div className="flex min-w-0 flex-col gap-1">
                            <DialogPrimitive.Title className="m-0 font-serif text-h4 font-medium text-ink">
                                {t('Cite this article')}
                            </DialogPrimitive.Title>
                            <DialogPrimitive.Description
                                className="m-0 line-clamp-2 text-ui text-ink-muted"
                                lang={source.article.titleLang}
                            >
                                {source.article.title}
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close
                            className="btn-icon -mt-1 -mr-2 shrink-0 border-transparent"
                            aria-label={t('Close')}
                        >
                            <X className="size-5" aria-hidden="true" />
                        </DialogPrimitive.Close>
                    </div>

                    {/* Mounted only while open, so it reads storage on the client. */}
                    {open && <CitePanel source={source} />}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}

function CitePanel({ source }: { source: CiteSource }) {
    const { t } = useT();
    const copy = useCopy();
    const id = useId();
    const [style, setStyle] = useState<CiteStyle>(storedStyle);
    const [copied, setCopied] = useState<CiteStyle | null>(null);
    const tabs = useRef<(HTMLButtonElement | null)[]>([]);
    const segments = formatCitation(style, source);
    const doiUrl =
        source.article.doiRegistered === true
            ? citableDoiUrl(source.article)
            : null;

    const choose = (next: CiteStyle) => {
        setStyle(next);
        setCopied(null);
        rememberStyle(next);
    };

    const onKeyDown = (
        event: KeyboardEvent<HTMLButtonElement>,
        index: number,
    ) => {
        const last = CITE_STYLES.length - 1;
        const next =
            event.key === 'ArrowRight'
                ? index === last
                    ? 0
                    : index + 1
                : event.key === 'ArrowLeft'
                  ? index === 0
                      ? last
                      : index - 1
                  : event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                      ? last
                      : null;

        if (next === null) {
            return;
        }

        event.preventDefault();
        choose(CITE_STYLES[next].id);
        tabs.current[next]?.focus();
    };

    const copyCitation = async () => {
        const ok = await copy(
            segmentsToText(segments),
            t('Citation copied'),
            segmentsToHtml(segments),
        );

        if (ok) {
            setCopied(style);
        }
    };

    return (
        <div className="flex min-h-0 flex-col overflow-y-auto">
            <div className="px-6 pt-4">
                <div
                    role="tablist"
                    aria-label={t('Citation style')}
                    className="flex gap-1 overflow-x-auto border-b border-line"
                >
                    {CITE_STYLES.map((item, index) => {
                        const selected = item.id === style;

                        return (
                            <button
                                key={item.id}
                                ref={(el) => {
                                    tabs.current[index] = el;
                                }}
                                type="button"
                                role="tab"
                                id={`${id}-tab-${item.id}`}
                                aria-selected={selected}
                                aria-controls={`${id}-panel`}
                                tabIndex={selected ? 0 : -1}
                                onClick={() => choose(item.id)}
                                onKeyDown={(event) => onKeyDown(event, index)}
                                className={cn(
                                    '-mb-px inline-flex min-h-11 shrink-0 cursor-pointer items-center border-0 border-b-[3px] bg-transparent px-3.5 font-sans text-ui whitespace-nowrap transition-colors',
                                    selected
                                        ? 'border-brand-dark font-semibold text-ink'
                                        : 'border-transparent text-ink-muted hover:text-ink',
                                )}
                            >
                                {item.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div
                role="tabpanel"
                id={`${id}-panel`}
                aria-labelledby={`${id}-tab-${style}`}
                tabIndex={0}
                className="flex flex-col gap-4 px-6 pt-5 pb-6 focus-visible:outline-none"
            >
                <p
                    lang={source.article.titleLang}
                    className="m-0 rounded-lg border border-line-card bg-mist px-5 py-4 text-base leading-[1.65] break-words text-ink select-all"
                >
                    <CitationText segments={segments} />
                </p>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        className="btn-primary"
                        onClick={copyCitation}
                    >
                        {copied === style ? (
                            <Check className="size-[18px]" aria-hidden="true" />
                        ) : (
                            <Copy className="size-[18px]" aria-hidden="true" />
                        )}
                        {copied === style ? t('Copied') : t('Copy citation')}
                    </button>
                    {doiUrl && (
                        <a
                            href={doiUrl}
                            target="_blank"
                            className="ml-auto text-ui break-all"
                            rel="noopener noreferrer"
                        >
                            {doiUrl.replace(/^https:\/\//, '')}
                        </a>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-line bg-mist px-6 pt-4 pb-6 sm:rounded-b-lg">
                <h3 className="m-0 font-sans text-ui font-semibold text-ink">
                    {t('Download for reference managers')}
                </h3>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        className="btn-outline"
                        onClick={() => downloadBibTeX(source)}
                    >
                        <Download
                            className="size-4 text-brand"
                            aria-hidden="true"
                        />
                        BibTeX
                        <span className="font-normal text-ink-muted">.bib</span>
                    </button>
                    <button
                        type="button"
                        className="btn-outline"
                        onClick={() => downloadRIS(source)}
                    >
                        <Download
                            className="size-4 text-brand"
                            aria-hidden="true"
                        />
                        RIS
                        <span className="font-normal text-ink-muted">.ris</span>
                    </button>
                </div>
                <p className="m-0 text-meta text-ink-muted">
                    {t(
                        'RIS works with EndNote, Mendeley and Zotero; BibTeX with LaTeX and JabRef.',
                    )}
                </p>
            </div>
        </div>
    );
}
