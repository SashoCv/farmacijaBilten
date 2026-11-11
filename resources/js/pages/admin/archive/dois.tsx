import { Head, Link, usePage } from '@inertiajs/react';
import { ExternalLink } from 'lucide-react';
import {
    ArticleDepositButtons,
    CrossrefAccountForm,
    CrossrefSettingsForm,
    DepositButtons,
    DepositLog,
} from '@/components/archive/crossref-panel';
import InputError from '@/components/input-error';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';
import {
    dois as archiveDois,
    index as archiveIndex,
} from '@/routes/admin/archive';
import type { ArchiveDoisProps } from '@/types/archive';

function Check({ href, children }: { href: string; children: string }) {
    return (
        <a
            href={href}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline"
        >
            <ExternalLink aria-hidden="true" className="size-3" />
            {children}
        </a>
    );
}

/**
 * Which DOIs do not resolve and why: the result of comparing the articles
 * with the list of DOIs the journal has deposited at Crossref.
 */
export default function ArchiveDois({
    checkedAt,
    prefix,
    groups,
    double,
    crossref,
    deposits,
}: ArchiveDoisProps) {
    const { t, locale } = useT();
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const count = groups.reduce((n, g) => n + g.articles.length, 0);
    const date = checkedAt
        ? new Date(checkedAt).toLocaleString(
              locale === 'mk' ? 'mk-MK' : 'en-GB',
              {
                  dateStyle: 'long',
                  timeStyle: 'short',
              },
          )
        : null;

    return (
        <>
            <Head title={t('DOI check')} />

            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <header className="max-w-3xl">
                    <h1 className="m-0 text-2xl font-semibold tracking-tight">
                        {t('DOI check')}
                    </h1>
                    <p className="m-0 mt-2 text-sm text-muted-foreground">
                        {t(
                            'A DOI works only after the publisher deposits it at Crossref, the DOI registration agency. The system downloads the list of every DOI deposited under the journal’s prefix {prefix} and compares it with the articles. A DOI that is not on that list does not open at doi.org: readers and indexing services cannot follow it.',
                            { prefix },
                        )}
                    </p>
                    <p className="m-0 mt-2 text-sm text-muted-foreground">
                        {date
                            ? t('Last compared with Crossref: {date}.', {
                                  date,
                              })
                            : t('Not compared with Crossref yet.')}{' '}
                        {t(
                            'Each DOI can be checked by hand with the links next to it: doi.org opens the article when the DOI is registered and shows “DOI not found” when it is not.',
                        )}
                    </p>
                </header>

                <CrossrefSettingsForm settings={crossref} />
                <CrossrefAccountForm settings={crossref} />
                <InputError message={errors.crossref} />

                <section className="rounded-xl border bg-card p-4">
                    <h2 className="m-0 text-base font-semibold">
                        {t('Not registered: {count}', { count })}
                    </h2>
                    <ul className="m-0 mt-3 grid list-none gap-1 p-0 text-sm">
                        {groups.map((g) => (
                            <li key={g.slug} className="flex flex-wrap gap-x-2">
                                <a
                                    href={`#doi-${g.slug}`}
                                    className="font-medium underline-offset-4 hover:underline"
                                >
                                    {g.label}
                                    {g.year && ` (${g.year})`}
                                </a>
                                <span className="text-muted-foreground">
                                    {g.articles.length === g.total
                                        ? t('all {count} articles', {
                                              count: g.total,
                                          })
                                        : t('{count} of {total} articles', {
                                              count: g.articles.length,
                                              total: g.total,
                                          })}
                                </span>
                            </li>
                        ))}
                    </ul>
                </section>

                <DepositLog deposits={deposits} />

                {groups.map((g) => (
                    <section
                        key={g.slug}
                        id={`doi-${g.slug}`}
                        className="grid scroll-mt-20 gap-2"
                    >
                        <h2 className="m-0 text-lg font-semibold">
                            <Link
                                href={g.url}
                                className="underline-offset-4 hover:underline"
                            >
                                {g.label}
                            </Link>
                            {g.year && (
                                <span className="font-normal text-muted-foreground">
                                    {' '}
                                    ({g.year})
                                </span>
                            )}
                        </h2>
                        <div className="flex flex-wrap items-center gap-3">
                            <DepositButtons
                                pending={g.pending}
                                xmlUrl={g.xmlUrl}
                                depositUrl={
                                    crossref.connected ? g.depositUrl : null
                                }
                            />
                            {g.pending < g.articles.length && (
                                <span className="text-xs text-muted-foreground">
                                    {t(
                                        'Articles whose DOI is registered for another PDF are left out: check them by hand first.',
                                    )}
                                </span>
                            )}
                        </div>
                        <ul className="m-0 grid list-none divide-y rounded-xl border bg-card p-0">
                            {g.articles.map((a) => (
                                <li
                                    key={a.number}
                                    className="grid gap-1 px-4 py-3 text-sm"
                                >
                                    <Link
                                        href={a.url}
                                        className="font-medium underline-offset-4 hover:underline"
                                    >
                                        {a.number}. {a.title}
                                    </Link>
                                    <span className="font-mono text-xs break-all">
                                        {a.doi}
                                    </span>
                                    <span className="text-xs font-medium text-red-700">
                                        {t(a.problem)}
                                        {a.crossrefDoi &&
                                            ` — ${t('Crossref has: {doi}', { doi: a.crossrefDoi })}`}
                                    </span>
                                    <span className="flex flex-wrap items-center gap-3">
                                        <ArticleDepositButtons
                                            xmlUrl={a.xmlUrl}
                                            depositUrl={
                                                crossref.connected
                                                    ? a.depositUrl
                                                    : null
                                            }
                                        />
                                        <Check
                                            href={`https://doi.org/${a.doi}`}
                                        >
                                            {t('Open at doi.org')}
                                        </Check>
                                        <Check
                                            href={`https://search.crossref.org/search/works?q=${encodeURIComponent(a.doi)}&from_ui=yes`}
                                        >
                                            {t('Search at Crossref')}
                                        </Check>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </section>
                ))}

                {double.length > 0 && (
                    <section className="grid gap-3">
                        <h2 className="m-0 text-lg font-semibold">
                            {t('Registered with a mistake ({count})', {
                                count: double.reduce(
                                    (n, g) => n + g.articles.length,
                                    0,
                                ),
                            })}
                        </h2>
                        <p className="m-0 max-w-3xl text-sm text-muted-foreground">
                            {t(
                                'These DOIs were deposited at Crossref with a typo, most often the prefix written twice. The DOI printed on the article does not open; only the mistyped form does (the website links to it for now). The fix: deposit the issue again, which registers the DOIs as printed. Afterwards the publisher can ask Crossref support to alias the mistyped DOIs to the right ones.',
                            )}
                        </p>
                        {double.map((g) => (
                            <div key={g.slug} className="grid gap-2">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="m-0 text-base font-semibold">
                                        {g.label}
                                    </h3>
                                    <DepositButtons
                                        pending={g.pending}
                                        xmlUrl={g.xmlUrl}
                                        depositUrl={
                                            crossref.connected
                                                ? g.depositUrl
                                                : null
                                        }
                                    />
                                </div>
                                <ul className="m-0 grid list-none divide-y rounded-xl border bg-card p-0">
                                    {g.articles.map((d) => (
                                        <li
                                            key={d.number}
                                            className="grid gap-1 px-4 py-3 text-sm"
                                        >
                                            <Link
                                                href={d.url}
                                                className="font-medium underline-offset-4 hover:underline"
                                            >
                                                {g.label}, {d.number}
                                            </Link>
                                            <span className="font-mono text-xs break-all">
                                                {t('Printed (does not open)')}:{' '}
                                                {d.doi}
                                            </span>
                                            <span className="font-mono text-xs break-all">
                                                {t('Registered (opens)')}:{' '}
                                                {d.registeredAs}
                                            </span>
                                            <span className="flex flex-wrap items-center gap-3">
                                                <ArticleDepositButtons
                                                    xmlUrl={d.xmlUrl}
                                                    depositUrl={
                                                        crossref.connected
                                                            ? d.depositUrl
                                                            : null
                                                    }
                                                />
                                                <Check
                                                    href={`https://doi.org/${d.doi}`}
                                                >
                                                    {t(
                                                        'Open printed at doi.org',
                                                    )}
                                                </Check>
                                                <Check
                                                    href={`https://doi.org/${d.registeredAs}`}
                                                >
                                                    {t(
                                                        'Open registered at doi.org',
                                                    )}
                                                </Check>
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </section>
                )}
            </div>
        </>
    );
}

ArchiveDois.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Archive', href: archiveIndex() },
        { title: 'DOI check', href: archiveDois() },
    ],
};
