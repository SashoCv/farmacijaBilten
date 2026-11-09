import { Form, Head, Link, router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { CountrySelect } from '@/components/forms/country-select';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { privacyHref } from '@/lib/site-links';
import type { InvitationProps } from '@/types/review';
import '../../../css/manuscript.css';
import '../../../css/manuscript-article.css';

function Field({
    id,
    label,
    hint,
    error,
    children,
    className,
}: {
    id: string;
    label: string;
    hint?: string;
    error?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div className={className ?? 'grid gap-2'}>
            <Label htmlFor={id} className="text-ui font-semibold">
                {label}
            </Label>
            {children}
            {hint && !error && (
                <p id={`${id}-hint`} className="m-0 text-meta text-ink-muted">
                    {hint}
                </p>
            )}
            <InputError id={`${id}-error`} message={error} />
        </div>
    );
}

function describedBy(id: string, error?: string, hint?: boolean) {
    return {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': error
            ? `${id}-error`
            : hint
              ? `${id}-hint`
              : undefined,
    } as const;
}

/** Account for an invited reviewer: name, institution, country, password. */
function CreateAccount({
    email,
    name,
    countries,
    passwordRules,
    action,
}: {
    email: string;
    name: string | null;
    countries: string[];
    passwordRules: string;
    action: string;
}) {
    const { t } = useT();
    const [given, ...rest] = (name ?? '').trim().split(/\s+/);

    return (
        <Form
            action={action}
            method="post"
            resetOnSuccess={['password', 'password_confirmation']}
            disableWhileProcessing
            className="grid gap-5"
        >
            {({ processing, errors }) => (
                <>
                    <div>
                        <h2 className="m-0 text-h4 font-semibold">
                            {t('Create your reviewer account')}
                        </h2>
                        <p className="m-0 mt-1 text-ui text-ink-soft">
                            {t(
                                'The account is for {email}. With it you answer the invitation, read the manuscript and send your review.',
                                { email },
                            )}
                        </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field
                            id="given_name"
                            label={t('Given name')}
                            error={errors.given_name}
                        >
                            <Input
                                {...describedBy(
                                    'given_name',
                                    errors.given_name,
                                )}
                                name="given_name"
                                required
                                defaultValue={given ?? ''}
                                autoComplete="given-name"
                                className="h-11 text-base"
                            />
                        </Field>
                        <Field
                            id="family_name"
                            label={t('Family name')}
                            error={errors.family_name}
                        >
                            <Input
                                {...describedBy(
                                    'family_name',
                                    errors.family_name,
                                )}
                                name="family_name"
                                required
                                defaultValue={rest.join(' ')}
                                autoComplete="family-name"
                                className="h-11 text-base"
                            />
                        </Field>
                        <Field
                            id="affiliation"
                            label={t('Institution / affiliation')}
                            error={errors.affiliation}
                            className="grid gap-2 sm:col-span-2"
                        >
                            <Input
                                {...describedBy(
                                    'affiliation',
                                    errors.affiliation,
                                )}
                                name="affiliation"
                                required
                                autoComplete="organization"
                                className="h-11 text-base"
                            />
                        </Field>
                        <Field
                            id="country_code"
                            label={t('Country')}
                            error={errors.country_code}
                        >
                            <CountrySelect
                                {...describedBy(
                                    'country_code',
                                    errors.country_code,
                                )}
                                codes={countries}
                                name="country_code"
                                required
                                defaultValue=""
                                autoComplete="country"
                            />
                        </Field>
                        <Field id="invited_email" label={t('E-mail address')}>
                            <Input
                                id="invited_email"
                                value={email}
                                readOnly
                                className="h-11 text-base"
                            />
                        </Field>
                        <Field
                            id="password"
                            label={t('Password')}
                            error={errors.password}
                        >
                            <PasswordInput
                                {...describedBy('password', errors.password)}
                                name="password"
                                required
                                autoComplete="new-password"
                                passwordrules={passwordRules}
                                className="h-11 text-base"
                            />
                        </Field>
                        <Field
                            id="password_confirmation"
                            label={t('Repeat the password')}
                            error={errors.password_confirmation}
                        >
                            <PasswordInput
                                {...describedBy(
                                    'password_confirmation',
                                    errors.password_confirmation,
                                )}
                                name="password_confirmation"
                                required
                                autoComplete="new-password"
                                className="h-11 text-base"
                            />
                        </Field>
                    </div>

                    <div className="grid gap-2">
                        <div className="flex items-start gap-3">
                            <Checkbox
                                id="privacy"
                                name="privacy"
                                value="1"
                                required
                                className="mt-0.5"
                                aria-invalid={errors.privacy ? true : undefined}
                                aria-describedby={
                                    errors.privacy ? 'privacy-error' : undefined
                                }
                            />
                            <Label
                                htmlFor="privacy"
                                className="text-ui leading-snug font-normal"
                            >
                                {t(
                                    'I agree that the journal keeps my details to handle my manuscripts and reviews.',
                                )}{' '}
                                <a
                                    href={privacyHref}
                                    target="_blank"
                                    className="link-u"
                                >
                                    {t('Privacy statement')}
                                </a>
                            </Label>
                        </div>
                        <InputError
                            id="privacy-error"
                            message={errors.privacy}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="h-11 w-full text-base font-semibold"
                        disabled={processing}
                    >
                        {processing && <Spinner />}
                        {t('Create account and continue')}
                    </Button>
                </>
            )}
        </Form>
    );
}

export default function Invitation({
    email,
    name,
    manuscript,
    responseDueAt,
    reviewDueAt,
    message,
    mode,
    signedInAs,
    countries,
    passwordRules,
    urls,
}: InvitationProps) {
    const { t } = useT();
    const { date } = useDates();

    return (
        <>
            <Head title={t('Invitation to review')} />

            <div className="grid gap-7">
                <section
                    aria-labelledby="invited-manuscript"
                    className="grid gap-3"
                >
                    <p className="m-0 text-meta font-semibold tracking-[0.08em] text-ink-muted uppercase">
                        {manuscript.typeLabel}
                    </p>
                    <h2
                        id="invited-manuscript"
                        className="m-0 text-h4 leading-snug font-semibold"
                    >
                        {manuscript.title || t('Untitled manuscript')}
                    </h2>
                    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-ui">
                        <dt className="text-ink-muted">{t('Answer by')}</dt>
                        <dd className="m-0 font-medium">
                            {date(responseDueAt)}
                        </dd>
                        <dt className="text-ink-muted">{t('Review due')}</dt>
                        <dd className="m-0 font-medium">{date(reviewDueAt)}</dd>
                    </dl>
                    {message && (
                        <figure className="m-0 rounded-lg border-l-4 border-brand/40 bg-mist px-4 py-3 text-ui">
                            <figcaption className="mb-1 text-meta font-semibold text-ink-muted">
                                {t('Message from the editorial office')}
                            </figcaption>
                            <blockquote className="m-0 whitespace-pre-line">
                                {message}
                            </blockquote>
                        </figure>
                    )}
                    {manuscript.abstractHtml && (
                        <details className="rounded-lg border border-line-card">
                            <summary className="cursor-pointer px-4 py-2.5 text-ui font-semibold">
                                {t('Read the abstract')}
                            </summary>
                            <div
                                className="ms max-h-[50svh] overflow-y-auto border-t border-line-card px-4 py-3"
                                // Trusted server HTML (ManuscriptRenderer).
                                dangerouslySetInnerHTML={{
                                    __html: manuscript.abstractHtml,
                                }}
                            />
                        </details>
                    )}
                </section>

                <div className="border-t border-line pt-6">
                    {mode === 'create' && (
                        <CreateAccount
                            email={email}
                            name={name}
                            countries={countries}
                            passwordRules={passwordRules}
                            action={urls.createAccount}
                        />
                    )}

                    {mode === 'sign_in' && (
                        <div className="grid gap-3">
                            <p className="m-0 text-ui">
                                {t(
                                    'You already have an account with {email}. Sign in to answer the invitation.',
                                    { email },
                                )}
                            </p>
                            <Button
                                asChild
                                className="h-11 w-full text-base font-semibold"
                            >
                                <Link href={urls.signIn}>{t('Sign in')}</Link>
                            </Button>
                        </div>
                    )}

                    {mode === 'wrong_account' && (
                        <div className="grid gap-3">
                            <p className="m-0 text-ui">
                                {t(
                                    'You are signed in as {current}, but the invitation was sent to {email}. Sign out, then open the link in the e-mail again.',
                                    { current: signedInAs ?? '', email },
                                )}
                            </p>
                            <Button
                                variant="outline"
                                className="h-11 w-full text-base"
                                onClick={() => router.post(urls.signOut)}
                            >
                                {t('Sign out')}
                            </Button>
                        </div>
                    )}

                    {mode === 'closed' && (
                        <p role="status" className="m-0 text-ui">
                            {t(
                                'This invitation is no longer open: it was answered, withdrawn or has expired. If you think this is a mistake, write to the editorial office.',
                            )}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}

Invitation.layout = {
    title: 'Invitation to review',
    description:
        'The editorial office invites you to review a manuscript for the journal.',
    wide: true,
};
