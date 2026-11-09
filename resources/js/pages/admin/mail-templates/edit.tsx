import { Head, router, setLayoutProps, usePage } from '@inertiajs/react';
import { Eye, RotateCcw, Save } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { failureReason, sendJson } from '@/lib/http';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import type { MailTemplateEditProps } from '@/types/review';

type Lang = 'en' | 'mk';
type Texts = Record<Lang, { subject: string; body: string }>;
type Preview =
    | { kind: 'idle' }
    | { kind: 'loading' }
    | { kind: 'ready'; subject: string; html: string }
    | { kind: 'failed'; message: string };

const LANGS: { code: Lang; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'mk', label: 'Macedonian' },
];

const PREVIEW_DELAY = 800;

export default function MailTemplateEdit({
    template,
    urls,
}: MailTemplateEditProps) {
    const { t } = useT();
    const errors = usePage().props.errors as Record<string, string>;
    const [lang, setLang] = useState<Lang>('en');
    const [texts, setTexts] = useState<Texts>({
        en: {
            subject: template.languages.en.subject,
            body: template.languages.en.body,
        },
        mk: {
            subject: template.languages.mk.subject,
            body: template.languages.mk.body,
        },
    });
    const [preview, setPreview] = useState<Preview>({ kind: 'idle' });
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [confirmReset, setConfirmReset] = useState(false);
    const focused = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const request = useRef(0);

    const page = usePage();

    setLayoutProps({
        breadcrumbs: [
            { title: 'Dashboard', href: dashboard() },
            { title: 'E-mail templates', href: urls.index },
            { title: template.description, href: page.url },
        ],
    });

    const loadPreview = async (code: Lang, subject: string, body: string) => {
        const id = ++request.current;
        setPreview({ kind: 'loading' });
        const result = await sendJson<{ subject: string; html: string }>(
            urls.preview,
            'POST',
            {
                locale: code,
                subject,
                body,
            },
        );

        if (id !== request.current) {
            return;
        }

        setPreview(
            result.ok && result.body
                ? {
                      kind: 'ready',
                      subject: result.body.subject,
                      html: result.body.html,
                  }
                : { kind: 'failed', message: failureReason(result, t) },
        );
    };

    const schedulePreview = (code: Lang, next: Texts) => {
        if (timer.current) {
            clearTimeout(timer.current);
        }

        timer.current = setTimeout(
            () => void loadPreview(code, next[code].subject, next[code].body),
            PREVIEW_DELAY,
        );
    };

    // First preview, and a new one whenever the language changes.
    useEffect(() => {
        void loadPreview(lang, texts[lang].subject, texts[lang].body);

        return () => {
            if (timer.current) {
                clearTimeout(timer.current);
            }
        };
        // Only on a language change: typing schedules its own preview.
    }, [lang]);

    const update = (code: Lang, field: 'subject' | 'body', value: string) => {
        const next = { ...texts, [code]: { ...texts[code], [field]: value } };
        setTexts(next);
        schedulePreview(code, next);
    };

    /** Inserts "{name}" at the cursor of the field last focused (body by default). */
    const insert = (name: string) => {
        const target =
            focused.current ??
            document.querySelector<HTMLTextAreaElement>(`#body-${lang}`);

        if (!target) {
            return;
        }

        const field = target.id.startsWith('subject') ? 'subject' : 'body';
        const value = texts[lang][field];
        const start = target.selectionStart ?? value.length;
        const end = target.selectionEnd ?? value.length;
        const token = `{${name}}`;
        update(lang, field, value.slice(0, start) + token + value.slice(end));
        requestAnimationFrame(() => {
            target.focus();
            target.setSelectionRange(
                start + token.length,
                start + token.length,
            );
        });
    };

    const restoreOriginal = (code: Lang) => {
        const next = {
            ...texts,
            [code]: {
                subject: template.languages[code].defaultSubject,
                body: template.languages[code].defaultBody,
            },
        };
        setTexts(next);
        schedulePreview(code, next);
    };

    const save = () =>
        router.put(urls.update, texts, {
            preserveScroll: true,
            preserveState: true,
            onStart: () => setSaving(true),
            onFinish: () => setSaving(false),
        });

    const reset = () =>
        router.post(
            urls.reset,
            {},
            {
                preserveScroll: true,
                onStart: () => setResetting(true),
                onFinish: () => {
                    setResetting(false);
                    setConfirmReset(false);
                },
            },
        );

    const current = template.languages[lang];
    const changedFromOriginal =
        texts[lang].subject !== current.defaultSubject ||
        texts[lang].body !== current.defaultBody;

    return (
        <>
            <Head title={t(template.description)} />

            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <header className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <p className="m-0 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            {t('E-mail template')}
                        </p>
                        <h1 className="m-0 mt-1 text-xl font-semibold tracking-tight">
                            {t(template.description)}
                        </h1>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setConfirmReset(true)}
                        >
                            <RotateCcw aria-hidden="true" />
                            {t('Reset to the original wording')}
                        </Button>
                        <Button onClick={save} disabled={saving}>
                            <Save aria-hidden="true" />
                            {saving ? t('Saving…') : t('Save both languages')}
                        </Button>
                    </div>
                </header>

                <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="grid min-w-0 gap-4">
                        <div
                            role="tablist"
                            aria-label={t('Language')}
                            className="flex gap-1 border-b"
                        >
                            {LANGS.map(({ code, label }) => (
                                <button
                                    key={code}
                                    type="button"
                                    role="tab"
                                    id={`tab-${code}`}
                                    aria-selected={lang === code}
                                    aria-controls={`panel-${code}`}
                                    onClick={() => {
                                        focused.current = null;
                                        setLang(code);
                                    }}
                                    className={cn(
                                        '-mb-px border-b-2 px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring',
                                        lang === code
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground',
                                    )}
                                >
                                    {t(label)}{' '}
                                    <span className="text-xs font-normal text-muted-foreground">
                                        (
                                        {template.languages[code].customised
                                            ? t('Customised')
                                            : t('Original wording')}
                                        )
                                    </span>
                                </button>
                            ))}
                        </div>

                        {LANGS.filter(({ code }) => code === lang).map(
                            ({ code }) => (
                                <div
                                    key={code}
                                    role="tabpanel"
                                    id={`panel-${code}`}
                                    aria-labelledby={`tab-${code}`}
                                    className="grid gap-4"
                                >
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`subject-${code}`}>
                                            {t('Subject')}
                                        </Label>
                                        <Input
                                            id={`subject-${code}`}
                                            lang={code}
                                            value={texts[code].subject}
                                            aria-invalid={
                                                errors[`${code}.subject`]
                                                    ? true
                                                    : undefined
                                            }
                                            onFocus={(e) =>
                                                (focused.current =
                                                    e.currentTarget)
                                            }
                                            onChange={(e) =>
                                                update(
                                                    code,
                                                    'subject',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                        <InputError
                                            message={errors[`${code}.subject`]}
                                        />
                                    </div>
                                    <div className="grid gap-1.5">
                                        <Label htmlFor={`body-${code}`}>
                                            {t('Text of the e-mail')}
                                        </Label>
                                        <textarea
                                            id={`body-${code}`}
                                            lang={code}
                                            rows={18}
                                            value={texts[code].body}
                                            aria-invalid={
                                                errors[`${code}.body`]
                                                    ? true
                                                    : undefined
                                            }
                                            aria-describedby="mail-help"
                                            onFocus={(e) =>
                                                (focused.current =
                                                    e.currentTarget)
                                            }
                                            onChange={(e) =>
                                                update(
                                                    code,
                                                    'body',
                                                    e.target.value,
                                                )
                                            }
                                            className="min-h-80 w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-[13px] leading-relaxed shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        />
                                        <InputError
                                            message={errors[`${code}.body`]}
                                        />
                                    </div>
                                    {changedFromOriginal && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-fit"
                                            onClick={() =>
                                                restoreOriginal(code)
                                            }
                                        >
                                            {t(
                                                'Use the original text (not saved until you save)',
                                            )}
                                        </Button>
                                    )}
                                </div>
                            ),
                        )}

                        <section
                            aria-labelledby="placeholders"
                            className="grid gap-2 rounded-xl border bg-card p-4"
                        >
                            <h2
                                id="placeholders"
                                className="m-0 text-sm font-semibold"
                            >
                                {t('Placeholders')}
                            </h2>
                            <p className="m-0 text-xs text-muted-foreground">
                                {t(
                                    'Click one to insert it where the cursor is.',
                                )}
                            </p>
                            <ul className="m-0 grid list-none gap-1 p-0 sm:grid-cols-2">
                                {Object.entries(template.placeholders).map(
                                    ([name, description]) => (
                                        <li key={name}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) =>
                                                    e.preventDefault()
                                                }
                                                onClick={() => insert(name)}
                                                className="flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                                            >
                                                <code className="shrink-0 rounded bg-muted px-1 font-mono text-xs">{`{${name}}`}</code>
                                                <span className="text-muted-foreground">
                                                    {t(description)}
                                                </span>
                                            </button>
                                        </li>
                                    ),
                                )}
                                {template.hasButton && (
                                    <li>
                                        <button
                                            type="button"
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={() => insert('button')}
                                            className="flex w-full items-baseline gap-2 rounded-md px-2 py-1 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                                        >
                                            <code className="shrink-0 rounded bg-muted px-1 font-mono text-xs">
                                                {'{button}'}
                                            </code>
                                            <span className="text-muted-foreground">
                                                {t('Where the button goes')}
                                            </span>
                                        </button>
                                    </li>
                                )}
                            </ul>
                            <ul
                                id="mail-help"
                                className="m-0 mt-1 grid list-disc gap-0.5 pl-5 text-xs text-muted-foreground"
                            >
                                <li>
                                    {t(
                                        'Separate paragraphs with an empty line.',
                                    )}
                                </li>
                                {template.hasButton && (
                                    <li>
                                        {t(
                                            '{button} places the button; without it the button goes at the end.',
                                        )}
                                    </li>
                                )}
                                <li>{t('**bold** makes text bold.')}</li>
                                <li>
                                    {t(
                                        'A placeholder with no value (e.g. an empty message) is left out.',
                                    )}
                                </li>
                            </ul>
                        </section>
                    </div>

                    <section
                        aria-labelledby="mail-preview"
                        className="grid gap-2 xl:sticky xl:top-4"
                    >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <h2
                                id="mail-preview"
                                className="m-0 flex items-center gap-1.5 text-sm font-semibold"
                            >
                                <Eye aria-hidden="true" className="size-4" />
                                {t('Preview ({language})', {
                                    language: t(
                                        LANGS.find((l) => l.code === lang)!
                                            .label,
                                    ),
                                })}
                            </h2>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    void loadPreview(
                                        lang,
                                        texts[lang].subject,
                                        texts[lang].body,
                                    )
                                }
                            >
                                {t('Refresh')}
                            </Button>
                        </div>
                        <p
                            role="status"
                            aria-live="polite"
                            className="m-0 text-sm"
                        >
                            {preview.kind === 'loading' && (
                                <span className="text-muted-foreground">
                                    {t('Preparing the preview…')}
                                </span>
                            )}
                            {preview.kind === 'ready' && (
                                <>
                                    <span className="text-muted-foreground">
                                        {t('Subject')}:
                                    </span>{' '}
                                    <span className="font-medium">
                                        {preview.subject}
                                    </span>
                                </>
                            )}
                            {preview.kind === 'failed' && (
                                <span className="text-red-700 dark:text-red-400">
                                    {preview.message}
                                </span>
                            )}
                        </p>
                        <iframe
                            title={t('Preview of the e-mail')}
                            sandbox=""
                            srcDoc={
                                preview.kind === 'ready' ? preview.html : ''
                            }
                            className="h-[70svh] w-full rounded-xl border bg-white"
                        />
                        <p className="m-0 text-xs text-muted-foreground">
                            {t(
                                'The preview fills the placeholders with sample values.',
                            )}
                        </p>
                    </section>
                </div>
            </div>

            <Dialog
                open={confirmReset}
                onOpenChange={(open) => !resetting && setConfirmReset(open)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>
                        {t('Reset to the original wording?')}
                    </DialogTitle>
                    <DialogDescription>
                        {t(
                            'The changes in both languages are removed and the system sends the original text again.',
                        )}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            disabled={resetting}
                            onClick={() => setConfirmReset(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={resetting}
                            onClick={reset}
                        >
                            {t('Reset')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
