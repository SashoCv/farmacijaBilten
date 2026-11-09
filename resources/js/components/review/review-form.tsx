import { router, usePage } from '@inertiajs/react';
import { CircleAlert, CloudOff, Lock, Paperclip, Send } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useDates } from '@/lib/dates';
import { failureReason, sendJson, uploadForm } from '@/lib/http';
import { useT } from '@/lib/i18n';
import { recommendationLabel } from '@/lib/manuscript-status';
import { cn } from '@/lib/utils';
import type {
    Recommendation,
    ReviewFile,
    ReviewerShowProps,
} from '@/types/review';
import { ReviewFiles } from './review-files';

/** One-line explanations of the recommendations (English keys). */
const EXPLANATIONS: Record<Recommendation, string> = {
    accept: 'The manuscript can be published as it is.',
    minor_revision: 'Small corrections; no new review needed.',
    major_revision: 'Substantial changes; another review is needed.',
    reject: 'The manuscript is not suitable for the journal.',
};

const textareaClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

type SaveState =
    | { kind: 'idle' }
    | { kind: 'dirty' }
    | { kind: 'saving' }
    | { kind: 'saved'; at: string }
    | { kind: 'failed'; message: string };

const AUTOSAVE_MS = 2000;

/**
 * The review: recommendation, comments to the authors, confidential
 * comments to the editor and files. Saved as a draft (also automatically),
 * then submitted once.
 */
export function ReviewForm({
    review,
    recommendations,
    urls,
    files: limits,
}: Pick<ReviewerShowProps, 'review' | 'recommendations' | 'urls' | 'files'>) {
    const { t } = useT();
    const { dateTime } = useDates();
    const id = useId();
    const errors = usePage().props.errors as Record<string, string>;

    const [recommendation, setRecommendation] = useState<Recommendation | null>(
        review.recommendation,
    );
    const [toAuthor, setToAuthor] = useState(review.commentsToAuthor);
    const [toEditor, setToEditor] = useState(review.commentsToEditor);
    const [files, setFiles] = useState<ReviewFile[]>(review.files);
    const [save, setSave] = useState<SaveState>({ kind: 'idle' });
    const [confirming, setConfirming] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [visibility, setVisibility] = useState<'author' | 'editor'>('author');
    const [upload, setUpload] = useState<
        | { kind: 'idle' }
        | { kind: 'busy'; progress: number }
        | { kind: 'failed'; message: string }
    >({ kind: 'idle' });
    const [deleting, setDeleting] = useState<string | null>(null);
    const [tried, setTried] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const latest = useRef({ recommendation, toAuthor, toEditor });

    const payload = () => ({
        recommendation: latest.current.recommendation,
        comments_to_author: latest.current.toAuthor,
        comments_to_editor: latest.current.toEditor,
    });

    const saveDraft = async (): Promise<boolean> => {
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        setSave({ kind: 'saving' });
        const result = await sendJson<{ savedAt?: string; message?: string }>(
            urls.save,
            'PUT',
            payload(),
        );

        if (result.ok) {
            setSave({
                kind: 'saved',
                at: result.body?.savedAt ?? new Date().toISOString(),
            });

            return true;
        }

        setSave({ kind: 'failed', message: failureReason(result, t) });

        return false;
    };

    const changed = (patch: Partial<typeof latest.current>) => {
        latest.current = { ...latest.current, ...patch };
        setSave({ kind: 'dirty' });

        if (timer.current) {
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(() => void saveDraft(), AUTOSAVE_MS);
    };

    // A pending autosave is sent when the page is left.
    useEffect(
        () => () => {
            if (timer.current) {
                clearTimeout(timer.current);
                void sendJson(urls.save, 'PUT', {
                    recommendation: latest.current.recommendation,
                    comments_to_author: latest.current.toAuthor,
                    comments_to_editor: latest.current.toEditor,
                });
            }
        },
        [urls.save],
    );

    const chooseFile = async (file: File | undefined) => {
        if (!file) {
            return;
        }

        const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

        if (
            limits.extensions.length > 0 &&
            !limits.extensions.includes(extension)
        ) {
            setUpload({
                kind: 'failed',
                message: t('Allowed file types: {types}.', {
                    types: limits.extensions.join(', '),
                }),
            });

            return;
        }

        if (file.size > limits.maxMb * 1024 * 1024) {
            setUpload({
                kind: 'failed',
                message: t('The file is larger than {mb} MB.', {
                    mb: limits.maxMb,
                }),
            });

            return;
        }

        const form = new FormData();
        form.append('file', file);
        form.append('visibility', visibility);
        setUpload({ kind: 'busy', progress: 0 });
        const result = await uploadForm<ReviewFile & { message?: string }>(
            urls.upload,
            form,
            (progress) => setUpload({ kind: 'busy', progress }),
        );

        if (result.ok && result.body?.id) {
            const added = result.body;
            setFiles((list) => [...list, added]);
            setUpload({ kind: 'idle' });
        } else {
            setUpload({ kind: 'failed', message: failureReason(result, t) });
        }
    };

    const deleteFile = async (file: ReviewFile) => {
        if (!file.deleteUrl) {
            return;
        }

        setDeleting(file.id);
        const result = await sendJson(file.deleteUrl, 'DELETE');
        setDeleting(null);

        if (result.ok) {
            setFiles((list) => list.filter((f) => f.id !== file.id));
        } else {
            setUpload({ kind: 'failed', message: failureReason(result, t) });
        }
    };

    const missing = !recommendation || toAuthor.trim() === '';

    const askSubmit = () => {
        setTried(true);

        if (!missing) {
            setConfirming(true);
        }
    };

    const submit = async () => {
        setSubmitting(true);

        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }

        router.post(urls.submit, payload(), {
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
                setConfirming(false);
            },
        });
    };

    const recommendationError =
        errors.recommendation ??
        (tried && !recommendation ? t('Choose a recommendation.') : undefined);
    const authorError =
        errors.comments_to_author ??
        (tried && toAuthor.trim() === ''
            ? t('Write your comments to the authors.')
            : undefined);

    return (
        <form
            aria-labelledby={`${id}-title`}
            className="grid gap-5"
            onSubmit={(event) => {
                event.preventDefault();
                askSubmit();
            }}
            noValidate
        >
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={`${id}-title`} className="m-0 text-base font-semibold">
                    {t('Your review')}
                </h2>
                <p
                    role="status"
                    aria-live="polite"
                    className="m-0 flex items-center gap-1.5 text-xs text-muted-foreground"
                >
                    {save.kind === 'saving' && t('Saving…')}
                    {save.kind === 'dirty' && t('Unsaved changes')}
                    {save.kind === 'saved' &&
                        t('Draft saved {time}', { time: dateTime(save.at) })}
                    {save.kind === 'failed' && (
                        <span className="flex items-center gap-1 text-red-700 dark:text-red-400">
                            <CloudOff aria-hidden="true" className="size-3.5" />
                            {t('Not saved')}
                        </span>
                    )}
                </p>
            </div>
            {save.kind === 'failed' && (
                <p
                    role="alert"
                    className="m-0 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                >
                    {save.message}
                </p>
            )}

            <fieldset
                className="m-0 grid gap-2 border-0 p-0"
                aria-describedby={
                    recommendationError ? `${id}-rec-error` : `${id}-rec-hint`
                }
            >
                <legend className="mb-1 p-0 text-sm font-medium">
                    {t('Recommendation')}
                </legend>
                {recommendations.map((value) => (
                    <label
                        key={value}
                        className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm hover:bg-muted/50 has-[:checked]:border-primary has-[:checked]:bg-muted has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring',
                        )}
                    >
                        <input
                            type="radio"
                            name={`${id}-recommendation`}
                            value={value}
                            checked={recommendation === value}
                            onChange={() => {
                                setRecommendation(value);
                                changed({ recommendation: value });
                            }}
                            className="mt-0.5 size-4 accent-[#2c4a8a]"
                        />
                        <span>
                            <span className="block font-medium">
                                {t(recommendationLabel(value))}
                            </span>
                            <span className="block text-muted-foreground">
                                {t(EXPLANATIONS[value])}
                            </span>
                        </span>
                    </label>
                ))}
                <p
                    id={`${id}-rec-hint`}
                    className="m-0 text-xs text-muted-foreground"
                >
                    {t(
                        'Your recommendation is advice; the editor makes the decision.',
                    )}
                </p>
                {recommendationError && (
                    <p
                        id={`${id}-rec-error`}
                        className="m-0 text-sm text-red-600 dark:text-red-400"
                    >
                        {recommendationError}
                    </p>
                )}
            </fieldset>

            <div className="grid gap-1.5">
                <Label htmlFor={`${id}-author`}>
                    {t('Comments to the authors')}
                </Label>
                <p
                    id={`${id}-author-hint`}
                    className="m-0 text-xs text-muted-foreground"
                >
                    {t(
                        'Sent to the authors with the decision, under "Reviewer" and a number. Do not sign them.',
                    )}
                </p>
                <textarea
                    id={`${id}-author`}
                    rows={14}
                    value={toAuthor}
                    aria-invalid={authorError ? true : undefined}
                    aria-describedby={
                        authorError ? `${id}-author-error` : `${id}-author-hint`
                    }
                    onChange={(event) => {
                        setToAuthor(event.target.value);
                        changed({ toAuthor: event.target.value });
                    }}
                    className={cn(textareaClass, 'min-h-64')}
                />
                {authorError && (
                    <p
                        id={`${id}-author-error`}
                        className="m-0 text-sm text-red-600 dark:text-red-400"
                    >
                        {authorError}
                    </p>
                )}
            </div>

            <div className="grid gap-1.5 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-700 dark:bg-amber-950/40">
                <Label
                    htmlFor={`${id}-editor`}
                    className="flex items-center gap-1.5"
                >
                    <Lock aria-hidden="true" className="size-3.5" />
                    {t('Confidential comments to the editor (optional)')}
                </Label>
                <p
                    id={`${id}-editor-hint`}
                    className="m-0 text-xs text-amber-950 dark:text-amber-100"
                >
                    {t('Never shown to the authors.')}
                </p>
                <textarea
                    id={`${id}-editor`}
                    rows={5}
                    value={toEditor}
                    aria-describedby={`${id}-editor-hint`}
                    onChange={(event) => {
                        setToEditor(event.target.value);
                        changed({ toEditor: event.target.value });
                    }}
                    className={cn(textareaClass, 'bg-background')}
                />
            </div>

            <fieldset className="m-0 grid gap-2 border-0 p-0">
                <legend className="mb-1 p-0 text-sm font-medium">
                    {t('Files (optional)')}
                </legend>
                <ReviewFiles
                    files={files}
                    onDelete={(file) => void deleteFile(file)}
                    busy={deleting}
                />
                <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="inline-flex items-center gap-1.5">
                        <input
                            type="radio"
                            name={`${id}-visibility`}
                            checked={visibility === 'author'}
                            onChange={() => setVisibility('author')}
                            className="size-4 accent-[#2c4a8a]"
                        />
                        {t('Share with the authors')}
                    </label>
                    <label className="inline-flex items-center gap-1.5">
                        <input
                            type="radio"
                            name={`${id}-visibility`}
                            checked={visibility === 'editor'}
                            onChange={() => setVisibility('editor')}
                            className="size-4 accent-[#2c4a8a]"
                        />
                        {t('Editorial office only')}
                    </label>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={upload.kind === 'busy'}
                        onClick={() => fileInput.current?.click()}
                    >
                        <Paperclip aria-hidden="true" />
                        {upload.kind === 'busy'
                            ? t('Uploading… {percent} %', {
                                  percent: Math.round(upload.progress * 100),
                              })
                            : t('Attach a file')}
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        className="sr-only"
                        tabIndex={-1}
                        aria-hidden="true"
                        accept={limits.extensions.map((e) => `.${e}`).join(',')}
                        onChange={(event) => {
                            void chooseFile(event.target.files?.[0]);
                            event.target.value = '';
                        }}
                    />
                    <span className="text-xs text-muted-foreground">
                        {t('Up to {mb} MB: {types}.', {
                            mb: limits.maxMb,
                            types: limits.extensions.join(', '),
                        })}
                    </span>
                </div>
                <p className="m-0 text-xs text-muted-foreground">
                    {t(
                        'File properties (the author field of a Word or PDF file) can reveal your name; remove it before you share a file with the authors.',
                    )}
                </p>
                {upload.kind === 'failed' && (
                    <p
                        role="alert"
                        className="m-0 flex items-start gap-1.5 text-sm text-red-700 dark:text-red-400"
                    >
                        <CircleAlert
                            aria-hidden="true"
                            className="mt-0.5 size-4 shrink-0"
                        />
                        {upload.message}
                    </p>
                )}
            </fieldset>

            <div className="flex flex-wrap gap-2 border-t pt-4">
                <Button
                    type="button"
                    variant="outline"
                    disabled={save.kind === 'saving'}
                    onClick={() => void saveDraft()}
                >
                    {t('Save draft')}
                </Button>
                <Button type="submit">
                    <Send aria-hidden="true" />
                    {t('Submit review…')}
                </Button>
            </div>

            <Dialog
                open={confirming}
                onOpenChange={(open) => !submitting && setConfirming(open)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>{t('Submit your review?')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'After you submit, the review can no longer be changed. The editorial office is notified.',
                        )}
                    </DialogDescription>
                    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-muted-foreground">
                            {t('Recommendation')}
                        </dt>
                        <dd className="m-0 font-medium">
                            {recommendation
                                ? t(recommendationLabel(recommendation))
                                : '—'}
                        </dd>
                        <dt className="text-muted-foreground">
                            {t('Comments to the authors')}
                        </dt>
                        <dd className="m-0">
                            {t('{count} words', {
                                count: toAuthor
                                    .trim()
                                    .split(/\s+/)
                                    .filter(Boolean).length,
                            })}
                        </dd>
                        <dt className="text-muted-foreground">
                            {t('Confidential comments')}
                        </dt>
                        <dd className="m-0">
                            {toEditor.trim() ? t('Yes') : t('None')}
                        </dd>
                        <dt className="text-muted-foreground">{t('Files')}</dt>
                        <dd className="m-0">{files.length}</dd>
                    </dl>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            disabled={submitting}
                            onClick={() => setConfirming(false)}
                        >
                            {t('Back to the review')}
                        </Button>
                        <Button
                            disabled={submitting}
                            onClick={() => void submit()}
                        >
                            <Send aria-hidden="true" />
                            {submitting ? t('Sending…') : t('Submit review')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </form>
    );
}
