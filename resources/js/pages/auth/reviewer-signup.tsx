import { Head, Link, router } from '@inertiajs/react';
import { ReviewerAccountForm } from '@/components/review/reviewer-account-form';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';
import type { ReviewerSignupProps } from '@/types/review';

export default function ReviewerSignup({
    email,
    givenName,
    familyName,
    affiliation,
    message,
    mode,
    signedInAs,
    countries,
    passwordRules,
    urls,
}: ReviewerSignupProps) {
    const { t } = useT();

    return (
        <>
            <Head title={t('Join the reviewers')} />

            <div className="grid gap-7">
                <section className="grid gap-3">
                    <p className="m-0 text-ui text-ink-soft">
                        {t(
                            'As a reviewer you receive the editorial office’s invitations to review by e-mail. You see only the manuscripts you are invited to and agree to review.',
                        )}
                    </p>
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
                </section>

                <div className="border-t border-line pt-6">
                    {mode === 'create' && (
                        <ReviewerAccountForm
                            email={email}
                            givenName={givenName ?? ''}
                            familyName={familyName ?? ''}
                            affiliation={affiliation}
                            intro={t(
                                'The account is for {email}. With it you answer invitations to review, read the manuscripts and send your reviews.',
                                { email },
                            )}
                            countries={countries}
                            passwordRules={passwordRules}
                            action={urls.createAccount}
                        />
                    )}

                    {mode === 'sign_in' && (
                        <div className="grid gap-3">
                            <p className="m-0 text-ui">
                                {t(
                                    'You are in the list of reviewers with the account {email}. Sign in to see your invitations.',
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
                                'This link no longer works: it was withdrawn, replaced by a newer e-mail or already used. If you think this is a mistake, write to the editorial office.',
                            )}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}

ReviewerSignup.layout = {
    title: 'Join the reviewers',
    description:
        'The editorial office invites you to join the journal’s list of reviewers.',
    wide: true,
};
