import { Head, setLayoutProps } from '@inertiajs/react';
import { ExternalLink, FileText } from 'lucide-react';
import { ArticleRow } from '@/components/archive/article-row';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import type { ArchiveIssueProps } from '@/types/archive';

export default function ArchiveIssue({ issue, articles }: ArchiveIssueProps) {
    const { t } = useT();

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'Archive', href: issue.indexUrl },
            { title: issue.label, href: issue.publicUrl },
        ],
    });

    return (
        <>
            <Head title={issue.label} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h1 className="m-0 text-2xl font-semibold tracking-tight">
                            {issue.label}
                        </h1>
                        <p className="m-0 mt-1 text-sm text-muted-foreground">
                            {[
                                issue.year,
                                t('{count} articles', {
                                    count: articles.length,
                                }),
                            ]
                                .filter(Boolean)
                                .join(' · ')}
                            {!issue.published &&
                                ` · ${t('Early online (issue not complete)')}`}
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button asChild variant="outline" size="sm">
                            <a
                                href={issue.publicUrl}
                                target="_blank"
                                rel="noopener"
                            >
                                <ExternalLink aria-hidden="true" />
                                {t('Public page')}
                            </a>
                        </Button>
                        {issue.fullPdf && (
                            <Button asChild variant="outline" size="sm">
                                <a
                                    href={issue.fullPdf}
                                    target="_blank"
                                    rel="noopener"
                                >
                                    <FileText aria-hidden="true" />
                                    {t('Full issue (PDF)')}
                                </a>
                            </Button>
                        )}
                    </div>
                </header>

                <p className="m-0 max-w-3xl text-sm text-muted-foreground">
                    {t(
                        'Archived articles, published as PDFs in the old layout. They are shown as they are and cannot be edited.',
                    )}
                </p>

                {articles.length === 0 ? (
                    <p className="m-0 text-sm text-muted-foreground">
                        {t('This issue has no articles.')}
                    </p>
                ) : (
                    <ol className="m-0 grid list-none overflow-hidden rounded-xl border p-0">
                        {articles.map((row) => (
                            <ArticleRow
                                key={row.id}
                                row={row}
                                showIssue={false}
                            />
                        ))}
                    </ol>
                )}
            </div>
        </>
    );
}
