import { Form } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { CountrySelect } from '@/components/forms/country-select';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { privacyHref } from '@/lib/site-links';

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

/**
 * Account for an invited reviewer: name, institution, country, password.
 * Used by the invitation to review and by the invitation to the list of
 * reviewers; the e-mail address comes from the invitation and is fixed.
 */
export function ReviewerAccountForm({
    email,
    givenName,
    familyName,
    affiliation,
    intro,
    countries,
    passwordRules,
    action,
}: {
    email: string;
    givenName: string;
    familyName: string;
    affiliation?: string | null;
    /** The sentence under the heading. */
    intro: string;
    countries: string[];
    passwordRules: string;
    action: string;
}) {
    const { t } = useT();

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
                            {intro}
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
                                defaultValue={givenName}
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
                                defaultValue={familyName}
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
                                defaultValue={affiliation ?? ''}
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
