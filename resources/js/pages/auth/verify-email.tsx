import { Form, Head } from '@inertiajs/react';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { useT } from '@/lib/i18n';
import { logout } from '@/routes';
import { send } from '@/routes/verification';

export default function VerifyEmail({ status }: { status?: string }) {
    const { t } = useT();

    return (
        <>
            <Head title={t('E-mail verification')} />

            {status === 'verification-link-sent' && (
                <p
                    role="status"
                    className="mt-0 mb-6 rounded-md border border-line-card bg-tint px-4 py-3 text-ui text-brand-dark"
                >
                    {t(
                        'A new verification link has been sent to the e-mail address of your account.',
                    )}
                </p>
            )}

            <Form {...send.form()} className="flex flex-col gap-5">
                {({ processing }) => (
                    <>
                        <Button
                            disabled={processing}
                            className="h-11 w-full text-base font-semibold"
                        >
                            {processing && <Spinner />}
                            {t('Resend verification e-mail')}
                        </Button>

                        <TextLink
                            href={logout()}
                            className="mx-auto block text-ui text-brand decoration-underline hover:text-brand-dark"
                        >
                            {t('Log out')}
                        </TextLink>
                    </>
                )}
            </Form>
        </>
    );
}

VerifyEmail.layout = {
    title: 'Verify your e-mail address',
    description:
        'Please confirm your e-mail address by following the link we have just sent you.',
};
