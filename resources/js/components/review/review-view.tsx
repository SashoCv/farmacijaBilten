import { Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { recommendationLabel } from '@/lib/manuscript-status';
import type { SubmittedReview } from '@/types/review';
import { ReviewFiles } from './review-files';

/** A submitted review, read-only. Confidential comments only when present (editor and reviewer views). */
export function ReviewView({ review }: { review: SubmittedReview }) {
    const { t } = useT();

    return (
        <div className="grid gap-4 text-sm">
            <p className="m-0">
                <span className="text-muted-foreground">
                    {t('Recommendation')}:
                </span>{' '}
                <span className="font-semibold">
                    {review.recommendation
                        ? t(recommendationLabel(review.recommendation))
                        : '—'}
                </span>
            </p>
            <div>
                <h4 className="m-0 mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                    {t('Comments to the authors')}
                </h4>
                <p className="m-0 whitespace-pre-line">
                    {review.commentsToAuthor || '—'}
                </p>
            </div>
            {review.commentsToEditor !== undefined &&
                review.commentsToEditor !== '' && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50">
                        <h4 className="m-0 mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
                            <Lock aria-hidden="true" className="size-3.5" />
                            {t('Confidential comments to the editor')}
                        </h4>
                        <p className="m-0 whitespace-pre-line">
                            {review.commentsToEditor}
                        </p>
                    </div>
                )}
            {review.files.length > 0 && (
                <div>
                    <h4 className="m-0 mb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                        {t('Files')}
                    </h4>
                    <ReviewFiles files={review.files} />
                </div>
            )}
        </div>
    );
}
