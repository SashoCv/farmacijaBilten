import type { JSONContent } from '@tiptap/core';

/*
 * The manuscript as the author writes it (docs/backoffice). This is the
 * contract between the editor page and the server: the server stores
 * `ManuscriptContent` as JSON (manuscript_drafts.content), validates it with
 * App\Manuscripts\ManuscriptChecker and renders it with
 * App\Manuscripts\Rendering\ManuscriptRenderer.
 *
 * Rich text fields are TipTap documents (`{ type: 'doc', content: [...] }`):
 * - inline-only fields (titles): one paragraph, marks bold/italic/sub/sup;
 * - prose fields (abstract, acknowledgements): paragraphs with those marks;
 * - section bodies: paragraphs, level-2 headings (italic subheadings), lists,
 *   and journal tables (tableBlock = tableCaption table tableNotes);
 * - references: one paragraph per reference, in the order printed.
 */

export type ManuscriptStatus =
    | 'draft'
    | 'submitted'
    | 'under_review'
    | 'revision_requested'
    | 'resubmitted'
    | 'accepted'
    | 'in_production'
    | 'published'
    | 'rejected'
    | 'withdrawn';

export type ManuscriptLanguage = 'en' | 'mk';

export type ManuscriptAuthor = {
    /** Stable client id (uuid). */
    id: string;
    givenName: string;
    familyName: string;
    /** The name in the other script, printed in the Summary/Резиме. */
    givenNameAlt: string;
    familyNameAlt: string;
    email: string;
    orcid: string;
    /** Required for corresponding authors. */
    phone: string;
    /** Ids from `affiliations`, in order. At least one. */
    affiliations: string[];
    corresponding: boolean;
};

export type ManuscriptAffiliation = {
    id: string;
    /** Full postal address: organisation, street, postal code, city, country. */
    text: string;
    /** The same in the other language (for the Summary/Резиме). */
    textAlt: string;
};

export type ManuscriptSection = {
    /** Skeleton key ('introduction', 'methods', …) or 'custom-<uuid>' for review sections. */
    key: string;
    /** Printed heading. Fixed for skeleton sections (or one of the alternatives); free for custom ones. */
    heading: string;
    body: JSONContent;
};

export type ManuscriptContent = {
    schema: 1;
    title: JSONContent | null;
    runningTitle: string;
    abstract: JSONContent | null;
    keywords: string[];
    authors: ManuscriptAuthor[];
    affiliations: ManuscriptAffiliation[];
    sections: ManuscriptSection[];
    acknowledgements: JSONContent | null;
    conflictOfInterest: string;
    funding: string;
    references: JSONContent | null;
    /** The other language: Резиме for an English paper, Summary for a Macedonian one. */
    summary: {
        title: JSONContent | null;
        abstract: JSONContent | null;
        keywords: string[];
    };
};

/** What only the editorial office sees (never shown to reviewers). */
export type SubmissionData = {
    suggestedReviewers: { name: string; affiliation: string; email: string }[];
    coverLetter: string;
    declarations: Record<string, boolean>;
    /** Revisions only: the authors' point-by-point response to the reviewers (required to resubmit). */
    responseToReviewers?: string;
};

export type CheckIssue = {
    /** 'error' blocks submitting; 'warning' does not. */
    level: 'error' | 'warning';
    /** Where to go: 'title', 'abstract', 'keywords', 'authors', 'authors.<id>', 'affiliations', 'sections.<key>', 'references', 'summary', 'declarations', 'suggestedReviewers'. */
    field: string;
    /** Already translated into the UI language. */
    message: string;
};

export type ArticleTypeConfig = {
    key: string;
    label: string;
    languages: ManuscriptLanguage[];
    abstractWords: number;
    maxTablesAndFigures: number | null;
    /** Skeleton sections for this type, headings in the manuscript language. */
    sections: {
        key: string;
        heading: string | null;
        alternatives: string[];
        required: boolean;
        /** Review papers: the author adds their own titled sections here. */
        free: boolean;
    }[];
};

/** Template settings sent with the editor page. */
export type TemplateConfig = {
    types: ArticleTypeConfig[];
    keywords: { min: number; max: number };
    runningTitleMax: number;
    suggestedReviewers: number;
    /** key → English sentence (translated with t()). */
    declarations: Record<string, string>;
    /** Printed labels in the manuscript language (Abstract, Key words, Table…). */
    labels: Record<string, string>;
    defaultConflictOfInterest: string;
};

/** Props of pages/author/manuscripts/edit.tsx. */
export type ManuscriptEditProps = {
    manuscript: {
        id: string;
        type: string;
        language: ManuscriptLanguage;
        status: ManuscriptStatus;
        reference: string | null;
        updatedAt: string | null;
    };
    content: ManuscriptContent;
    submission: SubmissionData;
    /**
     * Optional (added by the frontend): type of the latest editorial decision.
     * When the manuscript was returned for corrections ('return'), resubmitting
     * needs no response to the reviewers.
     */
    lastDecisionType?: import('./review').DecisionType | null;
    /** Optimistic lock: send back with every save; 409 when someone else saved meanwhile. */
    lock: number;
    issues: CheckIssue[];
    template: TemplateConfig;
    /** URLs (already resolved by the server). */
    urls: {
        save: string;
        submit: string;
        preview: string;
        show: string;
        index: string;
        destroy: string;
    };
};

/** Response of PUT {urls.save} (JSON). */
export type SaveResponse = {
    lock: number;
    savedAt: string;
    issues: CheckIssue[];
};

/** A row in the author's and the admin's lists. */
export type ManuscriptSummary = {
    id: string;
    reference: string | null;
    title: string;
    type: string;
    typeLabel: string;
    language: ManuscriptLanguage;
    status: ManuscriptStatus;
    submittedAt: string | null;
    updatedAt: string | null;
    submitter?: { id: number; name: string; email: string };
    authorsLine?: string;
    /** Edit page for drafts the user may edit, otherwise the read-only page. */
    url: string;
};

/** Props of pages/author/manuscripts/index.tsx. */
export type AuthorManuscriptIndexProps = {
    manuscripts: ManuscriptSummary[];
    /** For the "New manuscript" form (POST urls.store with `type` and `language`). */
    types: { key: string; label: string; languages: ManuscriptLanguage[] }[];
    urls: { store: string };
};

/** Props of pages/author/manuscripts/show.tsx (and the admin view). */
export type ManuscriptShowProps = {
    manuscript: ManuscriptSummary & { authorsLine: string };
    /** The article rendered by the server, styled by resources/css/manuscript.css (`.ms`). Trusted (sanitised) HTML. */
    html: string;
    events: ManuscriptEvent[];
    /** Present when the author may still edit (draft or revision requested). */
    editUrl: string | null;
    /** Editorial decisions with the anonymised reviews (author view; see types/review.ts). */
    decisions?: import('./review').AuthorDecision[];
    /** When a revision is requested: its due date. */
    revisionDueAt?: string | null;
    /** Messages the editorial office sent to the authors (notes marked for the authors). */
    messages?: { id: number; body: string; at: string }[];
    /** Issue, pages, DOI and the article link once placed in an issue or published. */
    publication?: import('./publishing').AuthorPublication | null;
};

/** Response of GET {urls.preview} (JSON). */
export type PreviewResponse = { html: string; issues: CheckIssue[] };

export type ManuscriptEvent = {
    id: number;
    type: string;
    fromStatus: ManuscriptStatus | null;
    toStatus: ManuscriptStatus | null;
    actor: string | null;
    at: string;
    note: string | null;
};
