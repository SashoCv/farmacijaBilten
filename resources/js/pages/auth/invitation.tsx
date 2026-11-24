import { Head, Link, router } from '@inertiajs/react';
import { ReviewerAccountForm } from '@/components/review/reviewer-account-form';
import { Button } from '@/components/ui/button';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import type { InvitationProps } from '@/types/review';
import '../../../css/manuscript.css';
import '../../../css/manuscript-article.css';

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
    const [given, ...others] = (name ?? '').trim().split(/\s+/);

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
                        <ReviewerAccountForm
                            email={email}
                            givenName={given ?? ''}
                            familyName={others.join(' ')}
                            intro={t(
                                'The account is for {email}. With it you answer the invitation, read the manuscript and send your review.',
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
