import type { ManuscriptLanguage } from '@/types/manuscript';
import type { AdminAssignment, DecisionType } from '@/types/review';

/*
 * The decision letter the editor starts from: greeting, the decision, then
 * each submitted review of the round as "Reviewer N:" and its comments to
 * the authors. Confidential comments to the editor are never included.
 * Written in the manuscript's language; the editor edits it freely.
 */

type Texts = {
    greeting: (name: string | null) => string;
    thanks: (
        title: string,
        reference: string | null,
        journal: string,
    ) => string;
    decisions: Record<DecisionType, string>;
    reviewsIntro: string;
    reviewer: (n: number) => string;
    closing: (journal: string) => string;
};

const TEXTS: Record<ManuscriptLanguage, Texts> = {
    en: {
        greeting: (name) => (name ? `Dear ${name},` : 'Dear authors,'),
        thanks: (title, reference, journal) =>
            `Thank you for submitting your manuscript "${title}"${reference ? ` (${reference})` : ''} to the ${journal}.`,
        decisions: {
            accept: 'We are pleased to inform you that your manuscript has been accepted for publication.',
            minor_revision:
                'The reviewers recommend minor revisions. Please revise the manuscript, answer each comment in your response to the reviewers and resubmit it.',
            major_revision:
                'The reviewers recommend major revisions. Please revise the manuscript thoroughly, answer each comment point by point in your response to the reviewers and resubmit it; the revised version will be reviewed again.',
            reject: 'After careful consideration, we regret to inform you that your manuscript cannot be accepted for publication.',
            return: 'Before the manuscript can be sent to reviewers, please correct the points below and submit it again.',
        },
        reviewsIntro: 'The reviewers’ comments follow.',
        reviewer: (n) => `Reviewer ${n}:`,
        closing: (journal) => `Kind regards,\nThe editorial office\n${journal}`,
    },
    mk: {
        greeting: (name) =>
            name ? `Почитувани ${name},` : 'Почитувани автори,',
        thanks: (title, reference, journal) =>
            `Ви благодариме што го поднесовте ракописот „${title}“${reference ? ` (${reference})` : ''} во ${journal}.`,
        decisions: {
            accept: 'Со задоволство Ве известуваме дека Вашиот ракопис е прифатен за објавување.',
            minor_revision:
                'Рецензентите препорачуваат мала ревизија. Ве молиме ревидирајте го ракописот, одговорете на секој коментар во одговорот до рецензентите и поднесете го повторно.',
            major_revision:
                'Рецензентите препорачуваат голема ревизија. Ве молиме темелно ревидирајте го ракописот, одговорете точка по точка на секој коментар во одговорот до рецензентите и поднесете го повторно; ревидираната верзија повторно ќе биде рецензирана.',
            reject: 'По внимателно разгледување, со жалење Ве известуваме дека Вашиот ракопис не може да биде прифатен за објавување.',
            return: 'Пред ракописот да биде испратен на рецензенти, Ве молиме поправете ги точките подолу и поднесете го повторно.',
        },
        reviewsIntro: 'Во продолжение се коментарите на рецензентите.',
        reviewer: (n) => `Рецензент ${n}:`,
        closing: (journal) => `Со почит,\nРедакцијата\n${journal}`,
    },
};

export function decisionLetter({
    type,
    language,
    authorName,
    title,
    reference,
    journal,
    assignments,
    round,
}: {
    type: DecisionType;
    language: ManuscriptLanguage;
    authorName: string | null;
    title: string;
    reference: string | null;
    journal: string;
    assignments: AdminAssignment[];
    round: number;
}): string {
    const texts = TEXTS[language] ?? TEXTS.en;
    // A technical return goes out before review: no reviewers' comments.
    const reviews = (type === 'return' ? [] : assignments)
        .filter(
            (a) =>
                a.round === round &&
                a.status === 'submitted' &&
                a.review &&
                a.review.commentsToAuthor.trim() !== '',
        )
        .sort((a, b) => a.number - b.number);

    const parts = [
        texts.greeting(authorName),
        texts.thanks(title, reference, journal),
        texts.decisions[type],
    ];

    if (type === 'return') {
        parts.push('1. …');
    }

    if (reviews.length > 0) {
        parts.push(texts.reviewsIntro);

        for (const assignment of reviews) {
            parts.push(
                `${texts.reviewer(assignment.number)}\n${assignment.review!.commentsToAuthor.trim()}`,
            );
        }
    }

    parts.push(texts.closing(journal));

    return parts.join('\n\n');
}
