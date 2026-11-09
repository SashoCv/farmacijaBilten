import { Form, Head, Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { CountrySelect } from '@/components/forms/country-select';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';

type Profile = {
    given_name: string | null;
    family_name: string | null;
    academic_title: string | null;
    affiliation: string | null;
    department: string | null;
    city: string | null;
    country_code: string | null;
    phone: string | null;
    orcid: string | null;
    expertise: string | null;
    locale: 'en' | 'mk';
};

const SELECT =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs';

function Field({
    id,
    label,
    error,
    hint,
    children,
    wide = false,
}: {
    id: string;
    label: string;
    error?: string;
    hint?: string;
    children: ReactNode;
    wide?: boolean;
}) {
    return (
        <div className={wide ? 'grid gap-2 sm:col-span-2' : 'grid gap-2'}>
            <Label htmlFor={id}>{label}</Label>
            {children}
            {hint && (
                <p className="m-0 text-xs text-muted-foreground">{hint}</p>
            )}
            <InputError message={error} />
        </div>
    );
}

export default function ProfilePage({
    mustVerifyEmail,
    status,
    profile,
    countries,
    academicTitles,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    profile: Profile;
    countries: string[];
    academicTitles: string[];
}) {
    const { t } = useT();
    const { auth } = usePage().props;

    return (
        <>
            <Head title={t('Profile settings')} />

            <h1 className="sr-only">{t('Profile settings')}</h1>

            <div className="space-y-6">
                <Heading
                    variant="small"
                    title={t('Profile')}
                    description={t(
                        'Your name and institution as they appear on manuscripts and reviews.',
                    )}
                />

                <Form
                    {...ProfileController.update.form()}
                    options={{ preserveScroll: true }}
                    className="space-y-6"
                >
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="academic_title"
                                    label={t('Title (optional)')}
                                    error={errors.academic_title}
                                >
                                    <select
                                        id="academic_title"
                                        name="academic_title"
                                        defaultValue={
                                            profile.academic_title ?? ''
                                        }
                                        className={SELECT}
                                    >
                                        <option value="">{t('None')}</option>
                                        {academicTitles.map((title) => (
                                            <option key={title} value={title}>
                                                {title}
                                            </option>
                                        ))}
                                    </select>
                                </Field>
                                <div className="hidden sm:block" />
                                <Field
                                    id="given_name"
                                    label={t('Given name')}
                                    error={errors.given_name}
                                >
                                    <Input
                                        id="given_name"
                                        name="given_name"
                                        required
                                        autoComplete="given-name"
                                        defaultValue={profile.given_name ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="family_name"
                                    label={t('Family name')}
                                    error={errors.family_name}
                                >
                                    <Input
                                        id="family_name"
                                        name="family_name"
                                        required
                                        autoComplete="family-name"
                                        defaultValue={profile.family_name ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="email"
                                    label={t('E-mail address')}
                                    error={errors.email}
                                    wide
                                >
                                    <Input
                                        id="email"
                                        type="email"
                                        name="email"
                                        required
                                        autoComplete="username"
                                        defaultValue={auth.user?.email}
                                    />
                                </Field>
                            </div>

                            {mustVerifyEmail &&
                                auth.user?.email_verified_at === null && (
                                    <div>
                                        <p className="-mt-2 text-sm text-muted-foreground">
                                            {t(
                                                'Your e-mail address is not confirmed yet.',
                                            )}{' '}
                                            <Link
                                                href={send()}
                                                as="button"
                                                className="text-foreground underline underline-offset-4"
                                            >
                                                {t(
                                                    'Send the confirmation link again.',
                                                )}
                                            </Link>
                                        </p>

                                        {status ===
                                            'verification-link-sent' && (
                                            <div className="mt-2 text-sm font-medium text-green-600">
                                                {t(
                                                    'A new confirmation link has been sent to your e-mail address.',
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field
                                    id="affiliation"
                                    label={t('Institution / affiliation')}
                                    error={errors.affiliation}
                                    wide
                                >
                                    <Input
                                        id="affiliation"
                                        name="affiliation"
                                        required
                                        autoComplete="organization"
                                        defaultValue={profile.affiliation ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="department"
                                    label={t('Department (optional)')}
                                    error={errors.department}
                                    wide
                                >
                                    <Input
                                        id="department"
                                        name="department"
                                        defaultValue={profile.department ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="city"
                                    label={t('City (optional)')}
                                    error={errors.city}
                                >
                                    <Input
                                        id="city"
                                        name="city"
                                        autoComplete="address-level2"
                                        defaultValue={profile.city ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="country_code"
                                    label={t('Country')}
                                    error={errors.country_code}
                                >
                                    <CountrySelect
                                        id="country_code"
                                        name="country_code"
                                        required
                                        codes={countries}
                                        defaultValue={
                                            profile.country_code ?? ''
                                        }
                                        className={SELECT}
                                    />
                                </Field>
                                <Field
                                    id="orcid"
                                    label={t('ORCID iD (optional)')}
                                    error={errors.orcid}
                                >
                                    <Input
                                        id="orcid"
                                        name="orcid"
                                        inputMode="numeric"
                                        placeholder="0000-0000-0000-0000"
                                        defaultValue={profile.orcid ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="phone"
                                    label={t('Phone (optional)')}
                                    hint={t(
                                        'Only the editorial office sees it; needed for the corresponding author.',
                                    )}
                                    error={errors.phone}
                                >
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        autoComplete="tel"
                                        defaultValue={profile.phone ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="expertise"
                                    label={t('Areas of expertise (optional)')}
                                    hint={t(
                                        'Keywords, separated by commas. They help the editorial office choose reviewers.',
                                    )}
                                    error={errors.expertise}
                                    wide
                                >
                                    <Input
                                        id="expertise"
                                        name="expertise"
                                        defaultValue={profile.expertise ?? ''}
                                    />
                                </Field>
                                <Field
                                    id="locale"
                                    label={t('Language of e-mails')}
                                    error={errors.locale}
                                >
                                    <select
                                        id="locale"
                                        name="locale"
                                        defaultValue={profile.locale}
                                        className={SELECT}
                                    >
                                        <option value="en">English</option>
                                        <option value="mk">Македонски</option>
                                    </select>
                                </Field>
                            </div>

                            <div className="flex items-center gap-4">
                                <Button
                                    disabled={processing}
                                    data-test="update-profile-button"
                                >
                                    {t('Save')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>

            <DeleteUser />
        </>
    );
}

ProfilePage.layout = {
    breadcrumbs: [
        {
            title: 'Profile settings',
            href: edit(),
        },
    ],
};
