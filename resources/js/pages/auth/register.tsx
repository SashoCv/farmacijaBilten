import { Form, Head } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { CountrySelect } from '@/components/forms/country-select';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { privacyHref } from '@/lib/site-links';
import { login } from '@/routes';
import { store } from '@/routes/register';

type Props = {
    passwordRules: string;
    countries: string[];
    academicTitles: string[];
};

/** Label, control and error, with the error tied to the control. */
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

function Group({ legend, children }: { legend: string; children: ReactNode }) {
    return (
        <fieldset className="m-0 grid gap-4 border-0 p-0 sm:grid-cols-2">
            <legend className="mb-3 p-0 text-meta font-semibold tracking-[0.08em] text-ink-muted uppercase">
                {legend}
            </legend>
            {children}
        </fieldset>
    );
}

export default function Register({
    passwordRules,
    countries,
    academicTitles,
}: Props) {
    const { t } = useT();

    return (
        <>
            <Head title={t('Create an author account')} />

            <Form
                {...store.form()}
                resetOnSuccess={['password', 'password_confirmation']}
                disableWhileProcessing
                className="flex flex-col gap-7"
            >
                {({ processing, errors }) => (
                    <>
                        <Group legend={t('Name')}>
                            <Field
                                id="academic_title"
                                label={t('Title (optional)')}
                                error={errors.academic_title}
                                className="grid gap-2 sm:col-span-2 sm:max-w-[50%]"
                            >
                                <select
                                    {...describedBy(
                                        'academic_title',
                                        errors.academic_title,
                                    )}
                                    name="academic_title"
                                    defaultValue=""
                                    className="field h-11 px-3"
                                >
                                    <option value="">{t('None')}</option>
                                    {academicTitles.map((title) => (
                                        <option key={title} value={title}>
                                            {title}
                                        </option>
                                    ))}
                                </select>
                            </Field>
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
                                    autoFocus
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
                                    autoComplete="family-name"
                                    className="h-11 text-base"
                                />
                            </Field>
                        </Group>

                        <Group legend={t('Institution')}>
                            <Field
                                id="affiliation"
                                label={t('Institution / affiliation')}
                                hint={t(
                                    'As it should appear under your name, e.g. Faculty of Pharmacy, Ss. Cyril and Methodius University in Skopje.',
                                )}
                                error={errors.affiliation}
                                className="grid gap-2 sm:col-span-2"
                            >
                                <Input
                                    {...describedBy(
                                        'affiliation',
                                        errors.affiliation,
                                        true,
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
                            <Field
                                id="orcid"
                                label={t('ORCID iD (optional)')}
                                hint={t(
                                    'Printed with your name in published papers.',
                                )}
                                error={errors.orcid}
                            >
                                <Input
                                    {...describedBy(
                                        'orcid',
                                        errors.orcid,
                                        true,
                                    )}
                                    name="orcid"
                                    inputMode="numeric"
                                    placeholder="0000-0000-0000-0000"
                                    pattern="\d{4}-\d{4}-\d{4}-\d{3}[\dX]"
                                    className="h-11 text-base"
                                />
                            </Field>
                        </Group>

                        <Group legend={t('Sign-in')}>
                            <Field
                                id="email"
                                label={t('E-mail address')}
                                hint={t(
                                    'We send a link to confirm it. Decisions and reviews arrive at this address.',
                                )}
                                error={errors.email}
                                className="grid gap-2 sm:col-span-2"
                            >
                                <Input
                                    {...describedBy(
                                        'email',
                                        errors.email,
                                        true,
                                    )}
                                    type="email"
                                    name="email"
                                    required
                                    autoComplete="email"
                                    className="h-11 text-base"
                                />
                            </Field>
                            <Field
                                id="password"
                                label={t('Password')}
                                error={errors.password}
                            >
                                <PasswordInput
                                    {...describedBy(
                                        'password',
                                        errors.password,
                                    )}
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
                        </Group>

                        <div className="grid gap-2">
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    id="privacy"
                                    name="privacy"
                                    value="1"
                                    required
                                    className="mt-0.5"
                                    aria-invalid={
                                        errors.privacy ? true : undefined
                                    }
                                    aria-describedby={
                                        errors.privacy
                                            ? 'privacy-error'
                                            : undefined
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

                        {/* Spam trap: hidden from people, filled in by bots. */}
                        <div
                            aria-hidden="true"
                            className="absolute -left-[9999px] h-px w-px overflow-hidden"
                        >
                            <label htmlFor="reg-website">Website</label>
                            <input
                                id="reg-website"
                                name="website"
                                tabIndex={-1}
                                autoComplete="off"
                            />
                        </div>

                        <Button
                            type="submit"
                            className="h-11 w-full text-base font-semibold"
                            disabled={processing}
                            data-test="register-button"
                        >
                            {processing && <Spinner />}
                            {t('Create account')}
                        </Button>

                        <p className="m-0 border-t border-line pt-5 text-center text-ui text-ink-soft">
                            {t('Already have an account?')}{' '}
                            <TextLink href={login()}>{t('Sign in')}</TextLink>
                        </p>
                    </>
                )}
            </Form>
        </>
    );
}

Register.layout = {
    title: 'Create an author account',
    description:
        'With an account you write and submit manuscripts on the journal template and follow them through review.',
    wide: true,
};
