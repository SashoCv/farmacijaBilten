import { Link, router } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import type { ManuscriptPublishing } from '@/types/publishing';
import { PublishOnline } from './publish-online';

/** Which issue the manuscript goes into, and publishing it online. */
export function IssueBox({ publishing }: { publishing: ManuscriptPublishing }) {
    const { t } = useT();
    const id = useId();
    const [choice, setChoice] = useState(publishing.issue?.slug ?? '');
    const [saving, setSaving] = useState(false);

    const assign = () =>
        router.post(
            publishing.assignUrl,
            { issue: choice || null },
            {
                preserveScroll: true,
                onStart: () => setSaving(true),
                onFinish: () => setSaving(false),
            },
        );

    return (
        <div className="grid gap-3 text-sm">
            {publishing.issue ? (
                <p className="m-0">
                    {t('Placed in')}{' '}
                    <Link
                        href={publishing.issue.url}
                        className="font-medium underline underline-offset-4"
                    >
                        {publishing.issue.label}
                    </Link>
                </p>
            ) : (
                <p className="m-0 text-muted-foreground">
                    {t('Not placed in an issue yet.')}
                </p>
            )}

            {publishing.canAssign && !publishing.articleUrl && (
                <div className="grid gap-1.5">
                    <label
                        htmlFor={`${id}-issue`}
                        className="text-xs font-medium"
                    >
                        {t('Issue')}
                    </label>
                    {publishing.openIssues.length === 0 ? (
                        <p className="m-0 text-xs text-muted-foreground">
                            {t(
                                'No issue is open. Open one under Archive and issues.',
                            )}
                        </p>
                    ) : (
                        <div className="flex gap-2">
                            <select
                                id={`${id}-issue`}
                                value={choice}
                                onChange={(e) => setChoice(e.target.value)}
                                className="h-9 min-w-0 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
                            >
                                <option value="">{t('Not in an issue')}</option>
                                {publishing.openIssues.map((issue) => (
                                    <option key={issue.slug} value={issue.slug}>
                                        {issue.label}
                                    </option>
                                ))}
                            </select>
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-9"
                                disabled={
                                    saving ||
                                    choice === (publishing.issue?.slug ?? '')
                                }
                                onClick={assign}
                            >
                                {t('Save')}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {publishing.articleUrl ? (
                <a
                    href={publishing.articleUrl}
                    target="_blank"
                    rel="noopener"
                    className="inline-flex items-center gap-1.5 font-medium text-emerald-700 underline-offset-4 hover:underline dark:text-emerald-400"
                >
                    <ExternalLink aria-hidden="true" className="size-4" />
                    {t('Published on the website')}
                </a>
            ) : (
                publishing.publishUrl && (
                    <div className="grid gap-2 border-t pt-3">
                        <p className="m-0 text-xs text-muted-foreground">
                            {t(
                                'Fill in the DOI before publishing. If the first page is empty, the article starts on the page after the last article in the issue.',
                            )}
                        </p>
                        <PublishOnline
                            url={publishing.publishUrl}
                            pdfUrl={publishing.pdfUrl}
                        />
                    </div>
                )
            )}
        </div>
    );
}
