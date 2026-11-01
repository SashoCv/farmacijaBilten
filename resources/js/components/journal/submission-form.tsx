import { Form, usePage } from '@inertiajs/react';
import type { FormComponentRef } from '@inertiajs/core';
import { CircleAlert, CircleCheck, FileText, Mail } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { store as storeSubmission } from '@/routes/submissions';

export type SubmissionConfig = {
    types: string[];
    /** Largest manuscript file, in MB. */
    maxMb: number;
    /** Largest signed form, in MB (App\Models\Submission::FORM_MAX_KB). */
    formsMaxMb?: number;
    /** How many signed forms may be attached. */
    maxForms?: number;
    manuscriptExtensions?: string[];
    formExtensions?: string[];
    /** Reference of a manuscript just received, e.g. "MPB-2026-0042". */
    received: string | null;
};

type Errors = Record<string, string | undefined>;

const INSTRUCTIONS = '/guidelines/instructions-for-authors';
const DOWNLOADS = '/guidelines/downloads';
const PRIVACY = '/privacy';

/** Field ids, in the order the fields appear (the error summary follows it). */
const FIELD_IDS: Record<string, string> = {
    name: 'sub-name',
    email: 'sub-email',
    affiliation: 'sub-affiliation',
    title: 'sub-title',
    type: 'sub-type',
    manuscript: 'sub-file',
    forms: 'sub-forms',
    reviewers: 'sub-reviewers',
    message: 'sub-message',
    consent: 'sub-consent',
    privacy: 'sub-privacy',
};

/** Collapses "forms.0", "forms.1" into "forms" and orders errors like the form. */
function fieldErrors(errors: Errors): Errors {
    const out: Errors = {};

    for (const [key, message] of Object.entries(errors)) {
        const field = key.split('.')[0];

        if (message && !out[field]) {
            out[field] = message;
        }
    }

    return out;
}

const label = 'text-ui font-semibold text-ink';
const hint = 'm-0 text-[14px] leading-normal text-ink-muted';
const fileField =
    'field cursor-pointer px-2 py-2 text-ui text-ink-soft file:mr-4 file:min-h-9 file:cursor-pointer file:rounded-[5px] file:border file:border-solid file:border-control file:bg-mist file:px-3.5 file:font-sans file:text-ui file:font-semibold file:text-ink hover:file:border-brand';

function Required() {
    const { t } = useT();

    return (
        <>
            <span aria-hidden="true" className="ml-0.5 font-bold text-danger">
                *
            </span>
            <span className="sr-only"> ({t('required')})</span>
        </>
    );
}

function Optional() {
    const { t } = useT();

    return (
        <span className="ml-1.5 text-[14px] font-normal text-ink-muted">
            ({t('optional')})
        </span>
    );
}

function FieldError({ id, message }: { id: string; message?: string }) {
    const { t } = useT();

    return message ? (
        <p
            id={id}
            className="m-0 flex items-start gap-1.5 text-[15px] leading-snug font-semibold text-danger"
        >
            <CircleAlert
                aria-hidden="true"
                className="mt-0.5 size-4 shrink-0"
            />
            <span>
                <span className="sr-only">{t('Error')}: </span>
                {message}
            </span>
        </p>
    ) : null;
}

/** aria-* wiring for one field: hint and error ids, invalid state. */
function describe(id: string, error: string | undefined, withHint = false) {
    const ids = [withHint && `${id}-hint`, error && `${id}-error`].filter(
        Boolean,
    );

    return {
        id,
        'aria-invalid': error ? (true as const) : undefined,
        'aria-describedby': ids.length ? ids.join(' ') : undefined,
    };
}

/** Link that opens in a new tab, so a half-filled form is never lost. */
function NewTabLink({ href, children }: { href: string; children: ReactNode }) {
    const { t } = useT();

    return (
        <a href={href} target="_blank" rel="noopener" className="link-u">
            {children}
            <span className="sr-only"> ({t('opens in a new tab')})</span>
        </a>
    );
}

/** Splits a translated sentence around {link} so the link stays inline. */
function withLink(sentence: string, link: ReactNode) {
    const [before, after = ''] = sentence.split('{link}');

    return (
        <>
            {before}
            {link}
            {after}
        </>
    );
}

function Section({
    step,
    title,
    children,
}: {
    step: number;
    title: string;
    children: ReactNode;
}) {
    return (
        <div className="border-t border-line pt-8 first:border-t-0 first:pt-0">
            <fieldset className="m-0 min-w-0 border-0 p-0">
                <legend className="mb-6 flex items-center gap-3 p-0">
                    <span
                        aria-hidden="true"
                        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-tint text-meta font-bold text-brand-dark tabular-nums"
                    >
                        {step}
                    </span>
                    <span className="font-serif text-h4 font-medium text-ink">
                        {title}
                    </span>
                </legend>
                <div className="flex flex-col gap-6">{children}</div>
            </fieldset>
        </div>
    );
}

/** Confirmation after a successful submission; takes focus when it appears. */
function ReceivedNotice({
    reference,
    onAnother,
}: {
    reference: string;
    /** Set while the form is hidden; shows "Submit another manuscript". */
    onAnother?: () => void;
}) {
    const { t } = useT();
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        ref.current?.focus();
    }, [reference]);

    return (
        <div
            ref={ref}
            role="status"
            tabIndex={-1}
            className="flex scroll-mt-[var(--anchor-offset)] gap-4 rounded-lg border border-[#A6D5B8] bg-[#F1F8F3] p-5 text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand md:p-6"
        >
            <CircleCheck
                aria-hidden="true"
                className="mt-0.5 size-6 shrink-0 text-[#1E7B45]"
            />
            <div className="flex flex-col gap-1.5">
                <p className="m-0 font-serif text-h4 font-medium">
                    {t('Thank you, your manuscript has been received.')}
                </p>
                <p className="m-0 text-ink-soft">
                    {t('Your reference number is')}{' '}
                    <strong className="font-semibold text-ink tabular-nums">
                        {reference}
                    </strong>
                    .{' '}
                    {t(
                        'A confirmation has been sent to your e-mail address. Please quote the reference in any correspondence about this manuscript.',
                    )}
                </p>
                <p className="m-0 text-ink-soft">
                    {t(
                        'The editorial office will contact you after the initial assessment.',
                    )}
                </p>
                {onAnother && (
                    <p className="m-0 mt-2">
                        <button
                            type="button"
                            onClick={onAnother}
                            className="btn-outline"
                        >
                            {t('Submit another manuscript')}
                        </button>
                    </p>
                )}
            </div>
        </div>
    );
}

/** Summary of all errors with links to the fields; focused after a failed submit. */
function ErrorSummary({
    errors,
    attempt,
}: {
    errors: Errors;
    attempt: number;
}) {
    const { t } = useT();
    const ref = useRef<HTMLDivElement>(null);
    const entries = Object.keys(FIELD_IDS)
        .filter((field) => errors[field])
        .map((field) => [field, errors[field]!] as const);

    useEffect(() => {
        if (attempt > 0) {
            ref.current?.focus();
        }
    }, [attempt]);

    if (entries.length === 0) {
        return null;
    }

    return (
        <div
            ref={ref}
            role="alert"
            tabIndex={-1}
            aria-labelledby="sub-errors-title"
            className="scroll-mt-[var(--anchor-offset)] rounded-lg border-2 border-danger bg-white p-5 outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 md:p-6"
        >
            <h2
                id="sub-errors-title"
                className="m-0 flex items-center gap-2 font-sans text-h4 font-semibold text-ink"
            >
                <CircleAlert
                    aria-hidden="true"
                    className="size-5 shrink-0 text-danger"
                />
                {t('Please correct the following before sending')}
            </h2>
            <ul className="m-0 mt-3 flex list-none flex-col gap-1.5 p-0 pl-7">
                {entries.map(([field, message]) => (
                    <li key={field}>
                        <a
                            href={`#${FIELD_IDS[field]}`}
                            className="font-semibold text-danger underline decoration-danger/40 underline-offset-4 hover:text-danger hover:decoration-danger"
                            onClick={(event) => {
                                const el = document.getElementById(
                                    FIELD_IDS[field],
                                );

                                if (el) {
                                    event.preventDefault();
                                    el.focus({ preventScroll: true });
                                    el.scrollIntoView({ block: 'center' });
                                }
                            }}
                        >
                            {message}
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** "Before you submit": checklist from the instructions, fees, e-mail fallback. */
/**
 * "Before you submit" panel. Rendered by SubmissionForm; exported so a page
 * can also place it in its own right rail (see SubmissionForm `checklist`).
 * It lays itself out in two columns when it is wide (container query).
 */
export function SubmissionChecklist({
    className = '',
}: {
    className?: string;
}) {
    const { t } = useT();
    const titleId = useId();
    const { journal } = usePage().props;
    const apc = journal.apc;

    const checklist = [
        t(
            'Written in English; professional papers may be submitted in Macedonian',
        ),
        t(
            'Not published before and not under consideration elsewhere; approved by all authors',
        ),
        t(
            'Title page with all authors and affiliations; the corresponding author marked with *',
        ),
        t(
            'Abstract of up to 250 words (100 for short communications), followed by 3–6 keywords',
        ),
        t(
            'Work with humans or animals follows the ethical standards stated in the instructions',
        ),
        t('Signed Author Disclosure and Ethical Responsibility forms'),
        t('Names, institutions and e-mail addresses of 3 potential reviewers'),
    ];

    return (
        <section
            aria-labelledby={titleId}
            className={`@container/panel flex flex-col gap-6 rounded-lg border border-line-card bg-white p-6 ${className}`}
        >
            <div className="flex flex-col gap-2">
                <p className="eyebrow">{t('Before you submit')}</p>
                <h2
                    id={titleId}
                    className="m-0 font-serif text-h4 font-medium text-ink"
                >
                    {t('Check your manuscript')}
                </h2>
            </div>

            <div className="grid gap-6 @xl/panel:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] @xl/panel:gap-10">
                <div className="flex flex-col gap-5">
                    <ul className="checklist text-ui leading-snug text-ink-soft">
                        {checklist.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>

                    <p className="m-0 text-ui">
                        <NewTabLink href={INSTRUCTIONS}>
                            {t('Read the instructions for authors')}
                        </NewTabLink>
                    </p>
                </div>

                <div className="flex flex-col gap-5">
                    <dl className="m-0 flex flex-col border-t border-line text-ui @xl/panel:border-t-0 @xl/panel:[&>div:first-child]:pt-0">
                        {apc && (
                            <div className="flex flex-col gap-0.5 border-b border-line py-3">
                                <dt className="text-meta font-semibold tracking-[0.04em] text-ink-muted uppercase">
                                    {t('Article processing charge')}
                                </dt>
                                <dd className="m-0 text-ink">
                                    <span className="font-semibold tabular-nums">
                                        {apc.amount} {apc.currency}
                                    </span>
                                    {apc.charged && (
                                        <span className="text-ink-soft">
                                            {', '}
                                            {t(`charged ${apc.charged}`)}
                                        </span>
                                    )}
                                </dd>
                            </div>
                        )}
                        {journal.reviewModel && (
                            <div className="flex flex-col gap-0.5 border-b border-line py-3">
                                <dt className="text-meta font-semibold tracking-[0.04em] text-ink-muted uppercase">
                                    {t('Peer review')}
                                </dt>
                                <dd className="m-0 text-ink">
                                    {t(journal.reviewModel)}
                                </dd>
                            </div>
                        )}
                        <div className="flex flex-col gap-0.5 border-b border-line py-3">
                            <dt className="text-meta font-semibold tracking-[0.04em] text-ink-muted uppercase">
                                {t('Revised manuscripts')}
                            </dt>
                            <dd className="m-0 text-ink">
                                {t(
                                    'Returned within 30 days of the reviewers’ comments',
                                )}
                            </dd>
                        </div>
                    </dl>

                    {journal.editorialEmail && (
                        <div className="flex items-start gap-3 rounded-md bg-mist p-4 text-ui">
                            <Mail
                                aria-hidden="true"
                                className="mt-0.5 size-4 shrink-0 text-brand"
                            />
                            <p className="m-0 text-ink-soft">
                                {t('Or e-mail your manuscript to')}{' '}
                                <a
                                    href={`mailto:${journal.editorialEmail}`}
                                    className="link-u inline-block"
                                >
                                    {journal.editorialEmail}
                                </a>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

function extensionList(extensions: string[]) {
    return extensions.map((ext) => `.${ext}`).join(',');
}

/** Manuscript submission, replacing the old site's upload form. */
export function SubmissionForm({
    config,
    checklist = 'auto',
}: {
    config: SubmissionConfig;
    /**
     * Where the "Before you submit" panel goes:
     * - 'auto': beside the form when there is room (container ≥ 56rem), else above it;
     * - 'mobile-only': above the form below md only, for a page that renders
     *   <SubmissionChecklist /> in its own rail from md up;
     * - 'none': not rendered.
     */
    checklist?: 'auto' | 'mobile-only' | 'none';
}) {
    const { t } = useT();
    const formRef = useRef<FormComponentRef>(null);
    const [attempt, setAttempt] = useState(0);
    // After a successful submission the form stays folded away until asked for.
    const [againFor, setAgainFor] = useState<string | null>(null);
    const showForm = !config.received || againFor === config.received;

    const maxForms = config.maxForms ?? 2;
    const formsMaxMb = config.formsMaxMb ?? 5;
    const manuscriptExt = config.manuscriptExtensions ?? [
        'doc',
        'docx',
        'pdf',
        'odt',
        'rtf',
    ];
    const formExt = config.formExtensions ?? ['pdf', 'docx'];

    /**
     * Catches files that are too large before they are uploaded: PHP would
     * otherwise reject the whole request after a long upload.
     */
    function checkFiles(): boolean {
        const form = formRef.current;
        const manuscript = document.getElementById(
            FIELD_IDS.manuscript,
        ) as HTMLInputElement | null;
        const forms = document.getElementById(
            FIELD_IDS.forms,
        ) as HTMLInputElement | null;
        const tooLarge = (file: File, mb: number) =>
            file.size > mb * 1024 * 1024;
        const errors: Errors = {};

        const file = manuscript?.files?.[0];

        if (file && tooLarge(file, config.maxMb)) {
            errors.manuscript = t(
                'The manuscript file must be {size} MB or smaller.',
                { size: config.maxMb },
            );
        }

        const signed = Array.from(forms?.files ?? []);

        if (signed.length > maxForms) {
            errors.forms = t('Attach at most {count} signed forms.', {
                count: maxForms,
            });
        } else if (signed.some((f) => tooLarge(f, formsMaxMb))) {
            errors.forms = t('Each signed form must be {size} MB or smaller.', {
                size: formsMaxMb,
            });
        }

        if (form && Object.keys(errors).length > 0) {
            form.clearErrors();
            form.setError(errors as Record<string, string>);
            setAttempt((n) => n + 1);

            return false;
        }

        return true;
    }

    return (
        <div className="@container/sub">
            <div className="grid items-start gap-10 @4xl/sub:grid-cols-12 @4xl/sub:gap-12">
                {checklist !== 'none' && (
                    <div
                        className={
                            checklist === 'mobile-only'
                                ? 'md:hidden'
                                : '@4xl/sub:sticky @4xl/sub:top-[88px] @4xl/sub:order-2 @4xl/sub:col-span-4'
                        }
                    >
                        <SubmissionChecklist />
                    </div>
                )}

                <div
                    className={`flex min-w-0 flex-col gap-8 @4xl/sub:order-1 ${checklist === 'auto' ? '@4xl/sub:col-span-8' : '@4xl/sub:col-span-12'}`}
                >
                    {config.received && (
                        <ReceivedNotice
                            reference={config.received}
                            onAnother={
                                showForm
                                    ? undefined
                                    : () => setAgainFor(config.received)
                            }
                        />
                    )}

                    {showForm && (
                        <Form
                            ref={formRef}
                            {...storeSubmission.form()}
                            noValidate
                            resetOnSuccess
                            disableWhileProcessing
                            options={{ preserveScroll: true }}
                            onBefore={() => checkFiles()}
                            onError={() => setAttempt((n) => n + 1)}
                            aria-labelledby="sub-form-title"
                            className="flex flex-col gap-8"
                        >
                            {({ errors: rawErrors, processing, progress }) => {
                                const errors = fieldErrors(rawErrors as Errors);

                                return (
                                    <>
                                        <div className="flex flex-col gap-3">
                                            <h2
                                                id="sub-form-title"
                                                className="m-0 font-serif text-h3 font-medium text-ink"
                                            >
                                                {t('Submission form')}
                                            </h2>

                                            <p className="m-0 text-[15px] text-ink-muted">
                                                {withLink(
                                                    t(
                                                        'Fields marked {link} are required.',
                                                    ),
                                                    <span
                                                        aria-hidden="true"
                                                        className="font-bold text-danger"
                                                    >
                                                        *
                                                    </span>,
                                                )}
                                            </p>
                                        </div>

                                        <ErrorSummary
                                            errors={errors}
                                            attempt={attempt}
                                        />

                                        <div className="flex flex-col gap-8 rounded-lg border border-line-card bg-white p-5 sm:p-6 md:p-8">
                                            <Section
                                                step={1}
                                                title={t(
                                                    'Corresponding author',
                                                )}
                                            >
                                                <div className="grid gap-6 md:grid-cols-2">
                                                    <div className="flex flex-col gap-2">
                                                        <label
                                                            htmlFor={
                                                                FIELD_IDS.name
                                                            }
                                                            className={label}
                                                        >
                                                            {t('Full name')}
                                                            <Required />
                                                        </label>
                                                        <input
                                                            {...describe(
                                                                FIELD_IDS.name,
                                                                errors.name,
                                                            )}
                                                            name="name"
                                                            required
                                                            autoComplete="name"
                                                            maxLength={120}
                                                            className="field h-12 px-3.5"
                                                        />
                                                        <FieldError
                                                            id={`${FIELD_IDS.name}-error`}
                                                            message={
                                                                errors.name
                                                            }
                                                        />
                                                    </div>
                                                    <div className="flex flex-col gap-2">
                                                        <label
                                                            htmlFor={
                                                                FIELD_IDS.email
                                                            }
                                                            className={label}
                                                        >
                                                            {t('E-mail')}
                                                            <Required />
                                                        </label>
                                                        <input
                                                            {...describe(
                                                                FIELD_IDS.email,
                                                                errors.email,
                                                            )}
                                                            name="email"
                                                            type="email"
                                                            required
                                                            autoComplete="email"
                                                            spellCheck={false}
                                                            maxLength={190}
                                                            className="field h-12 px-3.5"
                                                        />
                                                        <FieldError
                                                            id={`${FIELD_IDS.email}-error`}
                                                            message={
                                                                errors.email
                                                            }
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor={
                                                            FIELD_IDS.affiliation
                                                        }
                                                        className={label}
                                                    >
                                                        {t('Affiliation')}
                                                        <Optional />
                                                    </label>
                                                    <input
                                                        {...describe(
                                                            FIELD_IDS.affiliation,
                                                            errors.affiliation,
                                                            true,
                                                        )}
                                                        name="affiliation"
                                                        autoComplete="organization"
                                                        maxLength={300}
                                                        className="field h-12 px-3.5"
                                                    />
                                                    <p
                                                        id={`${FIELD_IDS.affiliation}-hint`}
                                                        className={hint}
                                                    >
                                                        {t(
                                                            'Institution, city and country.',
                                                        )}
                                                    </p>
                                                    <FieldError
                                                        id={`${FIELD_IDS.affiliation}-error`}
                                                        message={
                                                            errors.affiliation
                                                        }
                                                    />
                                                </div>
                                            </Section>

                                            <Section
                                                step={2}
                                                title={t('Manuscript')}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor={
                                                            FIELD_IDS.title
                                                        }
                                                        className={label}
                                                    >
                                                        {t('Manuscript title')}
                                                        <Required />
                                                    </label>
                                                    <textarea
                                                        {...describe(
                                                            FIELD_IDS.title,
                                                            errors.title,
                                                        )}
                                                        name="title"
                                                        required
                                                        rows={2}
                                                        maxLength={500}
                                                        className="field resize-y px-3.5 py-3 leading-normal"
                                                    />
                                                    <FieldError
                                                        id={`${FIELD_IDS.title}-error`}
                                                        message={errors.title}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2 md:max-w-[22rem]">
                                                    <label
                                                        htmlFor={FIELD_IDS.type}
                                                        className={label}
                                                    >
                                                        {t('Type of paper')}
                                                        <Required />
                                                    </label>
                                                    <select
                                                        {...describe(
                                                            FIELD_IDS.type,
                                                            errors.type,
                                                        )}
                                                        name="type"
                                                        required
                                                        defaultValue=""
                                                        className="field h-12 px-3"
                                                    >
                                                        <option
                                                            value=""
                                                            disabled
                                                        >
                                                            {t('Choose a type')}
                                                        </option>
                                                        {config.types.map(
                                                            (type) => (
                                                                <option
                                                                    key={type}
                                                                    value={type}
                                                                >
                                                                    {t(type)}
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                    <FieldError
                                                        id={`${FIELD_IDS.type}-error`}
                                                        message={errors.type}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor={
                                                            FIELD_IDS.manuscript
                                                        }
                                                        className={label}
                                                    >
                                                        {t('Manuscript file')}
                                                        <Required />
                                                    </label>
                                                    <p
                                                        id={`${FIELD_IDS.manuscript}-hint`}
                                                        className={hint}
                                                    >
                                                        {t(
                                                            'Word, PDF, ODT or RTF, up to {size} MB. Put figures and tables in the same file.',
                                                            {
                                                                size: config.maxMb,
                                                            },
                                                        )}
                                                    </p>
                                                    <input
                                                        {...describe(
                                                            FIELD_IDS.manuscript,
                                                            errors.manuscript,
                                                            true,
                                                        )}
                                                        name="manuscript"
                                                        type="file"
                                                        required
                                                        accept={extensionList(
                                                            manuscriptExt,
                                                        )}
                                                        className={fileField}
                                                    />
                                                    <FieldError
                                                        id={`${FIELD_IDS.manuscript}-error`}
                                                        message={
                                                            errors.manuscript
                                                        }
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor={
                                                            FIELD_IDS.forms
                                                        }
                                                        className={label}
                                                    >
                                                        {t('Signed forms')}
                                                        <Optional />
                                                    </label>
                                                    <p
                                                        id={`${FIELD_IDS.forms}-hint`}
                                                        className={hint}
                                                    >
                                                        {withLink(
                                                            t(
                                                                'Author Disclosure Form and Ethical Responsibility Form, signed, as PDF or Word (.docx), up to {size} MB each. Download the blank forms from {link}.',
                                                                {
                                                                    size: formsMaxMb,
                                                                },
                                                            ),
                                                            <NewTabLink
                                                                href={DOWNLOADS}
                                                            >
                                                                {t(
                                                                    'Forms and downloads',
                                                                )}
                                                            </NewTabLink>,
                                                        )}
                                                    </p>
                                                    <input
                                                        {...describe(
                                                            FIELD_IDS.forms,
                                                            errors.forms,
                                                            true,
                                                        )}
                                                        name="forms[]"
                                                        type="file"
                                                        multiple
                                                        accept={extensionList(
                                                            formExt,
                                                        )}
                                                        className={fileField}
                                                    />
                                                    <FieldError
                                                        id={`${FIELD_IDS.forms}-error`}
                                                        message={errors.forms}
                                                    />
                                                </div>
                                            </Section>

                                            <Section
                                                step={3}
                                                title={t(
                                                    'Reviewers and message',
                                                )}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor={
                                                            FIELD_IDS.reviewers
                                                        }
                                                        className={label}
                                                    >
                                                        {t(
                                                            'Suggested reviewers (3)',
                                                        )}
                                                        <Optional />
                                                    </label>
                                                    <p
                                                        id={`${FIELD_IDS.reviewers}-hint`}
                                                        className={hint}
                                                    >
                                                        {t(
                                                            'One per line: name, institution and e-mail address. The editor decides whether to invite them.',
                                                        )}
                                                    </p>
                                                    <textarea
                                                        {...describe(
                                                            FIELD_IDS.reviewers,
                                                            errors.reviewers,
                                                            true,
                                                        )}
                                                        name="reviewers"
                                                        rows={4}
                                                        maxLength={3000}
                                                        className="field resize-y px-3.5 py-3 leading-normal"
                                                    />
                                                    <FieldError
                                                        id={`${FIELD_IDS.reviewers}-error`}
                                                        message={
                                                            errors.reviewers
                                                        }
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <label
                                                        htmlFor={
                                                            FIELD_IDS.message
                                                        }
                                                        className={label}
                                                    >
                                                        {t(
                                                            'Message to the editor',
                                                        )}
                                                        <Optional />
                                                    </label>
                                                    <textarea
                                                        {...describe(
                                                            FIELD_IDS.message,
                                                            errors.message,
                                                        )}
                                                        name="message"
                                                        rows={4}
                                                        maxLength={3000}
                                                        className="field resize-y px-3.5 py-3 leading-normal"
                                                    />
                                                    <FieldError
                                                        id={`${FIELD_IDS.message}-error`}
                                                        message={errors.message}
                                                    />
                                                </div>
                                            </Section>

                                            <Section
                                                step={4}
                                                title={t('Declarations')}
                                            >
                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            {...describe(
                                                                FIELD_IDS.consent,
                                                                errors.consent,
                                                            )}
                                                            name="consent"
                                                            type="checkbox"
                                                            value="1"
                                                            required
                                                            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand"
                                                        />
                                                        <label
                                                            htmlFor={
                                                                FIELD_IDS.consent
                                                            }
                                                            className="cursor-pointer text-ui leading-normal text-ink-soft"
                                                        >
                                                            {t(
                                                                'The work has not been published before and is not under consideration elsewhere, and all authors have approved this submission.',
                                                            )}
                                                            <Required />
                                                        </label>
                                                    </div>
                                                    <FieldError
                                                        id={`${FIELD_IDS.consent}-error`}
                                                        message={errors.consent}
                                                    />
                                                </div>

                                                <div className="flex flex-col gap-2">
                                                    <div className="flex items-start gap-3">
                                                        <input
                                                            {...describe(
                                                                FIELD_IDS.privacy,
                                                                errors.privacy,
                                                            )}
                                                            name="privacy"
                                                            type="checkbox"
                                                            value="1"
                                                            required
                                                            className="mt-0.5 size-5 shrink-0 cursor-pointer accent-brand"
                                                        />
                                                        <label
                                                            htmlFor={
                                                                FIELD_IDS.privacy
                                                            }
                                                            className="cursor-pointer text-ui leading-normal text-ink-soft"
                                                        >
                                                            {withLink(
                                                                t(
                                                                    'I have read the {link}.',
                                                                ),
                                                                <NewTabLink
                                                                    href={
                                                                        PRIVACY
                                                                    }
                                                                >
                                                                    {t(
                                                                        'privacy notice',
                                                                    )}
                                                                </NewTabLink>,
                                                            )}
                                                            <Required />
                                                        </label>
                                                    </div>
                                                    <FieldError
                                                        id={`${FIELD_IDS.privacy}-error`}
                                                        message={errors.privacy}
                                                    />
                                                </div>
                                            </Section>

                                            {/* Spam trap: hidden from people, filled in by bots. */}
                                            <div
                                                aria-hidden="true"
                                                className="absolute -left-[9999px] h-px w-px overflow-hidden"
                                            >
                                                <label htmlFor="sub-website">
                                                    Website
                                                </label>
                                                <input
                                                    id="sub-website"
                                                    name="website"
                                                    tabIndex={-1}
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            {progress && (
                                                <div className="flex items-center gap-3">
                                                    <progress
                                                        value={
                                                            progress.percentage
                                                        }
                                                        max={100}
                                                        aria-label={t(
                                                            'Upload progress',
                                                        )}
                                                        className="h-2 flex-1 overflow-hidden rounded-full accent-brand [&::-moz-progress-bar]:bg-brand [&::-webkit-progress-bar]:bg-tint [&::-webkit-progress-value]:bg-brand"
                                                    >
                                                        {progress.percentage}%
                                                    </progress>
                                                    <span className="text-meta text-ink-muted tabular-nums">
                                                        {progress.percentage}%
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                                                <button
                                                    type="submit"
                                                    disabled={processing}
                                                    className="btn-primary min-h-12 px-7 whitespace-nowrap disabled:cursor-wait disabled:opacity-70"
                                                >
                                                    <FileText
                                                        aria-hidden="true"
                                                        className="size-[18px]"
                                                    />
                                                    {processing
                                                        ? t('Sending…')
                                                        : t(
                                                              'Submit manuscript',
                                                          )}
                                                </button>
                                                <p className={hint}>
                                                    {t('Questions?')}{' '}
                                                    <a
                                                        href="/contact"
                                                        target="_blank"
                                                        rel="noopener"
                                                        className="link-u"
                                                    >
                                                        {t(
                                                            'Contact the editorial office',
                                                        )}
                                                        <span className="sr-only">
                                                            {' '}
                                                            (
                                                            {t(
                                                                'opens in a new tab',
                                                            )}
                                                            )
                                                        </span>
                                                    </a>
                                                </p>
                                            </div>
                                        </div>
                                    </>
                                );
                            }}
                        </Form>
                    )}
                </div>
            </div>
        </div>
    );
}
