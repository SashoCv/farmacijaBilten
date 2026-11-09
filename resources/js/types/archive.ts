/*
 * The published archive in the back-office (App\Http\Controllers\Admin\
 * ArchiveAdminController), read-only. These articles are PDFs in the
 * journal's OLD layout (two columns, made in Word): they are shown as they
 * are, marked as archived, and never opened in the new editor or template.
 */

export type ArchiveArticleRow = {
    id: number;
    number: string;
    issueLabel: string;
    title: string;
    authors: string[];
    type: string | null;
    pages: string | null;
    doi: string | null;
    /** true registered with Crossref, false not registered, null not checked. */
    doiRegistered: boolean | null;
    hasAbstract: boolean;
    keywordsCount: number;
    /** The original PDF (old layout), public URL. */
    pdfUrl: string | null;
    /** The article's page on the public site. */
    publicUrl: string;
    /** admin/archive/article page (read-only). */
    url: string;
};

/** pages/admin/archive/index.tsx */
export type ArchiveIndexProps = {
    /** The DOI check page (admin/archive/dois). */
    doiCheckUrl: string;
    /** Newest volume first, regular issues before supplements. */
    issues: {
        slug: string;
        label: string;
        volume: number;
        kind: string;
        year: number | null;
        /** false: early online (articles out before the issue is complete). */
        published: boolean;
        articles: number;
        cover: string | null;
        url: string;
        publicUrl: string;
        /** admin/issues/show for an issue in preparation (open); null once closed. */
        manageUrl: string | null;
    }[];
    /** POST (Inertia) { volume, kind: 'issue'|'supplement', number, year } → redirects to the new issue. */
    createIssueUrl: string;
    /** Defaults for the "New issue" form. */
    nextIssue: { volume: number; number: number; year: number };
    /** GET ?q=… searches titles, authors, keywords, abstracts or an exact DOI. */
    filters: { q: string };
    /** Up to 50 matches when q is set. */
    results: ArchiveArticleRow[];
    totals: {
        issues: number;
        articles: number;
        doiUnregistered: number;
        withoutAbstract: number;
        withoutKeywords: number;
    };
};

/** pages/admin/archive/issue.tsx */
export type ArchiveIssueProps = {
    issue: {
        slug: string;
        label: string;
        year: number | null;
        published: boolean;
        fullPdf: string | null;
        publicUrl: string;
        indexUrl: string;
    };
    /** In table-of-contents order. */
    articles: ArchiveArticleRow[];
};

/** pages/admin/archive/article.tsx (read-only) */
export type ArchiveArticleProps = {
    article: ArchiveArticleRow & {
        abstract: string;
        keywords: string[];
        affiliations: string[];
        /** YYYY-MM-DD */
        onlineAt: string | null;
        issueUrl: string;
    };
};

/** pages/admin/archive/dois.tsx: DOIs that do not resolve, from journal:sync-crossref. */
export type ArchiveDoisProps = {
    /** When the DOIs were last compared with Crossref (ISO), null if never. */
    checkedAt: string | null;
    prefix: string;
    /** Issues with unregistered DOIs, newest first. */
    groups: {
        slug: string;
        label: string;
        year: number | null;
        volume: number;
        url: string;
        /** Articles in the issue. */
        total: number;
        /** Not registered and safe to deposit (excludes those to check by hand). */
        pending: number;
        /** GET: the Crossref deposit file of the pending DOIs. */
        xmlUrl: string;
        /** POST (Inertia): send them to Crossref. Errors in `errors.crossref`. */
        depositUrl: string;
        articles: {
            number: string;
            title: string;
            doi: string;
            /** English reason (translated in the page). */
            problem: string;
            /** The DOI Crossref has for this PDF, when it differs. */
            crossrefDoi: string | null;
            url: string;
        }[];
    }[];
    /**
     * Registered only in a mistyped form (e.g. the prefix twice), by issue.
     * Depositing the issue registers the DOIs as printed.
     */
    double: {
        slug: string;
        label: string;
        volume: number;
        pending: number;
        xmlUrl: string;
        depositUrl: string;
        articles: {
            number: string;
            doi: string;
            registeredAs: string;
            url: string;
        }[];
    }[];
    indexUrl: string;
    crossref: CrossrefSettings;
    /** The last 20 deposits, newest first. */
    deposits: CrossrefDepositRow[];
};

export type CrossrefSettings = {
    depositorName: string | null;
    depositorEmail: string | null;
    /** Deposit each article when it is published online. */
    auto: boolean;
    /** The Crossref account is set on the server (.env): deposits can be sent. */
    connected: boolean;
    /** Crossref's test system: nothing is really registered. */
    testMode: boolean;
    /** Where DOIs lead: the PDF or the article page. */
    target: 'pdf' | 'page';
    /** PUT { depositor_name, depositor_email, auto } */
    settingsUrl: string;
    /** PUT { username, password (empty: keep), mode: 'test' | 'live', forget } */
    accountUrl: string;
    username: string | null;
    /** Where the account is set: in the back-office, in .env, or nowhere. */
    accountSource: 'panel' | 'env' | null;
};

export type CrossrefDepositRow = {
    id: number;
    batchId: string;
    issue: string | null;
    count: number;
    dois: string[];
    /** queued | sent | succeeded | partly | failed */
    status: string;
    /** button | publish */
    trigger: string;
    test: boolean;
    message: string | null;
    by: string | null;
    at: string | null;
};
