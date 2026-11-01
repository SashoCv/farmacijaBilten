import { clsx as cn } from 'clsx';
import type { ReactNode } from 'react';
import { Breadcrumbs } from '@/components/journal/breadcrumbs';
import type { Crumb } from '@/components/journal/breadcrumbs';
import { useT } from '@/lib/i18n';

type Props = {
    crumbs: Crumb[];
    title: string;
    /** Small label above the title: the section ("For authors", "About"). */
    eyebrow?: string;
    /** One or two sentences under the title. */
    lead?: ReactNode;
    /** Language of the lead, when it is content rather than interface text. */
    leadLang?: string;
    /** Notes, badges and meta lines under the lead. */
    children?: ReactNode;
};

/**
 * Header band of the editorial and information pages: breadcrumbs, eyebrow,
 * H1 and lead on the mist surface. Kept compact so short pages start with
 * content, not with a hero.
 */
export function CmsPageHeader({
    crumbs,
    title,
    eyebrow,
    lead,
    leadLang,
    children,
}: Props) {
    return (
        <header className="border-b border-line bg-mist">
            <div className="page-wrap flex flex-col gap-4 pt-6 pb-8 md:pt-8 md:pb-10">
                <Breadcrumbs items={crumbs} />
                <div className="flex flex-col gap-3">
                    {eyebrow && <p className="eyebrow">{eyebrow}</p>}
                    <h1 className="m-0 max-w-[26ch] font-serif text-h1 font-medium text-balance text-ink">
                        {title}
                    </h1>
                    {lead && (
                        <p
                            lang={leadLang}
                            className="m-0 max-w-[62ch] text-body text-ink-soft"
                        >
                            {lead}
                        </p>
                    )}
                </div>
                {children}
            </div>
        </header>
    );
}

/**
 * Inline note shown in the Macedonian interface when a page's text exists
 * only in English.
 */
export function EnglishOnlyNote({ className }: { className?: string }) {
    const { t, locale } = useT();

    if (locale !== 'mk') {
        return null;
    }

    return (
        <p
            className={cn(
                'm-0 inline-flex items-center gap-2 self-start text-meta text-ink-muted',
                className,
            )}
        >
            <svg
                viewBox="0 0 16 16"
                width="14"
                height="14"
                fill="none"
                aria-hidden="true"
                focusable="false"
            >
                <circle
                    cx="8"
                    cy="8"
                    r="6.25"
                    stroke="currentColor"
                    strokeWidth="1.3"
                />
                <path
                    d="M1.75 8h12.5M8 1.75c1.8 1.9 2.6 3.9 2.6 6.25S9.8 12.35 8 14.25C6.2 12.35 5.4 10.35 5.4 8S6.2 3.65 8 1.75z"
                    stroke="currentColor"
                    strokeWidth="1.1"
                />
            </svg>
            {t('The content is available in English only.')}
        </p>
    );
}

/** "Draft" notice for texts that still need the editors' approval. */
export function DraftNotice({ children }: { children: ReactNode }) {
    const { t } = useT();

    return (
        <div
            role="note"
            className="flex max-w-[70ch] flex-col gap-1.5 rounded-lg border border-l-4 border-line-card border-l-brand bg-white px-5 py-4"
        >
            <p className="eyebrow">{t('Draft')}</p>
            <p className="m-0 text-ui text-ink-soft">{children}</p>
        </div>
    );
}
