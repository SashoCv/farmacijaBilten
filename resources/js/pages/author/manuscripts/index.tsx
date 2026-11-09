import { Form, Head, Link } from '@inertiajs/react';
import { ChevronRight, FilePen, FilePlus2 } from 'lucide-react';
import { useState } from 'react';
import InputError from '@/components/input-error';
import { StatusBadge } from '@/components/manuscript/status-badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useT } from '@/lib/i18n';
import { statusNext } from '@/lib/manuscript-status';
import { dashboard } from '@/routes';
import { index as manuscriptsIndex } from '@/routes/author/manuscripts';
import type {
    AuthorManuscriptIndexProps,
    ManuscriptLanguage,
} from '@/types/manuscript';

function useDate() {
    const { locale } = useT();
    const format = new Intl.DateTimeFormat(
        locale === 'mk' ? 'mk-MK' : 'en-GB',
        {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            timeZone: 'Europe/Skopje',
        },
    );

    return (iso: string | null) => (iso ? format.format(new Date(iso)) : '—');
}

const selectClass =
    'h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

/** Type and language of a new manuscript; the server opens the editor. */
function NewManuscript({
    types,
    action,
}: {
    types: AuthorManuscriptIndexProps['types'];
    action: string;
}) {
    const { t } = useT();
    const [type, setType] = useState(types[0]?.key ?? '');
    const languages: ManuscriptLanguage[] = types.find(
        (item) => item.key === type,
    )?.languages ?? ['en'];
    const [language, setLanguage] = useState<ManuscriptLanguage>(languages[0]);
    const chosenLanguage = languages.includes(language)
        ? language
        : languages[0];

    const languageName = (code: ManuscriptLanguage) =>
        code === 'mk' ? t('Macedonian') : t('English');

    return (
        <section
            aria-labelledby="new-manuscript"
            className="rounded-xl border bg-card p-5"
        >
            <h2 id="new-manuscript" className="m-0 text-base font-semibold">
                {t('New manuscript')}
            </h2>
            <p className="m-0 mt-1 text-sm text-muted-foreground">
                {t(
                    'Choose the type of paper. The editor opens with the sections of that type, in the journal’s layout.',
                )}
            </p>

            <Form
                action={action}
                method="post"
                className="mt-4 flex flex-wrap items-end gap-3"
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid min-w-[14rem] flex-1 gap-1.5">
                            <Label htmlFor="new-type">
                                {t('Type of paper')}
                            </Label>
                            <select
                                id="new-type"
                                name="type"
                                value={type}
                                onChange={(event) =>
                                    setType(event.target.value)
                                }
                                className={selectClass}
                            >
                                {types.map((item) => (
                                    <option key={item.key} value={item.key}>
                                        {item.label}
                                    </option>
                                ))}
                            </select>
                            <InputError message={errors.type} />
                        </div>

                        {languages.length > 1 ? (
                            <div className="grid min-w-[10rem] gap-1.5">
                                <Label htmlFor="new-language">
                                    {t('Language of the manuscript')}
                                </Label>
                                <select
                                    id="new-language"
                                    name="language"
                                    value={chosenLanguage}
                                    onChange={(event) =>
                                        setLanguage(
                                            event.target
                                                .value as ManuscriptLanguage,
                                        )
                                    }
                                    className={selectClass}
                                >
                                    {languages.map((code) => (
                                        <option key={code} value={code}>
                                            {languageName(code)}
                                        </option>
                                    ))}
                                </select>
                                <InputError message={errors.language} />
                            </div>
                        ) : (
                            <>
                                <input
                                    type="hidden"
                                    name="language"
                                    value={languages[0]}
                                />
                                <p className="m-0 pb-2 text-sm text-muted-foreground">
                                    {t('Written in {language}', {
                                        language: languageName(languages[0]),
                                    })}
                                </p>
                            </>
                        )}

                        <Button type="submit" disabled={processing}>
                            <FilePlus2 aria-hidden="true" />
                            {t('Start writing')}
                        </Button>
                    </>
                )}
            </Form>
        </section>
    );
}

export default function AuthorManuscripts({
    manuscripts,
    types,
    urls,
}: AuthorManuscriptIndexProps) {
    const { t } = useT();
    const date = useDate();

    return (
        <>
            <Head title={t('My manuscripts')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('My manuscripts')}
                    </h1>
                    <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                        {t(
                            'Write on the journal template, submit, and follow the review.',
                        )}
                    </p>
                </header>

                <NewManuscript types={types} action={urls.store} />

                {manuscripts.length === 0 ? (
                    <section className="rounded-xl border border-dashed p-6 text-sm">
                        <div className="flex items-start gap-3">
                            <span
                                aria-hidden
                                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted"
                            >
                                <FilePen className="size-5" />
                            </span>
                            <div>
                                <h2 className="m-0 text-base font-semibold">
                                    {t('No manuscripts yet')}
                                </h2>
                                <ol className="m-0 mt-2 grid list-decimal gap-1 pl-5 text-muted-foreground">
                                    <li>
                                        {t(
                                            'Start a manuscript above. You write it here, section by section, on the journal’s template; tables are set in the journal’s style.',
                                        )}
                                    </li>
                                    <li>
                                        {t(
                                            'Every change is saved automatically. You can stop and continue later.',
                                        )}
                                    </li>
                                    <li>
                                        {t(
                                            'The checks list what is still missing. When they are done, submit: the editorial office receives the manuscript and you follow the review here.',
                                        )}
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </section>
                ) : (
                    <section aria-labelledby="my-list">
                        <h2 id="my-list" className="sr-only">
                            {t('Manuscripts')}
                        </h2>
                        <ul className="m-0 grid list-none gap-0 overflow-hidden rounded-xl border p-0">
                            {manuscripts.map((item) => (
                                <li
                                    key={item.id}
                                    className="border-b last:border-b-0"
                                >
                                    <Link
                                        href={item.url}
                                        className="group flex items-center gap-4 px-4 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="m-0 font-medium">
                                                {item.title.trim() || (
                                                    <span className="text-muted-foreground italic">
                                                        {t(
                                                            'Untitled manuscript',
                                                        )}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="m-0 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                                                <StatusBadge
                                                    status={item.status}
                                                />
                                                <span>{item.typeLabel}</span>
                                                {item.reference && (
                                                    <span className="tabular-nums">
                                                        {item.reference}
                                                    </span>
                                                )}
                                                <span>
                                                    {item.submittedAt
                                                        ? t(
                                                              'Submitted {date}',
                                                              {
                                                                  date: date(
                                                                      item.submittedAt,
                                                                  ),
                                                              },
                                                          )
                                                        : t(
                                                              'Last saved {date}',
                                                              {
                                                                  date: date(
                                                                      item.updatedAt,
                                                                  ),
                                                              },
                                                          )}
                                                </span>
                                            </p>
                                            <p className="m-0 mt-1 text-sm">
                                                {t(statusNext(item.status))}
                                                {item.status ===
                                                    'published' && (
                                                    <span className="ml-1 font-medium underline underline-offset-4">
                                                        {t(
                                                            'Open to see the article',
                                                        )}
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <ChevronRight
                                            aria-hidden="true"
                                            className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground"
                                        />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </div>
        </>
    );
}

AuthorManuscripts.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'My manuscripts', href: manuscriptsIndex() },
    ],
};
