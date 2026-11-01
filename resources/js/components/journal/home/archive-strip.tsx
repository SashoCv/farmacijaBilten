import { Link } from '@inertiajs/react';
import { IssueCover } from '@/components/journal/issue-cover';
import { useT } from '@/lib/i18n';
import { archive } from '@/routes';
import { show as showIssue } from '@/routes/issues';
import type { IssueSummary, VolumeSummary } from '@/types/journal';

type Props = {
    issues: IssueSummary[];
    volumes: VolumeSummary[];
    start: { volume: number; year: number | null } | null;
};

/** Recent issues as covers, then every volume as a link into the archive. */
export function ArchiveStrip({ issues, volumes, start }: Props) {
    const { t } = useT();

    return (
        <section
            id="archive"
            aria-labelledby="archive-title"
            className="border-t border-line bg-mist"
        >
            <div className="page-wrap flex flex-col gap-6 py-10 md:py-12">
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
                    <div className="flex flex-col gap-1">
                        <h2
                            id="archive-title"
                            className="m-0 font-serif text-[26px] leading-[1.2] font-medium md:text-h2"
                        >
                            {t('Recent issues')}
                        </h2>
                        {start && (
                            <p className="m-0 text-ui text-ink-muted">
                                {start.year
                                    ? t(
                                          'Online archive from Volume {volume} ({year})',
                                          {
                                              volume: start.volume,
                                              year: start.year,
                                          },
                                      )
                                    : t('Online archive from Volume {volume}', {
                                          volume: start.volume,
                                      })}
                            </p>
                        )}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1 sm:items-end">
                        <Link href={archive()} className="link-u text-ui">
                            {t('All volumes')}
                            <span aria-hidden="true"> →</span>
                        </Link>
                        <nav
                            aria-labelledby="volumes-title"
                            className="flex flex-wrap items-center gap-x-2 sm:justify-end"
                        >
                            <h3
                                id="volumes-title"
                                className="m-0 text-meta font-semibold text-ink-muted"
                            >
                                {t('Volumes')}
                            </h3>
                            <ul className="m-0 flex list-none flex-wrap p-0">
                                {volumes.map((volume) => (
                                    <li key={volume.volume}>
                                        <Link
                                            href={`${archive.url()}#volume-${volume.volume}`}
                                            title={volume.summary}
                                            aria-label={t('Volume {volume}', {
                                                volume: volume.volume,
                                            })}
                                            className="inline-flex min-h-8 min-w-[30px] items-center justify-center rounded-md text-ui font-semibold text-brand tabular-nums no-underline hover:bg-white hover:text-brand-dark hover:underline"
                                        >
                                            {volume.volume}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                    </div>
                </div>

                <ul className="m-0 grid list-none grid-cols-3 gap-x-4 gap-y-6 p-0 sm:grid-cols-6">
                    {issues.map((issue) => (
                        <li key={issue.slug}>
                            <Link
                                href={showIssue.url(issue.slug)}
                                className="group flex flex-col gap-2 text-ink no-underline hover:text-brand"
                            >
                                <IssueCover
                                    image={issue.coverImage}
                                    volume={issue.volume}
                                    caption={
                                        issue.kind === 'supplement'
                                            ? (issue.note ?? issue.part ?? '')
                                            : (issue.part ?? String(issue.year))
                                    }
                                    variant={
                                        issue.kind === 'supplement'
                                            ? 'supplement'
                                            : 'regular'
                                    }
                                    size="sm"
                                    className="w-full max-w-[120px] transition-[box-shadow,translate] duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_10px_24px_-14px_rgba(30,42,68,0.45)]"
                                />
                                <span className="flex flex-col">
                                    <span className="text-meta leading-snug font-semibold group-hover:underline group-hover:decoration-underline group-hover:underline-offset-2">
                                        {issue.label}
                                    </span>
                                    <span className="text-meta text-ink-muted tabular-nums">
                                        {issue.note
                                            ? `${issue.note} · ${issue.year}`
                                            : issue.year}
                                    </span>
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
