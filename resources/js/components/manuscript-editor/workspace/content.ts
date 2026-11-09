import type { JSONContent } from '@tiptap/core';
import type {
    ArticleTypeConfig,
    ManuscriptAffiliation,
    ManuscriptAuthor,
    ManuscriptContent,
    ManuscriptSection,
    SubmissionData,
    TemplateConfig,
} from '@/types/manuscript';

/** A new client id (authors, affiliations, review sections). */
export function uuid(): string {
    // randomUUID needs a secure context (https or localhost).
    if (typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }

    // Older browsers on plain http: RFC 4122 v4 from getRandomValues.
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));

    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export const EMPTY_DOC: JSONContent = {
    type: 'doc',
    content: [{ type: 'paragraph' }],
};

export function emptyAuthor(affiliations: string[] = []): ManuscriptAuthor {
    return {
        id: uuid(),
        givenName: '',
        familyName: '',
        givenNameAlt: '',
        familyNameAlt: '',
        email: '',
        orcid: '',
        phone: '',
        affiliations,
        corresponding: false,
    };
}

export function emptyAffiliation(): ManuscriptAffiliation {
    return { id: uuid(), text: '', textAlt: '' };
}

/** A section as the page holds it (the body lives in its editor). */
export type SectionState = {
    key: string;
    heading: string;
    /** Skeleton entry it belongs to; null for a section the template no longer has. */
    skeleton: string | null;
    free: boolean;
};

/** Everything except the rich-text fields, which live in their editors. */
export type Meta = {
    runningTitle: string;
    keywords: string[];
    authors: ManuscriptAuthor[];
    affiliations: ManuscriptAffiliation[];
    conflictOfInterest: string;
    funding: string;
    summaryKeywords: string[];
};

export function sectionField(key: string): string {
    return `sections.${key}`;
}

export function isCustomKey(key: string): boolean {
    return key.startsWith('custom-');
}

export function newCustomKey(): string {
    return `custom-${uuid()}`;
}

/**
 * Lays the stored sections over the type's skeleton: every skeleton
 * section once, in order; the author's own sections at the `free` slot (at
 * least one); stored sections the template no longer has at the end, so no
 * text is lost.
 */
export function initialSections(
    type: ArticleTypeConfig | undefined,
    stored: ManuscriptSection[],
): { sections: SectionState[]; bodies: Map<string, JSONContent> } {
    const bodies = new Map<string, JSONContent>();
    const byKey = new Map(stored.map((section) => [section.key, section]));
    const used = new Set<string>();
    const sections: SectionState[] = [];

    for (const section of stored) {
        bodies.set(section.key, section.body ?? EMPTY_DOC);
    }

    for (const skeleton of type?.sections ?? []) {
        if (skeleton.free) {
            const custom = stored.filter((section) => isCustomKey(section.key));

            if (custom.length === 0) {
                sections.push({
                    key: newCustomKey(),
                    heading: '',
                    skeleton: skeleton.key,
                    free: true,
                });
            }

            for (const section of custom) {
                used.add(section.key);
                sections.push({
                    key: section.key,
                    heading: section.heading ?? '',
                    skeleton: skeleton.key,
                    free: true,
                });
            }

            continue;
        }

        const existing = byKey.get(skeleton.key);
        const options = [skeleton.heading, ...skeleton.alternatives].filter(
            (heading): heading is string => Boolean(heading),
        );
        used.add(skeleton.key);
        sections.push({
            key: skeleton.key,
            heading:
                existing && options.includes(existing.heading)
                    ? existing.heading
                    : (skeleton.heading ?? existing?.heading ?? ''),
            skeleton: skeleton.key,
            free: false,
        });
    }

    for (const section of stored) {
        if (!used.has(section.key)) {
            sections.push({
                key: section.key,
                heading: section.heading ?? '',
                skeleton: null,
                free: false,
            });
        }
    }

    return { sections, bodies };
}

export function initialMeta(
    content: ManuscriptContent,
    template: TemplateConfig,
): Meta {
    return {
        runningTitle: content.runningTitle ?? '',
        keywords: content.keywords ?? [],
        authors: content.authors ?? [],
        affiliations: content.affiliations ?? [],
        conflictOfInterest:
            content.conflictOfInterest || template.defaultConflictOfInterest,
        funding: content.funding ?? '',
        summaryKeywords: content.summary?.keywords ?? [],
    };
}

export function initialSubmission(
    submission: SubmissionData | null | undefined,
    template: TemplateConfig,
): SubmissionData {
    const reviewers = [...(submission?.suggestedReviewers ?? [])];

    while (reviewers.length < template.suggestedReviewers) {
        reviewers.push({ name: '', affiliation: '', email: '' });
    }

    const declarations: Record<string, boolean> = {};

    for (const key of Object.keys(template.declarations)) {
        declarations[key] = submission?.declarations?.[key] === true;
    }

    return {
        suggestedReviewers: reviewers.slice(
            0,
            Math.max(template.suggestedReviewers, 0),
        ),
        coverLetter: submission?.coverLetter ?? '',
        declarations,
        responseToReviewers: submission?.responseToReviewers ?? '',
    };
}

/** Rich-text values a field starts with, keyed by field name. */
export function initialRichValues(
    content: ManuscriptContent,
    bodies: Map<string, JSONContent>,
): Map<string, JSONContent | null> {
    const values = new Map<string, JSONContent | null>([
        ['title', content.title],
        ['abstract', content.abstract],
        ['acknowledgements', content.acknowledgements],
        ['references', content.references],
        ['summary.title', content.summary?.title ?? null],
        ['summary.abstract', content.summary?.abstract ?? null],
    ]);

    for (const [key, body] of bodies) {
        values.set(sectionField(key), body);
    }

    return values;
}

/** Number of words in a text (for the abstract limit). */
export function countWords(text: string): number {
    const words = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’\-.]*/gu);

    return words ? words.length : 0;
}

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ORCID = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

/** Affiliation numbers as printed: the order of the affiliation list. */
export function affiliationNumbers(
    affiliations: ManuscriptAffiliation[],
): Map<string, number> {
    return new Map(affiliations.map((item, index) => [item.id, index + 1]));
}
