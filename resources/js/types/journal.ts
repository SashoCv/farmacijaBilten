/*
 * Data contract between the Laravel presenters and the journal pages.
 *
 * Every shape here is produced by exactly one PHP method; change both together:
 *   IssueSummary   ← App\Models\Issue::presentSummary()
 *   IssueDetail    ← App\Models\Issue::present()
 *   ArticleSummary ← App\Models\Article::presentSummary()
 *   ArticleDetail  ← App\Models\Article::present()
 *   JournalFacts   ← App\Journal\Journal::facts() (shared prop `journal`)
 *   BoardMember    ← App\Models\BoardMember::present()
 *
 * Fields marked "(WS9)" are null/false until the data workstream fills them;
 * render them conditionally.
 */

export type IssueKind = 'issue' | 'supplement' | 'volume' | 'abstracts';

/** Language of a piece of content, for the `lang` attribute. */
export type ContentLang = 'en' | 'mk';

/* ------------------------------------------------------------------ */
/* Issues                                                              */
/* ------------------------------------------------------------------ */

/** An issue in a list: archive card, sidebar, cover strip. */
export type IssueSummary = {
    slug: string;
    volume: number;
    number: number | null;
    kind: IssueKind;
    /** "Issue 2" / "Supplement 1" / "Book of Abstracts"; null for a single-issue volume */
    part: string | null;
    /** "Volume 71, Issue 2" (localized) */
    label: string;
    /** Congress or special-issue short name, e.g. "8CPM" */
    note: string | null;
    /** Full congress title, e.g. "8th Congress of Pharmacy in North Macedonia…" (WS9) */
    fullTitle: string | null;
    /** "Ohrid, 1–4 October 2026" (WS9) */
    locationDates: string | null;
    /** Always set by the importer (the column is nullable). */
    year: number;
    /** True for the journal's current (newest published regular) issue. */
    isCurrent: boolean;
    /** False while articles are still being released online first. */
    isPublished: boolean;
    /** Null when the query did not count articles. */
    articleCount: number | null;
    /** "30 April – 5 June 2025" (localized) */
    publishedRange: string | null;
    /** "April–June 2025" (localized) */
    publishedSpan: string | null;
    /** URL of the printed cover image (WS9); fall back to the generated cover. */
    coverImage: string | null;
    /** URL of the whole issue as one PDF. */
    pdf: string | null;
    /** URL of the table-of-contents PDF. */
    tocPdf: string | null;
};

/** The issue page (and the issue an article belongs to). */
export type IssueDetail = IssueSummary & {
    /** URL of a separate cover-page PDF (WS9). */
    coverPdf: string | null;
    /** Issue DOI (WS9). */
    doi: string | null;
    /** https://doi.org/… for `doi`. */
    doiUrl: string | null;
    /** ISO date (Y-m-d) the issue went online (WS9). */
    onlineAt: string | null;
    /** First and last printed page (null unless the articles were loaded / WS9). */
    firstPage: number | null;
    lastPage: number | null;
    /** Page count and size of the whole-issue PDF (WS9). */
    pdfPages: number | null;
    pdfBytes: number | null;
};

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

/** A row in a table of contents, list or search result. */
export type ArticleSummary = {
    /** "001", unique within the issue */
    number: string;
    issueSlug: string;
    /** "Volume 71, Issue 2" (localized) */
    issueLabel: string;
    /** Plain title: for <title>, citations and attributes. */
    title: string;
    /**
     * Title as HTML with only i/em/sup/sub (sanitised on import). Falls back
     * to the escaped plain title. Render with dangerouslySetInnerHTML.
     */
    titleHtml: string;
    titleLang: ContentLang;
    authors: string[];
    /** "Original scientific paper", "Review paper", … */
    type: string | null;
    /** "3–11" */
    pages: string | null;
    doi: string | null;
    /** Registered with Crossref: true / false, or null while unchecked (WS9). */
    doiRegistered: boolean | null;
    /**
     * https://doi.org/… link target, or null when there is no DOI or it is
     * known to be unregistered. Show the DOI as a link only when
     * `doiRegistered === true`.
     */
    doiUrl: string | null;
    /** ISO date (Y-m-d) published online */
    publishedAt: string | null;
    /** "30 April 2025" (localized) */
    publishedLabel: string | null;
    /** Online date, else the issue year: "2025-04-30" or "2025". */
    publicationDate: string | null;
    /** URL of the article PDF */
    pdf: string | null;
    /** PDF size in bytes (WS9) */
    pdfBytes: number | null;
    hasAbstract: boolean;
    /** Vancouver reference, as used by the journal. */
    citation: string;
};

/** The article page. */
export type ArticleDetail = ArticleSummary & {
    /** From the PDF's title page; not linked to individual authors. */
    affiliations: string[];
    /** "Received: February 2025; Accepted: April 2025" (free text from the PDF) */
    history: string | null;
    /** ISO dates (Y-m-d) (WS9) */
    receivedAt: string | null;
    acceptedAt: string | null;
    onlineAt: string | null;
    /** Page count of the PDF (WS9) */
    pdfPages: number | null;
    /** URL of a first-page thumbnail image (WS9) */
    pdfThumb: string | null;
    /** Article-specific licence name; null means the journal's (`journal.licence`). */
    licence: string | null;
    abstract: string | null;
    abstractLang: ContentLang | null;
    keywords: string[];
    keywordsLang: ContentLang | null;
    references: string | null;
};

/* ------------------------------------------------------------------ */
/* Lists and pages                                                     */
/* ------------------------------------------------------------------ */

export type VolumeSummary = {
    volume: number;
    summary: string;
};

export type ArchiveVolume = {
    volume: number;
    year: number | null;
    issues: IssueSummary[];
};

export type CmsPage = {
    path: string;
    title: string;
    /** Macedonian title, when set (WS6). */
    titleMk: string | null;
    /** Sanitised HTML imported from the old site. */
    body: string;
    /** Sanitised Macedonian HTML, when translated. */
    bodyMk: string | null;
    /** One line for hub cards and meta descriptions. */
    summary: string | null;
};

export type PageSection = {
    title: string;
    path: string;
    pages: { path: string; title: string; titleMk: string | null }[];
};

/* ------------------------------------------------------------------ */
/* Journal facts (shared prop `journal`)                               */
/* ------------------------------------------------------------------ */

export type Organisation = {
    nameEn: string;
    nameMk: string;
    url: string;
};

export type IndexingService = {
    key: 'doaj' | 'ebsco' | 'crossref' | (string & {});
    /** "DOAJ" */
    name: string;
    /** "Directory of Open Access Journals" */
    label: string;
    /** The journal's record at the service. */
    url: string;
    /** Logo URL, or null when none is available yet. */
    logo: string | null;
};

/**
 * Facts from config/journal.php. Values the editors have not confirmed are
 * marked "TO CONFIRM" there; null means "not stated" and must not be shown.
 */
export type JournalFacts = {
    nameEn: string;
    nameMk: string;
    /** "Maced. Pharm. Bull." */
    abbrev: string;
    issnPrint: string;
    issnOnline: string;
    /** "10.33320" */
    doiPrefix: string;
    publisher: Organisation & {
        abbrev: string;
        email: string;
        address: string;
    };
    coPublisher: Organisation;
    /** Editorial office. */
    address: {
        organisation: string;
        street: string;
        postalCode: string;
        city: string;
        country: string;
        countryCode: string;
    };
    editorialEmail: string;
    phone: string | null;
    editor: {
        name: string;
        /** "Professor" */
        title: string | null;
        role: string | null;
        /** URL of the signature image */
        signature: string | null;
    };
    licence: { name: string; url: string };
    apc: { amount: number; currency: string; charged: string } | null;
    reviewModel: string | null;
    frequency: string | null;
    foundedYear: number | null;
    /** Languages articles are published in. */
    languages: ContentLang[];
    openAccess: boolean;
    indexing: IndexingService[];
    /** Verbatim EBSCO licensing sentence from the old home page. */
    ebscoStatement: string;
    /** Verbatim indexing sentence from the Editor's words. */
    indexingStatement: string;
};

/* ------------------------------------------------------------------ */
/* Editorial board                                                     */
/* ------------------------------------------------------------------ */

export type BoardMember = {
    id: number;
    /** "editor-in-chief" | "secretary" | "international" | … */
    group: string;
    /** Role shown on the card (TO CONFIRM by the editors). */
    role: string | null;
    position: number;
    /** Academic title, e.g. "Prof. Dr." */
    title: string | null;
    givenName: string;
    familyName: string;
    /** "Given Family" */
    name: string;
    affiliation: string | null;
    city: string | null;
    country: string | null;
    orcid: string | null;
    email: string | null;
    /** Portrait URL */
    photo: string | null;
};
