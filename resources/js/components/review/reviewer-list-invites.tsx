import { router, useForm } from '@inertiajs/react';
import { Mail, UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useId, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import type { ReviewersIndexProps } from '@/types/review';

const textareaClass =
    'w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive';

/**
 * Add someone to the list of reviewers: with an account they get the role at
 * once, otherwise an e-mail asks them to create a reviewer account.
 */
export function AddReviewerForm({ storeUrl }: { storeUrl: string }) {
    const { t } = useT();
    const id = useId();
    const [open, setOpen] = useState(false);
    const form = useForm({
        email: '',
        given_name: '',
        family_name: '',
        affiliation: '',
        expertise: '',
        message: '',
    });

    if (!open) {
        return (
            <div>
                <Button type="button" onClick={() => setOpen(true)}>
                    <UserPlus aria-hidden="true" />
                    {t('Add a reviewer')}
                </Button>
            </div>
        );
    }

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(storeUrl, {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                setOpen(false);
            },
        });
    };

    const field = (
        name: 'email' | 'given_name' | 'family_name' | 'affiliation' | 'expertise',
        label: string,
        props: { type?: string; required?: boolean; autoComplete?: string } = {},
    ) => (
        <div className="grid gap-1.5">
            <Label htmlFor={`${id}-${name}`}>{label}</Label>
            <Input
                id={`${id}-${name}`}
                type={props.type ?? 'text'}
                required={props.required}
                autoComplete={props.autoComplete ?? 'off'}
                value={form.data[name]}
                aria-invalid={form.errors[name] ? true : undefined}
                onChange={(e) => form.setData(name, e.target.value)}
            />
            <InputError message={form.errors[name]} />
        </div>
    );

    return (
        <form
            onSubmit={submit}
            className="grid gap-4 rounded-xl border bg-card p-4"
            noValidate
        >
            <div>
                <h2 className="m-0 text-base font-semibold">
                    {t('Add a reviewer')}
                </h2>
                <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                    {t(
                        'The person gets an e-mail with a link to create a reviewer account. Someone who already has an account simply becomes a reviewer. Reviewers see only the manuscripts they are invited to.',
                    )}
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                {field('given_name', t('Given name'), { required: true })}
                {field('family_name', t('Family name'), { required: true })}
                {field('email', t('E-mail'), { type: 'email', required: true })}
                {field('affiliation', t('Institution / affiliation'))}
                <div className="sm:col-span-2">
                    {field('expertise', t('Expertise (for finding reviewers)'))}
                </div>
                <div className="grid gap-1.5 sm:col-span-2">
                    <Label htmlFor={`${id}-message`}>
                        {t('Personal message (optional)')}
                    </Label>
                    <textarea
                        id={`${id}-message`}
                        rows={3}
                        value={form.data.message}
                        onChange={(e) =>
                            form.setData('message', e.target.value)
                        }
                        className={textareaClass}
                    />
                    <InputError message={form.errors.message} />
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={form.processing}>
                    <Mail aria-hidden="true" />
                    {form.processing ? t('Sending…') : t('Add and send the e-mail')}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                        form.reset();
                        form.clearErrors();
                        setOpen(false);
                    }}
                >
                    {t('Cancel')}
                </Button>
            </div>
        </form>
    );
}

/** People invited to the list who have not created their account yet. */
export function PendingReviewerInvites({
    invites,
}: {
    invites: ReviewersIndexProps['invites'];
}) {
    const { t } = useT();
    const { date } = useDates();
    const [busy, setBusy] = useState<number | null>(null);

    if (invites.length === 0) {
        return null;
    }

    const act = (
        invite: ReviewersIndexProps['invites'][number],
        method: 'post' | 'delete',
    ) => {
        const url = method === 'post' ? invite.resendUrl : invite.withdrawUrl;
        setBusy(invite.id);
        router.visit(url, {
            method,
            preserveScroll: true,
            onFinish: () => setBusy(null),
        });
    };

    return (
        <section className="grid gap-2 rounded-xl border bg-card p-4">
            <h2 className="m-0 text-base font-semibold">
                {t('Invited, no account yet ({count})', {
                    count: invites.length,
                })}
            </h2>
            <ul className="m-0 grid list-none gap-2 p-0">
                {invites.map((i) => (
                    <li
                        key={i.id}
                        className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border bg-background px-3 py-2 text-sm"
                    >
                        <div className="min-w-0 flex-1">
                            <span className="font-medium">{i.name}</span>{' '}
                            <a
                                href={`mailto:${i.email}`}
                                className="text-muted-foreground underline-offset-4 hover:underline"
                            >
                                {i.email}
                            </a>
                            {(i.affiliation || i.expertise) && (
                                <span className="block text-xs text-muted-foreground">
                                    {[i.affiliation, i.expertise]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </span>
                            )}
                        </div>
                        <span className="text-xs text-muted-foreground">
                            {t('E-mail sent {date}', {
                                date: date(i.invitedAt),
                            })}
                        </span>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy === i.id}
                                onClick={() => act(i, 'post')}
                            >
                                {t('Send again')}
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={busy === i.id}
                                onClick={() => act(i, 'delete')}
                            >
                                {t('Withdraw')}
                            </Button>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}
