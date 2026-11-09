import { Link } from '@inertiajs/react';
import { Eye, ExternalLink, FileText } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { ArchiveArticleRow } from '@/types/archive';

/** "registered" / "not registered" / "not checked", in words. */
export function DoiState({ row }: { row: ArchiveArticleRow }) {
    const { t } = useT();

    if (!row.doi) {
        return <span className="text-muted-foreground">{t('No DOI')}</span>;
    }

    const state =
        row.doiRegistered === true
            ? {
                  text: t('registered'),
                  tone: 'text-emerald-700 dark:text-emerald-400',
              }
            : row.doiRegistered === false
              ? {
                    text: t('not registered'),
                    tone: 'font-semibold text-red-700 dark:text-red-400',
                }
              : { text: t('not checked'), tone: 'text-muted-foreground' };

    return (
        <span className="break-all">
            <span className="font-mono text-xs">{row.doi}</span>{' '}
            <span className={cn('text-xs', state.tone)}>({state.text})</span>
        </span>
    );
}

function Tag({ children, warn }: { children: string; warn?: boolean }) {
    return (
        <span
            className={cn(
                'rounded border px-1.5 py-0.5 text-xs',
                warn
                    ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
                    : 'text-muted-foreground',
            )}
        >
            {children}
        </span>
    );
}

/** One archived article (read-only): its data, the original PDF and the public page. */
export function ArticleRow({
    row,
    showIssue = true,
}: {
    row: ArchiveArticleRow;
    showIssue?: boolean;
}) {
    const { t } = useT();

    return (
        <li className="flex flex-col gap-2 border-b px-4 py-3 last:border-b-0 sm:flex-row sm:items-start">
            <span className="w-10 shrink-0 pt-0.5 font-mono text-xs text-muted-foreground">
                {row.number}
            </span>
            <div className="min-w-0 flex-1">
                <Link
                    href={row.url}
                    className="font-medium underline-offset-4 hover:underline"
                >
                    {row.title || t('Untitled')}
                </Link>
                {row.authors.length > 0 && (
                    <p className="m-0 mt-0.5 text-sm text-muted-foreground">
                        {row.authors.join(', ')}
                    </p>
                )}
                <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                    {showIssue && (
                        <span className="text-muted-foreground">
                            {row.issueLabel}
                        </span>
                    )}
                    {row.type && <span>{row.type}</span>}
                    {row.pages && (
                        <span className="text-muted-foreground">
                            {t('pp. {pages}', { pages: row.pages })}
                        </span>
                    )}
                    <DoiState row={row} />
                </p>
                <p className="m-0 mt-1.5 flex flex-wrap gap-1.5">
                    <Tag>{t('Archived · old layout')}</Tag>
                    {!row.pdfUrl && <Tag warn>{t('no PDF')}</Tag>}
                </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-1 sm:flex-col sm:items-stretch">
                <Link
                    href={row.url}
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <Eye aria-hidden="true" className="size-3.5" />
                    {t('View')}
                </Link>
                {row.pdfUrl && (
                    <a
                        href={row.pdfUrl}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                    >
                        <FileText aria-hidden="true" className="size-3.5" />
                        {t('Open PDF')}
                    </a>
                )}
                <a
                    href={row.publicUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                    {t('Public page')}
                </a>
            </div>
        </li>
    );
}
