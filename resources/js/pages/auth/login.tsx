import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { register } from '@/routes';
import { store } from '@/routes/login';
import { request } from '@/routes/password';

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};

export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    const { t } = useT();

    return (
        <>
            <Head title={t('Log in')} />

            {status && (
                <p
                    role="status"
                    className="mt-0 mb-6 rounded-md border border-line-card bg-tint px-4 py-3 text-ui text-brand-dark"
                >
                    {status}
                </p>
            )}

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-5"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-2">
                            <Label
                                htmlFor="email"
                                className="text-ui font-semibold"
                            >
                                {t('E-mail address')}
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                name="email"
                                required
                                autoFocus
                                autoComplete="email"
                                className="h-11 text-base"
                                aria-invalid={errors.email ? true : undefined}
                                aria-describedby={
                                    errors.email ? 'email-error' : undefined
                                }
                            />
                            <InputError
                                id="email-error"
                                message={errors.email}
                            />
                        </div>

                        <div className="grid gap-2">
                            <div className="flex items-baseline justify-between gap-3">
                                <Label
                                    htmlFor="password"
                                    className="text-ui font-semibold"
                                >
                                    {t('Password')}
                                </Label>
                                {canResetPassword && (
                                    <TextLink
                                        href={request()}
                                        className="text-meta text-brand decoration-underline hover:text-brand-dark"
                                    >
                                        {t('Forgot your password?')}
                                    </TextLink>
                                )}
                            </div>
                            <PasswordInput
                                id="password"
                                name="password"
                                required
                                autoComplete="current-password"
                                className="h-11 text-base"
                                aria-invalid={
                                    errors.password ? true : undefined
                                }
                                aria-describedby={
                                    errors.password
                                        ? 'password-error'
                                        : undefined
                                }
                            />
                            <InputError
                                id="password-error"
                                message={errors.password}
                            />
                        </div>

                        <div className="flex items-center gap-3">
                            <Checkbox id="remember" name="remember" />
                            <Label htmlFor="remember" className="text-ui">
                                {t('Keep me signed in on this device')}
                            </Label>
                        </div>

                        <Button
                            type="submit"
                            className="mt-1 h-11 w-full text-base font-semibold"
                            disabled={processing}
                            data-test="login-button"
                        >
                            {processing && <Spinner />}
                            {t('Sign in')}
                        </Button>

                        {canRegister && (
                            <p className="m-0 border-t border-line pt-5 text-center text-ui text-ink-soft">
                                {t('New author?')}{' '}
                                <TextLink href={register()}>
                                    {t('Create an author account')}
                                </TextLink>
                            </p>
                        )}
                    </>
                )}
            </Form>
        </>
    );
}

Login.layout = {
    title: 'Sign in',
    description: "Sign in to the Bulletin's manuscript system.",
};
