import { Head, usePage } from '@inertiajs/react';
import { CmsPageHeader } from '@/components/journal/cms-page-header';
import { ClosingCta } from '@/components/journal/cms-rail';
import { localTitle } from '@/components/journal/section-nav';
import type { SectionData } from '@/components/journal/section-nav';
import { useT } from '@/lib/i18n';
import { contactHref } from '@/lib/site-links';
import { home } from '@/routes';
import type { BoardMember } from '@/types/journal';
import ContentPage, { initials } from './page';
import type { CmsPageData } from './page';

type Props = {
    page: CmsPageData;
    section: SectionData | null;
    /** Editors first, then the international board alphabetically. */
    members: BoardMember[];
    /** ISO date the member list last changed. */
    updatedAt: string | null;
    /** The same date, formatted in the reader's language. */
    updatedLabel: string | null;
};

const EDITOR_GROUPS = ['editor-in-chief', 'secretary'];

/**
 * The editorial board from `board_members`: the editors as two cards, then
 * the international board as a grid. Falls back to the imported page text
 * while the table is empty.
 */
export default function EditorialBoardPage({
    page,
    section,
    members,
    updatedAt,
    updatedLabel,
}: Props) {
    const { t, locale } = useT();
    const { editorialEmail } = usePage().props.journal;
    const title = localTitle(page, locale);

    if (members.length === 0) {
        return <ContentPage page={page} section={section} submission={null} />;
    }

    const editors = members.filter((m) => EDITOR_GROUPS.includes(m.group));
    const board = members.filter((m) => !EDITOR_GROUPS.includes(m.group));
    const countries = new Set(
        members.map((m) => m.country).filter((c): c is string => Boolean(c)),
    );

    return (
        <>
            <Head title={title} />

            <CmsPageHeader
                crumbs={[
                    { label: t('Home'), href: home.url() },
                    { label: title },
                ]}
                eyebrow={t('About')}
                title={title}
                lead={t('{members} members from {countries} countries.', {
                    members: members.length,
                    countries: countries.size,
                })}
            >
                {updatedAt && updatedLabel && (
                    <p className="m-0 text-meta text-ink-muted">
                        {t('Last updated')}{' '}
                        <time dateTime={updatedAt}>{updatedLabel}</time>
                    </p>
                )}
            </CmsPageHeader>

            <div className="page-wrap flex flex-col gap-12 section-y md:gap-16">
                {editors.length > 0 && (
                    <section
                        aria-labelledby="editors-title"
                        className="flex flex-col gap-6"
                    >
                        <h2
                            id="editors-title"
                            className="m-0 font-serif text-h3 font-medium text-ink"
                        >
                            {t('Editors')}
                        </h2>
                        <ul className="m-0 grid list-none gap-4 p-0 md:grid-cols-2">
                            {editors.map((member) => (
                                <li
                                    key={member.id}
                                    className="flex gap-5 rounded-lg border border-line-card bg-white p-5 sm:p-6"
                                >
                                    <Avatar member={member} />
                                    <div className="flex min-w-0 flex-col gap-1">
                                        {member.role && (
                                            <p className="eyebrow">
                                                {t(member.role)}
                                            </p>
                                        )}
                                        <h3
                                            lang="en"
                                            className="m-0 font-serif text-h4 font-medium text-ink"
                                        >
                                            {[member.title, member.name]
                                                .filter(Boolean)
                                                .join(' ')}
                                        </h3>
                                        <MemberDetails member={member} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {board.length > 0 && (
                    <section
                        aria-labelledby="board-title"
                        className="flex flex-col gap-6"
                    >
                        <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                            <h2
                                id="board-title"
                                className="m-0 font-serif text-h3 font-medium text-ink"
                            >
                                {t(board[0].role ?? 'Editorial board')}
                            </h2>
                            <p className="m-0 text-meta text-ink-muted tabular-nums">
                                {t('{count} members, in alphabetical order', {
                                    count: board.length,
                                })}
                            </p>
                        </div>
                        <ul
                            lang="en"
                            className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4"
                        >
                            {board.map((member) => (
                                <li
                                    key={member.id}
                                    className="flex flex-col gap-0.5 rounded-lg border border-line-card bg-white px-5 py-4"
                                >
                                    <div className="flex min-w-0 flex-col gap-0.5">
                                        <h3 className="m-0 font-sans text-[17px] leading-snug font-semibold text-ink">
                                            {[member.title, member.name]
                                                .filter(Boolean)
                                                .join(' ')}
                                        </h3>
                                        <MemberDetails member={member} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                <p className="m-0 max-w-[70ch] border-t border-line pt-6 text-ui text-ink-muted">
                    {t(
                        'The list is published as provided by the editorial office.',
                    )}{' '}
                    {t('Corrections and questions:')}{' '}
                    <a href={`mailto:${editorialEmail}`} className="link-u">
                        {editorialEmail}
                    </a>{' '}
                    · <a href={contactHref}>{t('Contact')}</a>
                </p>
            </div>

            <ClosingCta />
        </>
    );
}

function MemberDetails({ member }: { member: BoardMember }) {
    const place = [member.city, member.country].filter(Boolean).join(', ');

    return (
        <>
            {member.affiliation && (
                <p className="m-0 text-ui text-ink-soft">
                    {member.affiliation}
                </p>
            )}
            {place && <p className="m-0 text-meta text-ink-muted">{place}</p>}
            {(member.orcid || member.email) && (
                <p className="m-0 mt-1 flex flex-wrap gap-x-4 text-meta">
                    {member.orcid && (
                        <a
                            href={`https://orcid.org/${member.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            ORCID {member.orcid}
                        </a>
                    )}
                    {member.email && (
                        <a href={`mailto:${member.email}`}>{member.email}</a>
                    )}
                </p>
            )}
        </>
    );
}

function Avatar({ member }: { member: BoardMember }) {
    const box = 'size-16 text-xl';

    if (member.photo) {
        return (
            <img
                src={member.photo}
                alt=""
                loading="lazy"
                className={`${box} shrink-0 rounded-full object-cover`}
            />
        );
    }

    return (
        <span
            aria-hidden="true"
            className={`${box} flex shrink-0 items-center justify-center rounded-full bg-tint font-serif font-medium text-brand-dark`}
        >
            {initials(`${member.givenName} ${member.familyName}`)}
        </span>
    );
}
