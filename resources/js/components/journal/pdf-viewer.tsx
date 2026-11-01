import { clsx as cn } from 'clsx';
import { Download, ExternalLink, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { usePdfFacts } from '@/components/journal/article-actions';
import { useT } from '@/lib/i18n';

type Props = {
    /** URL of the PDF. */
    src: string;
    /** What the PDF is, for the frame's accessible name: the article or issue title. */
    title: string;
    /** Language of `title`. */
    titleLang?: string;
    pages?: number | null;
    bytes?: number | null;
    /** First-page image shown instead of the frame below md. */
    thumb?: string | null;
    className?: string;
};

const DESKTOP = '(min-width: 48rem)';

/** True from md up, after hydration (false on the server). */
function useDesktop(): boolean {
    const [desktop, setDesktop] = useState(false);

    useEffect(() => {
        const query = window.matchMedia(DESKTOP);
        const update = () => setDesktop(query.matches);

        update();
        query.addEventListener('change', update);

        return () => query.removeEventListener('change', update);
    }, []);

    return desktop;
}

/**
 * Inline PDF reader: a toolbar (open in a new tab, download with size and
 * page count) over the browser's own viewer at 85vh. Phones get a linked
 * first-page image instead, because mobile browsers do not render PDFs in
 * frames; the frame is only mounted from md up so phones never fetch it twice.
 */
export function PdfViewer({
    src,
    title,
    titleLang,
    pages,
    bytes,
    thumb,
    className,
}: Props) {
    const { t } = useT();
    const desktop = useDesktop();
    const facts = usePdfFacts(bytes, pages);
    const downloadLabel = facts
        ? t('Download PDF ({facts})', { facts })
        : t('Download PDF');

    return (
        <figure
            className={cn(
                'm-0 overflow-hidden rounded-lg border border-line-card bg-white',
                className,
            )}
        >
            <figcaption className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line-card bg-mist px-4 py-2.5">
                <span className="inline-flex items-center gap-2 text-meta font-semibold tracking-[0.06em] text-ink-muted uppercase">
                    <FileText
                        className="size-4 text-brand"
                        aria-hidden="true"
                    />
                    PDF
                    {facts && (
                        <span className="font-normal tracking-normal normal-case tabular-nums">
                            · {facts}
                        </span>
                    )}
                </span>
                <span className="flex flex-wrap items-center gap-x-5 gap-y-1 text-ui">
                    <a
                        href={src}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold no-underline hover:underline"
                    >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        {t('Open in new tab')}
                        <span className="sr-only">
                            {' '}
                            ({t('opens in a new tab')})
                        </span>
                    </a>
                    <a
                        href={src}
                        download
                        className="inline-flex min-h-11 items-center gap-1.5 font-semibold no-underline hover:underline"
                    >
                        <Download className="size-4" aria-hidden="true" />
                        {downloadLabel}
                    </a>
                </span>
            </figcaption>

            {/* md and up: the browser's PDF viewer. The box is reserved on the server. */}
            <div className="hidden h-[85vh] max-h-[1400px] min-h-[560px] bg-[#525659] md:block">
                {desktop && (
                    <iframe
                        src={`${src}#view=FitH`}
                        title={t('PDF: {title}', { title })}
                        lang={titleLang}
                        className="block size-full border-0"
                        loading="lazy"
                    />
                )}
            </div>

            {/* Below md: the first page as a picture, linked to the PDF. */}
            <div className="md:hidden">
                {thumb ? (
                    <a href={src} className="block bg-mist p-4 no-underline">
                        <img
                            src={thumb}
                            alt={t('First page of the PDF')}
                            loading="lazy"
                            className="mx-auto block h-auto w-full max-w-[420px] border border-line-card bg-white shadow-[0_8px_24px_-12px_rgba(22,38,77,0.35)]"
                        />
                        <span className="mt-3 block text-center text-ui font-semibold text-brand">
                            {t('Tap to read the full PDF')}
                        </span>
                    </a>
                ) : (
                    <a
                        href={src}
                        className="flex items-center gap-4 p-5 text-ink no-underline hover:bg-mist hover:text-ink"
                    >
                        <span className="flex h-16 w-12 shrink-0 items-center justify-center rounded-sm border border-line-card bg-mist text-meta font-bold tracking-[0.06em] text-brand">
                            PDF
                        </span>
                        <span className="flex min-w-0 flex-col gap-0.5">
                            <span className="text-ui font-semibold text-brand">
                                {t('Read the full text (PDF)')}
                            </span>
                            <span className="text-meta text-ink-muted">
                                {t('Opens in your browser’s PDF viewer.')}
                            </span>
                        </span>
                    </a>
                )}
            </div>
        </figure>
    );
}
