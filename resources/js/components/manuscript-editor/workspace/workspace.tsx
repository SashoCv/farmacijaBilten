import type { JSONContent } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { router } from '@inertiajs/react';
import {
    CircleAlert,
    Eye,
    History,
    ListChecks,
    LogIn,
    RotateCcw,
    Send,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { StatusBadge } from '@/components/manuscript/status-badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { login } from '@/routes';
import type {
    CheckIssue,
    ManuscriptContent,
    ManuscriptEditProps,
    ManuscriptLanguage,
    PreviewResponse,
    SubmissionData,
} from '@/types/manuscript';
import { Toolbar } from '../toolbar';
import { AffiliationLines, AuthorsBlock, AuthorsLine } from './authors-block';
import { Autosaver, clearBackup, readBackup } from './autosave';
import type { Backup } from './autosave';
import {
    countWords,
    initialMeta,
    initialRichValues,
    initialSections,
    initialSubmission,
    sectionField,
} from './content';
import type { Meta, SectionState } from './content';
import { issueId, WorkspaceContext } from './context';
import type { ActiveEditor, Workspace } from './context';
import { FieldIssues } from './field-issues';
import { figureOptions, withoutUploads } from './figures';
import type { LabImages } from './figures';
import { KeywordsInput } from './keywords-input';
import { PaperHint, PaperInput, PaperLabel, PaperTextarea } from './paper-ui';
import { docx } from '@/routes/manuscripts';
import { PreviewDialog } from './preview-dialog';
import type { PreviewState } from './preview-dialog';
import { RichField } from './rich-field';
import { Sections } from './sections';
import { IssuesList, SaveIndicator } from './side-panel';
import { createStore, useStore } from './store';
import type { Store } from './store';
import { SubmitDialog } from './submit-dialog';

/** Printed "Key words" label of the summary, in the summary's language. */
const KEYWORDS_LABEL: Record<ManuscriptLanguage, string> = {
    en: 'Key words',
    mk: 'Клучни зборови',
};

const EMPTY_BODY: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

/** Issues the submit dialog itself resolves. */
const SUBMISSION_FIELDS = new Set([
    'declarations',
    'suggestedReviewers',
    'responseToReviewers',
]);

type Loaded = {
    meta: Meta;
    sections: SectionState[];
    submission: SubmissionData;
    rich: Map<string, JSONContent | null>;
};

function load(
    content: ManuscriptContent,
    submission: SubmissionData,
    props: ManuscriptEditProps,
): Loaded {
    const type = props.template.types.find(
        (item) => item.key === props.manuscript.type,
    );
    const { sections, bodies } = initialSections(type, content.sections ?? []);

    return {
        meta: initialMeta(content, props.template),
        sections,
        submission: initialSubmission(submission, props.template),
        rich: initialRichValues(content, bodies),
    };
}

/** A backup worth offering: not saved to the server and newer than its copy. */
function restorable(props: ManuscriptEditProps): Backup | null {
    const backup = readBackup(props.manuscript.id);

    if (!backup || backup.synced) {
        return null;
    }

    const server = props.manuscript.updatedAt
        ? Date.parse(props.manuscript.updatedAt)
        : 0;

    if (Date.parse(backup.at) <= server) {
        return null;
    }

    return JSON.stringify(backup.content) === JSON.stringify(props.content)
        ? null
        : backup;
}

function Banner({
    tone,
    children,
    actions,
}: {
    tone: 'danger' | 'warning' | 'info';
    children: ReactNode;
    actions?: ReactNode;
}) {
    return (
        <div
            role={tone === 'info' ? 'status' : 'alert'}
            className={cn(
                'flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm',
                tone === 'danger' &&
                    'border-red-300 bg-red-50 text-red-950 dark:border-red-800 dark:bg-red-950 dark:text-red-50',
                tone === 'warning' &&
                    'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-50',
                tone === 'info' &&
                    'border-sky-300 bg-sky-50 text-sky-950 dark:border-sky-800 dark:bg-sky-950 dark:text-sky-50',
            )}
        >
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            <div className="min-w-0 flex-1">{children}</div>
            {actions && <div className="flex gap-2">{actions}</div>}
        </div>
    );
}

/** Abstract-like field with a live word count against the limit. */
function CountedProse({
    field,
    label,
    placeholder,
    lang,
    limit,
    className,
}: {
    field: string;
    label: string;
    placeholder: string;
    lang: string;
    limit: number;
    className?: string;
}) {
    const { t } = useT();
    const [words, setWords] = useState(0);
    const over = words > limit;

    return (
        <>
            <RichField
                field={field}
                variant="prose"
                label={label}
                placeholder={placeholder}
                lang={lang}
                className={className}
                onText={(editor: Editor) =>
                    setWords(
                        countWords(
                            editor.state.doc.textBetween(
                                0,
                                editor.state.doc.content.size,
                                ' ',
                                ' ',
                            ),
                        ),
                    )
                }
            />
            <PaperHint invalid={over}>
                {over
                    ? t('{words} words — {over} over the limit of {limit}.', {
                          words,
                          over: words - limit,
                          limit,
                      })
                    : t('{words} of {limit} words', { words, limit })}
            </PaperHint>
            <FieldIssues field={field} />
        </>
    );
}

/** The toolbar target: "Formatting: Abstract". */
function ActiveToolbar({ active }: { active: Store<ActiveEditor | null> }) {
    const { t } = useT();
    const current = useStore(active);

    return (
        <Toolbar
            // A new toolbar state for another field (its schema and selection).
            key={current?.field ?? ''}
            editor={current?.editor ?? null}
            className="top-0 z-20 flex-nowrap overflow-x-auto rounded-t-lg border-x border-t sm:flex-wrap sm:overflow-visible"
            target={
                <p className="m-0 hidden max-w-[14rem] shrink-0 truncate px-1 text-xs text-muted-foreground sm:block">
                    {current
                        ? t('Formatting: {field}', { field: current.label })
                        : t('Click in the text to format it')}
                </p>
            }
        />
    );
}

export default function ManuscriptWorkspace(props: ManuscriptEditProps) {
    const { t, locale } = useT();
    const { manuscript, template, urls } = props;
    const lang = manuscript.language;
    const altLang: ManuscriptLanguage = lang === 'en' ? 'mk' : 'en';
    const type = template.types.find((item) => item.key === manuscript.type);
    const labels = template.labels;

    const [initial] = useState(() =>
        load(props.content, props.submission, props),
    );
    const [meta, setMetaState] = useState(initial.meta);
    const [sections, setSectionsState] = useState(initial.sections);
    const [submission, setSubmissionState] = useState(initial.submission);
    const [generation, setGeneration] = useState(0);
    const [backup, setBackup] = useState<Backup | null>(() =>
        restorable(props),
    );
    const [panelOpen, setPanelOpen] = useState(false);
    const [submitOpen, setSubmitOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [preview, setPreview] = useState<PreviewState>({ kind: 'closed' });

    /*
     * The page state the autosave reads. Updated in the handlers below, next
     * to the React state, so a save never sees an older value; the editors
     * are read only when saving.
     */
    const ref = useRef({
        meta: initial.meta,
        sections: initial.sections,
        submission: initial.submission,
        rich: initial.rich,
        editors: new Map<string, Editor>(),
        blurTimer: null as ReturnType<typeof setTimeout> | null,
    });

    const translateNow = t;
    const [workspace] = useState(() => {
        const live = () => ref.current;
        const issues = createStore<CheckIssue[]>(props.issues);

        const richJson = (field: string): JSONContent | null => {
            const editor = live().editors.get(field);

            if (editor && !editor.isDestroyed) {
                return editor.isEmpty ? null : editor.getJSON();
            }

            return live().rich.get(field) ?? null;
        };

        const collect = () => {
            const { meta: m, sections: s, submission: sub } = live();
            const content: ManuscriptContent = {
                schema: 1,
                title: richJson('title'),
                runningTitle: m.runningTitle.trim(),
                abstract: richJson('abstract'),
                keywords: m.keywords,
                authors: m.authors,
                affiliations: m.affiliations,
                sections: s.map((section) => ({
                    key: section.key,
                    heading: section.heading.trim(),
                    body: withoutUploads(
                        richJson(sectionField(section.key)) ?? EMPTY_BODY,
                    ),
                })),
                acknowledgements: richJson('acknowledgements'),
                conflictOfInterest: m.conflictOfInterest.trim(),
                funding: m.funding.trim(),
                references: richJson('references'),
                summary: {
                    title: richJson('summary.title'),
                    abstract: richJson('summary.abstract'),
                    keywords: m.summaryKeywords,
                },
            };

            return {
                content,
                submission: sub,
                type: props.manuscript.type,
                language: props.manuscript.language,
            };
        };

        const autosaver = new Autosaver({
            id: props.manuscript.id,
            url: props.urls.save,
            lock: props.lock,
            savedAt: props.manuscript.updatedAt,
            collect,
            onIssues: (next) => issues.set(next),
        });

        const api: Workspace = {
            changed: () => autosaver.touch(),
            register: (field, editor) => live().editors.set(field, editor),
            unregister: (field, editor) => {
                if (live().editors.get(field) === editor) {
                    // Keep the last text: the editor may come back (Strict Mode).
                    if (!editor.isDestroyed) {
                        live().rich.set(
                            field,
                            editor.isEmpty ? null : editor.getJSON(),
                        );
                    }

                    live().editors.delete(field);
                }
            },
            isEmpty: (field) => {
                const editor = live().editors.get(field);

                return editor ? editor.isEmpty : !live().rich.get(field);
            },
            initial: (field) => live().rich.get(field) ?? null,
            active: createStore<ActiveEditor | null>(null),
            issues,
            figures: figureOptions(
                props.manuscript.id,
                translateNow,
                (props as ManuscriptEditProps & { lab?: LabImages }).lab,
            ),
            blurred: () => {
                const pending = live().blurTimer;

                if (pending) {
                    clearTimeout(pending);
                }

                live().blurTimer = setTimeout(
                    () => void autosaver.flush(),
                    400,
                );
            },
        };

        return { api, autosaver };
    });

    const { api, autosaver } = workspace;
    const status = useStore(autosaver.status);
    const backupWorks = useStore(autosaver.backupWorks);
    const issues = useStore(api.issues);

    const setMeta = (update: (previous: Meta) => Meta) => {
        ref.current.meta = update(ref.current.meta);
        setMetaState(ref.current.meta);
        autosaver.touch();
    };

    const setSections = (
        update: (previous: SectionState[]) => SectionState[],
    ) => {
        ref.current.sections = update(ref.current.sections);
        setSectionsState(ref.current.sections);
        autosaver.touch();
    };

    const setSubmission = (
        update: (previous: SubmissionData) => SubmissionData,
    ) => {
        ref.current.submission = update(ref.current.submission);
        setSubmissionState(ref.current.submission);
        autosaver.touch();
    };

    // Issues from a fresh server render (e.g. after a refused submit).
    useEffect(() => {
        api.issues.set(props.issues);
    }, [api, props.issues]);

    // Save when the author leaves the tab or the page; retry when back.
    useEffect(() => {
        const onHidden = () => {
            if (document.visibilityState === 'hidden') {
                void autosaver.flush();
            } else {
                autosaver.retry();
            }
        };
        const onPageHide = () => autosaver.flushOnExit();
        const onBeforeUnload = (event: BeforeUnloadEvent) => {
            const kind = autosaver.status.get().kind;

            if (
                !autosaver.isStopped &&
                (autosaver.dirty || kind === 'saving')
            ) {
                autosaver.flushOnExit();
                event.preventDefault();
            }
        };
        const onBack = () => autosaver.retry();
        const offBefore = router.on('before', () => {
            void autosaver.flush();
        });

        document.addEventListener('visibilitychange', onHidden);
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('focus', onBack);
        window.addEventListener('online', onBack);

        return () => {
            offBefore();
            document.removeEventListener('visibilitychange', onHidden);
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('focus', onBack);
            window.removeEventListener('online', onBack);
            autosaver.dispose();
        };
    }, [autosaver]);

    const errors = issues.filter((issue) => issue.level === 'error');
    const blocking = errors.filter(
        (issue) => !SUBMISSION_FIELDS.has(issue.field),
    );
    const canDelete = manuscript.status === 'draft';
    const revision = manuscript.status === 'revision_requested';
    const stopped = status.kind === 'conflict';

    /** Scrolls to a field named by a check issue and puts the cursor there. */
    const goTo = (field: string) => {
        setPanelOpen(false);

        if (SUBMISSION_FIELDS.has(field)) {
            setSubmitOpen(true);

            return;
        }

        let name = field;
        let target: HTMLElement | null = null;

        while (name && !target) {
            target = document.querySelector<HTMLElement>(
                `[data-field="${CSS.escape(name)}"]`,
            );
            name = name.includes('.')
                ? name.slice(0, name.lastIndexOf('.'))
                : '';
        }

        if (!target) {
            return;
        }

        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const fields = Array.from(
            target.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
                'input:not([type="checkbox"]):not(:disabled), textarea',
            ),
        );
        const focusable =
            target.querySelector<HTMLElement>('[aria-invalid="true"]') ??
            target.querySelector<HTMLElement>('[contenteditable="true"]') ??
            fields.find((input) => input.value.trim() === '') ??
            target.querySelector<HTMLElement>(
                'input:not([type="checkbox"]), textarea, select, button',
            );
        focusable?.focus({ preventScroll: true });
    };

    const openPreview = async () => {
        setPreview({ kind: 'loading' });
        await autosaver.flush();

        try {
            const response = await fetch(urls.preview, {
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (!response.ok) {
                throw new Error(String(response.status));
            }

            const data = (await response.json()) as PreviewResponse;
            api.issues.set(data.issues);
            setPreview({ kind: 'ready', html: data.html });
        } catch {
            setPreview({ kind: 'failed' });
        }
    };

    /** Saves (with the submission data), checks and sends. */
    const send = async (): Promise<string[]> => {
        const saved = await autosaver.saveNow();

        if (!saved) {
            return [
                t(
                    'The manuscript could not be saved. Check the message at the top of the page and try again.',
                ),
            ];
        }

        const stillWrong = api.issues
            .get()
            .filter((issue) => issue.level === 'error');

        if (stillWrong.length > 0) {
            return stillWrong.map((issue) => issue.message);
        }

        return new Promise((resolve) => {
            router.post(
                urls.submit,
                {},
                {
                    preserveScroll: true,
                    onSuccess: () => {
                        autosaver.stop();
                        clearBackup(manuscript.id);
                        resolve([]);
                    },
                    onError: (found) =>
                        resolve(
                            Object.values(found)
                                .flat()
                                .map((message) => String(message)),
                        ),
                    // Anything else (cancelled, network): back to the dialog.
                    onFinish: () => resolve([]),
                },
            );
        });
    };

    const destroy = () => {
        setDeleting(true);
        autosaver.stop();
        router.delete(urls.destroy, {
            onSuccess: () => clearBackup(manuscript.id),
            onFinish: () => setDeleting(false),
        });
    };

    const restore = () => {
        if (!backup) {
            return;
        }

        const loaded = load(backup.content, backup.submission, props);

        const live = ref.current;
        live.meta = loaded.meta;
        live.sections = loaded.sections;
        live.submission = loaded.submission;
        live.rich = loaded.rich;
        live.editors.clear();
        api.active.set(null);

        setMetaState(loaded.meta);
        setSectionsState(loaded.sections);
        setSubmissionState(loaded.submission);
        setGeneration((g) => g + 1);
        setBackup(null);
        autosaver.touch();
    };

    const dismissBackup = () => {
        setBackup(null);
        clearBackup(manuscript.id);
        // Keep the current text as the local copy.
        autosaver.touch();
    };

    const time = (iso: string) =>
        new Intl.DateTimeFormat(locale === 'mk' ? 'mk-MK' : 'en-GB', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hourCycle: 'h23',
        }).format(new Date(iso));

    const languageName = (code: ManuscriptLanguage) =>
        code === 'mk' ? t('Macedonian') : t('English');

    const panel = (
        <div className="grid gap-5">
            <div className="grid gap-3">
                <SaveIndicator
                    status={autosaver.status}
                    className="hidden lg:flex"
                />
                <div className="grid gap-2">
                    <Button
                        variant="outline"
                        onClick={() => void openPreview()}
                        className="justify-start"
                    >
                        <Eye aria-hidden="true" />
                        {t('Preview')}
                    </Button>
                    <Button
                        onClick={() => setSubmitOpen(true)}
                        disabled={blocking.length > 0 || stopped}
                        aria-describedby="ms-submit-why"
                        className="justify-start"
                    >
                        <Send aria-hidden="true" />
                        {revision ? t('Submit the revision…') : t('Submit…')}
                    </Button>
                    <p
                        id="ms-submit-why"
                        className="m-0 text-xs text-muted-foreground"
                    >
                        {blocking.length > 0
                            ? t(
                                  'Fix the errors listed below to submit ({count} left).',
                                  { count: blocking.length },
                              )
                            : t(
                                  'Next you suggest reviewers and confirm the declaration.',
                              )}
                    </p>
                </div>
            </div>

            <IssuesList issues={api.issues} onGo={goTo} />

            <div className="grid gap-2 border-t pt-4 text-xs text-muted-foreground">
                <a
                    href={urls.show}
                    className="inline-flex items-center gap-1.5 underline-offset-4 hover:underline"
                    onClick={(event) => {
                        event.preventDefault();
                        router.visit(urls.show);
                    }}
                >
                    <History aria-hidden="true" className="size-3.5" />
                    {t('History and read-only view')}
                </a>
                {canDelete && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteOpen(true)}
                        className="w-fit justify-start px-0 text-red-700 hover:bg-transparent hover:text-red-800 hover:underline dark:text-red-400"
                    >
                        <Trash2 aria-hidden="true" />
                        {t('Delete draft')}
                    </Button>
                )}
            </div>
        </div>
    );

    return (
        <WorkspaceContext.Provider value={api}>
            <div className="flex flex-1 flex-col gap-4 p-3 sm:p-4 lg:flex-row lg:items-start lg:gap-6 lg:p-6">
                <aside
                    aria-label={t('Manuscript status and checks')}
                    className="order-first lg:sticky lg:top-4 lg:order-last lg:max-h-[calc(100svh-2rem)] lg:w-80 lg:shrink-0 lg:overflow-y-auto"
                >
                    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 lg:hidden">
                        <SaveIndicator
                            status={autosaver.status}
                            className="min-w-0 flex-1"
                        />
                        <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={panelOpen}
                            aria-controls="ms-panel"
                            onClick={() => setPanelOpen((open) => !open)}
                        >
                            <ListChecks aria-hidden="true" />
                            {t('Checks ({count})', { count: issues.length })}
                        </Button>
                    </div>
                    <div
                        id="ms-panel"
                        className={cn(
                            'mt-2 rounded-lg border bg-card p-4 lg:mt-0 lg:block',
                            panelOpen ? 'block' : 'hidden',
                        )}
                    >
                        {panel}
                    </div>
                </aside>

                <div className="min-w-0 flex-1">
                    <header className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h1 className="m-0 text-xl font-semibold tracking-tight">
                            {revision
                                ? t('Revise the manuscript')
                                : t('Write the manuscript')}
                        </h1>
                        <StatusBadge status={manuscript.status} />
                        {manuscript.reference && (
                            <span className="text-sm text-muted-foreground tabular-nums">
                                {manuscript.reference}
                            </span>
                        )}
                    </header>

                    <div className="mb-3 grid gap-2 empty:hidden">
                        {status.kind === 'conflict' && (
                            <Banner
                                tone="danger"
                                actions={
                                    <Button
                                        size="sm"
                                        onClick={() => window.location.reload()}
                                    >
                                        <RotateCcw aria-hidden="true" />
                                        {t('Reload')}
                                    </Button>
                                }
                            >
                                {t(
                                    'Changed in another window — reload. Autosave has stopped here; your latest text is kept in this browser and offered after the reload.',
                                )}
                            </Banner>
                        )}
                        {status.kind === 'session' && (
                            <Banner
                                tone="danger"
                                actions={
                                    <Button size="sm" variant="outline" asChild>
                                        <a
                                            href={login().url}
                                            target="_blank"
                                            rel="noopener"
                                        >
                                            <LogIn aria-hidden="true" />
                                            {t('Sign in (new tab)')}
                                        </a>
                                    </Button>
                                }
                            >
                                {t(
                                    'Your session expired — sign in again in a new tab; your changes are kept here and saved as soon as you are back.',
                                )}
                            </Banner>
                        )}
                        {status.kind === 'offline' && (
                            <Banner tone="warning">
                                {t(
                                    'Not saved — retrying in {seconds} s. Your changes are kept in this browser.',
                                    {
                                        seconds: Math.round(
                                            status.retryIn / 1000,
                                        ),
                                    },
                                )}
                            </Banner>
                        )}
                        {status.kind === 'rejected' && (
                            <Banner tone="danger">
                                {status.message ??
                                    t(
                                        'The server refused to save the manuscript. Your changes are kept in this browser.',
                                    )}
                            </Banner>
                        )}
                        {!backupWorks && (
                            <Banner tone="warning">
                                {t(
                                    'This browser cannot keep a backup copy (private mode or full storage). Keep this tab open until the changes are saved.',
                                )}
                            </Banner>
                        )}
                        {backup && (
                            <Banner
                                tone="info"
                                actions={
                                    <>
                                        <Button size="sm" onClick={restore}>
                                            {t('Restore')}
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={dismissBackup}
                                        >
                                            {t('Keep the saved version')}
                                        </Button>
                                    </>
                                }
                            >
                                {t(
                                    'This browser has changes from {time} that did not reach the server. Restore them?',
                                    { time: time(backup.at) },
                                )}
                            </Banner>
                        )}
                    </div>

                    <ActiveToolbar active={api.active} />

                    <div className="ms-desk rounded-b-lg border-x border-b">
                        <article
                            key={generation}
                            lang={lang}
                            aria-label={t('Manuscript')}
                            className="ms ms-paper ms-ed"
                            onBlur={api.blurred}
                        >
                            <p className="ms-ed-type">
                                {type?.label ?? manuscript.type}
                                <span className="ms-ui ms-ed-aside">
                                    {t('Written in {language}', {
                                        language: languageName(lang),
                                    })}
                                </span>
                            </p>

                            <RichField
                                field="title"
                                variant="inline"
                                label={t('Title')}
                                placeholder={t('Title of the manuscript')}
                                lang={lang}
                                className="ms-ed-title"
                            />
                            <FieldIssues
                                field="title"
                                className="text-center"
                            />

                            <div
                                data-field="runningTitle"
                                className="ms-ed-running"
                            >
                                <PaperLabel htmlFor="ms-running-title">
                                    {t(
                                        'Running title (optional, printed at the top of odd pages)',
                                    )}
                                </PaperLabel>
                                <PaperInput
                                    id="ms-running-title"
                                    lang={lang}
                                    value={meta.runningTitle}
                                    maxLength={template.runningTitleMax}
                                    aria-describedby="ms-running-title-count"
                                    onChange={(e) =>
                                        setMeta((m) => ({
                                            ...m,
                                            runningTitle: e.target.value,
                                        }))
                                    }
                                />
                                <PaperHint id="ms-running-title-count">
                                    {t('{count} of {max} characters', {
                                        count: meta.runningTitle.length,
                                        max: template.runningTitleMax,
                                    })}
                                </PaperHint>
                            </div>

                            <AuthorsBlock
                                authors={meta.authors}
                                affiliations={meta.affiliations}
                                onChange={(update) =>
                                    setMeta((m) => ({ ...m, ...update(m) }))
                                }
                                lang={lang}
                                altLang={altLang}
                                summaryLabel={labels.summary ?? ''}
                            />

                            <div
                                className="ms-ed-abstract"
                                data-field="abstract"
                            >
                                <h2 className="ms-ed-label">
                                    {labels.abstract ?? t('Abstract')}
                                </h2>
                                <CountedProse
                                    field="abstract"
                                    label={labels.abstract ?? t('Abstract')}
                                    placeholder={t(
                                        'The abstract: aim, methods, main results and conclusion, without references.',
                                    )}
                                    lang={lang}
                                    limit={type?.abstractWords ?? 250}
                                />
                                <KeywordsInput
                                    field="keywords"
                                    label={labels.keywords ?? t('Key words')}
                                    value={meta.keywords}
                                    onChange={(keywords) =>
                                        setMeta((m) => ({ ...m, keywords }))
                                    }
                                    min={template.keywords.min}
                                    max={template.keywords.max}
                                    lang={lang}
                                />
                            </div>

                            <Sections
                                type={type}
                                sections={sections}
                                onChange={setSections}
                                lang={lang}
                            />

                            <section
                                className="ms-ed-section"
                                data-field="acknowledgements"
                                aria-labelledby="ms-h-ack"
                            >
                                <h2 id="ms-h-ack" className="ms-ed-h1">
                                    {labels.acknowledgements}
                                    <span className="ms-ui ms-ed-aside">
                                        {t('optional')}
                                    </span>
                                </h2>
                                <RichField
                                    field="acknowledgements"
                                    variant="prose"
                                    label={
                                        labels.acknowledgements ??
                                        t('Acknowledgements')
                                    }
                                    placeholder={t(
                                        'People and institutions you thank (not the funding, which goes below).',
                                    )}
                                    lang={lang}
                                />
                                <FieldIssues field="acknowledgements" />
                            </section>

                            <section
                                className="ms-ed-section"
                                data-field="conflictOfInterest"
                                aria-labelledby="ms-h-coi"
                            >
                                <h2 id="ms-h-coi" className="ms-ed-h1">
                                    {labels.conflict_of_interest}
                                </h2>
                                <PaperTextarea
                                    aria-labelledby="ms-h-coi"
                                    aria-describedby={issueId(
                                        'conflictOfInterest',
                                    )}
                                    lang={lang}
                                    rows={2}
                                    value={meta.conflictOfInterest}
                                    onChange={(e) =>
                                        setMeta((m) => ({
                                            ...m,
                                            conflictOfInterest: e.target.value,
                                        }))
                                    }
                                    className="ms-ed-plain"
                                />
                                <FieldIssues field="conflictOfInterest" />
                            </section>

                            <section
                                className="ms-ed-section"
                                data-field="funding"
                                aria-labelledby="ms-h-funding"
                            >
                                <h2 id="ms-h-funding" className="ms-ed-h1">
                                    {labels.funding}
                                </h2>
                                <PaperTextarea
                                    aria-labelledby="ms-h-funding"
                                    aria-describedby={issueId('funding')}
                                    lang={lang}
                                    rows={2}
                                    value={meta.funding}
                                    placeholder={t(
                                        'Funders and grant numbers, or: This research received no specific funding.',
                                    )}
                                    onChange={(e) =>
                                        setMeta((m) => ({
                                            ...m,
                                            funding: e.target.value,
                                        }))
                                    }
                                    className="ms-ed-plain"
                                />
                                <FieldIssues field="funding" />
                            </section>

                            <section
                                className="ms-ed-section"
                                data-field="references"
                                aria-labelledby="ms-h-refs"
                            >
                                <h2 id="ms-h-refs" className="ms-ed-h1">
                                    {labels.references}
                                </h2>
                                <div className="ms-ui ms-ed-note">
                                    <p>
                                        {t(
                                            'One reference per paragraph, in alphabetical order of the first author, then by year. All authors, no italics:',
                                        )}
                                    </p>
                                    <p className="font-serif">
                                        Author, A.A., Author, B., Year. Title of
                                        the article. Abbrev. Journal
                                        Volume(Issue), first–last.
                                        https://doi.org/…
                                    </p>
                                </div>
                                <RichField
                                    field="references"
                                    variant="prose"
                                    label={labels.references ?? t('References')}
                                    placeholder={t(
                                        'Paste or type the reference list, one reference per paragraph.',
                                    )}
                                    lang={lang}
                                    className="ms-ed-references"
                                />
                                <FieldIssues field="references" />
                            </section>

                            <section
                                className="ms-ed-summary"
                                data-field="summary"
                                lang={altLang}
                                aria-labelledby="ms-h-summary"
                            >
                                <h2
                                    id="ms-h-summary"
                                    className="ms-ed-summary-label"
                                >
                                    {labels.summary}
                                </h2>
                                <p className="ms-ui ms-ed-note ms-ed-note-center">
                                    {t(
                                        'The summary in {language}: title, key words and abstract. Names and addresses come from the authors above.',
                                        { language: languageName(altLang) },
                                    )}
                                </p>
                                <RichField
                                    field="summary.title"
                                    variant="inline"
                                    label={t('Title in {language}', {
                                        language: languageName(altLang),
                                    })}
                                    placeholder={t('Title in {language}', {
                                        language: languageName(altLang),
                                    })}
                                    lang={altLang}
                                    className="ms-ed-title ms-ed-title-summary"
                                />
                                <FieldIssues
                                    field="summary.title"
                                    className="text-center"
                                />
                                <AuthorsLine
                                    authors={meta.authors}
                                    affiliations={meta.affiliations}
                                    alt
                                />
                                <AffiliationLines
                                    affiliations={meta.affiliations}
                                    alt
                                />
                                <div className="ms-ed-abstract ms-ed-abstract-summary">
                                    <KeywordsInput
                                        field="summary.keywords"
                                        label={KEYWORDS_LABEL[altLang]}
                                        value={meta.summaryKeywords}
                                        onChange={(summaryKeywords) =>
                                            setMeta((m) => ({
                                                ...m,
                                                summaryKeywords,
                                            }))
                                        }
                                        min={template.keywords.min}
                                        max={template.keywords.max}
                                        lang={altLang}
                                    />
                                    <CountedProse
                                        field="summary.abstract"
                                        label={t('Abstract in {language}', {
                                            language: languageName(altLang),
                                        })}
                                        placeholder={t(
                                            'Abstract in {language}',
                                            {
                                                language: languageName(altLang),
                                            },
                                        )}
                                        lang={altLang}
                                        limit={type?.abstractWords ?? 250}
                                        className="ms-ed-summary-abstract"
                                    />
                                </div>
                                <FieldIssues field="summary" />
                            </section>
                        </article>
                    </div>
                </div>
            </div>

            <SubmitDialog
                open={submitOpen}
                onOpenChange={setSubmitOpen}
                submission={submission}
                onChange={setSubmission}
                template={template}
                onSend={send}
                revision={revision}
                needsResponse={revision && props.lastDecisionType !== 'return'}
            />

            <PreviewDialog
                state={preview}
                onClose={() => setPreview({ kind: 'closed' })}
                onRetry={() => void openPreview()}
                lang={lang}
                docxUrl={docx(props.manuscript.id).url}
            />

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogTitle>{t('Delete this draft?')}</DialogTitle>
                    <DialogDescription>
                        {t(
                            'The draft and everything written in it will be deleted. This cannot be undone.',
                        )}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => setDeleteOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={destroy}
                        >
                            <Trash2 aria-hidden="true" />
                            {t('Delete draft')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </WorkspaceContext.Provider>
    );
}
