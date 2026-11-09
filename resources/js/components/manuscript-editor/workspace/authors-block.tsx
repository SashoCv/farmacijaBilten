import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Fragment } from 'react';
import { useT } from '@/lib/i18n';
import type {
    ManuscriptAffiliation,
    ManuscriptAuthor,
} from '@/types/manuscript';
import {
    affiliationNumbers,
    EMAIL,
    emptyAffiliation,
    emptyAuthor,
    ORCID,
} from './content';
import { issueId } from './context';
import { FieldIssues } from './field-issues';
import {
    PaperButton,
    PaperCheckbox,
    PaperHint,
    PaperInput,
    PaperLabel,
    PaperTextarea,
} from './paper-ui';

type People = {
    authors: ManuscriptAuthor[];
    affiliations: ManuscriptAffiliation[];
};

type Props = People & {
    onChange: (update: (previous: People) => People) => void;
    /** Manuscript language and the other one (names and addresses for the summary). */
    lang: string;
    altLang: string;
    /** Printed heading of the summary ("Резиме", "Summary"). */
    summaryLabel: string;
};

function move<T>(list: T[], index: number, by: number): T[] {
    const next = [...list];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);

    return next;
}

/** "Given Family¹,²*" as printed under the title. */
export function AuthorsLine({
    authors,
    affiliations,
    alt = false,
}: People & { alt?: boolean }) {
    const numbers = affiliationNumbers(affiliations);
    const named = authors.filter((a) =>
        alt ? a.givenNameAlt || a.familyNameAlt : a.givenName || a.familyName,
    );

    if (named.length === 0) {
        return null;
    }

    return (
        <p className="ms-ed-authors">
            {named.map((author, index) => {
                const marks = author.affiliations
                    .map((id) => numbers.get(id))
                    .filter((n): n is number => n !== undefined)
                    .sort((a, b) => a - b)
                    .join(',');

                return (
                    <Fragment key={author.id}>
                        {index > 0 && ', '}
                        {alt
                            ? `${author.givenNameAlt} ${author.familyNameAlt}`.trim()
                            : `${author.givenName} ${author.familyName}`.trim()}
                        {(marks || author.corresponding) && (
                            <sup>
                                {marks}
                                {author.corresponding ? '*' : ''}
                            </sup>
                        )}
                    </Fragment>
                );
            })}
        </p>
    );
}

/** "¹Address" lines as printed under the authors. */
export function AffiliationLines({
    affiliations,
    alt = false,
}: {
    affiliations: ManuscriptAffiliation[];
    alt?: boolean;
}) {
    const filled = affiliations
        .map((item, index) => ({
            n: index + 1,
            text: alt ? item.textAlt : item.text,
        }))
        .filter((item) => item.text.trim() !== '');

    if (filled.length === 0) {
        return null;
    }

    return (
        <div className="ms-ed-affiliations">
            {filled.map((item) => (
                <p key={item.n}>
                    <sup>{item.n}</sup>
                    {item.text}
                </p>
            ))}
        </div>
    );
}

/**
 * Authors and affiliations: the printed lines on the paper, and below them
 * the details of each author and address. Every action is a button (no
 * drag and drop), so the block works from the keyboard.
 */
export function AuthorsBlock({
    authors,
    affiliations,
    onChange,
    lang,
    altLang,
    summaryLabel,
}: Props) {
    const { t } = useT();

    const setAuthor = (id: string, patch: Partial<ManuscriptAuthor>) =>
        onChange((p) => ({
            ...p,
            authors: p.authors.map((a) =>
                a.id === id ? { ...a, ...patch } : a,
            ),
        }));

    const setAffiliation = (
        id: string,
        patch: Partial<ManuscriptAffiliation>,
    ) =>
        onChange((p) => ({
            ...p,
            affiliations: p.affiliations.map((a) =>
                a.id === id ? { ...a, ...patch } : a,
            ),
        }));

    const focusLater = (selector: string) =>
        requestAnimationFrame(() =>
            document.querySelector<HTMLElement>(selector)?.focus(),
        );

    const addAuthor = () => {
        const author = emptyAuthor();
        onChange((p) => {
            // The first author brings the first address with them.
            const next =
                p.affiliations.length === 0
                    ? [emptyAffiliation()]
                    : p.affiliations;
            const first = p.authors.length === 0;

            return {
                authors: [
                    ...p.authors,
                    {
                        ...author,
                        affiliations:
                            first || next.length === 1 ? [next[0].id] : [],
                        corresponding: first,
                    },
                ],
                affiliations: next,
            };
        });
        focusLater(`[data-author-first="${author.id}"]`);
    };

    const removeAuthor = (id: string) =>
        onChange((p) => ({
            ...p,
            authors: p.authors.filter((a) => a.id !== id),
        }));

    const addAffiliation = () => {
        const created = emptyAffiliation();
        onChange((p) => ({
            ...p,
            affiliations: [...p.affiliations, created],
        }));
        focusLater(`[data-affiliation-first="${created.id}"]`);
    };

    const removeAffiliation = (id: string) =>
        onChange((p) => ({
            authors: p.authors.map((a) => ({
                ...a,
                affiliations: a.affiliations.filter((x) => x !== id),
            })),
            affiliations: p.affiliations.filter((a) => a.id !== id),
        }));

    const toggleAffiliation = (author: ManuscriptAuthor, id: string) => {
        const has = author.affiliations.includes(id);
        const order = affiliations.map((a) => a.id);
        setAuthor(author.id, {
            affiliations: has
                ? author.affiliations.filter((x) => x !== id)
                : [...author.affiliations, id].sort(
                      (a, b) => order.indexOf(a) - order.indexOf(b),
                  ),
        });
    };

    return (
        <div className="ms-ed-people">
            <div data-field="authors" className="ms-ed-printed">
                {authors.length > 0 ? (
                    <>
                        <AuthorsLine
                            authors={authors}
                            affiliations={affiliations}
                        />
                        <AffiliationLines affiliations={affiliations} />
                    </>
                ) : null}
            </div>

            <section
                aria-labelledby="ms-authors-heading"
                className="ms-ui ms-ed-panel"
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2
                        id="ms-authors-heading"
                        className="text-sm font-semibold text-slate-900"
                    >
                        {t('Authors')}{' '}
                        <span className="font-normal text-slate-600">
                            ({authors.length})
                        </span>
                    </h2>
                    <PaperButton onClick={addAuthor}>
                        <Plus aria-hidden="true" />
                        {t('Add author')}
                    </PaperButton>
                </div>
                <FieldIssues field="authors" />

                {authors.length === 0 && (
                    <p className="mt-2 text-sm text-slate-600">
                        {t(
                            'Add the authors in the order they are printed. Mark the corresponding author.',
                        )}
                    </p>
                )}

                <ol className="mt-3 space-y-3">
                    {authors.map((author, index) => {
                        const key = `authors.${author.id}`;
                        const base = `ms-author-${author.id}`;
                        const needContact = author.corresponding;
                        const emailBad =
                            author.email !== '' && !EMAIL.test(author.email);
                        const emailMissing = needContact && author.email === '';
                        const phoneMissing =
                            needContact && author.phone.trim() === '';
                        const orcidBad =
                            author.orcid !== '' && !ORCID.test(author.orcid);
                        const name =
                            `${author.givenName} ${author.familyName}`.trim() ||
                            t('Author {n}', { n: index + 1 });

                        return (
                            <li
                                key={author.id}
                                data-field={key}
                                aria-label={t('Author {n}: {name}', {
                                    n: index + 1,
                                    name,
                                })}
                                className="rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                            >
                                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-900">
                                        <span className="mr-1.5 inline-flex size-5 items-center justify-center rounded-full bg-slate-200 text-xs tabular-nums">
                                            {index + 1}
                                        </span>
                                        {name}
                                    </p>
                                    <div className="flex gap-1">
                                        <PaperButton
                                            tone="quiet"
                                            disabled={index === 0}
                                            onClick={() =>
                                                onChange((p) => ({
                                                    ...p,
                                                    authors: move(
                                                        p.authors,
                                                        index,
                                                        -1,
                                                    ),
                                                }))
                                            }
                                            aria-label={t('Move {name} up', {
                                                name,
                                            })}
                                            title={t('Move up')}
                                        >
                                            <ArrowUp aria-hidden="true" />
                                        </PaperButton>
                                        <PaperButton
                                            tone="quiet"
                                            disabled={
                                                index === authors.length - 1
                                            }
                                            onClick={() =>
                                                onChange((p) => ({
                                                    ...p,
                                                    authors: move(
                                                        p.authors,
                                                        index,
                                                        1,
                                                    ),
                                                }))
                                            }
                                            aria-label={t('Move {name} down', {
                                                name,
                                            })}
                                            title={t('Move down')}
                                        >
                                            <ArrowDown aria-hidden="true" />
                                        </PaperButton>
                                        <PaperButton
                                            tone="danger"
                                            onClick={() =>
                                                removeAuthor(author.id)
                                            }
                                            aria-label={t('Remove {name}', {
                                                name,
                                            })}
                                            title={t('Remove')}
                                        >
                                            <Trash2 aria-hidden="true" />
                                        </PaperButton>
                                    </div>
                                </div>

                                <div className="grid gap-2 sm:grid-cols-2">
                                    <div>
                                        <PaperLabel htmlFor={`${base}-given`}>
                                            {t('Given name')}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-given`}
                                            data-author-first={author.id}
                                            lang={lang}
                                            autoComplete="off"
                                            value={author.givenName}
                                            aria-describedby={issueId(key)}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    givenName: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <PaperLabel htmlFor={`${base}-family`}>
                                            {t('Family name')}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-family`}
                                            lang={lang}
                                            autoComplete="off"
                                            value={author.familyName}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    familyName: e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <PaperLabel
                                            htmlFor={`${base}-given-alt`}
                                        >
                                            {t('Given name in the {summary}', {
                                                summary: summaryLabel,
                                            })}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-given-alt`}
                                            lang={altLang}
                                            autoComplete="off"
                                            value={author.givenNameAlt}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    givenNameAlt:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <PaperLabel
                                            htmlFor={`${base}-family-alt`}
                                        >
                                            {t('Family name in the {summary}', {
                                                summary: summaryLabel,
                                            })}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-family-alt`}
                                            lang={altLang}
                                            autoComplete="off"
                                            value={author.familyNameAlt}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    familyNameAlt:
                                                        e.target.value,
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <PaperLabel htmlFor={`${base}-email`}>
                                            {needContact
                                                ? t('E-mail (required)')
                                                : t('E-mail')}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-email`}
                                            type="email"
                                            autoComplete="off"
                                            value={author.email}
                                            aria-invalid={
                                                emailBad || emailMissing
                                            }
                                            aria-describedby={`${base}-email-hint`}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    email: e.target.value.trim(),
                                                })
                                            }
                                        />
                                        {(emailBad || emailMissing) && (
                                            <PaperHint
                                                id={`${base}-email-hint`}
                                                invalid
                                            >
                                                {emailBad
                                                    ? t(
                                                          'This is not a valid e-mail address.',
                                                      )
                                                    : t(
                                                          'Required for the corresponding author.',
                                                      )}
                                            </PaperHint>
                                        )}
                                    </div>
                                    <div>
                                        <PaperLabel htmlFor={`${base}-phone`}>
                                            {needContact
                                                ? t('Phone (required)')
                                                : t('Phone')}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-phone`}
                                            type="tel"
                                            autoComplete="off"
                                            value={author.phone}
                                            placeholder="+389 2 …"
                                            aria-invalid={phoneMissing}
                                            aria-describedby={`${base}-phone-hint`}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    phone: e.target.value,
                                                })
                                            }
                                        />
                                        <PaperHint
                                            id={`${base}-phone-hint`}
                                            invalid={phoneMissing}
                                        >
                                            {phoneMissing
                                                ? t(
                                                      'Required for the corresponding author, with the country code.',
                                                  )
                                                : t(
                                                      'Only the editorial office sees it.',
                                                  )}
                                        </PaperHint>
                                    </div>
                                    <div>
                                        <PaperLabel htmlFor={`${base}-orcid`}>
                                            {t('ORCID iD (optional)')}
                                        </PaperLabel>
                                        <PaperInput
                                            id={`${base}-orcid`}
                                            autoComplete="off"
                                            inputMode="numeric"
                                            placeholder="0000-0000-0000-0000"
                                            value={author.orcid}
                                            aria-invalid={orcidBad}
                                            aria-describedby={`${base}-orcid-hint`}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    orcid: e.target.value
                                                        .trim()
                                                        .replace(
                                                            /^https?:\/\/orcid\.org\//,
                                                            '',
                                                        ),
                                                })
                                            }
                                        />
                                        {orcidBad && (
                                            <PaperHint
                                                id={`${base}-orcid-hint`}
                                                invalid
                                            >
                                                {t(
                                                    'Use the form 0000-0000-0000-0000.',
                                                )}
                                            </PaperHint>
                                        )}
                                    </div>
                                    <div className="flex items-end pb-1.5">
                                        <PaperCheckbox
                                            checked={author.corresponding}
                                            onChange={(e) =>
                                                setAuthor(author.id, {
                                                    corresponding:
                                                        e.target.checked,
                                                })
                                            }
                                            label={t(
                                                'Corresponding author (marked *)',
                                            )}
                                        />
                                    </div>
                                </div>

                                <fieldset className="mt-3">
                                    <legend className="mb-1 text-xs font-medium text-slate-700">
                                        {t('Affiliations of this author')}
                                    </legend>
                                    {affiliations.length === 0 ? (
                                        <PaperHint invalid>
                                            {t(
                                                'Add an affiliation below first.',
                                            )}
                                        </PaperHint>
                                    ) : (
                                        <div className="flex flex-col gap-1">
                                            {affiliations.map((aff, n) => (
                                                <PaperCheckbox
                                                    key={aff.id}
                                                    checked={author.affiliations.includes(
                                                        aff.id,
                                                    )}
                                                    onChange={() =>
                                                        toggleAffiliation(
                                                            author,
                                                            aff.id,
                                                        )
                                                    }
                                                    label={
                                                        <>
                                                            <sup>{n + 1}</sup>{' '}
                                                            {aff.text ||
                                                                t(
                                                                    'Affiliation {n} (not filled in yet)',
                                                                    {
                                                                        n:
                                                                            n +
                                                                            1,
                                                                    },
                                                                )}
                                                        </>
                                                    }
                                                />
                                            ))}
                                            {author.affiliations.length ===
                                                0 && (
                                                <PaperHint invalid>
                                                    {t(
                                                        'Choose at least one affiliation.',
                                                    )}
                                                </PaperHint>
                                            )}
                                        </div>
                                    )}
                                </fieldset>
                                <FieldIssues field={key} />
                            </li>
                        );
                    })}
                </ol>
            </section>

            <section
                data-field="affiliations"
                aria-labelledby="ms-affiliations-heading"
                className="ms-ui ms-ed-panel"
            >
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2
                        id="ms-affiliations-heading"
                        className="text-sm font-semibold text-slate-900"
                    >
                        {t('Affiliations')}{' '}
                        <span className="font-normal text-slate-600">
                            ({affiliations.length})
                        </span>
                    </h2>
                    <PaperButton onClick={addAffiliation}>
                        <Plus aria-hidden="true" />
                        {t('Add affiliation')}
                    </PaperButton>
                </div>
                <p className="mt-1 text-xs text-slate-600">
                    {t(
                        'Full postal address: department, institution, street, postal code, city, country.',
                    )}
                </p>
                <FieldIssues field="affiliations" />

                <ol className="mt-3 space-y-3">
                    {affiliations.map((aff, index) => {
                        const base = `ms-aff-${aff.id}`;

                        return (
                            <li
                                key={aff.id}
                                data-field={`affiliations.${aff.id}`}
                                className="flex gap-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                            >
                                <span
                                    aria-hidden="true"
                                    className="mt-6 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs tabular-nums"
                                >
                                    {index + 1}
                                </span>
                                <div className="grid min-w-0 flex-1 gap-2">
                                    <div>
                                        <PaperLabel htmlFor={`${base}-text`}>
                                            {t('Affiliation {n}', {
                                                n: index + 1,
                                            })}
                                        </PaperLabel>
                                        <PaperTextarea
                                            id={`${base}-text`}
                                            data-affiliation-first={aff.id}
                                            lang={lang}
                                            rows={2}
                                            className="min-h-[2.5rem]"
                                            value={aff.text}
                                            onChange={(e) =>
                                                setAffiliation(aff.id, {
                                                    text: e.target.value.replace(
                                                        /\n/g,
                                                        ' ',
                                                    ),
                                                })
                                            }
                                        />
                                    </div>
                                    <div>
                                        <PaperLabel
                                            htmlFor={`${base}-text-alt`}
                                        >
                                            {t('The same in the {summary}', {
                                                summary: summaryLabel,
                                            })}
                                        </PaperLabel>
                                        <PaperTextarea
                                            id={`${base}-text-alt`}
                                            lang={altLang}
                                            rows={2}
                                            className="min-h-[2.5rem]"
                                            value={aff.textAlt}
                                            onChange={(e) =>
                                                setAffiliation(aff.id, {
                                                    textAlt:
                                                        e.target.value.replace(
                                                            /\n/g,
                                                            ' ',
                                                        ),
                                                })
                                            }
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <PaperButton
                                        tone="quiet"
                                        disabled={index === 0}
                                        onClick={() =>
                                            onChange((p) => ({
                                                ...p,
                                                affiliations: move(
                                                    p.affiliations,
                                                    index,
                                                    -1,
                                                ),
                                            }))
                                        }
                                        aria-label={t(
                                            'Move affiliation {n} up',
                                            { n: index + 1 },
                                        )}
                                        title={t('Move up')}
                                    >
                                        <ArrowUp aria-hidden="true" />
                                    </PaperButton>
                                    <PaperButton
                                        tone="quiet"
                                        disabled={
                                            index === affiliations.length - 1
                                        }
                                        onClick={() =>
                                            onChange((p) => ({
                                                ...p,
                                                affiliations: move(
                                                    p.affiliations,
                                                    index,
                                                    1,
                                                ),
                                            }))
                                        }
                                        aria-label={t(
                                            'Move affiliation {n} down',
                                            { n: index + 1 },
                                        )}
                                        title={t('Move down')}
                                    >
                                        <ArrowDown aria-hidden="true" />
                                    </PaperButton>
                                    <PaperButton
                                        tone="danger"
                                        onClick={() =>
                                            removeAffiliation(aff.id)
                                        }
                                        aria-label={t(
                                            'Remove affiliation {n}',
                                            { n: index + 1 },
                                        )}
                                        title={t('Remove')}
                                    >
                                        <Trash2 aria-hidden="true" />
                                    </PaperButton>
                                </div>
                            </li>
                        );
                    })}
                </ol>
            </section>
        </div>
    );
}
