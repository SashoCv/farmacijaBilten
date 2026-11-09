import { Head, Link } from '@inertiajs/react';
import { PenLine } from 'lucide-react';
import { useDates } from '@/lib/dates';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import { index as templatesIndex } from '@/routes/admin/mail-templates';
import type {
    MailTemplateAudience,
    MailTemplatesIndexProps,
} from '@/types/review';

const GROUPS: { audience: MailTemplateAudience; title: string }[] = [
    { audience: 'author', title: 'To authors' },
    { audience: 'reviewer', title: 'To reviewers' },
    { audience: 'editors', title: 'To the editorial office' },
];

export default function MailTemplatesIndex({
    templates,
}: MailTemplatesIndexProps) {
    const { t } = useT();
    const { date } = useDates();

    return (
        <>
            <Head title={t('E-mail templates')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header>
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('E-mail templates')}
                    </h1>
                    <p className="m-0 mt-1 max-w-3xl text-sm text-muted-foreground">
                        {t(
                            'These are the e-mails the system sends. Change the wording in English and Macedonian; {placeholders} are filled in automatically.',
                        )}
                    </p>
                </header>

                {GROUPS.map((group) => {
                    const list = templates.filter(
                        (tpl) => tpl.audience === group.audience,
                    );

                    if (list.length === 0) {
                        return null;
                    }

                    return (
                        <section
                            key={group.audience}
                            aria-labelledby={`mail-${group.audience}`}
                            className="grid gap-2"
                        >
                            <h2
                                id={`mail-${group.audience}`}
                                className="m-0 text-base font-semibold"
                            >
                                {t(group.title)}
                            </h2>
                            <ul className="m-0 grid list-none overflow-hidden rounded-xl border p-0">
                                {list.map((tpl) => (
                                    <li
                                        key={tpl.key}
                                        className="border-b last:border-b-0"
                                    >
                                        <Link
                                            href={tpl.url}
                                            className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 hover:bg-muted/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="m-0 font-medium">
                                                    {t(tpl.description)}
                                                </p>
                                                <p className="m-0 mt-0.5 truncate text-sm text-muted-foreground">
                                                    {t('Subject: {subject}', {
                                                        subject: tpl.subject,
                                                    })}
                                                </p>
                                            </div>
                                            {tpl.customised ? (
                                                <span className="rounded-md border border-sky-300 bg-sky-50 px-2 py-0.5 text-xs font-medium text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100">
                                                    {t('Customised')}
                                                    {tpl.updatedAt &&
                                                        ` · ${date(tpl.updatedAt)}`}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">
                                                    {t('Original wording')}
                                                </span>
                                            )}
                                            <span className="inline-flex items-center gap-1 text-sm font-medium">
                                                <PenLine
                                                    aria-hidden="true"
                                                    className="size-4"
                                                />
                                                {t('Edit')}
                                            </span>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    );
                })}
            </div>
        </>
    );
}

MailTemplatesIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'E-mail templates', href: templatesIndex() },
    ],
};
