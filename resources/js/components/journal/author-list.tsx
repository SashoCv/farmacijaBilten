import { clsx as cn } from 'clsx';
import { Link } from '@inertiajs/react';
import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { search } from '@/routes';
import { useT } from '@/lib/i18n';

/** "mk" when most letters are Cyrillic (names and affiliations carry no language of their own). */
function scriptLang(text: string): 'mk' | 'en' {
    const letters = text.match(/\p{L}/gu)?.length ?? 0;
    const cyrillic = text.match(/\p{Script=Cyrillic}/gu)?.length ?? 0;

    return letters > 0 && cyrillic / letters > 0.5 ? 'mk' : 'en';
}

type Props = {
    authors: string[];
    affiliations: string[];
    /**
     * Affiliation numbers (1-based) per author, when the source states them.
     * Without it the affiliations are listed without superscripts.
     */
    authorAffiliations?: number[][];
    /** Affiliations shown open up to this many; more are collapsed. */
    openUpTo?: number;
    className?: string;
};

/**
 * Author names (each a search for more of their work) and their
 * affiliations: open when there are a few, otherwise behind a toggle.
 */
export function AuthorList({
    authors,
    affiliations,
    authorAffiliations,
    openUpTo = 3,
    className,
}: Props) {
    const { t } = useT();
    const id = useId();
    const collapsible = affiliations.length > openUpTo;
    const [open, setOpen] = useState(!collapsible);
    const numbered =
        affiliations.length > 1 &&
        authorAffiliations?.length === authors.length;

    if (authors.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex flex-col gap-2', className)}>
            <p
                className="m-0 text-body text-ink"
                lang={scriptLang(authors.join(' '))}
            >
                <span className="sr-only">{t('Authors')}: </span>
                {authors.map((author, index) => (
                    <span key={`${author}-${index}`}>
                        {index > 0 && ', '}
                        <Link
                            href={search.url({
                                query: { q: author, field: 'author' },
                            })}
                            title={t('More by {author}', { author })}
                            className="font-semibold text-ink no-underline decoration-underline underline-offset-4 hover:text-brand hover:underline"
                        >
                            {author}
                        </Link>
                        {numbered && authorAffiliations[index]?.length > 0 && (
                            <sup className="ml-px text-meta font-normal text-ink-muted">
                                {authorAffiliations[index].join(',')}
                            </sup>
                        )}
                    </span>
                ))}
            </p>

            {affiliations.length > 0 && (
                <div className="flex flex-col gap-1.5">
                    {collapsible && (
                        <button
                            type="button"
                            aria-expanded={open}
                            aria-controls={`${id}-affiliations`}
                            onClick={() => setOpen((v) => !v)}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent p-0 font-sans text-ui font-semibold text-brand hover:text-brand-dark"
                        >
                            {open
                                ? t('Hide affiliations')
                                : t('Show {count} affiliations', {
                                      count: affiliations.length,
                                  })}
                            <ChevronDown
                                className={cn(
                                    'size-4 transition-transform motion-reduce:transition-none',
                                    open && 'rotate-180',
                                )}
                                aria-hidden="true"
                            />
                        </button>
                    )}
                    <div id={`${id}-affiliations`} hidden={!open}>
                        <h2 className="sr-only">{t('Affiliations')}</h2>
                        <ol className="m-0 flex list-none flex-col gap-1 p-0 text-ui text-ink-muted">
                            {affiliations.map((affiliation, index) => (
                                <li
                                    key={`${index}-${affiliation.slice(0, 24)}`}
                                    lang={scriptLang(affiliation)}
                                    className="flex gap-2"
                                >
                                    {affiliations.length > 1 && (
                                        <span
                                            aria-hidden="true"
                                            className="w-3 shrink-0 text-right text-meta leading-[1.75] text-ink-muted/80 tabular-nums"
                                        >
                                            {index + 1}
                                        </span>
                                    )}
                                    <span className="min-w-0">
                                        {affiliation}
                                    </span>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            )}
        </div>
    );
}
