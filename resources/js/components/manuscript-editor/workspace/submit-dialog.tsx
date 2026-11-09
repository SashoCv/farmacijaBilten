import { CircleAlert, Send } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import type { SubmissionData, TemplateConfig } from '@/types/manuscript';
import { EMAIL } from './content';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    submission: SubmissionData;
    onChange: (update: (previous: SubmissionData) => SubmissionData) => void;
    template: TemplateConfig;
    /** Saves, checks and sends; resolves with the messages that stopped it. */
    onSend: () => Promise<string[]>;
    revision: boolean;
    /** Revisions after review need a response to the reviewers (not after a technical return). */
    needsResponse: boolean;
};

/**
 * The last step before sending: suggested reviewers, a cover letter and
 * the submission declaration. Saved with the draft (autosave), then the
 * manuscript is sent.
 */
export function SubmitDialog({
    open,
    onOpenChange,
    submission,
    onChange,
    template,
    onSend,
    revision,
    needsResponse,
}: Props) {
    const { t } = useT();
    const id = useId();
    const [sending, setSending] = useState(false);
    const [problems, setProblems] = useState<string[]>([]);
    const [tried, setTried] = useState(false);

    const setReviewer = (
        index: number,
        patch: Partial<SubmissionData['suggestedReviewers'][number]>,
    ) =>
        onChange((p) => ({
            ...p,
            suggestedReviewers: p.suggestedReviewers.map((r, i) =>
                i === index ? { ...r, ...patch } : r,
            ),
        }));

    const reviewersOk = submission.suggestedReviewers.every(
        (r) =>
            r.name.trim() !== '' &&
            r.affiliation.trim() !== '' &&
            EMAIL.test(r.email.trim()),
    );
    const declarationsOk = Object.keys(template.declarations).every(
        (key) => submission.declarations[key] === true,
    );

    const responseOk =
        !needsResponse || (submission.responseToReviewers ?? '').trim() !== '';

    const send = async () => {
        setTried(true);

        if (!reviewersOk || !declarationsOk || !responseOk) {
            return;
        }

        setSending(true);
        setProblems([]);
        const found = await onSend();
        setSending(false);
        setProblems(found);
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                if (!sending) {
                    onOpenChange(next);
                }
            }}
        >
            <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
                <DialogTitle>
                    {revision
                        ? t('Submit the revised manuscript')
                        : t('Submit the manuscript')}
                </DialogTitle>
                <DialogDescription>
                    {t(
                        'Only the editorial office sees this page; it is not sent to the reviewers. After you submit, the manuscript can no longer be changed unless the editors ask for a revision.',
                    )}
                </DialogDescription>

                <form
                    className="grid gap-6"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void send();
                    }}
                    noValidate
                >
                    {submission.suggestedReviewers.length > 0 && (
                        <fieldset className="grid gap-3">
                            <legend className="mb-1 text-sm font-semibold">
                                {t('Suggested reviewers')}
                            </legend>
                            <p className="m-0 -mt-1 text-sm text-muted-foreground">
                                {t(
                                    'Suggest {count} experts in the field who are not from your institution and have not worked with you recently. The editors decide whether to invite them.',
                                    { count: template.suggestedReviewers },
                                )}
                            </p>
                            {submission.suggestedReviewers.map(
                                (reviewer, index) => {
                                    const base = `${id}-r${index}`;
                                    const emailBad =
                                        tried &&
                                        !EMAIL.test(reviewer.email.trim());

                                    return (
                                        <fieldset
                                            key={index}
                                            className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3"
                                        >
                                            <legend className="px-1 text-xs font-medium text-muted-foreground">
                                                {t('Reviewer {n}', {
                                                    n: index + 1,
                                                })}
                                            </legend>
                                            <div className="grid gap-1">
                                                <Label htmlFor={`${base}-name`}>
                                                    {t('Name')}
                                                </Label>
                                                <Input
                                                    id={`${base}-name`}
                                                    value={reviewer.name}
                                                    aria-invalid={
                                                        tried &&
                                                        reviewer.name.trim() ===
                                                            ''
                                                    }
                                                    onChange={(e) =>
                                                        setReviewer(index, {
                                                            name: e.target
                                                                .value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor={`${base}-affiliation`}
                                                >
                                                    {t(
                                                        'Institution and address',
                                                    )}
                                                </Label>
                                                <Input
                                                    id={`${base}-affiliation`}
                                                    value={reviewer.affiliation}
                                                    aria-invalid={
                                                        tried &&
                                                        reviewer.affiliation.trim() ===
                                                            ''
                                                    }
                                                    onChange={(e) =>
                                                        setReviewer(index, {
                                                            affiliation:
                                                                e.target.value,
                                                        })
                                                    }
                                                />
                                            </div>
                                            <div className="grid gap-1">
                                                <Label
                                                    htmlFor={`${base}-email`}
                                                >
                                                    {t('E-mail')}
                                                </Label>
                                                <Input
                                                    id={`${base}-email`}
                                                    type="email"
                                                    value={reviewer.email}
                                                    aria-invalid={emailBad}
                                                    aria-describedby={
                                                        emailBad
                                                            ? `${base}-email-error`
                                                            : undefined
                                                    }
                                                    onChange={(e) =>
                                                        setReviewer(index, {
                                                            email: e.target.value.trim(),
                                                        })
                                                    }
                                                />
                                                {emailBad && (
                                                    <p
                                                        id={`${base}-email-error`}
                                                        className="m-0 text-xs text-red-600 dark:text-red-400"
                                                    >
                                                        {t(
                                                            'This is not a valid e-mail address.',
                                                        )}
                                                    </p>
                                                )}
                                            </div>
                                        </fieldset>
                                    );
                                },
                            )}
                            {tried && !reviewersOk && (
                                <p className="m-0 text-sm text-red-600 dark:text-red-400">
                                    {t(
                                        'Give the name, institution and e-mail address of every suggested reviewer.',
                                    )}
                                </p>
                            )}
                        </fieldset>
                    )}

                    {needsResponse && (
                        <div className="grid gap-1.5">
                            <Label htmlFor={`${id}-response`}>
                                {t('Response to the reviewers')}
                            </Label>
                            <p
                                id={`${id}-response-hint`}
                                className="m-0 text-sm text-muted-foreground"
                            >
                                {t(
                                    'Answer every comment point by point and say what you changed and where. Under anonymous review, do not sign it or name the authors.',
                                )}
                            </p>
                            <textarea
                                id={`${id}-response`}
                                rows={10}
                                value={submission.responseToReviewers ?? ''}
                                aria-invalid={
                                    tried && !responseOk ? true : undefined
                                }
                                aria-describedby={
                                    tried && !responseOk
                                        ? `${id}-response-error`
                                        : `${id}-response-hint`
                                }
                                onChange={(e) =>
                                    onChange((p) => ({
                                        ...p,
                                        responseToReviewers: e.target.value,
                                    }))
                                }
                                className="min-h-48 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive"
                            />
                            {tried && !responseOk && (
                                <p
                                    id={`${id}-response-error`}
                                    className="m-0 text-sm text-red-600 dark:text-red-400"
                                >
                                    {t(
                                        'Write your response to the reviewers to submit the revision.',
                                    )}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="grid gap-1.5">
                        <Label htmlFor={`${id}-letter`}>
                            {t('Cover letter (optional)')}
                        </Label>
                        <textarea
                            id={`${id}-letter`}
                            rows={5}
                            value={submission.coverLetter}
                            onChange={(e) =>
                                onChange((p) => ({
                                    ...p,
                                    coverLetter: e.target.value,
                                }))
                            }
                            className="min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        />
                    </div>

                    <fieldset className="grid gap-3">
                        <legend className="mb-1 text-sm font-semibold">
                            {t('Submission declaration')}
                        </legend>
                        {Object.entries(template.declarations).map(
                            ([key, sentence]) => (
                                <div
                                    key={key}
                                    className="flex items-start gap-3"
                                >
                                    <Checkbox
                                        id={`${id}-d-${key}`}
                                        className="mt-0.5"
                                        checked={
                                            submission.declarations[key] ===
                                            true
                                        }
                                        aria-invalid={
                                            tried &&
                                            submission.declarations[key] !==
                                                true
                                        }
                                        onCheckedChange={(checked) =>
                                            onChange((p) => ({
                                                ...p,
                                                declarations: {
                                                    ...p.declarations,
                                                    [key]: checked === true,
                                                },
                                            }))
                                        }
                                    />
                                    <Label
                                        htmlFor={`${id}-d-${key}`}
                                        className="leading-snug font-normal"
                                    >
                                        {t(sentence)}
                                    </Label>
                                </div>
                            ),
                        )}
                        {tried && !declarationsOk && (
                            <p className="m-0 text-sm text-red-600 dark:text-red-400">
                                {t('Confirm every statement to submit.')}
                            </p>
                        )}
                    </fieldset>

                    {problems.length > 0 && (
                        <div
                            role="alert"
                            className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100"
                        >
                            <p className="m-0 flex items-center gap-2 font-medium">
                                <CircleAlert
                                    aria-hidden="true"
                                    className="size-4"
                                />
                                {t('The manuscript was not sent:')}
                            </p>
                            <ul className="m-0 mt-1 list-disc pl-6">
                                {problems.map((problem, index) => (
                                    <li key={index}>{problem}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="secondary"
                            disabled={sending}
                            onClick={() => onOpenChange(false)}
                        >
                            {t('Back to the manuscript')}
                        </Button>
                        <Button type="submit" disabled={sending}>
                            <Send aria-hidden="true" />
                            {sending
                                ? t('Sending…')
                                : t('Send to the editorial office')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
