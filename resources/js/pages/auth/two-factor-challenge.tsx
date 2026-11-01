import { Form, Head, setLayoutProps } from '@inertiajs/react';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
} from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { OTP_MAX_LENGTH } from '@/hooks/use-two-factor-auth';
import { useT } from '@/lib/i18n';
import { store } from '@/routes/two-factor/login';

const MODES = {
    code: {
        title: 'Authentication code',
        description: 'Enter the code shown in your authenticator application.',
        toggle: 'Use a recovery code instead',
    },
    recovery: {
        title: 'Recovery code',
        description:
            'Enter one of the emergency recovery codes you saved when you set up two-factor authentication.',
        toggle: 'Use an authentication code instead',
    },
} as const;

export default function TwoFactorChallenge() {
    const { t } = useT();
    const [showRecoveryInput, setShowRecoveryInput] = useState<boolean>(false);
    const [code, setCode] = useState<string>('');

    const mode = MODES[showRecoveryInput ? 'recovery' : 'code'];

    // The layout translates these English keys.
    setLayoutProps({ title: mode.title, description: mode.description });

    const toggleRecoveryMode = (clearErrors: () => void): void => {
        setShowRecoveryInput(!showRecoveryInput);
        clearErrors();
        setCode('');
    };

    return (
        <>
            <Head title={t('Two-factor authentication')} />

            <Form
                {...store.form()}
                className="flex flex-col gap-5"
                resetOnError
                resetOnSuccess={!showRecoveryInput}
            >
                {({ errors, processing, clearErrors }) => (
                    <>
                        {showRecoveryInput ? (
                            <div className="grid gap-2">
                                <Label
                                    htmlFor="recovery_code"
                                    className="text-ui font-semibold"
                                >
                                    {t('Recovery code')}
                                </Label>
                                <Input
                                    id="recovery_code"
                                    name="recovery_code"
                                    type="text"
                                    autoComplete="one-time-code"
                                    autoFocus
                                    required
                                    className="h-11 text-base"
                                />
                                <InputError message={errors.recovery_code} />
                            </div>
                        ) : (
                            <div className="flex flex-col items-center gap-3 text-center">
                                <InputOTP
                                    name="code"
                                    maxLength={OTP_MAX_LENGTH}
                                    value={code}
                                    onChange={(value) => setCode(value)}
                                    disabled={processing}
                                    pattern={REGEXP_ONLY_DIGITS}
                                    aria-label={t('Authentication code')}
                                    autoFocus
                                >
                                    <InputOTPGroup>
                                        {Array.from(
                                            { length: OTP_MAX_LENGTH },
                                            (_, index) => (
                                                <InputOTPSlot
                                                    key={index}
                                                    index={index}
                                                    className="size-11 text-base"
                                                />
                                            ),
                                        )}
                                    </InputOTPGroup>
                                </InputOTP>
                                <InputError message={errors.code} />
                            </div>
                        )}

                        <Button
                            type="submit"
                            className="h-11 w-full text-base font-semibold"
                            disabled={processing}
                        >
                            {t('Continue')}
                        </Button>

                        <button
                            type="button"
                            className="mx-auto min-h-11 cursor-pointer bg-transparent px-2 text-ui font-semibold text-brand underline decoration-underline underline-offset-4 hover:text-brand-dark hover:decoration-brand"
                            onClick={() => toggleRecoveryMode(clearErrors)}
                        >
                            {t(mode.toggle)}
                        </button>
                    </>
                )}
            </Form>
        </>
    );
}
