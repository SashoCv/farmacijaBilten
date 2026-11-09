import { Form, router } from '@inertiajs/react';
import { Download, Send } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { CrossrefDepositRow, CrossrefSettings } from '@/types/archive';

/** Depositor, automatic deposits and the state of the Crossref account. */
export function CrossrefSettingsForm({
    settings,
}: {
    settings: CrossrefSettings;
}) {
    const { t } = useT();
    const [auto, setAuto] = useState(settings.auto);

    return (
        <section className="grid gap-4 rounded-xl border bg-card p-4">
            <div>
                <h2 className="m-0 text-base font-semibold">
                    {t('Crossref settings')}
                </h2>
                <p className="m-0 mt-1 text-sm">
                    {settings.connected ? (
                        <span
                            className={cn(
                                'font-medium',
                                settings.testMode
                                    ? 'text-amber-800'
                                    : 'text-emerald-700',
                            )}
                        >
                            {settings.testMode
                                ? t(
                                      'Crossref account connected — TEST system: deposits are checked but nothing is registered.',
                                  )
                                : t(
                                      'Crossref account connected: deposits are sent from here.',
                                  )}
                        </span>
                    ) : (
                        <span className="text-muted-foreground">
                            {t(
                                'No Crossref account is entered (below). Until then, download the XML of an issue and upload it at Crossref (doi.crossref.org → Submissions → Upload, type Metadata).',
                            )}
                        </span>
                    )}
                </p>
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                    {settings.target === 'pdf'
                        ? t(
                              'DOIs lead to the article PDF, as in all earlier deposits.',
                          )
                        : t('DOIs lead to the article page on the website.')}
                </p>
            </div>

            <Form
                action={settings.settingsUrl}
                method="put"
                options={{ preserveScroll: true }}
                className="grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end"
            >
                {({ processing, errors }) => (
                    <>
                        <input
                            type="hidden"
                            name="auto"
                            value={auto ? '1' : '0'}
                        />
                        <div className="grid gap-1.5">
                            <Label htmlFor="cr-name">
                                {t('Depositor (person or institution)')}
                            </Label>
                            <Input
                                id="cr-name"
                                name="depositor_name"
                                defaultValue={settings.depositorName ?? ''}
                                placeholder="Macedonian Pharmaceutical Association"
                            />
                            <InputError message={errors.depositor_name} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="cr-email">
                                {t(
                                    'Depositor e-mail (Crossref sends the results there)',
                                )}
                            </Label>
                            <Input
                                id="cr-email"
                                name="depositor_email"
                                type="email"
                                defaultValue={settings.depositorEmail ?? ''}
                            />
                            <InputError message={errors.depositor_email} />
                        </div>
                        <Button type="submit" disabled={processing}>
                            {t('Save')}
                        </Button>
                        <label
                            className={cn(
                                'flex items-center gap-2 text-sm md:col-span-3',
                                !settings.connected && 'opacity-60',
                            )}
                        >
                            <input
                                type="checkbox"
                                checked={auto}
                                disabled={!settings.connected}
                                onChange={(e) => setAuto(e.target.checked)}
                                className="size-4 rounded border-input"
                            />
                            {t(
                                'Register the DOI automatically when an article is published online',
                            )}
                        </label>
                    </>
                )}
            </Form>
        </section>
    );
}

/** Download the deposit file of an issue, or send it to Crossref. */
export function DepositButtons({
    pending,
    xmlUrl,
    depositUrl,
}: {
    pending: number;
    xmlUrl: string;
    depositUrl: string | null;
}) {
    const { t } = useT();
    const [sending, setSending] = useState(false);

    if (pending === 0) {
        return (
            <span className="text-xs text-muted-foreground">
                {t('Nothing to deposit here.')}
            </span>
        );
    }

    return (
        <span className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
                <a href={xmlUrl}>
                    <Download aria-hidden="true" />
                    {t('Crossref XML ({count} DOIs)', { count: pending })}
                </a>
            </Button>
            {depositUrl && (
                <Button
                    size="sm"
                    disabled={sending}
                    onClick={() =>
                        router.post(
                            depositUrl,
                            {},
                            {
                                preserveScroll: true,
                                onStart: () => setSending(true),
                                onFinish: () => setSending(false),
                            },
                        )
                    }
                >
                    <Send aria-hidden="true" />
                    {sending ? t('Sending…') : t('Send to Crossref')}
                </Button>
            )}
        </span>
    );
}

const STATUS_TONE: Record<string, string> = {
    succeeded: 'text-emerald-700',
    failed: 'text-red-700',
    partly: 'text-amber-800',
};

/** The last deposits and Crossref's answer. */
export function DepositLog({ deposits }: { deposits: CrossrefDepositRow[] }) {
    const { t, locale } = useT();

    if (deposits.length === 0) {
        return null;
    }

    const label: Record<string, string> = {
        queued: t('waiting to be sent'),
        sent: t('sent, waiting for Crossref'),
        succeeded: t('registered'),
        partly: t('partly registered'),
        failed: t('failed'),
    };

    return (
        <section className="grid gap-2">
            <h2 className="m-0 text-lg font-semibold">{t('Deposits')}</h2>
            <ul className="m-0 grid list-none divide-y rounded-xl border bg-card p-0">
                {deposits.map((d) => (
                    <li key={d.id} className="grid gap-1 px-4 py-3 text-sm">
                        <span className="flex flex-wrap gap-x-3">
                            <span className="font-medium">
                                {d.issue ?? '—'}
                            </span>
                            <span>{t('{count} DOIs', { count: d.count })}</span>
                            <span
                                className={cn(
                                    'font-medium',
                                    STATUS_TONE[d.status] ??
                                        'text-muted-foreground',
                                )}
                            >
                                {label[d.status] ?? d.status}
                            </span>
                            {d.test && (
                                <span className="text-amber-800">
                                    {t('test')}
                                </span>
                            )}
                            <span className="text-muted-foreground">
                                {d.at &&
                                    new Date(d.at).toLocaleString(
                                        locale === 'mk' ? 'mk-MK' : 'en-GB',
                                        {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        },
                                    )}
                                {d.trigger === 'publish'
                                    ? ` · ${t('automatic, on publishing')}`
                                    : d.by && ` · ${d.by}`}
                            </span>
                        </span>
                        {d.message && (
                            <pre className="m-0 font-mono text-xs whitespace-pre-wrap text-red-700">
                                {d.message}
                            </pre>
                        )}
                    </li>
                ))}
            </ul>
        </section>
    );
}

/**
 * The journal's Crossref account (username, password, test or live). The
 * password is stored encrypted and never shown again: leave it empty to keep it.
 */
export function CrossrefAccountForm({
    settings,
}: {
    settings: CrossrefSettings;
}) {
    const { t } = useT();
    const [mode, setMode] = useState<'test' | 'live'>(
        settings.testMode ? 'test' : 'live',
    );
    const saved = settings.accountSource === 'panel';

    return (
        <section className="grid gap-4 rounded-xl border bg-card p-4">
            <div>
                <h2 className="m-0 text-base font-semibold">
                    {t('Crossref account')}
                </h2>
                <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                    {t(
                        'With the account entered here the system sends the deposits to Crossref itself (the buttons “Send to Crossref” and the automatic registration on publishing). Use the account of the Macedonian Pharmaceutical Association (member 18202), best a separate role for this system. The password is stored encrypted and is never shown again.',
                    )}
                </p>
                {settings.accountSource === 'env' && (
                    <p className="m-0 mt-1 text-sm text-muted-foreground">
                        {t(
                            'An account is set on the server (.env). An account entered here takes its place.',
                        )}
                    </p>
                )}
            </div>

            <Form
                action={settings.accountUrl}
                method="put"
                options={{ preserveScroll: true }}
                resetOnSuccess={['password']}
                className="grid gap-3 md:grid-cols-2"
            >
                {({ processing, errors }) => (
                    <>
                        <input type="hidden" name="mode" value={mode} />
                        <div className="grid gap-1.5">
                            <Label htmlFor="cr-user">
                                {t('Crossref username')}
                            </Label>
                            <Input
                                id="cr-user"
                                name="username"
                                autoComplete="off"
                                defaultValue={
                                    saved ? (settings.username ?? '') : ''
                                }
                            />
                            <InputError message={errors.username} />
                        </div>
                        <div className="grid gap-1.5">
                            <Label htmlFor="cr-pass">
                                {t('Crossref password')}
                            </Label>
                            <Input
                                id="cr-pass"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                placeholder={
                                    saved
                                        ? t('Saved — leave empty to keep it')
                                        : ''
                                }
                            />
                            <InputError message={errors.password} />
                        </div>
                        <fieldset className="m-0 grid gap-2 border-0 p-0 md:col-span-2">
                            <legend className="mb-1 text-sm font-medium">
                                {t('Where deposits go')}
                            </legend>
                            <label className="flex items-start gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={mode === 'test'}
                                    onChange={() => setMode('test')}
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="font-medium">
                                        {t('Test system')}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        {t(
                                            '— Crossref checks the file and answers, but registers nothing. Start here.',
                                        )}
                                    </span>
                                </span>
                            </label>
                            <label className="flex items-start gap-2 text-sm">
                                <input
                                    type="radio"
                                    checked={mode === 'live'}
                                    onChange={() => setMode('live')}
                                    className="mt-0.5"
                                />
                                <span>
                                    <span className="font-medium">
                                        {t('Live')}
                                    </span>{' '}
                                    <span className="text-muted-foreground">
                                        {t(
                                            '— the DOIs are really registered (Crossref charges its fee per DOI).',
                                        )}
                                    </span>
                                </span>
                            </label>
                        </fieldset>
                        <div className="flex flex-wrap gap-2 md:col-span-2">
                            <Button type="submit" disabled={processing}>
                                {t('Save the account')}
                            </Button>
                            {saved && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={processing}
                                    onClick={() =>
                                        router.put(
                                            settings.accountUrl,
                                            { forget: true, mode },
                                            { preserveScroll: true },
                                        )
                                    }
                                >
                                    {t('Remove the account')}
                                </Button>
                            )}
                        </div>
                    </>
                )}
            </Form>
        </section>
    );
}
