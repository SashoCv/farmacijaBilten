import { Form, Head } from '@inertiajs/react';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useT();

    return (
        <>
            <Head title={t('Forgot password')} />

            {status && (
                <p
                    role="status"
                    className="mt-0 mb-6 rounded-md border border-line-card bg-tint px-4 py-3 text-ui text-brand-dark"
                >
                    {status}
                </p>
            )}

            <Form {...email.form()} className="flex flex-col gap-5">
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
                                autoComplete="email"
                                autoFocus
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

                        <Button
                            className="h-11 w-full text-base font-semibold"
                            disabled={processing}
                            data-test="email-password-reset-link-button"
                        >
                            {processing && <Spinner />}
                            {t('Send reset link')}
                        </Button>
                    </>
                )}
            </Form>

            <p className="mt-6 mb-0 text-center text-ui text-ink-soft">
                <TextLink
                    href={login()}
                    className="text-brand decoration-underline hover:text-brand-dark"
                >
                    {t('Back to sign-in')}
                </TextLink>
            </p>
        </>
    );
}

ForgotPassword.layout = {
    title: 'Forgot password',
    description:
        'Enter the e-mail address of your editor account and we will send you a link to choose a new password.',
};
