import { Head, Link } from '@inertiajs/react';
import { Archive, ExternalLink, FileText } from 'lucide-react';
import type { ReactNode } from 'react';
import { DoiState } from '@/components/archive/article-row';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { index as archiveIndex } from '@/routes/admin/archive';
import type { ArchiveArticleProps } from '@/types/archive';

function Item({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="grid gap-1 border-b py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="m-0 text-sm">{children}</dd>
        </div>
    );
}

/**
 * An archived article, read-only: its data and the original PDF in the old
 * layout. Never opened in the new editor or rendered with the new template.
 */
export default function ArchiveArticle({ article }: ArchiveArticleProps) {
    const { t, locale } = useT();
    const date = article.onlineAt
        ? new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
          }).format(new Date(article.onlineAt))
        : null;

    return (
        <>
            <Head title={article.title} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="flex flex-col gap-3">
                    <p className="m-0 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <Link
                            href={article.issueUrl}
                            className="underline-offset-4 hover:underline"
                        >
                            {article.issueLabel}
                        </Link>
                        <span aria-hidden>·</span>
                        <span className="font-mono">{article.number}</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground">
                            <Archive aria-hidden className="size-3.5" />
                            {t('Archived · old layout')}
                        </span>
                    </p>
                    <h1 className="m-0 text-xl leading-snug font-semibold tracking-tight md:text-2xl">
                        {article.title}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                        {article.pdfUrl && (
                            <a
                                href={article.pdfUrl}
                                target="_blank"
                                rel="noopener"
                                className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                            >
                                <FileText aria-hidden className="size-4" />
                                {t('Open the PDF in a new tab')}
                            </a>
                        )}
                        <a
                            href={article.publicUrl}
                            target="_blank"
                            rel="noopener"
                            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                        >
                            <ExternalLink aria-hidden className="size-4" />
                            {t('Public page')}
                        </a>
                    </div>
                    <p className="m-0 max-w-3xl rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                        {t(
                            'Published before the manuscript system, in the old two-column layout. The original PDF is the published version; the article is shown as it is and cannot be edited.',
                        )}
                    </p>
                </header>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
                    <section aria-label={t('Article data')}>
                        <dl className="m-0 rounded-xl border bg-card px-4">
                            <Item label={t('Authors')}>
                                {article.authors.length > 0
                                    ? article.authors.join(', ')
                                    : '—'}
                            </Item>
                            {article.affiliations.length > 0 && (
                                <Item label={t('Affiliations')}>
                                    <ol className="m-0 flex flex-col gap-1 pl-4">
                                        {article.affiliations.map(
                                            (affiliation) => (
                                                <li key={affiliation}>
                                                    {affiliation}
                                                </li>
                                            ),
                                        )}
                                    </ol>
                                </Item>
                            )}
                            <Item label={t('Type')}>{article.type ?? '—'}</Item>
                            <Item label={t('Pages')}>
                                {article.pages ?? '—'}
                            </Item>
                            <Item label="DOI">
                                <DoiState row={article} />
                            </Item>
                            {date && (
                                <Item label={t('Published online')}>
                                    {date}
                                </Item>
                            )}
                            <Item label={t('Key words')}>
                                {article.keywords.length > 0
                                    ? article.keywords.join(', ')
                                    : '—'}
                            </Item>
                            <Item label={t('Abstract')}>
                                {article.abstract ? (
                                    <p className="m-0 whitespace-pre-line">
                                        {article.abstract}
                                    </p>
                                ) : (
                                    '—'
                                )}
                            </Item>
                        </dl>
                    </section>

                    <section
                        aria-label={t(
                            'Published version (original PDF, old layout)',
                        )}
                        className="flex flex-col gap-2 xl:sticky xl:top-4 xl:self-start"
                    >
                        <h2 className="m-0 text-sm font-semibold">
                            {t('Published version (original PDF, old layout)')}
                        </h2>
                        {article.pdfUrl ? (
                            <iframe
                                src={article.pdfUrl}
                                title={t(
                                    'Published version (original PDF, old layout)',
                                )}
                                className="h-[80svh] w-full rounded-xl border bg-white"
                            />
                        ) : (
                            <p className="m-0 rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                                {t('No PDF for this article.')}
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </>
    );
}

ArchiveArticle.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Archive', href: archiveIndex() },
    ],
};
